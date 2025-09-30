using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;

public class WhatsAppAvatarChecker
{
    private readonly string apiKey;
    private readonly string baseUrl;
    private readonly HttpClient httpClient;

    public WhatsAppAvatarChecker(string apiKey)
    {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.checknumber.ai/wa/api/avatar/tasks";
        this.httpClient = new HttpClient();
        this.httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        this.httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<AvatarResponse> UploadFileAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        using var form = new MultipartFormDataContent();
        using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        using var streamContent = new StreamContent(fileStream);
        
        streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
        form.Add(streamContent, "file", Path.GetFileName(filePath));

        try
        {
            var response = await httpClient.PostAsync(baseUrl, form);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AvatarResponse>(json);
        }
        catch (HttpRequestException ex)
        {
            throw new Exception($"Request failed: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new Exception($"JSON parsing error: {ex.Message}");
        }
    }

    public async Task<AvatarResponse> CheckTaskStatusAsync(string taskId, string userId)
    {
        var url = $"{baseUrl}/{taskId}?user_id={userId}";
        
        try
        {
            var response = await httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AvatarResponse>(json);
        }
        catch (HttpRequestException ex)
        {
            throw new Exception($"Request failed: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new Exception($"JSON parsing error: {ex.Message}");
        }
    }

    public async Task<AvatarResponse> PollTaskStatusAsync(string taskId, string userId, int intervalSeconds = 5)
    {
        Console.WriteLine("🤖 Starting AI-powered avatar analysis...");
        
        while (true)
        {
            var response = await CheckTaskStatusAsync(taskId, userId);
            
            if (response.Status == "processing")
            {
                Console.WriteLine($"🔄 AI Processing: {response.Success}/{response.Total} avatars analyzed");
            }
            else
            {
                Console.WriteLine($"📊 Status: {response.Status}, Success: {response.Success}, Total: {response.Total}");
            }

            switch (response.Status)
            {
                case "exported":
                    Console.WriteLine($"✅ Avatar analysis complete! Results: {response.ResultUrl ?? "N/A"}");
                    return response;
                case "failed":
                    throw new Exception("Avatar analysis task failed");
                default:
                    await Task.Delay(intervalSeconds * 1000);
                    break;
            }
        }
    }

    public string CreateInputFile(string[] phoneNumbers, string filePath = "input.txt")
    {
        try
        {
            File.WriteAllText(filePath, string.Join("\n", phoneNumbers));
            return filePath;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to create file {filePath}: {ex.Message}");
        }
    }

    public async Task<string> DownloadResultsAsync(string resultUrl, string outputPath = "avatar_results.xlsx")
    {
        try
        {
            var response = await httpClient.GetAsync(resultUrl);
            response.EnsureSuccessStatusCode();

            await using var fileStream = new FileStream(outputPath, FileMode.Create);
            await response.Content.CopyToAsync(fileStream);

            return outputPath;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to download results: {ex.Message}");
        }
    }

    public AvatarAnalysis AnalyzeAvatarResults(List<AvatarResult> results)
    {
        Console.WriteLine("\n🤖 AI AVATAR ANALYSIS SUMMARY");
        Console.WriteLine(new string('=', 50));

        var analysis = new AvatarAnalysis
        {
            TotalRecords = results.Count,
            WhatsAppAccounts = results.Count(r => r.WhatsApp == "yes"),
            AvailableAvatars = results.Count(r => r.Avatar != null && r.Avatar != "unknown"),
            GenderDistribution = new Dictionary<string, int>(),
            AgeDistribution = new Dictionary<string, int>(),
            HairColorDistribution = new Dictionary<string, int>(),
            EthnicityDistribution = new Dictionary<string, int>(),
            CategoryDistribution = new Dictionary<string, int>()
        };

        Console.WriteLine($"📊 Total Records: {analysis.TotalRecords:N0}");
        Console.WriteLine($"✅ WhatsApp Accounts: {analysis.WhatsAppAccounts:N0} ({(double)analysis.WhatsAppAccounts / analysis.TotalRecords * 100:F1}%)");
        Console.WriteLine($"🖼️ Available Avatars: {analysis.AvailableAvatars:N0} ({(double)analysis.AvailableAvatars / analysis.TotalRecords * 100:F1}%)");

        // Analyze demographics for WhatsApp accounts only
        var whatsappResults = results.Where(r => r.WhatsApp == "yes").ToList();

        // Gender analysis
        analysis.GenderDistribution = whatsappResults
            .Where(r => !string.IsNullOrEmpty(r.Gender) && r.Gender != "unknown")
            .GroupBy(r => r.Gender)
            .ToDictionary(g => g.Key, g => g.Count());

        if (analysis.GenderDistribution.Any())
        {
            var totalGender = analysis.GenderDistribution.Values.Sum();
            Console.WriteLine($"\n👥 GENDER ANALYSIS ({totalGender:N0} profiles)");
            Console.WriteLine(new string('-', 30));
            
            foreach (var kvp in analysis.GenderDistribution.OrderByDescending(x => x.Value))
            {
                var percentage = (double)kvp.Value / totalGender * 100;
                Console.WriteLine($"   {kvp.Key.Substring(0, 1).ToUpper() + kvp.Key.Substring(1)}: {kvp.Value:N0} ({percentage:F1}%)");
            }
        }

        // Age analysis
        analysis.AgeDistribution = whatsappResults
            .Where(r => !string.IsNullOrEmpty(r.Age) && r.Age != "unknown")
            .GroupBy(r => r.Age)
            .ToDictionary(g => g.Key, g => g.Count());

        if (analysis.AgeDistribution.Any())
        {
            var totalAge = analysis.AgeDistribution.Values.Sum();
            Console.WriteLine($"\n🎂 AGE ANALYSIS ({totalAge:N0} profiles)");
            Console.WriteLine(new string('-', 25));
            
            var sortedAges = analysis.AgeDistribution
                .OrderBy(x => ParseAge(x.Key))
                .Take(10); // Top 10 age ranges
            
            foreach (var kvp in sortedAges)
            {
                var percentage = (double)kvp.Value / totalAge * 100;
                Console.WriteLine($"   {kvp.Key}: {kvp.Value:N0} ({percentage:F1}%)");
            }
        }

        // Hair color analysis
        analysis.HairColorDistribution = whatsappResults
            .Where(r => !string.IsNullOrEmpty(r.HairColor) && r.HairColor != "unknown")
            .GroupBy(r => r.HairColor)
            .ToDictionary(g => g.Key, g => g.Count());

        if (analysis.HairColorDistribution.Any())
        {
            var totalHair = analysis.HairColorDistribution.Values.Sum();
            Console.WriteLine($"\n💇 HAIR COLOR ANALYSIS ({totalHair:N0} profiles)");
            Console.WriteLine(new string('-', 35));
            
            foreach (var kvp in analysis.HairColorDistribution.OrderByDescending(x => x.Value).Take(8))
            {
                var percentage = (double)kvp.Value / totalHair * 100;
                Console.WriteLine($"   {kvp.Key.Substring(0, 1).ToUpper() + kvp.Key.Substring(1)}: {kvp.Value:N0} ({percentage:F1}%)");
            }
        }

        // Ethnicity analysis
        analysis.EthnicityDistribution = whatsappResults
            .Where(r => !string.IsNullOrEmpty(r.SkinColor) && r.SkinColor != "unknown")
            .GroupBy(r => r.SkinColor)
            .ToDictionary(g => g.Key, g => g.Count());

        if (analysis.EthnicityDistribution.Any())
        {
            var totalEthnicity = analysis.EthnicityDistribution.Values.Sum();
            Console.WriteLine($"\n🌍 ETHNICITY ANALYSIS ({totalEthnicity:N0} profiles)");
            Console.WriteLine(new string('-', 35));
            
            foreach (var kvp in analysis.EthnicityDistribution.OrderByDescending(x => x.Value))
            {
                var percentage = (double)kvp.Value / totalEthnicity * 100;
                Console.WriteLine($"   {kvp.Key.Substring(0, 1).ToUpper() + kvp.Key.Substring(1)}: {kvp.Value:N0} ({percentage:F1}%)");
            }
        }

        // Category analysis
        analysis.CategoryDistribution = whatsappResults
            .Where(r => !string.IsNullOrEmpty(r.Category) && r.Category != "unknown")
            .GroupBy(r => r.Category)
            .ToDictionary(g => g.Key, g => g.Count());

        if (analysis.CategoryDistribution.Any())
        {
            Console.WriteLine($"\n📷 AVATAR CATEGORY ANALYSIS");
            Console.WriteLine(new string('-', 35));
            
            foreach (var kvp in analysis.CategoryDistribution.OrderByDescending(x => x.Value))
            {
                var percentage = (double)kvp.Value / analysis.AvailableAvatars * 100;
                var displayName = kvp.Key.Replace("_", " ");
                displayName = char.ToUpper(displayName[0]) + displayName.Substring(1);
                Console.WriteLine($"   {displayName}: {kvp.Value:N0} ({percentage:F1}%)");
            }
        }

        Console.WriteLine("\n" + new string('=', 50));
        Console.WriteLine("💡 Use this data responsibly and in compliance with privacy laws!");

        return analysis;
    }

    private static float ParseAge(string ageStr)
    {
        try
        {
            if (ageStr.Contains("-"))
            {
                // Handle age ranges like "25-30"
                return float.Parse(ageStr.Split('-')[0]);
            }
            return float.Parse(ageStr);
        }
        catch
        {
            return 999; // Put unparseable ages at the end
        }
    }

    public void ExportDemographicsSummary(AvatarAnalysis analysis, string outputFile = "demographics_summary.json")
    {
        try
        {
            var json = JsonSerializer.Serialize(analysis, new JsonSerializerOptions 
            { 
                WriteIndented = true 
            });
            File.WriteAllText(outputFile, json);
            Console.WriteLine($"📄 Demographics summary exported to: {outputFile}");
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to export summary: {ex.Message}");
        }
    }

    public void Dispose()
    {
        httpClient?.Dispose();
    }
}

// Data classes
public class AvatarResponse
{
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string TaskId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Success { get; set; }
    public int Failure { get; set; }
    public string? ResultUrl { get; set; }
}

public class AvatarResult
{
    public string Number { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string? Age { get; set; }
    public string? Gender { get; set; }
    public string? HairColor { get; set; }
    public string? SkinColor { get; set; }
    public string? Category { get; set; }
}

public class AvatarAnalysis
{
    public int TotalRecords { get; set; }
    public int WhatsAppAccounts { get; set; }
    public int AvailableAvatars { get; set; }
    public Dictionary<string, int> GenderDistribution { get; set; } = new();
    public Dictionary<string, int> AgeDistribution { get; set; } = new();
    public Dictionary<string, int> HairColorDistribution { get; set; } = new();
    public Dictionary<string, int> EthnicityDistribution { get; set; } = new();
    public Dictionary<string, int> CategoryDistribution { get; set; } = new();
}

class Program
{
    static async Task Main(string[] args)
    {
        var apiKey = Environment.GetEnvironmentVariable("WHATSAPP_AVATAR_API_KEY") ?? "YOUR_API_KEY";
        
        Console.WriteLine("🚀 WhatsApp Avatar Checker with AI Analysis");
        Console.WriteLine("⚠️  This tool analyzes profile pictures and demographics");
        Console.WriteLine("🔒 Please ensure ethical and legal use\n");
        
        var checker = new WhatsAppAvatarChecker(apiKey);

        try
        {
            // Example phone numbers for avatar analysis
            var phoneNumbers = new[]
            {
                "+1234567890",  // Example number with potential avatar
                "+9876543210",  // Example number with potential avatar
                "+1122334455"   // Example number with potential avatar
            };

            // Create input file
            var inputFile = checker.CreateInputFile(phoneNumbers, "input.txt");
            Console.WriteLine($"📁 Created input file: {inputFile}");

            // Upload file
            Console.WriteLine("📤 Uploading file for AI avatar analysis...");
            var uploadResponse = await checker.UploadFileAsync(inputFile);
            Console.WriteLine($"🆔 Task ID: {uploadResponse.TaskId}");
            Console.WriteLine($"📊 Initial Status: {uploadResponse.Status}");

            // Poll for completion (avatar analysis takes longer due to AI processing)
            Console.WriteLine("\n🔄 Starting avatar analysis (this may take several minutes)...");
            var finalResponse = await checker.PollTaskStatusAsync(uploadResponse.TaskId, uploadResponse.UserId);

            Console.WriteLine("\n✅ Avatar analysis completed successfully!");

            // Download and analyze results (simplified for example)
            if (!string.IsNullOrEmpty(finalResponse.ResultUrl))
            {
                Console.WriteLine("\n📥 Downloading comprehensive avatar analysis results...");
                var resultsFile = await checker.DownloadResultsAsync(finalResponse.ResultUrl, "avatar_analysis_results.xlsx");
                Console.WriteLine($"💾 Results saved to: {resultsFile}");

                // Note: In a real implementation, you'd parse the Excel file
                // For demo purposes, we'll create sample data
                var sampleResults = new List<AvatarResult>
                {
                    new AvatarResult { Number = "+1234567890", WhatsApp = "yes", Gender = "male", Age = "25", Category = "individual portrait" },
                    new AvatarResult { Number = "+9876543210", WhatsApp = "yes", Gender = "female", Age = "30", Category = "individual portrait" },
                    new AvatarResult { Number = "+1122334455", WhatsApp = "no" }
                };

                // Perform demographic analysis
                Console.WriteLine("\n🤖 Analyzing demographic data...");
                var analysis = checker.AnalyzeAvatarResults(sampleResults);

                // Export summary
                checker.ExportDemographicsSummary(analysis);

                Console.WriteLine($"\n📋 Analysis complete! Files created:");
                Console.WriteLine($"   • Avatar results: {resultsFile}");
                Console.WriteLine($"   • Demographics summary: demographics_summary.json");

                Console.WriteLine($"\n🎯 INSIGHTS:");
                Console.WriteLine($"   • Profile pictures provide rich demographic data");
                Console.WriteLine($"   • Use findings to enhance marketing personalization");
                Console.WriteLine($"   • Remember to comply with privacy regulations");
                Console.WriteLine($"   • Consider demographic diversity in your strategies");
            }

            // Clean up input file
            if (File.Exists(inputFile))
            {
                File.Delete(inputFile);
                Console.WriteLine("\n🧹 Cleaned up temporary files");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ Error: {ex.Message}");
            Environment.Exit(1);
        }
        finally
        {
            checker.Dispose();
        }
    }
}
