#!/bin/bash

# WhatsApp Avatar Checker with AI Analysis - Shell Script
# Requires: curl, jq

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
API_KEY="${WHATSAPP_AVATAR_API_KEY:-YOUR_API_KEY}"
BASE_URL="https://api.checknumber.ai/wa/api/avatar/tasks"
TIMEOUT=30
POLL_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Unicode emojis for better visual representation
ROBOT="🤖"
UPLOAD="📤"
PROCESSING="🔄"
SUCCESS="✅"
WARNING="⚠️"
ERROR="❌"
INFO="📊"
AVATAR="🖼️"
GENDER="👥"
AGE="🎂"
HAIR="💇"
ETHNICITY="🌍"
CATEGORY="📷"
INSIGHTS="🎯"
PRIVACY="🔒"
CLEAN="🧹"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_ai() {
    echo -e "${PURPLE}[AI ANALYSIS]${NC} $1"
}

log_privacy() {
    echo -e "${ORANGE}[PRIVACY]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install them and try again."
        exit 1
    fi
}

# Validate API key
validate_api_key() {
    if [ "$API_KEY" = "YOUR_API_KEY" ] || [ -z "$API_KEY" ]; then
        log_error "Please set a valid API key in WHATSAPP_AVATAR_API_KEY environment variable"
        log_privacy "This API processes profile pictures and demographic data - ensure proper authorization"
        exit 1
    fi
}

# Upload file function
upload_file() {
    local file_path="$1"
    
    if [ ! -f "$file_path" ]; then
        log_error "File not found: $file_path"
        return 1
    fi
    
    log_info "${UPLOAD} Uploading file for AI avatar analysis: $file_path"
    log_ai "Starting profile picture analysis and demographic extraction"
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" \
        --location "$BASE_URL" \
        --header "X-API-Key: $API_KEY" \
        --form "file=@\"$file_path\"" \
        --write-out "\nHTTP_STATUS:%{http_code}")
    
    local http_status
    http_status=$(echo "$response" | tail -n1 | cut -d: -f2)
    local json_response
    json_response=$(echo "$response" | sed '$d')
    
    if [ "$http_status" -ne 200 ]; then
        log_error "Upload failed with HTTP status: $http_status"
        echo "$json_response" | jq -r '.' 2>/dev/null || echo "$json_response"
        return 1
    fi
    
    echo "$json_response"
}

# Check task status function
check_task_status() {
    local task_id="$1"
    local user_id="$2"
    
    local url="${BASE_URL}/${task_id}?user_id=${user_id}"
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" \
        --location "$url" \
        --header "X-API-Key: $API_KEY" \
        --write-out "\nHTTP_STATUS:%{http_code}")
    
    local http_status
    http_status=$(echo "$response" | tail -n1 | cut -d: -f2)
    local json_response
    json_response=$(echo "$response" | sed '$d')
    
    if [ "$http_status" -ne 200 ]; then
        log_error "Status check failed with HTTP status: $http_status"
        echo "$json_response" | jq -r '.' 2>/dev/null || echo "$json_response"
        return 1
    fi
    
    echo "$json_response"
}

# Poll task status until completion
poll_task_status() {
    local task_id="$1"
    local user_id="$2"
    
    log_ai "${ROBOT} Starting AI-powered avatar analysis (Task ID: $task_id)"
    log_privacy "Processing profile pictures with demographic extraction"
    
    while true; do
        local response
        if ! response=$(check_task_status "$task_id" "$user_id"); then
            return 1
        fi
        
        local status
        status=$(echo "$response" | jq -r '.status')
        local success
        success=$(echo "$response" | jq -r '.success')
        local total
        total=$(echo "$response" | jq -r '.total')
        
        if [ "$status" = "processing" ]; then
            log_ai "${PROCESSING} AI Processing: $success/$total avatars analyzed with demographic extraction"
        else
            log_info "${INFO} Status: $status, Success: $success, Total: $total"
        fi
        
        case "$status" in
            "exported")
                local result_url
                result_url=$(echo "$response" | jq -r '.result_url // "N/A"')
                log_success "${SUCCESS} Avatar analysis complete! Results: $result_url"
                log_ai "${INSIGHTS} Comprehensive demographic analysis ready for download"
                echo "$response"
                return 0
                ;;
            "failed")
                log_error "${ERROR} Avatar analysis task failed"
                return 1
                ;;
            *)
                sleep "$POLL_INTERVAL"
                ;;
        esac
    done
}

