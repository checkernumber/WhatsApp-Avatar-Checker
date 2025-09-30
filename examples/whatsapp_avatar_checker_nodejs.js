const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

class WhatsAppAvatarChecker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.checknumber.ai/wa/api/avatar/tasks';
        
        // Create axios instance with default headers
        this.client = axios.create({
            headers: {
                'X-API-Key': this.apiKey
            },
            timeout: 30000
        });
    }

    // Upload file for avatar analysis
    async uploadFile(filePath) {
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            // Create form data
            const form = new FormData();
            const fileStream = fs.createReadStream(filePath);
            form.append('file', fileStream, {
                filename: path.basename(filePath),
                contentType: 'text/plain'
            });

            // Make request
            const response = await this.client.post(this.baseUrl, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP error! status: ${error.response.status}, message: ${error.response.data}`);
            }
            throw error;
        }
    }

    // Check avatar analysis task status
    async checkTaskStatus(taskId, userId) {
        try {
            const url = `${this.baseUrl}/${taskId}?user_id=${userId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP error! status: ${error.response.status}, message: ${error.response.data}`);
            }
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
                    } else {
                        console.log(`📊 Status: ${status}, Success: ${success}, Total: ${total}`);
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

    // Create file from array of phone numbers
    createInputFile(phoneNumbers, filePath = 'input.txt') {
        const content = Array.isArray(phoneNumbers) ? phoneNumbers.join('\n') : phoneNumbers;
        fs.writeFileSync(filePath, content, 'utf8');
        return filePath;
    }

    // Download avatar analysis results
    async downloadResults(resultUrl, outputPath = 'avatar_results.xlsx') {
        try {
            const response = await axios.get(resultUrl, {
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(outputPath));
                writer.on('error', reject);
            });
        } catch (error) {
            throw new Error(`Failed to download results: ${error.message}`);
        }
    }

    // Analyze avatar results and provide demographic insights
    async analyzeAvatarResults(resultsFile) {
        try {
            // Note: In Node.js, you'd typically use a library like xlsx to parse Excel files
            // For this example, we'll show the structure
            console.log('\n🤖 AI AVATAR ANALYSIS SUMMARY');
            console.log('='.repeat(50));
            
            console.log('📊 Processing avatar analysis results...');
            console.log('🖼️  Extracting demographic insights...');
            console.log('👥 Analyzing gender distribution...');
            console.log('🎂 Processing age data...');
            console.log('💇 Examining hair color patterns...');
            console.log('🌍 Reviewing ethnicity analysis...');
            console.log('📷 Categorizing avatar types...');
            
            const analysis = {
                totalRecords: 0,
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
            
            console.log('\n' + '='.repeat(50));
            console.log('💡 Use this data responsibly and in compliance with privacy laws!');
            
            return analysis;
        } catch (error) {
            throw new Error(`Failed to analyze results: ${error.message}`);
        }
    }

    // Export demographics summary to JSON
    exportDemographicsSummary(analysis, outputFile = 'demographics_summary.json') {
        try {
            fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
            console.log(`📄 Demographics summary exported to: ${outputFile}`);
            return outputFile;
        } catch (error) {
            throw new Error(`Failed to export summary: ${error.message}`);
        }
    }
}

// Usage Example
async function main() {
    const apiKey = process.env.WHATSAPP_AVATAR_API_KEY || 'YOUR_API_KEY';
    
    console.log('🚀 WhatsApp Avatar Checker with AI Analysis');
    console.log('⚠️  This tool analyzes profile pictures and demographics');
    console.log('🔒 Please ensure ethical and legal use\n');
    
    const checker = new WhatsAppAvatarChecker(apiKey);

    try {
        // Example phone numbers for avatar analysis
        const phoneNumbers = [
            '+1234567890',  // Example number with potential avatar
            '+9876543210',  // Example number with potential avatar
            '+1122334455'   // Example number with potential avatar
        ];

        // Create input file
        const inputFile = checker.createInputFile(phoneNumbers, 'input.txt');
        console.log(`📁 Created input file: ${inputFile}`);

        // Upload file
        console.log('📤 Uploading file for AI avatar analysis...');
        const uploadResponse = await checker.uploadFile(inputFile);
        console.log(`🆔 Task ID: ${uploadResponse.task_id}`);
        console.log(`📊 Initial Status: ${uploadResponse.status}`);

        // Poll for completion (avatar analysis takes longer due to AI processing)
        console.log('\n🔄 Starting avatar analysis (this may take several minutes)...');
        const finalResponse = await checker.pollTaskStatus(uploadResponse.task_id, uploadResponse.user_id);

        console.log('\n✅ Avatar analysis completed successfully!');

        // Download and analyze results
        if (finalResponse.result_url) {
            console.log('\n📥 Downloading comprehensive avatar analysis results...');
            const resultsFile = await checker.downloadResults(finalResponse.result_url, 'avatar_analysis_results.xlsx');
            console.log(`💾 Results saved to: ${resultsFile}`);

            // Perform demographic analysis
            console.log('\n🤖 Analyzing demographic data...');
            const analysis = await checker.analyzeAvatarResults(resultsFile);

            // Export summary
            const summaryFile = checker.exportDemographicsSummary(analysis);

            console.log(`\n📋 Analysis complete! Files created:`);
            console.log(`   • Avatar results: ${resultsFile}`);
            console.log(`   • Demographics summary: ${summaryFile}`);

            console.log(`\n🎯 INSIGHTS:`);
            console.log(`   • Profile pictures provide rich demographic data`);
            console.log(`   • Use findings to enhance marketing personalization`);
            console.log(`   • Remember to comply with privacy regulations`);
            console.log(`   • Consider demographic diversity in your strategies`);
        }

        // Clean up input file
        if (fs.existsSync(inputFile)) {
            fs.unlinkSync(inputFile);
            console.log('\n🧹 Cleaned up temporary files');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Advanced avatar analysis utilities
class AvatarAnalysisUtils {
    static parseAge(ageStr) {
        try {
            if (ageStr.includes('-')) {
                // Handle age ranges like "25-30"
                return parseInt(ageStr.split('-')[0]);
            }
            return parseInt(ageStr);
        } catch {
            return 999; // Put unparseable ages at the end
        }
    }

    static categorizeGender(genderData) {
        const categories = {
            male: 0,
            female: 0,
            unknown: 0
        };

        Object.keys(genderData).forEach(gender => {
            if (categories.hasOwnProperty(gender)) {
                categories[gender] = genderData[gender];
            }
        });

        return categories;
    }

    static getTopAgeRanges(ageData, limit = 10) {
        return Object.entries(ageData)
            .filter(([age, _]) => age !== 'unknown')
            .sort(([a], [b]) => this.parseAge(a) - this.parseAge(b))
            .slice(0, limit);
    }

    static calculateDemographicInsights(analysis) {
        const insights = [];

        // Gender insights
        if (analysis.demographics.gender) {
            const totalGender = Object.values(analysis.demographics.gender)
                .filter((_, i) => Object.keys(analysis.demographics.gender)[i] !== 'unknown')
                .reduce((sum, count) => sum + count, 0);
            
            if (totalGender > 0) {
                const femaleRatio = (analysis.demographics.gender.female || 0) / totalGender;
                if (femaleRatio > 0.6) {
                    insights.push('👩 Female-dominant audience');
                } else if (femaleRatio < 0.4) {
                    insights.push('👨 Male-dominant audience');
                } else {
                    insights.push('⚖️ Balanced gender distribution');
                }
            }
        }

        // Age insights
        if (analysis.demographics.age) {
            const ages = Object.keys(analysis.demographics.age)
                .filter(age => age !== 'unknown')
                .map(age => this.parseAge(age))
                .filter(age => age < 999);

            if (ages.length > 0) {
                const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
                if (avgAge < 25) {
                    insights.push('🎯 Young audience (< 25)');
                } else if (avgAge > 45) {
                    insights.push('🎯 Mature audience (> 45)');
                } else {
                    insights.push('🎯 Adult audience (25-45)');
                }
            }
        }

        return insights;
    }
}

// Export classes for module use
module.exports = { 
    WhatsAppAvatarChecker,
    AvatarAnalysisUtils
};

// Run if called directly
if (require.main === module) {
    main();
}
