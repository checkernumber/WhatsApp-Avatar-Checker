import java.io.*;
import java.net.http.*;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import com.google.gson.*;
import com.google.gson.annotations.SerializedName;

public class WhatsAppAvatarChecker {
    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final Gson gson;

    public WhatsAppAvatarChecker(String apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.checknumber.ai/wa/api/avatar/tasks";
        this.httpClient = HttpClient.newBuilder()
            .timeout(Duration.ofSeconds(30))
            .build();
        this.gson = new Gson();
    }

    public CompletableFuture<AvatarResponse> uploadFile(String filePath) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                throw new FileNotFoundException("File not found: " + filePath);
            }

            String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
            String multipartBody = createMultipartBody(file, boundary);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl))
                .header("X-API-Key", apiKey)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofString(multipartBody))
                .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() != 200) {
                        throw new RuntimeException("HTTP error: " + response.statusCode());
                    }
                    return gson.fromJson(response.body(), AvatarResponse.class);
                });

        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }

    private String createMultipartBody(File file, String boundary) throws IOException {
        StringBuilder builder = new StringBuilder();
        builder.append("--").append(boundary).append("\r\n");
        builder.append("Content-Disposition: form-data; name=\"file\"; filename=\"")
               .append(file.getName()).append("\"\r\n");
        builder.append("Content-Type: text/plain\r\n\r\n");
        
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append("\n");
            }
        }
        
        builder.append("\r\n--").append(boundary).append("--\r\n");
        return builder.toString();
    }

    public CompletableFuture<AvatarResponse> checkTaskStatus(String taskId, String userId) {
        String url = baseUrl + "/" + taskId + "?user_id=" + userId;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("X-API-Key", apiKey)
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("HTTP error: " + response.statusCode());
                }
                return gson.fromJson(response.body(), AvatarResponse.class);
            });
    }

    public CompletableFuture<AvatarResponse> pollTaskStatus(String taskId, String userId, int intervalSeconds) {
        System.out.println("🤖 Starting AI-powered avatar analysis...");
        
        return CompletableFuture.supplyAsync(() -> {
            while (true) {
                try {
                    AvatarResponse response = checkTaskStatus(taskId, userId).get();
                    
                    if ("processing".equals(response.status)) {
                        System.out.printf("🔄 AI Processing: %d/%d avatars analyzed%n", response.success, response.total);
                    } else {
                        System.out.printf("📊 Status: %s, Success: %d, Total: %d%n", 
                                        response.status, response.success, response.total);
                    }

                    switch (response.status) {
                        case "exported":
                            System.out.println("✅ Avatar analysis complete! Results: " + 
                                             (response.resultUrl != null ? response.resultUrl : "N/A"));
                            return response;
                        case "failed":
                            throw new RuntimeException("Avatar analysis task failed");
                        default:
                            Thread.sleep(intervalSeconds * 1000);
                            break;
                    }
                } catch (Exception e) {
                    throw new RuntimeException("Polling failed", e);
                }
            }
        });
    }

    public void createInputFile(String[] phoneNumbers, String filePath) throws IOException {
        try (PrintWriter writer = new PrintWriter(new FileWriter(filePath))) {
            for (String number : phoneNumbers) {
                writer.println(number);
            }
        }
    }

    public CompletableFuture<String> downloadResults(String resultUrl, String outputPath) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(resultUrl))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("HTTP error: " + response.statusCode());
                }
                
                try (InputStream inputStream = response.body();
                     FileOutputStream outputStream = new FileOutputStream(outputPath)) {
                    
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    
                    return outputPath;
                } catch (IOException e) {
                    throw new RuntimeException("Failed to download results", e);
                }
            });
    }

    public AvatarAnalysis analyzeAvatarResults(List<AvatarResult> results) {
        System.out.println("\n🤖 AI AVATAR ANALYSIS SUMMARY");
        System.out.println("=".repeat(50));

        AvatarAnalysis analysis = new AvatarAnalysis();
        analysis.totalRecords = results.size();
        
        // Count WhatsApp accounts and available avatars
        for (AvatarResult result : results) {
            if ("yes".equals(result.whatsapp)) {
                analysis.whatsappAccounts++;
                if (result.avatar != null && !"unknown".equals(result.avatar)) {
                    analysis.availableAvatars++;
                }

                // Count demographics for WhatsApp accounts only
                if (result.gender != null && !"unknown".equals(result.gender)) {
                    analysis.genderDistribution.merge(result.gender, 1, Integer::sum);
                }
                if (result.age != null && !"unknown".equals(result.age)) {
                    analysis.ageDistribution.merge(result.age, 1, Integer::sum);
                }
                if (result.hairColor != null && !"unknown".equals(result.hairColor)) {
                    analysis.hairColorDistribution.merge(result.hairColor, 1, Integer::sum);
                }
                if (result.skinColor != null && !"unknown".equals(result.skinColor)) {
                    analysis.ethnicityDistribution.merge(result.skinColor, 1, Integer::sum);
                }
                if (result.category != null && !"unknown".equals(result.category)) {
                    analysis.categoryDistribution.merge(result.category, 1, Integer::sum);
                }
            }
        }

        // Print basic statistics
        System.out.printf("📊 Total Records: %,d%n", analysis.totalRecords);
        double whatsappPercentage = (double) analysis.whatsappAccounts / analysis.totalRecords * 100;
        System.out.printf("✅ WhatsApp Accounts: %,d (%.1f%%)%n", analysis.whatsappAccounts, whatsappPercentage);
        double avatarPercentage = (double) analysis.availableAvatars / analysis.totalRecords * 100;
        System.out.printf("🖼️ Available Avatars: %,d (%.1f%%)%n", analysis.availableAvatars, avatarPercentage);

        // Gender analysis
        if (!analysis.genderDistribution.isEmpty()) {
            int totalGender = analysis.genderDistribution.values().stream().mapToInt(Integer::intValue).sum();
            System.out.printf("%n👥 GENDER ANALYSIS (%,d profiles)%n", totalGender);
            System.out.println("-".repeat(30));
            
            analysis.genderDistribution.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(entry -> {
                    double percentage = (double) entry.getValue() / totalGender * 100;
                    String gender = entry.getKey().substring(0, 1).toUpperCase() + entry.getKey().substring(1);
                    System.out.printf("   %s: %,d (%.1f%%)%n", gender, entry.getValue(), percentage);
                });
        }

        // Age analysis
        if (!analysis.ageDistribution.isEmpty()) {
            int totalAge = analysis.ageDistribution.values().stream().mapToInt(Integer::intValue).sum();
            System.out.printf("%n🎂 AGE ANALYSIS (%,d profiles)%n", totalAge);
            System.out.println("-".repeat(25));
            
            analysis.ageDistribution.entrySet().stream()
                .sorted((e1, e2) -> Float.compare(parseAge(e1.getKey()), parseAge(e2.getKey())))
                .limit(10) // Top 10 age ranges
                .forEach(entry -> {
                    double percentage = (double) entry.getValue() / totalAge * 100;
                    System.out.printf("   %s: %,d (%.1f%%)%n", entry.getKey(), entry.getValue(), percentage);
                });
        }

        // Hair color analysis
        if (!analysis.hairColorDistribution.isEmpty()) {
            int totalHair = analysis.hairColorDistribution.values().stream().mapToInt(Integer::intValue).sum();
            System.out.printf("%n💇 HAIR COLOR ANALYSIS (%,d profiles)%n", totalHair);
            System.out.println("-".repeat(35));
            
            analysis.hairColorDistribution.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8) // Top 8 colors
                .forEach(entry -> {
                    double percentage = (double) entry.getValue() / totalHair * 100;
                    String color = entry.getKey().substring(0, 1).toUpperCase() + entry.getKey().substring(1);
                    System.out.printf("   %s: %,d (%.1f%%)%n", color, entry.getValue(), percentage);
                });
        }

        // Ethnicity analysis
        if (!analysis.ethnicityDistribution.isEmpty()) {
            int totalEthnicity = analysis.ethnicityDistribution.values().stream().mapToInt(Integer::intValue).sum();
            System.out.printf("%n🌍 ETHNICITY ANALYSIS (%,d profiles)%n", totalEthnicity);
            System.out.println("-".repeat(35));
            
            analysis.ethnicityDistribution.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(entry -> {
                    double percentage = (double) entry.getValue() / totalEthnicity * 100;
                    String ethnicity = entry.getKey().substring(0, 1).toUpperCase() + entry.getKey().substring(1);
                    System.out.printf("   %s: %,d (%.1f%%)%n", ethnicity, entry.getValue(), percentage);
                });
        }

        // Category analysis
        if (!analysis.categoryDistribution.isEmpty()) {
            System.out.println("\n📷 AVATAR CATEGORY ANALYSIS");
            System.out.println("-".repeat(35));
            
            analysis.categoryDistribution.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(entry -> {
                    double percentage = (double) entry.getValue() / analysis.availableAvatars * 100;
                    String displayName = Arrays.stream(entry.getKey().split("_"))
                        .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1))
                        .collect(Collectors.joining(" "));
                    System.out.printf("   %s: %,d (%.1f%%)%n", displayName, entry.getValue(), percentage);
                });
        }

        System.out.println("\n" + "=".repeat(50));
        System.out.println("💡 Use this data responsibly and in compliance with privacy laws!");

        return analysis;
    }

    private static float parseAge(String ageStr) {
        try {
            if (ageStr.contains("-")) {
                // Handle age ranges like "25-30"
                return Float.parseFloat(ageStr.split("-")[0]);
            }
            return Float.parseFloat(ageStr);
        } catch (NumberFormatException e) {
            return 999; // Put unparseable ages at the end
        }
    }

    public void exportDemographicsSummary(AvatarAnalysis analysis, String outputFile) throws IOException {
        String json = gson.toJson(analysis);
        try (FileWriter writer = new FileWriter(outputFile)) {
            writer.write(json);
        }
        System.out.println("📄 Demographics summary exported to: " + outputFile);
    }

    // Data classes
    public static class AvatarResponse {
        @SerializedName("created_at")
        public String createdAt;
        
        @SerializedName("updated_at")
        public String updatedAt;
        
        @SerializedName("task_id")
        public String taskId;
        
        @SerializedName("user_id")
        public String userId;
        
        public String status;
        public int total;
        public int success;
        public int failure;
        
        @SerializedName("result_url")
        public String resultUrl;
    }

    public static class AvatarResult {
        public String number;
        public String whatsapp;
        public String avatar;
        public String age;
        public String gender;
        
        @SerializedName("hair_color")
        public String hairColor;
        
        @SerializedName("skin_color")
        public String skinColor;
        
        public String category;
    }

    public static class AvatarAnalysis {
        public int totalRecords = 0;
        public int whatsappAccounts = 0;
        public int availableAvatars = 0;
        public Map<String, Integer> genderDistribution = new HashMap<>();
        public Map<String, Integer> ageDistribution = new HashMap<>();
        public Map<String, Integer> hairColorDistribution = new HashMap<>();
        public Map<String, Integer> ethnicityDistribution = new HashMap<>();
        public Map<String, Integer> categoryDistribution = new HashMap<>();
    }

    public static void main(String[] args) {
        String apiKey = System.getenv("WHATSAPP_AVATAR_API_KEY");
        if (apiKey == null) {
            apiKey = "YOUR_API_KEY";
        }

        System.out.println("🚀 WhatsApp Avatar Checker with AI Analysis");
        System.out.println("⚠️  This tool analyzes profile pictures and demographics");
        System.out.println("🔒 Please ensure ethical and legal use\n");

        WhatsAppAvatarChecker checker = new WhatsAppAvatarChecker(apiKey);

        try {
            // Example phone numbers for avatar analysis
            String[] phoneNumbers = {
                "+1234567890",  // Example number with potential avatar
                "+9876543210",  // Example number with potential avatar
                "+1122334455"   // Example number with potential avatar
            };

            // Create input file
            String inputFile = "input.txt";
            checker.createInputFile(phoneNumbers, inputFile);
            System.out.println("📁 Created input file: " + inputFile);

            // Upload file
            System.out.println("📤 Uploading file for AI avatar analysis...");
            AvatarResponse uploadResponse = checker.uploadFile(inputFile).get();
            System.out.println("🆔 Task ID: " + uploadResponse.taskId);
            System.out.println("📊 Initial Status: " + uploadResponse.status);

            // Poll for completion (avatar analysis takes longer due to AI processing)
            System.out.println("\n🔄 Starting avatar analysis (this may take several minutes)...");
            AvatarResponse finalResponse = checker.pollTaskStatus(
                uploadResponse.taskId, uploadResponse.userId, 5).get();

            System.out.println("\n✅ Avatar analysis completed successfully!");

            // Download and analyze results
            if (finalResponse.resultUrl != null && !finalResponse.resultUrl.isEmpty()) {
                System.out.println("\n📥 Downloading comprehensive avatar analysis results...");
                String resultsFile = checker.downloadResults(
                    finalResponse.resultUrl, "avatar_analysis_results.xlsx").get();
                System.out.println("💾 Results saved to: " + resultsFile);

                // Note: In a real implementation, you'd parse the Excel file
                // For demo purposes, we'll create sample data
                List<AvatarResult> sampleResults = Arrays.asList(
                    createAvatarResult("+1234567890", "yes", "male", "25", "individual portrait"),
                    createAvatarResult("+9876543210", "yes", "female", "30", "individual portrait"),
                    createAvatarResult("+1122334455", "no", null, null, null)
                );

                // Perform demographic analysis
                System.out.println("\n🤖 Analyzing demographic data...");
                AvatarAnalysis analysis = checker.analyzeAvatarResults(sampleResults);

                // Export summary
                checker.exportDemographicsSummary(analysis, "demographics_summary.json");

                System.out.println("\n📋 Analysis complete! Files created:");
                System.out.println("   • Avatar results: " + resultsFile);
                System.out.println("   • Demographics summary: demographics_summary.json");

                System.out.println("\n🎯 INSIGHTS:");
                System.out.println("   • Profile pictures provide rich demographic data");
                System.out.println("   • Use findings to enhance marketing personalization");
                System.out.println("   • Remember to comply with privacy regulations");
                System.out.println("   • Consider demographic diversity in your strategies");
            }

            // Clean up input file
            File file = new File(inputFile);
            if (file.delete()) {
                System.out.println("\n🧹 Cleaned up temporary files");
            }

        } catch (Exception e) {
            System.err.println("\n❌ Error: " + e.getMessage());
            System.exit(1);
        }
    }

    private static AvatarResult createAvatarResult(String number, String whatsapp, String gender, String age, String category) {
        AvatarResult result = new AvatarResult();
        result.number = number;
        result.whatsapp = whatsapp;
        result.gender = gender;
        result.age = age;
        result.category = category;
        return result;
    }
}
