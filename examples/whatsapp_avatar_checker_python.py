#!/usr/bin/env python3

import requests
import time
import os
import json
import pandas as pd
from typing import Dict, List, Union, Optional
from collections import Counter
import warnings

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore')

class WhatsAppAvatarChecker:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.checknumber.ai/wa/api/avatar/tasks'
        self.session = requests.Session()
        self.session.headers.update({'X-API-Key': self.api_key})
        self.session.timeout = 30
    
    def upload_file(self, file_path: str) -> Dict:
        """Upload file for avatar analysis"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            with open(file_path, 'rb') as file:
                files = {'file': (os.path.basename(file_path), file, 'text/plain')}
                response = self.session.post(self.base_url, files=files)
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
        except json.JSONDecodeError as e:
            raise Exception(f"JSON decode error: {e}")
    
    def check_task_status(self, task_id: str, user_id: str) -> Dict:
        """Check avatar analysis task status"""
        url = f"{self.base_url}/{task_id}?user_id={user_id}"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
        except json.JSONDecodeError as e:
            raise Exception(f"JSON decode error: {e}")
    
    def poll_task_status(self, task_id: str, user_id: str, interval: int = 5) -> Dict:
        """Poll avatar analysis task status until completion"""
        print("🤖 Starting AI-powered avatar analysis...")
        
        while True:
            response = self.check_task_status(task_id, user_id)
            status = response['status']
            success = response['success']
            total = response['total']
            
            if status == 'processing':
                print(f"🔄 AI Processing: {success}/{total} avatars analyzed")
            else:
                print(f"📊 Status: {status}, Success: {success}, Total: {total}")
            
            if response['status'] == 'exported':
                print(f"✅ Avatar analysis complete! Results: {response.get('result_url', 'N/A')}")
                return response
            elif response['status'] == 'failed':
                raise Exception('Avatar analysis task failed')
            
            time.sleep(interval)
    
    def create_input_file(self, phone_numbers: Union[List[str], str], file_path: str = 'input.txt') -> str:
        """Create input file from phone numbers"""
        if isinstance(phone_numbers, list):
            content = '\n'.join(phone_numbers)
        else:
            content = phone_numbers
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return file_path
        except IOError as e:
            raise Exception(f"Failed to create file {file_path}: {e}")
    
    def download_results(self, result_url: str, output_path: str = 'avatar_results.xlsx') -> str:
        """Download avatar analysis results"""
        try:
            response = requests.get(result_url, stream=True, timeout=300)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            return output_path
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to download results: {e}")
    
    def analyze_avatar_results(self, results_file: str) -> Dict:
        """Analyze avatar results and provide demographic insights"""
        try:
            df = pd.read_excel(results_file)
        except Exception as e:
            raise Exception(f"Failed to read results file: {e}")
        
        print("\n🤖 AI AVATAR ANALYSIS SUMMARY")
        print("=" * 50)
        
        # Basic statistics
        total_records = len(df)
        whatsapp_accounts = len(df[df.get('whatsapp') == 'yes']) if 'whatsapp' in df.columns else 0
        available_avatars = len(df[df.get('avatar', 'unknown') != 'unknown']) if 'avatar' in df.columns else 0
        
        print(f"📊 Total Records: {total_records:,}")
        print(f"✅ WhatsApp Accounts: {whatsapp_accounts:,} ({whatsapp_accounts/total_records*100:.1f}%)")
        print(f"🖼️ Available Avatars: {available_avatars:,} ({available_avatars/total_records*100:.1f}%)")
        
        analysis = {
            'total_records': total_records,
            'whatsapp_accounts': whatsapp_accounts,
            'available_avatars': available_avatars
        }
        
        # Gender analysis
        if 'gender' in df.columns:
            gender_data = df['gender'].value_counts().to_dict()
            gender_known = len(df[df['gender'] != 'unknown'])
            
            print(f"\n👥 GENDER ANALYSIS ({gender_known:,} profiles)")
            print("-" * 30)
            for gender, count in gender_data.items():
                if gender != 'unknown':
                    percentage = count/gender_known*100 if gender_known > 0 else 0
                    print(f"   {gender.capitalize()}: {count:,} ({percentage:.1f}%)")
            
            analysis['gender'] = gender_data
        
        # Age analysis
        if 'age' in df.columns:
            age_data = df['age'].value_counts().to_dict()
            age_known = len(df[df['age'] != 'unknown'])
            
            print(f"\n🎂 AGE ANALYSIS ({age_known:,} profiles)")
            print("-" * 25)
            age_ranges = {}
            for age_str, count in age_data.items():
                if age_str != 'unknown':
                    age_ranges[age_str] = count
            
            # Sort age ranges for better display
            sorted_ages = sorted(age_ranges.items(), key=lambda x: self._parse_age(x[0]))
            for age_str, count in sorted_ages[:10]:  # Top 10 age ranges
                percentage = count/age_known*100 if age_known > 0 else 0
                print(f"   {age_str}: {count:,} ({percentage:.1f}%)")
            
            analysis['age'] = age_data
        
        # Hair color analysis
        if 'hair_color' in df.columns:
            hair_data = df['hair_color'].value_counts().to_dict()
            hair_known = len(df[df['hair_color'] != 'unknown'])
            
            print(f"\n💇 HAIR COLOR ANALYSIS ({hair_known:,} profiles)")
            print("-" * 35)
            for color, count in list(hair_data.items())[:8]:  # Top 8 colors
                if color != 'unknown':
                    percentage = count/hair_known*100 if hair_known > 0 else 0
                    print(f"   {color.capitalize()}: {count:,} ({percentage:.1f}%)")
            
            analysis['hair_color'] = hair_data
        
        # Ethnicity analysis
        if 'skin_color' in df.columns:
            ethnicity_data = df['skin_color'].value_counts().to_dict()
            ethnicity_known = len(df[df['skin_color'] != 'unknown'])
            
            print(f"\n🌍 ETHNICITY ANALYSIS ({ethnicity_known:,} profiles)")
            print("-" * 35)
            for ethnicity, count in ethnicity_data.items():
                if ethnicity != 'unknown':
                    percentage = count/ethnicity_known*100 if ethnicity_known > 0 else 0
                    print(f"   {ethnicity.capitalize()}: {count:,} ({percentage:.1f}%)")
            
            analysis['ethnicity'] = ethnicity_data
        
        # Avatar category analysis
        if 'category' in df.columns:
            category_data = df['category'].value_counts().to_dict()
            
            print(f"\n📷 AVATAR CATEGORY ANALYSIS")
            print("-" * 35)
            for category, count in category_data.items():
                percentage = count/available_avatars*100 if available_avatars > 0 else 0
                print(f"   {category.replace('_', ' ').title()}: {count:,} ({percentage:.1f}%)")
            
            analysis['categories'] = category_data
        
        print("\n" + "=" * 50)
        print("💡 Use this data responsibly and in compliance with privacy laws!")
        
        return analysis
    
    def _parse_age(self, age_str: str) -> float:
        """Parse age string for sorting"""
        try:
            if '-' in age_str:
                # Handle age ranges like "25-30"
                return float(age_str.split('-')[0])
            return float(age_str)
        except:
            return 999  # Put unparseable ages at the end
    
    def export_demographics_summary(self, analysis: Dict, output_file: str = 'demographics_summary.json'):
        """Export demographic analysis to JSON"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analysis, f, indent=2, ensure_ascii=False)
            print(f"📄 Demographics summary exported to: {output_file}")
            return output_file
        except Exception as e:
            raise Exception(f"Failed to export summary: {e}")
    
    def close(self):
        """Close the session"""
        self.session.close()

