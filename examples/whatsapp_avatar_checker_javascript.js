// Browser-compatible JavaScript for WhatsApp Avatar Analysis

class WhatsAppAvatarChecker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.checknumber.ai/wa/api/avatar/tasks';
    }

    // Upload file for avatar analysis
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading file for avatar analysis:', error);
            throw error;
        }
    }

    // Check avatar analysis task status
    async checkTaskStatus(taskId, userId) {
        const url = `${this.baseUrl}/${taskId}?user_id=${userId}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking task status:', error);
            throw error;
        }
    }

    // Poll avatar analysis task status until completion
    async pollTaskStatus(taskId, userId, interval = 5000) {
        console.log('🤖 Starting AI-powered avatar analysis...');
        
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const response = await this.checkTaskStatus(taskId, userId);
                    const { status, success, total } = response;

                    if (status === 'processing') {
                        console.log(`🔄 AI Processing: ${success}/${total} avatars analyzed`);
                        updateUI(`🔄 AI Processing: ${success}/${total} avatars analyzed`);
                    } else {
                        console.log(`📊 Status: ${status}, Success: ${success}, Total: ${total}`);
                        updateUI(`📊 Status: ${status}, Success: ${success}, Total: ${total}`);
                    }

                    if (response.status === 'exported') {
                        console.log(`✅ Avatar analysis complete! Results: ${response.result_url}`);
                        resolve(response);
                    } else if (response.status === 'failed') {
                        reject(new Error('Avatar analysis task failed'));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            poll();
        });
    }
}

// Avatar Analysis Utilities
class AvatarAnalysisUtils {
    static async analyzeResults(resultsData) {
        // Process avatar analysis results
        const analysis = {
            totalRecords: resultsData.length,
            whatsappAccounts: 0,
            availableAvatars: 0,
            demographics: {
                gender: {},
                age: {},
                hairColor: {},
                ethnicity: {},
                categories: {}
            }
        };

        resultsData.forEach(record => {
            if (record.whatsapp === 'yes') {
                analysis.whatsappAccounts++;
                
                if (record.avatar && record.avatar !== 'unknown') {
                    analysis.availableAvatars++;
                }

                // Count demographics
                ['gender', 'age', 'hair_color', 'skin_color', 'category'].forEach(field => {
                    const value = record[field];
                    if (value && value !== 'unknown') {
                        const key = field === 'hair_color' ? 'hairColor' : 
                                   field === 'skin_color' ? 'ethnicity' : 
                                   field === 'category' ? 'categories' : field;
                        
                        if (!analysis.demographics[key][value]) {
                            analysis.demographics[key][value] = 0;
                        }
                        analysis.demographics[key][value]++;
                    }
                }
            }
        });

        return analysis;
    }

    static generateInsights(analysis) {
        const insights = [];
        const { demographics, whatsappAccounts } = analysis;

        // Gender insights
        if (demographics.gender && whatsappAccounts > 0) {
            const genderEntries = Object.entries(demographics.gender);
            if (genderEntries.length > 0) {
                const totalGender = genderEntries.reduce((sum, [_, count]) => sum + count, 0);
                const femaleRatio = (demographics.gender.female || 0) / totalGender;
                
                if (femaleRatio > 0.6) {
                    insights.push('👩 Female-dominant audience');
                } else if (femaleRatio < 0.4) {
                    insights.push('👨 Male-dominant audience');
                } else {
                    insights.push('⚖️ Balanced gender distribution');
                }
            }
        }

        // Avatar category insights
        if (demographics.categories) {
            const topCategory = Object.entries(demographics.categories)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (topCategory) {
                const [category, count] = topCategory;
                insights.push(`📷 Most common: ${category.replace('_', ' ')}`);
            }
        }

        return insights;
    }

    static createVisualization(analysis) {
        const container = document.createElement('div');
        container.className = 'avatar-analysis-visualization';
        
        // Create charts or visual representations
        container.innerHTML = `
            <div class="analysis-summary">
                <h3>🤖 AI Avatar Analysis Results</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${analysis.totalRecords.toLocaleString()}</div>
                        <div class="stat-label">Total Records</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${analysis.whatsappAccounts.toLocaleString()}</div>
                        <div class="stat-label">WhatsApp Accounts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${analysis.availableAvatars.toLocaleString()}</div>
                        <div class="stat-label">Available Avatars</div>
                    </div>
                </div>
            </div>
        `;
        
        return container;
    }
}

// UI Functions
function updateUI(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="status-message">${message}</div>`;
    }
}

