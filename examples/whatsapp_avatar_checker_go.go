package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type WhatsAppAvatarChecker struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

type AvatarResponse struct {
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	TaskID    string `json:"task_id"`
	UserID    string `json:"user_id"`
	Status    string `json:"status"`
	Total     int    `json:"total"`
	Success   int    `json:"success"`
	Failure   int    `json:"failure"`
	ResultURL string `json:"result_url,omitempty"`
}

type AvatarResult struct {
	Number    string `json:"number"`
	WhatsApp  string `json:"whatsapp"`
	Avatar    string `json:"avatar,omitempty"`
	Age       string `json:"age,omitempty"`
	Gender    string `json:"gender,omitempty"`
	HairColor string `json:"hair_color,omitempty"`
	SkinColor string `json:"skin_color,omitempty"`
	Category  string `json:"category,omitempty"`
}

type AvatarAnalysis struct {
	TotalRecords          int                    `json:"total_records"`
	WhatsAppAccounts      int                    `json:"whatsapp_accounts"`
	AvailableAvatars      int                    `json:"available_avatars"`
	GenderDistribution    map[string]int         `json:"gender_distribution"`
	AgeDistribution       map[string]int         `json:"age_distribution"`
	HairColorDistribution map[string]int         `json:"hair_color_distribution"`
	EthnicityDistribution map[string]int         `json:"ethnicity_distribution"`
	CategoryDistribution  map[string]int         `json:"category_distribution"`
}