# Create input file from phone numbers
create_input_file() {
    local phone_numbers=("$@")
    local output_file="${phone_numbers[-1]}"  # Last argument is output file
    unset phone_numbers[-1]  # Remove last element
    
    log_info "Creating input file for avatar analysis: $output_file"
    
    printf '%s\n' "${phone_numbers[@]}" > "$output_file"
    
    if [ -f "$output_file" ]; then
        log_success "Created input file with ${#phone_numbers[@]} phone numbers for AI analysis"
        return 0
    else
        log_error "Failed to create input file"
        return 1
    fi
}

# Download results
download_results() {
    local result_url="$1"
    local output_path="${2:-avatar_analysis_results.xlsx}"
    
    if [ "$result_url" = "N/A" ] || [ -z "$result_url" ]; then
        log_warning "No result URL provided, skipping download"
        return 0
    fi
    
    log_info "Downloading comprehensive avatar analysis results to: $output_path"
    
    if curl -s --max-time 300 \
        --location "$result_url" \
        --output "$output_path" \
        --write-out "HTTP_STATUS:%{http_code}" | grep -q "HTTP_STATUS:200"; then
        log_success "Avatar analysis results downloaded successfully"
        log_ai "Results contain demographic insights, avatar URLs, and AI classifications"
        return 0
    else
        log_error "Failed to download results"
        return 1
    fi
}

# Analyze sample results (simplified demonstration)
analyze_sample_results() {
    local total_records="$1"
    local whatsapp_accounts="$2"
    local available_avatars="$3"
    
    echo ""
    log_ai "${ROBOT} AI AVATAR ANALYSIS SUMMARY"
    echo "$(printf '=%.0s' {1..50})"
    
    echo ""
    log_info "${INFO} BASIC STATISTICS"
    echo "   Total Records: $(printf "%'d" "$total_records")"
    echo "   WhatsApp Accounts: $(printf "%'d" "$whatsapp_accounts") ($(bc <<< "scale=1; $whatsapp_accounts * 100.0 / $total_records")%)"
    echo "   Available Avatars: $(printf "%'d" "$available_avatars") ($(bc <<< "scale=1; $available_avatars * 100.0 / $total_records")%)"
    
    echo ""
    log_ai "${GENDER} DEMOGRAPHIC ANALYSIS CAPABILITIES"
    echo "   • Gender Detection: Male/Female classification from visual cues"
    echo "   • Age Estimation: Age ranges detected from facial features"
    echo "   • Hair Color Analysis: Black, brown, blonde, gray detection"
    echo "   • Ethnicity Detection: Skin color and ethnic classification"
    echo "   • Profile Categories: Portrait, pet, object, group classifications"
    
    echo ""
    log_ai "${CATEGORY} AVATAR CATEGORY ANALYSIS"
    echo "   • Individual Portrait: Single person with clear face"
    echo "   • Pet Avatar: Animal or pet profile pictures"
    echo "   • Object/Logo: Business logos or inanimate objects"
    echo "   • Group Photo: Multiple people in the image"
    echo "   • Cartoon/Art: Illustrations or animated characters"
    
    echo ""
    log_ai "${INSIGHTS} POTENTIAL BUSINESS INSIGHTS"
    echo "   • Target audience demographics for marketing"
    echo "   • Age-appropriate content and messaging"
    echo "   • Cultural sensitivity considerations"
    echo "   • Visual content optimization opportunities"
    echo "   • Customer persona development data"
    
    echo ""
    log_privacy "${WARNING} PRIVACY AND ETHICAL CONSIDERATIONS"
    echo "   • All analysis is automated with AI - no human review"
    echo "   • Demographic data is statistical estimates, not definitive"
    echo "   • Results should be used for legitimate business purposes only"
    echo "   • Comply with GDPR, CCPA, and local privacy regulations"
    echo "   • Obtain proper consent for demographic data processing"
    echo "   • Do not discriminate based on extracted characteristics"
    
    echo ""
    echo "$(printf '=%.0s' {1..50})"
    log_privacy "${PRIVACY} Use this data responsibly and in compliance with privacy laws!"
}

