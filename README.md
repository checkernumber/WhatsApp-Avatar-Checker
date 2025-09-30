# WhatsApp Avatar Checker API with AI Analysis

[![API Status](https://img.shields.io/badge/API-Live-success)](https://api.checknumber.ai/wa/api/avatar/tasks)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple)](#ai-analysis-features)
[![Language Support](https://img.shields.io/badge/Languages-8-blue)](#code-examples)
[![Privacy Focused](https://img.shields.io/badge/Privacy-Focused-orange)](#ethical-guidelines)

Advanced WhatsApp verification API with **AI-powered profile picture analysis**. Combines account verification with demographic insights, visual categorization, and avatar extraction capabilities.

## ⚠️ Important Privacy Notice

This API processes profile pictures and extracts demographic information. **Use responsibly** and ensure compliance with privacy laws and ethical guidelines. See [Ethical Guidelines](#ethical-guidelines) section.

## Table of Contents
- [Features](#features)
- [AI Analysis Features](#ai-analysis-features)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Response Format](#response-format)
- [Result Fields](#result-fields)
- [Code Examples](#code-examples)
- [Requirements](#requirements)
- [Workflow](#workflow)
- [Use Cases](#use-cases)
- [Ethical Guidelines](#ethical-guidelines)
- [Privacy & Compliance](#privacy--compliance)
- [Support](#support)

## Features

### 🔍 **WhatsApp Verification**
✅ Bulk phone number verification  
✅ Account existence detection  
✅ Global phone number support  

### 🤖 **AI-Powered Avatar Analysis**
✅ **Age Estimation** - Detect estimated age ranges from facial features  
✅ **Gender Detection** - Male/female classification from visual cues  
✅ **Hair Color Analysis** - Black, brown, blonde, gray detection  
✅ **Ethnicity Detection** - Skin color analysis and classification  
✅ **Image Categorization** - Portrait, pet, object, group photo types  
✅ **Avatar URL Extraction** - Direct profile picture links  

### 🛠 **Technical Features**
✅ Asynchronous batch processing  
✅ Excel/CSV result export  
✅ Real-time progress tracking  
✅ Enterprise-grade reliability  
✅ Multiple programming language examples  
✅ RESTful API architecture  

## AI Analysis Features

Our advanced AI engine analyzes WhatsApp profile pictures to extract:

| Feature | Description | Example Values |
|---------|-------------|----------------|
| **Age** | Estimated age range from facial features | `25`, `30-35`, `45` |
| **Gender** | Gender classification from visual cues | `male`, `female` |
| **Hair Color** | Dominant hair color detection | `black`, `brown`, `blonde`, `gray` |
| **Skin Color** | Ethnicity/race analysis | `white`, `black`, `asian`, `hispanic` |
| **Category** | Profile picture type classification | `individual portrait`, `pet avatar`, `object`, `group photo` |
| **Avatar URL** | Direct link to profile picture | `https://example.com/avatar.jpg` |

### AI Accuracy Notes
- **Best Results**: Clear, front-facing individual portraits
- **Limited Accuracy**: Group photos, distant shots, or heavily filtered images
- **No Analysis**: Default avatars, logos, or non-human subjects
- **Privacy**: All analysis is automated; no human review

## Getting Started

### Get API Key
1. Contact API provider to obtain your API key
2. Add the API key to your requests via `X-API-Key` header

### Base URL
```
https://api.checknumber.ai/wa/api/avatar/tasks
```

## API Endpoints

### File Upload
Upload a text file containing phone numbers for batch avatar analysis.

**Endpoint**
```
POST https://api.checknumber.ai/wa/api/avatar/tasks
```

**Headers**
```
X-API-Key: YOUR_API_KEY
Content-Type: multipart/form-data
```

**cURL Example**
```bash
curl --location 'https://api.checknumber.ai/wa/api/avatar/tasks' \
     --header 'X-API-Key: YOUR_API_KEY' \
     --form 'file=@"input.txt"'
```

**Input File Example (`input.txt`)**
```
+1234567890
+9876543210
+1122334455
```

### Task Status Check
Check the processing status of your avatar analysis task.

**Endpoint**
```
GET https://api.checknumber.ai/wa/api/avatar/tasks/{task_id}?user_id={user_id}
```

**cURL Example**
```bash
curl --location 'https://api.checknumber.ai/wa/api/avatar/tasks/cs9viu7i61pkfs4oavvg?user_id=USER_ID' \
     --header 'X-API-Key: YOUR_API_KEY'
```

## Response Format

### Upload Success Response
```json
{
  "created_at": "2024-10-19T18:24:56.450567423Z",
  "updated_at": "2024-10-19T18:24:56.450567423Z",
  "task_id": "cs9viu7i61pkfs4oavvg",
  "user_id": "test",
  "status": "pending",
  "total": 0,
  "success": 0,
  "failure": 0
}
```

### Processing Status Response
```json
{
  "created_at": "2024-10-19T18:24:56.450567423Z",
  "updated_at": "2024-10-19T18:33:22.86152082Z",
  "task_id": "cs9viu7i61pkfs4oavvg",
  "user_id": "test",
  "status": "processing",
  "total": 20000,
  "success": 6724,
  "failure": 0
}
```

### Completion Response with Results
```json
{
  "created_at": "2024-10-19T18:24:56.450567423Z",
  "updated_at": "2024-10-19T18:53:43.141760071Z",
  "task_id": "cs9viu7i61pkfs4oavvg",
  "user_id": "test",
  "status": "exported",
  "total": 20000,
  "success": 20000,
  "failure": 0,
  "result_url": "https://example-link-to-results.xlsx"
}
```

## Result Fields

The exported results contain comprehensive avatar analysis data:

| Field | Description | Example |
|-------|-------------|---------|
| **Number** | Phone number in E.164 format | `+41798284651` |
| **whatsapp** | WhatsApp account existence | `yes`, `no` |
| **avatar** | Direct URL to profile picture | `https://pps.whatsapp.net/v/t61.24...` |
| **age** | Estimated age or age range | `25`, `30-35`, `unknown` |
| **gender** | Gender classification | `male`, `female`, `unknown` |
| **hair_color** | Detected hair color | `black`, `brown`, `blonde`, `gray`, `unknown` |
| **skin_color** | Ethnicity/race classification | `white`, `black`, `asian`, `hispanic`, `unknown` |
| **category** | Profile picture type | `individual portrait`, `pet avatar`, `object`, `group photo`, `logo` |

### Analysis Result Interpretations

**WhatsApp Status:**
- `yes` - Active WhatsApp account with accessible profile
- `no` - No WhatsApp account or private profile

**Avatar Analysis:**
- **Available**: When `whatsapp: yes` and profile picture is public
- **Limited**: Private profiles may return basic info only
- **Unknown**: AI cannot determine characteristics (low quality, non-human, etc.)

**Category Types:**
- `individual portrait` - Single person, clear face
- `pet avatar` - Animal or pet pictures
- `object` - Inanimate objects, food, places
- `group photo` - Multiple people
- `logo` - Brand logos or business graphics
- `cartoon/illustration` - Drawings or animated characters

## Code Examples

Complete implementations in 8+ programming languages, all featuring avatar analysis capabilities:

### Python Example
```python
import requests
import time
import pandas as pd

class WhatsAppAvatarChecker:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.checknumber.ai/wa/api/avatar/tasks'
        self.headers = {'X-API-Key': self.api_key}
    
    def upload_file(self, file_path):
        with open(file_path, 'rb') as file:
            files = {'file': file}
            response = requests.post(self.base_url, files=files, headers=self.headers)
            return response.json()
    
    def analyze_avatar_results(self, results_file):
        """Analyze avatar results and provide insights"""
        df = pd.read_excel(results_file)
        
        print("🤖 AI Avatar Analysis Summary:")
        print(f"📊 Total Records: {len(df)}")
        print(f"✅ WhatsApp Accounts: {len(df[df['whatsapp'] == 'yes'])}")
        print(f"🖼️ Available Avatars: {len(df[df['avatar'] != 'unknown'])}")
        
        if 'gender' in df.columns:
            gender_counts = df['gender'].value_counts()
            print(f"👥 Gender Distribution: {dict(gender_counts)}")
        
        if 'category' in df.columns:
            category_counts = df['category'].value_counts()
            print(f"📷 Avatar Categories: {dict(category_counts)}")
        
        return df

# Usage
checker = WhatsAppAvatarChecker('YOUR_API_KEY')
result = checker.upload_file('input.txt')
print(f"Avatar Analysis Task ID: {result['task_id']}")
```

### Available Language Implementations
- **Python** - Full analysis with pandas integration
- **Node.js** - Server-side with avatar processing
- **JavaScript** - Browser with image preview
- **C#** - Enterprise-grade with image handling
- **Go** - High-performance concurrent processing
- **Java** - Robust with image analysis utilities
- **PHP** - Web integration with avatar display
- **Shell** - Command-line with image downloading

📁 **[View all examples →](examples/)**

### Complete File List
- `whatsapp_avatar_checker_python.py` - Python implementation
- `whatsapp_avatar_checker_nodejs.js` - Node.js implementation  
- `whatsapp_avatar_checker_go.go` - Go implementation
- `whatsapp_avatar_checker_java.java` - Java implementation
- `whatsapp_avatar_checker_csharp.cs` - C# implementation
- `whatsapp_avatar_checker_javascript.js` - Browser JavaScript
- `whatsapp_avatar_checker_php.php` - PHP implementation
- `whatsapp_avatar_checker_shell.sh` - Shell script

## Requirements

### Input File Requirements
- **Format**: Plain text file (.txt)
- **Content**: One phone number per line
- **Phone Format**: E.164 format recommended (`+1234567890`)
- **File Size**: Optimized for datasets up to 100K numbers
- **Encoding**: UTF-8

### API Limits
- **Authentication**: API key required
- **Processing Time**: Varies by dataset size (AI analysis takes longer)
- **Image Analysis**: Requires public WhatsApp profiles
- **Rate Limits**: Contact provider for high-volume usage

## Workflow

1. **📤 Upload** - Submit text file with phone numbers
2. **⏳ Queue** - Task enters AI processing queue
3. **🔄 WhatsApp Check** - Verify account existence
4. **🤖 AI Analysis** - Extract avatar and analyze with AI
   - Download profile pictures
   - Run demographic analysis
   - Categorize image types
   - Extract visual features
5. **📊 Monitor** - Track progress with detailed stats
6. **📥 Download** - Get comprehensive Excel results

**Typical Processing Time**: 5-30 minutes (depending on dataset size and AI processing)

## Use Cases

### 👤 **Demographics & Research**
✅ **Market Research** - Understand audience demographics  
✅ **Social Studies** - Analyze profile picture trends  
✅ **Age Verification** - Estimate user age ranges  
✅ **Gender Analysis** - Understand gender distribution  

### 🎯 **Marketing & Advertising**
✅ **Targeted Campaigns** - Demographic-based marketing  
✅ **Creative Optimization** - Match visuals to audience  
✅ **A/B Testing** - Test content with specific demographics  
✅ **Persona Development** - Build detailed user personas  

### 🔍 **Verification & Security**
✅ **Identity Verification** - Cross-reference profile information  
✅ **Fraud Detection** - Identify suspicious or fake profiles  
✅ **KYC Enhancement** - Add visual verification layers  
✅ **Account Authentication** - Verify profile consistency  

### 💼 **Business Intelligence**
✅ **Customer Insights** - Understand your user base  
✅ **Competitive Analysis** - Analyze competitor audiences  
✅ **Lead Qualification** - Enrich contact information  
✅ **CRM Enhancement** - Add demographic data to contacts  

## Ethical Guidelines

### ⚠️ **Responsible Use Requirements**

**✅ ACCEPTABLE USES:**
- Market research with aggregated, anonymized data
- Academic research with IRB approval
- Business intelligence for owned customer data
- Fraud prevention and security verification
- Marketing personalization with user consent
- Demographic analysis for service optimization

**❌ PROHIBITED USES:**
- Individual profiling for discrimination
- Harassment, stalking, or privacy invasion
- Unauthorized demographic profiling
- Creating databases for discriminatory purposes
- Age/gender discrimination in services
- Ethnic or racial profiling
- Personal information compilation without consent

### 🛡️ **Privacy Protection**
- **Data Minimization**: Only collect necessary information
- **Purpose Limitation**: Use data only for stated purposes  
- **Retention Limits**: Don't store data longer than needed
- **Access Control**: Restrict access to authorized personnel only
- **Anonymization**: Remove identifying information when possible
- **User Rights**: Honor deletion and access requests

### ⚖️ **Legal Compliance**
- **GDPR**: EU data protection requirements
- **CCPA**: California Consumer Privacy Act compliance
- **Local Laws**: Adhere to jurisdiction-specific regulations
- **Terms of Service**: Follow WhatsApp and platform terms
- **Industry Standards**: Meet sector-specific requirements

## Privacy & Compliance

### 🔒 **Data Handling**
- All processing is automated with AI
- No human review of individual profiles
- Temporary processing; images not permanently stored
- Results contain analyzed data only, not raw images
- API provider implements standard security measures

### 📋 **Compliance Checklist**
- [ ] Obtain necessary consent for demographic analysis
- [ ] Document legitimate business interest
- [ ] Implement data retention policies  
- [ ] Provide privacy notices to users
- [ ] Enable user opt-out mechanisms
- [ ] Regular compliance audits
- [ ] Staff training on ethical use

### 🌍 **International Considerations**
- **EU/GDPR**: Explicit consent required for biometric processing
- **California/CCPA**: Right to know and delete personal information
- **Other Regions**: Check local biometric and privacy laws

## Status Codes

| Status | Description |
|--------|-------------|
| 200 | Request successful, task created or status retrieved |
| 400 | Bad request, invalid parameters or file format |
| 500 | Internal server error, retry later |

## Pricing

Contact the API provider for current pricing information.

- **Higher Cost**: Due to AI processing requirements
- **Volume Discounts**: Available for large datasets
- **Research Rates**: Special pricing for academic use

## Support

For technical support, compliance questions, or enterprise inquiries:

📧 **Technical Support**: API Provider Support  
🔒 **Privacy Officer**: For compliance and privacy questions  
🎓 **Research Licensing**: Academic and research partnerships  
🚀 **Enterprise Sales**: Custom solutions and high-volume pricing  

### Common Issues
- **No Avatar Data**: User has private profile or default avatar
- **Low Accuracy**: Poor image quality or group photos
- **Processing Delays**: AI analysis requires additional time
- **Compliance Questions**: Contact privacy officer

## Disclaimer & Legal

### ⚖️ **Important Disclaimers**
- **AI Accuracy**: Demographic analysis is estimated, not definitive
- **Privacy Responsibility**: Users must ensure lawful, ethical use
- **No Affiliation**: Not affiliated with or endorsed by Meta/WhatsApp
- **Service Reliability**: Provided "as is" without guarantees
- **Legal Compliance**: Users responsible for regulatory compliance

### 🤝 **Terms of Use**
- Use only for legitimate, legal purposes
- Comply with all applicable laws and regulations
- Respect individual privacy and consent requirements
- No discrimination based on analyzed characteristics
- Report misuse or ethical concerns promptly

---

**Last Updated**: October 2024  
**Version**: 2.0.0 (AI-Powered)  
**API Status**: ✅ Active with AI Analysis  
**Privacy**: 🔒 Enhanced Protection Required