func NewWhatsAppAvatarChecker(apiKey string) *WhatsAppAvatarChecker {
	return &WhatsAppAvatarChecker{
		apiKey:  apiKey,
		baseURL: "https://api.checknumber.ai/wa/api/avatar/tasks",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (wac *WhatsAppAvatarChecker) UploadFile(filePath string) (*AvatarResponse, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %v", err)
	}

	_, err = io.Copy(part, file)
	if err != nil {
		return nil, fmt.Errorf("failed to copy file: %v", err)
	}

	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close writer: %v", err)
	}

	req, err := http.NewRequest("POST", wac.baseURL, &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", wac.apiKey)

	resp, err := wac.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	var result AvatarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &result, nil
}

func (wac *WhatsAppAvatarChecker) CheckTaskStatus(taskID, userID string) (*AvatarResponse, error) {
	url := fmt.Sprintf("%s/%s?user_id=%s", wac.baseURL, taskID, userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("X-API-Key", wac.apiKey)

	resp, err := wac.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	var result AvatarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &result, nil
}

func (wac *WhatsAppAvatarChecker) PollTaskStatus(taskID, userID string, interval time.Duration) (*AvatarResponse, error) {
	fmt.Println("🤖 Starting AI-powered avatar analysis...")

	for {
		resp, err := wac.CheckTaskStatus(taskID, userID)
		if err != nil {
			return nil, err
		}

		if resp.Status == "processing" {
			fmt.Printf("🔄 AI Processing: %d/%d avatars analyzed\n", resp.Success, resp.Total)
		} else {
			fmt.Printf("📊 Status: %s, Success: %d, Total: %d\n", resp.Status, resp.Success, resp.Total)
		}

		switch resp.Status {
		case "exported":
			fmt.Printf("✅ Avatar analysis complete! Results: %s\n", resp.ResultURL)
			return resp, nil
		case "failed":
			return nil, fmt.Errorf("avatar analysis task failed")
		default:
			time.Sleep(interval)
		}
	}
}

func (wac *WhatsAppAvatarChecker) CreateInputFile(phoneNumbers []string, filePath string) error {
	content := strings.Join(phoneNumbers, "\n")
	return os.WriteFile(filePath, []byte(content), 0644)
}

func (wac *WhatsAppAvatarChecker) DownloadResults(resultURL, outputPath string) error {
	resp, err := http.Get(resultURL)
	if err != nil {
		return fmt.Errorf("failed to download results: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create output file: %v", err)
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to write to file: %v", err)
	}

	return nil
}

func (wac *WhatsAppAvatarChecker) AnalyzeAvatarResults(results []AvatarResult) *AvatarAnalysis {
	fmt.Println("\n🤖 AI AVATAR ANALYSIS SUMMARY")
	fmt.Println(strings.Repeat("=", 50))

	analysis := &AvatarAnalysis{
		TotalRecords:          len(results),
		GenderDistribution:    make(map[string]int),
		AgeDistribution:       make(map[string]int),
		HairColorDistribution: make(map[string]int),
		EthnicityDistribution: make(map[string]int),
		CategoryDistribution:  make(map[string]int),
	}

	// Count WhatsApp accounts and avatars
	for _, result := range results {
		if result.WhatsApp == "yes" {
			analysis.WhatsAppAccounts++
			if result.Avatar != "" && result.Avatar != "unknown" {
				analysis.AvailableAvatars++
			}

			// Count demographics for WhatsApp accounts only
			if result.Gender != "" && result.Gender != "unknown" {
				analysis.GenderDistribution[result.Gender]++
			}
			if result.Age != "" && result.Age != "unknown" {
				analysis.AgeDistribution[result.Age]++
			}
			if result.HairColor != "" && result.HairColor != "unknown" {
				analysis.HairColorDistribution[result.HairColor]++
			}
			if result.SkinColor != "" && result.SkinColor != "unknown" {
				analysis.EthnicityDistribution[result.SkinColor]++
			}
			if result.Category != "" && result.Category != "unknown" {
				analysis.CategoryDistribution[result.Category]++
			}
		}
	}

	// Print basic statistics
	fmt.Printf("📊 Total Records: %s\n", formatNumber(analysis.TotalRecords))
	whatsappPercentage := float64(analysis.WhatsAppAccounts) / float64(analysis.TotalRecords) * 100
	fmt.Printf("✅ WhatsApp Accounts: %s (%.1f%%)\n", formatNumber(analysis.WhatsAppAccounts), whatsappPercentage)
	avatarPercentage := float64(analysis.AvailableAvatars) / float64(analysis.TotalRecords) * 100
	fmt.Printf("🖼️ Available Avatars: %s (%.1f%%)\n", formatNumber(analysis.AvailableAvatars), avatarPercentage)

	// Gender analysis
	if len(analysis.GenderDistribution) > 0 {
		totalGender := 0
		for _, count := range analysis.GenderDistribution {
			totalGender += count
		}

		fmt.Printf("\n👥 GENDER ANALYSIS (%s profiles)\n", formatNumber(totalGender))
		fmt.Println(strings.Repeat("-", 30))

		// Sort by count (descending)
		type genderCount struct {
			Gender string
			Count  int
		}
		var genderCounts []genderCount
		for gender, count := range analysis.GenderDistribution {
			genderCounts = append(genderCounts, genderCount{gender, count})
		}
		sort.Slice(genderCounts, func(i, j int) bool {
			return genderCounts[i].Count > genderCounts[j].Count
		})

		for _, gc := range genderCounts {
			percentage := float64(gc.Count) / float64(totalGender) * 100
			fmt.Printf("   %s: %s (%.1f%%)\n", strings.Title(gc.Gender), formatNumber(gc.Count), percentage)
		}
	}

	// Age analysis
	if len(analysis.AgeDistribution) > 0 {
		totalAge := 0
		for _, count := range analysis.AgeDistribution {
			totalAge += count
		}

		fmt.Printf("\n🎂 AGE ANALYSIS (%s profiles)\n", formatNumber(totalAge))
		fmt.Println(strings.Repeat("-", 25))

		// Sort by age (ascending), take top 10
		type ageCount struct {
			Age   string
			Count int
		}
		var ageCounts []ageCount
		for age, count := range analysis.AgeDistribution {
			ageCounts = append(ageCounts, ageCount{age, count})
		}
		sort.Slice(ageCounts, func(i, j int) bool {
			return parseAge(ageCounts[i].Age) < parseAge(ageCounts[j].Age)
		})

		maxDisplay := 10
		if len(ageCounts) < maxDisplay {
			maxDisplay = len(ageCounts)
		}

		for _, ac := range ageCounts[:maxDisplay] {
			percentage := float64(ac.Count) / float64(totalAge) * 100
			fmt.Printf("   %s: %s (%.1f%%)\n", ac.Age, formatNumber(ac.Count), percentage)
		}
	}

	// Hair color analysis
	if len(analysis.HairColorDistribution) > 0 {
		totalHair := 0
		for _, count := range analysis.HairColorDistribution {
			totalHair += count
		}

		fmt.Printf("\n💇 HAIR COLOR ANALYSIS (%s profiles)\n", formatNumber(totalHair))
		fmt.Println(strings.Repeat("-", 35))

		// Sort by count (descending), take top 8
		type hairCount struct {
			Color string
			Count int
		}
		var hairCounts []hairCount
		for color, count := range analysis.HairColorDistribution {
			hairCounts = append(hairCounts, hairCount{color, count})
		}
		sort.Slice(hairCounts, func(i, j int) bool {
			return hairCounts[i].Count > hairCounts[j].Count
		})

		maxDisplay := 8
		if len(hairCounts) < maxDisplay {
			maxDisplay = len(hairCounts)
		}

		for _, hc := range hairCounts[:maxDisplay] {
			percentage := float64(hc.Count) / float64(totalHair) * 100
			fmt.Printf("   %s: %s (%.1f%%)\n", strings.Title(hc.Color), formatNumber(hc.Count), percentage)
		}
	}

	// Ethnicity analysis
	if len(analysis.EthnicityDistribution) > 0 {
		totalEthnicity := 0
		for _, count := range analysis.EthnicityDistribution {
			totalEthnicity += count
		}

		fmt.Printf("\n🌍 ETHNICITY ANALYSIS (%s profiles)\n", formatNumber(totalEthnicity))
		fmt.Println(strings.Repeat("-", 35))

		// Sort by count (descending)
		type ethnicityCount struct {
			Ethnicity string
			Count     int
		}
		var ethnicityCounts []ethnicityCount
		for ethnicity, count := range analysis.EthnicityDistribution {
			ethnicityCounts = append(ethnicityCounts, ethnicityCount{ethnicity, count})
		}
		sort.Slice(ethnicityCounts, func(i, j int) bool {
			return ethnicityCounts[i].Count > ethnicityCounts[j].Count
		})

		for _, ec := range ethnicityCounts {
			percentage := float64(ec.Count) / float64(totalEthnicity) * 100
			fmt.Printf("   %s: %s (%.1f%%)\n", strings.Title(ec.Ethnicity), formatNumber(ec.Count), percentage)
		}
	}

	// Category analysis
	if len(analysis.CategoryDistribution) > 0 {
		fmt.Printf("\n📷 AVATAR CATEGORY ANALYSIS\n")
		fmt.Println(strings.Repeat("-", 35))

		// Sort by count (descending)
		type categoryCount struct {
			Category string
			Count    int
		}
		var categoryCounts []categoryCount
		for category, count := range analysis.CategoryDistribution {
			categoryCounts = append(categoryCounts, categoryCount{category, count})
		}
		sort.Slice(categoryCounts, func(i, j int) bool {
			return categoryCounts[i].Count > categoryCounts[j].Count
		})

		for _, cc := range categoryCounts {
			percentage := float64(cc.Count) / float64(analysis.AvailableAvatars) * 100
			displayName := strings.Title(strings.ReplaceAll(cc.Category, "_", " "))
			fmt.Printf("   %s: %s (%.1f%%)\n", displayName, formatNumber(cc.Count), percentage)
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("💡 Use this data responsibly and in compliance with privacy laws!")

	return analysis
}

func (wac *WhatsAppAvatarChecker) ExportDemographicsSummary(analysis *AvatarAnalysis, outputFile string) error {
	jsonData, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %v", err)
	}

	err = os.WriteFile(outputFile, jsonData, 0644)
	if err != nil {
		return fmt.Errorf("failed to write file: %v", err)
	}

	fmt.Printf("📄 Demographics summary exported to: %s\n", outputFile)
	return nil
}

// Helper functions
func parseAge(ageStr string) float64 {
	if strings.Contains(ageStr, "-") {
		// Handle age ranges like "25-30"
		parts := strings.Split(ageStr, "-")
		if len(parts) > 0 {
			if age, err := strconv.ParseFloat(parts[0], 64); err == nil {
				return age
			}
		}
	}
	if age, err := strconv.ParseFloat(ageStr, 64); err == nil {
		return age
	}
	return 999 // Put unparseable ages at the end
}

func formatNumber(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	} else if n < 1000000 {
		return fmt.Sprintf("%d,%03d", n/1000, n%1000)
	}
	return fmt.Sprintf("%d,%03d,%03d", n/1000000, (n%1000000)/1000, n%1000)
}

func main() {
	apiKey := os.Getenv("WHATSAPP_AVATAR_API_KEY")
	if apiKey == "" {
		apiKey = "YOUR_API_KEY"
	}

	fmt.Println("🚀 WhatsApp Avatar Checker with AI Analysis")
	fmt.Println("⚠️  This tool analyzes profile pictures and demographics")
	fmt.Println("🔒 Please ensure ethical and legal use\n")

	checker := NewWhatsAppAvatarChecker(apiKey)

	// Example phone numbers for avatar analysis
	phoneNumbers := []string{
		"+1234567890", // Example number with potential avatar
		"+9876543210", // Example number with potential avatar
		"+1122334455", // Example number with potential avatar
	}

	// Create input file
	inputFile := "input.txt"
	err := checker.CreateInputFile(phoneNumbers, inputFile)
	if err != nil {
		log.Fatalf("Failed to create input file: %v", err)
	}
	fmt.Printf("📁 Created input file: %s\n", inputFile)

	// Upload file
	fmt.Println("📤 Uploading file for AI avatar analysis...")
	uploadResponse, err := checker.UploadFile(inputFile)
	if err != nil {
		log.Fatalf("Upload failed: %v", err)
	}
	fmt.Printf("🆔 Task ID: %s\n", uploadResponse.TaskID)
	fmt.Printf("📊 Initial Status: %s\n", uploadResponse.Status)

	// Poll for completion (avatar analysis takes longer due to AI processing)
	fmt.Println("\n🔄 Starting avatar analysis (this may take several minutes)...")
	finalResponse, err := checker.PollTaskStatus(uploadResponse.TaskID, uploadResponse.UserID, 5*time.Second)
	if err != nil {
		log.Fatalf("Polling failed: %v", err)
	}

	fmt.Println("\n✅ Avatar analysis completed successfully!")

	// Download and analyze results
	if finalResponse.ResultURL != "" {
		fmt.Println("\n📥 Downloading comprehensive avatar analysis results...")
		resultsFile := "avatar_analysis_results.xlsx"
		err := checker.DownloadResults(finalResponse.ResultURL, resultsFile)
		if err != nil {
			log.Printf("Failed to download results: %v", err)
		} else {
			fmt.Printf("💾 Results saved to: %s\n", resultsFile)

			// Note: In a real implementation, you'd parse the Excel file
			// For demo purposes, we'll create sample data
			sampleResults := []AvatarResult{
				{Number: "+1234567890", WhatsApp: "yes", Gender: "male", Age: "25", Category: "individual portrait"},
				{Number: "+9876543210", WhatsApp: "yes", Gender: "female", Age: "30", Category: "individual portrait"},
				{Number: "+1122334455", WhatsApp: "no"},
			}

			// Perform demographic analysis
			fmt.Println("\n🤖 Analyzing demographic data...")
			analysis := checker.AnalyzeAvatarResults(sampleResults)

			// Export summary
			summaryFile := "demographics_summary.json"
			err := checker.ExportDemographicsSummary(analysis, summaryFile)
			if err != nil {
				log.Printf("Failed to export summary: %v", err)
			}

			fmt.Printf("\n📋 Analysis complete! Files created:\n")
			fmt.Printf("   • Avatar results: %s\n", resultsFile)
			fmt.Printf("   • Demographics summary: %s\n", summaryFile)

			fmt.Printf("\n🎯 INSIGHTS:\n")
			fmt.Printf("   • Profile pictures provide rich demographic data\n")
			fmt.Printf("   • Use findings to enhance marketing personalization\n")
			fmt.Printf("   • Remember to comply with privacy regulations\n")
			fmt.Printf("   • Consider demographic diversity in your strategies\n")
		}
	}

	// Clean up input file
	if err := os.Remove(inputFile); err == nil {
		fmt.Println("\n🧹 Cleaned up temporary files")
	}
}