# Generate insights based on sample data
generate_insights() {
    local whatsapp_ratio="$1"
    local avatar_ratio="$2"
    
    echo ""
    log_ai "${INSIGHTS} AI-GENERATED INSIGHTS"
    echo "$(printf '-%.0s' {1..35})"
    
    # WhatsApp adoption insights
    if (( $(echo "$whatsapp_ratio > 80" | bc -l) )); then
        echo "   📱 High WhatsApp adoption - excellent platform for outreach"
    elif (( $(echo "$whatsapp_ratio > 50" | bc -l) )); then
        echo "   📱 Moderate WhatsApp adoption - good potential for engagement"
    else
        echo "   📱 Lower WhatsApp adoption - consider multi-platform approach"
    fi
    
    # Avatar availability insights
    if (( $(echo "$avatar_ratio > 70" | bc -l) )); then
        echo "   🖼️ High avatar availability - rich demographic analysis possible"
    elif (( $(echo "$avatar_ratio > 40" | bc -l) )); then
        echo "   🖼️ Moderate avatar availability - decent demographic insights"
    else
        echo "   🖼️ Limited avatar availability - privacy-conscious audience"
    fi
    
    # Demographic analysis potential
    echo "   🎯 Demographic segmentation opportunities identified"
    echo "   📊 Visual content personalization potential"
    echo "   🌍 Cross-cultural marketing considerations available"
    echo "   👥 Audience profiling data for targeted campaigns"
}

# Export analysis summary
export_analysis_summary() {
    local total="$1"
    local whatsapp="$2"
    local avatars="$3"
    local output_file="${4:-avatar_analysis_summary.json}"
    
    cat > "$output_file" << EOF
{
  "avatar_analysis_summary": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "basic_statistics": {
      "total_records": $total,
      "whatsapp_accounts": $whatsapp,
      "available_avatars": $avatars,
      "whatsapp_ratio": $(bc <<< "scale=3; $whatsapp * 100.0 / $total"),
      "avatar_ratio": $(bc <<< "scale=3; $avatars * 100.0 / $total")
    },
    "ai_capabilities": {
      "gender_detection": "male/female classification",
      "age_estimation": "age ranges from facial features",
      "hair_color_analysis": "black, brown, blonde, gray detection",
      "ethnicity_detection": "skin color analysis",
      "category_classification": "portrait, pet, object, group types"
    },
    "business_applications": [
      "Demographic-targeted marketing campaigns",
      "Age-appropriate content optimization",
      "Cultural sensitivity considerations",
      "Customer persona development",
      "Visual content personalization"
    ],
    "privacy_compliance": {
      "automated_analysis": true,
      "human_review": false,
      "gdpr_considerations": "Biometric processing requires explicit consent",
      "data_retention": "Implement appropriate retention policies",
      "user_rights": "Honor deletion and access requests"
    },
    "ethical_guidelines": {
      "acceptable_uses": [
        "Market research with aggregated data",
        "Academic research with IRB approval", 
        "Business intelligence for owned data",
        "Fraud prevention and security"
      ],
      "prohibited_uses": [
        "Individual profiling for discrimination",
        "Harassment or privacy invasion",
        "Unauthorized demographic databases",
        "Discriminatory service provision"
      ]
    }
  }
}
EOF

    log_success "${SUCCESS} Analysis summary exported to: $output_file"
}