function displayDemographics(analysis) {
    const demographicsDiv = document.getElementById('demographics');
    if (!demographicsDiv) return;
    
    let html = '<div class="demographics-analysis"><h3>📊 Demographic Analysis</h3>';
    
    // Gender distribution
    if (analysis.demographics.gender && Object.keys(analysis.demographics.gender).length > 0) {
        html += '<div class="demographic-section"><h4>👥 Gender Distribution</h4><ul>';
        Object.entries(analysis.demographics.gender).forEach(([gender, count]) => {
            const percentage = (count / analysis.whatsappAccounts * 100).toFixed(1);
            html += `<li>${gender.charAt(0).toUpperCase() + gender.slice(1)}: ${count} (${percentage}%)</li>`;
        });
        html += '</ul></div>';
    }
    
    // Age distribution
    if (analysis.demographics.age && Object.keys(analysis.demographics.age).length > 0) {
        html += '<div class="demographic-section"><h4>🎂 Age Distribution</h4><ul>';
        const ageEntries = Object.entries(analysis.demographics.age)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .slice(0, 8); // Show top 8 age ranges
        
        ageEntries.forEach(([age, count]) => {
            const percentage = (count / analysis.whatsappAccounts * 100).toFixed(1);
            html += `<li>Age ${age}: ${count} (${percentage}%)</li>`;
        });
        html += '</ul></div>';
    }
    
    // Avatar categories
    if (analysis.demographics.categories && Object.keys(analysis.demographics.categories).length > 0) {
        html += '<div class="demographic-section"><h4>📷 Avatar Categories</h4><ul>';
        Object.entries(analysis.demographics.categories).forEach(([category, count]) => {
            const percentage = (count / analysis.availableAvatars * 100).toFixed(1);
            html += `<li>${category.replace('_', ' ')}: ${count} (${percentage}%)</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    demographicsDiv.innerHTML = html;
}

// Usage Example
async function main() {
    const apiKey = 'YOUR_API_KEY';
    const checker = new WhatsAppAvatarChecker(apiKey);

    try {
        // For file input from HTML form
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            console.error('Please select a file');
            return;
        }

        // Upload file
        console.log('📤 Uploading file for avatar analysis...');
        const uploadResponse = await checker.uploadFile(file);
        console.log('🆔 Task ID:', uploadResponse.task_id);

        // Poll for completion
        console.log('🔄 Starting avatar analysis (this may take several minutes)...');
        const finalResponse = await checker.pollTaskStatus(uploadResponse.task_id, uploadResponse.user_id);
        
        console.log('✅ Avatar analysis completed!');
        updateUI('✅ Avatar analysis completed successfully!');
        
        // Note: In a real implementation, you'd fetch and parse the Excel results
        // For demo purposes, we'll show the structure
        console.log('📊 Analysis complete:', finalResponse);

    } catch (error) {
        console.error('❌ Error:', error.message);
        updateUI(`❌ Error: ${error.message}`);
    }
}

// Create file from text content
function createFileFromText(content, filename = 'input.txt') {
    const blob = new Blob([content], { type: 'text/plain' });
    return new File([blob], filename, { type: 'text/plain' });
}

// HTML UI Creation
function createUI() {
    const htmlTemplate = `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px;">
        <h2>🤖 WhatsApp Avatar Checker with AI Analysis</h2>
        <div class="privacy-notice" style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <strong>⚠️ Privacy Notice:</strong> This tool analyzes profile pictures and extracts demographic information. 
            Use responsibly and ensure compliance with privacy laws.
        </div>
        
        <div style="margin-bottom: 20px;">
            <label for="api-key">🔑 API Key:</label><br>
            <input type="text" id="api-key" placeholder="YOUR_API_KEY" style="width: 400px; padding: 8px; margin-top: 5px;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label for="file-input">📁 Phone Numbers File:</label><br>
            <input type="file" id="file-input" accept=".txt" style="margin-top: 5px;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label for="text-input">📝 Or Enter Phone Numbers (one per line):</label><br>
            <textarea id="text-input" rows="8" cols="50" 
                placeholder="+1234567890 (potential business owner)
+9876543210 (potential individual user)
+1122334455 (potential group admin)" 
                style="margin-top: 5px; font-family: monospace;"></textarea>
        </div>
        
        <div style="margin-bottom: 20px;">
            <button onclick="processFile()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                🔍 Analyze Avatars from File
            </button>
            <button onclick="processText()" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                🔍 Analyze Avatars from Text
            </button>
        </div>
        
        <div id="status" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; min-height: 50px;">
            <div class="ready-message">Ready to analyze WhatsApp avatars with AI...</div>
        </div>
        
        <div id="demographics" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; display: none;">
            <!-- Demographics will be populated here -->
        </div>
        
        <div style="margin-top: 20px; font-size: 14px; color: #666;">
            <h4>🤖 AI Analysis Features:</h4>
            <ul style="text-align: left;">
                <li><strong>Age Estimation:</strong> Detect estimated age ranges from facial features</li>
                <li><strong>Gender Detection:</strong> Male/female classification from visual cues</li>
                <li><strong>Hair Color Analysis:</strong> Black, brown, blonde, gray detection</li>
                <li><strong>Ethnicity Detection:</strong> Skin color analysis</li>
                <li><strong>Image Categorization:</strong> Portrait, pet, object, group photo classification</li>
                <li><strong>Avatar URL Extraction:</strong> Direct profile picture links</li>
            </ul>
            
            <h4>🎯 Use Cases:</h4>
            <ul style="text-align: left;">
                <li>Market research and demographic analysis</li>
                <li>Targeted marketing campaigns</li>
                <li>Customer persona development</li>
                <li>Identity verification enhancement</li>
                <li>Social studies and research</li>
            </ul>
            
            <h4>⚠️ Ethical Guidelines:</h4>
            <ul style="text-align: left; color: #dc3545;">
                <li>Use only for legitimate, legal purposes</li>
                <li>Comply with privacy laws (GDPR, CCPA, etc.)</li>
                <li>Obtain consent when required</li>
                <li>No discrimination based on demographics</li>
                <li>Respect individual privacy rights</li>
            </ul>
        </div>
    </div>
    
    <style>
    .status-message { 
        padding: 10px; 
        background: #e3f2fd; 
        border-left: 4px solid #2196f3; 
        border-radius: 4px; 
    }
    .ready-message { 
        color: #666; 
        font-style: italic; 
    }
    .demographics-analysis {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .demographic-section {
        margin-bottom: 20px;
    }
    .demographic-section h4 {
        color: #333;
        margin-bottom: 10px;
    }
    .demographic-section ul {
        list-style-type: none;
        padding-left: 0;
    }
    .demographic-section li {
        padding: 5px 0;
        border-bottom: 1px solid #eee;
    }
    </style>
    `;
    
    document.body.innerHTML = htmlTemplate;
}

// Process file input
async function processFile() {
    const apiKey = document.getElementById('api-key').value;
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    const demographicsDiv = document.getElementById('demographics');
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        statusDiv.innerHTML = '<div style="color: red;">⚠️ Please enter your API key</div>';
        return;
    }
    
    if (!fileInput.files[0]) {
        statusDiv.innerHTML = '<div style="color: red;">⚠️ Please select a file</div>';
        return;
    }
    
    const checker = new WhatsAppAvatarChecker(apiKey);
    
    try {
        statusDiv.innerHTML = '📤 Uploading file for AI avatar analysis...';
        const uploadResponse = await checker.uploadFile(fileInput.files[0]);
        
        statusDiv.innerHTML = `🆔 Task created! Task ID: ${uploadResponse.task_id}<br>📊 Status: ${uploadResponse.status}<br>🤖 Starting AI analysis...`;
        
        const finalResponse = await checker.pollTaskStatus(uploadResponse.task_id, uploadResponse.user_id);
        
        statusDiv.innerHTML = `
            <div style="color: green;">✅ Avatar analysis completed successfully!</div>
            <div>📊 Total: ${finalResponse.total}</div>
            <div>✅ Success: ${finalResponse.success}</div>
            <div>🤖 AI analysis complete with demographic insights</div>
            ${finalResponse.result_url ? `<div><a href="${finalResponse.result_url}" target="_blank" style="color: #007bff;">📥 Download Detailed Results</a></div>` : ''}
        `;
        
        demographicsDiv.style.display = 'block';
        demographicsDiv.innerHTML = `
            <h3>🤖 AI Analysis Complete</h3>
            <p>Comprehensive avatar and demographic analysis has been completed. The results include:</p>
            <ul>
                <li>👥 Gender distribution analysis</li>
                <li>🎂 Age range estimation</li>
                <li>💇 Hair color detection</li>
                <li>🌍 Ethnicity analysis</li>
                <li>📷 Avatar category classification</li>
                <li>🔗 Direct avatar URLs</li>
            </ul>
            <p><strong>Download the Excel file above to see detailed demographic insights.</strong></p>
        `;
        
    } catch (error) {
        statusDiv.innerHTML = `<div style="color: red;">❌ Error: ${error.message}</div>`;
    }
}

// Process text input
async function processText() {
    const apiKey = document.getElementById('api-key').value;
    const textInput = document.getElementById('text-input').value;
    const statusDiv = document.getElementById('status');
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        statusDiv.innerHTML = '<div style="color: red;">⚠️ Please enter your API key</div>';
        return;
    }
    
    if (!textInput.trim()) {
        statusDiv.innerHTML = '<div style="color: red;">⚠️ Please enter phone numbers</div>';
        return;
    }
    
    const checker = new WhatsAppAvatarChecker(apiKey);
    
    try {
        statusDiv.innerHTML = '📁 Creating file and uploading for AI avatar analysis...';
        const file = createFileFromText(textInput);
        const uploadResponse = await checker.uploadFile(file);
        
        statusDiv.innerHTML = `🆔 Task created! Task ID: ${uploadResponse.task_id}<br>📊 Status: ${uploadResponse.status}<br>🤖 Starting AI analysis...`;
        
        const finalResponse = await checker.pollTaskStatus(uploadResponse.task_id, uploadResponse.user_id);
        
        statusDiv.innerHTML = `
            <div style="color: green;">✅ Avatar analysis completed successfully!</div>
            <div>📊 Total: ${finalResponse.total}</div>
            <div>✅ Success: ${finalResponse.success}</div>
            <div>🤖 AI demographic analysis complete</div>
            ${finalResponse.result_url ? `<div><a href="${finalResponse.result_url}" target="_blank" style="color: #007bff;">📥 Download Comprehensive Results</a></div>` : ''}
        `;
        
    } catch (error) {
        statusDiv.innerHTML = `<div style="color: red;">❌ Error: ${error.message}</div>`;
    }
}

// Initialize UI when DOM is loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', createUI);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        WhatsAppAvatarChecker, 
        AvatarAnalysisUtils,
        createFileFromText 
    };
}