def main():
    """Main function demonstrating avatar analysis usage"""
    api_key = os.environ.get('WHATSAPP_AVATAR_API_KEY', 'YOUR_API_KEY')
    
    print("🚀 WhatsApp Avatar Checker with AI Analysis")
    print("⚠️  This tool analyzes profile pictures and demographics")
    print("🔒 Please ensure ethical and legal use\n")
    
    checker = WhatsAppAvatarChecker(api_key)
    
    try:
        # Example phone numbers for avatar analysis
        phone_numbers = [
            '+1234567890',  # Example number with potential avatar
            '+9876543210',  # Example number with potential avatar  
            '+1122334455'   # Example number with potential avatar
        ]
        
        # Create input file
        input_file = checker.create_input_file(phone_numbers, 'input.txt')
        print(f"📁 Created input file: {input_file}")
        
        # Upload file
        print("📤 Uploading file for AI avatar analysis...")
        upload_response = checker.upload_file(input_file)
        print(f"🆔 Task ID: {upload_response['task_id']}")
        print(f"📊 Initial Status: {upload_response['status']}")
        
        # Poll for completion (avatar analysis takes longer due to AI processing)
        print("\n🔄 Starting avatar analysis (this may take several minutes)...")
        final_response = checker.poll_task_status(upload_response['task_id'], upload_response['user_id'])
        
        print("\n✅ Avatar analysis completed successfully!")
        
        # Download and analyze results
        if final_response.get('result_url'):
            print("\n📥 Downloading comprehensive avatar analysis results...")
            results_file = checker.download_results(final_response['result_url'], 'avatar_analysis_results.xlsx')
            print(f"💾 Results saved to: {results_file}")
            
            # Perform demographic analysis
            print("\n🤖 Analyzing demographic data...")
            analysis = checker.analyze_avatar_results(results_file)
            
            # Export summary
            summary_file = checker.export_demographics_summary(analysis)
            
            print(f"\n📋 Analysis complete! Files created:")
            print(f"   • Avatar results: {results_file}")
            print(f"   • Demographics summary: {summary_file}")
            
            print(f"\n🎯 INSIGHTS:")
            print(f"   • Profile pictures provide rich demographic data")
            print(f"   • Use findings to enhance marketing personalization")
            print(f"   • Remember to comply with privacy regulations")
            print(f"   • Consider demographic diversity in your strategies")
        
        # Clean up input file
        if os.path.exists(input_file):
            os.remove(input_file)
            print(f"\n🧹 Cleaned up temporary files")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)
    
    finally:
        checker.close()

if __name__ == '__main__':
    main()