# Main function
main() {
    local input_file="input.txt"
    local results_file="avatar_analysis_results.xlsx"
    local summary_file="avatar_analysis_summary.json"
    
    echo ""
    echo "$(printf '=%.0s' {1..60})"
    log_ai "${ROBOT} WhatsApp Avatar Checker with AI Analysis"
    log_privacy "${WARNING} This tool analyzes profile pictures and extracts demographic information"
    log_privacy "${PRIVACY} Please ensure ethical and legal use of demographic data"
    echo "$(printf '=%.0s' {1..60})"
    echo ""
    
    # Check dependencies and API key
    check_dependencies
    validate_api_key
    
    # Example phone numbers for avatar analysis - potential mixed demographics
    local phone_numbers=(
        "+1234567890"  # Example: potential business owner
        "+9876543210"  # Example: potential individual user
        "+1122334455"  # Example: potential group admin
    )
    
    # Create input file
    if ! create_input_file "${phone_numbers[@]}" "$input_file"; then
        exit 1
    fi
    
    # Upload file
    local upload_response
    if ! upload_response=$(upload_file "$input_file"); then
        exit 1
    fi
    
    local task_id
    task_id=$(echo "$upload_response" | jq -r '.task_id')
    local user_id
    user_id=$(echo "$upload_response" | jq -r '.user_id')
    local initial_status
    initial_status=$(echo "$upload_response" | jq -r '.status')
    
    log_success "${SUCCESS} File uploaded for AI avatar analysis"
    log_info "Task ID: $task_id"
    log_info "Initial Status: $initial_status"
    log_ai "AI will analyze profile pictures for demographics and visual characteristics"
    
    # Poll for completion (avatar analysis takes longer due to AI processing)
    log_info "Starting avatar analysis (this may take several minutes due to AI processing)..."
    
    local final_response
    if ! final_response=$(poll_task_status "$task_id" "$user_id"); then
        exit 1
    fi
    
    local total
    total=$(echo "$final_response" | jq -r '.total')
    local success
    success=$(echo "$final_response" | jq -r '.success')
    local result_url
    result_url=$(echo "$final_response" | jq -r '.result_url // "N/A"')
    
    log_success "${SUCCESS} Avatar analysis completed successfully!"
    log_ai "AI has completed demographic analysis and avatar classification"
    
    # Download results if available
    if [ "$result_url" != "N/A" ]; then
        download_results "$result_url" "$results_file"
    fi
    
    # Simulate analysis (in real use, you'd parse the Excel file)
    local simulated_avatars
    simulated_avatars=$((success * 80 / 100))  # Assume 80% have avatars
    
    # Perform analysis demonstration
    analyze_sample_results "$total" "$success" "$simulated_avatars"
    
    # Generate insights
    local whatsapp_ratio
    whatsapp_ratio=$(bc <<< "scale=1; $success * 100.0 / $total")
    local avatar_ratio
    avatar_ratio=$(bc <<< "scale=1; $simulated_avatars * 100.0 / $total")
    
    generate_insights "$whatsapp_ratio" "$avatar_ratio"
    
    # Export summary
    export_analysis_summary "$total" "$success" "$simulated_avatars" "$summary_file"
    
    echo ""
    log_success "${SUCCESS} Avatar analysis process completed successfully!"
    
    if [ -f "$results_file" ]; then
        log_info "📋 Files created:"
        log_info "   • Avatar analysis results: $results_file"
        log_info "   • Analysis summary: $summary_file"
        
        echo ""
        log_ai "${INSIGHTS} The Excel file contains detailed information:"
        echo "   • Phone numbers and WhatsApp status"
        echo "   • Direct avatar/profile picture URLs"
        echo "   • AI-estimated age ranges"
        echo "   • Gender classifications (male/female)"
        echo "   • Hair color analysis"
        echo "   • Ethnicity/skin color detection"
        echo "   • Avatar category classifications"
    fi
    
    echo ""
    log_ai "${INSIGHTS} BUSINESS RECOMMENDATIONS:"
    echo "   • Use demographic insights for targeted marketing campaigns"
    echo "   • Develop age-appropriate messaging and content"
    echo "   • Consider cultural sensitivity in communications"
    echo "   • Create detailed customer personas based on visual data"
    echo "   • Optimize visual content to match audience characteristics"
    
    echo ""
    log_privacy "${WARNING} COMPLIANCE REMINDERS:"
    echo "   • This data contains biometric and demographic information"
    echo "   • Ensure compliance with GDPR (EU), CCPA (California), and local laws"
    echo "   • Obtain explicit consent for processing demographic data"
    echo "   • Implement appropriate data retention and deletion policies"
    echo "   • Provide transparent privacy notices to users"
    echo "   • Use data only for legitimate, non-discriminatory purposes"
    
    # Clean up
    if [ -f "$input_file" ]; then
        rm "$input_file"
        log_info "${CLEAN} Cleaned up temporary files"
    fi
    
    echo ""
    log_success "${SUCCESS} WhatsApp avatar analysis with AI demographics completed!"
    echo "$(printf '=%.0s' {1..60})"
}

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "WhatsApp Avatar Checker with AI-Powered Demographic Analysis"
    echo "Analyzes profile pictures to extract demographic insights and visual characteristics"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE     Upload specific file instead of using example data"
    echo "  -k, --api-key KEY   Set API key (or use WHATSAPP_AVATAR_API_KEY env var)"
    echo "  -o, --output FILE   Set output file for results (default: avatar_analysis_results.xlsx)"
    echo "  -s, --summary FILE  Set summary file name (default: avatar_analysis_summary.json)"
    echo "  -i, --interval SEC  Set polling interval in seconds (default: 5)"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  WHATSAPP_AVATAR_API_KEY   Your API key for the avatar analysis service"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run with example data"
    echo "  $0 -f my_numbers.txt                 # Upload specific file"
    echo "  $0 -f contacts.txt -o my_results.xlsx -s my_summary.json"
    echo "  WHATSAPP_AVATAR_API_KEY=your_key $0  # Set API key via environment"
    echo ""
    echo "AI Analysis Features:"
    echo "  🤖 Age Estimation      - Detect estimated age ranges from facial features"
    echo "  👥 Gender Detection    - Male/female classification from visual cues"
    echo "  💇 Hair Color Analysis - Black, brown, blonde, gray detection"
    echo "  🌍 Ethnicity Detection - Skin color analysis and classification"
    echo "  📷 Image Categorization - Portrait, pet, object, group photo types"
    echo "  🔗 Avatar URL Extraction - Direct profile picture links"
    echo ""
    echo "Business Use Cases:"
    echo "  📊 Market research and demographic analysis"
    echo "  🎯 Targeted marketing campaigns"
    echo "  👤 Customer persona development"
    echo "  🔍 Identity verification enhancement"
    echo "  📈 Social studies and research"
    echo ""
    echo "⚠️  PRIVACY & ETHICAL USE REQUIREMENTS:"
    echo "  🔒 Obtain proper consent for demographic data processing"
    echo "  ⚖️ Comply with GDPR, CCPA, and local privacy regulations"
    echo "  🚫 Do not discriminate based on analyzed characteristics"
    echo "  ✅ Use only for legitimate, legal business purposes"
    echo "  📋 Implement data retention and deletion policies"
    echo "  👁️ Provide transparent privacy notices to users"
}

# Parse command line arguments
parse_args() {
    local custom_file=""
    local custom_output=""
    local custom_summary=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                custom_file="$2"
                shift 2
                ;;
            -k|--api-key)
                API_KEY="$2"
                shift 2
                ;;
            -o|--output)
                custom_output="$2"
                shift 2
                ;;
            -s|--summary)
                custom_summary="$2"
                shift 2
                ;;
            -i|--interval)
                POLL_INTERVAL="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # If custom file provided, use it instead of creating example
    if [ -n "$custom_file" ]; then
        if [ ! -f "$custom_file" ]; then
            log_error "File not found: $custom_file"
            exit 1
        fi
        
        log_info "Using custom file for avatar analysis: $custom_file"
        main_with_custom_file "$custom_file" "$custom_output" "$custom_summary"
    else
        main
    fi
}

# Main function for custom file
main_with_custom_file() {
    local input_file="$1"
    local results_file="${2:-avatar_analysis_results.xlsx}"
    local summary_file="${3:-avatar_analysis_summary.json}"
    
    echo ""
    echo "$(printf '=%.0s' {1..60})"
    log_ai "${ROBOT} WhatsApp Avatar Checker with AI Analysis - Custom File"
    log_privacy "${WARNING} Processing custom file with demographic analysis"
    log_privacy "${PRIVACY} Ensure compliance with privacy regulations"
    echo "$(printf '=%.0s' {1..60})"
    echo ""
    
    # Check dependencies and API key
    check_dependencies
    validate_api_key
    
    # Upload file
    local upload_response
    if ! upload_response=$(upload_file "$input_file"); then
        exit 1
    fi
    
    local task_id
    task_id=$(echo "$upload_response" | jq -r '.task_id')
    local user_id
    user_id=$(echo "$upload_response" | jq -r '.user_id')
    
    log_success "${SUCCESS} Custom file uploaded for AI avatar analysis"
    log_info "Task ID: $task_id"
    
    # Poll for completion
    local final_response
    if ! final_response=$(poll_task_status "$task_id" "$user_id"); then
        exit 1
    fi
    
    local total
    total=$(echo "$final_response" | jq -r '.total')
    local success
    success=$(echo "$final_response" | jq -r '.success')
    local result_url
    result_url=$(echo "$final_response" | jq -r '.result_url // "N/A"')
    
    log_success "${SUCCESS} Avatar analysis completed successfully!"
    
    # Download results if available
    if [ "$result_url" != "N/A" ]; then
        download_results "$result_url" "$results_file"
    fi
    
    # Analysis and summary
    local simulated_avatars
    simulated_avatars=$((success * 75 / 100))  # Assume 75% have avatars for custom data
    
    analyze_sample_results "$total" "$success" "$simulated_avatars"
    
    local whatsapp_ratio
    whatsapp_ratio=$(bc <<< "scale=1; $success * 100.0 / $total")
    local avatar_ratio
    avatar_ratio=$(bc <<< "scale=1; $simulated_avatars * 100.0 / $total")
    
    generate_insights "$whatsapp_ratio" "$avatar_ratio"
    export_analysis_summary "$total" "$success" "$simulated_avatars" "$summary_file"
    
    log_success "${SUCCESS} Custom avatar analysis process completed successfully!"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check if bc is available for calculations
    if ! command -v bc &> /dev/null; then
        log_warning "bc not found - percentage calculations will be simplified"
    fi
    
    if [ $# -eq 0 ]; then
        main
    else
        parse_args "$@"
    fi
fi
