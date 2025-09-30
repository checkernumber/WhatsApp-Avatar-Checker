<?php

class WhatsAppAvatarChecker
{
    private string $apiKey;
    private string $baseUrl;
    private array $curlOptions;

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = 'https://api.checknumber.ai/wa/api/avatar/tasks';
        $this->curlOptions = [
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => [
                'X-API-Key: ' . $this->apiKey
            ]
        ];
    }

    public function uploadFile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new InvalidArgumentException("File not found: $filePath");
        }

        $curl = curl_init();
        
        $postFields = [
            'file' => new CURLFile($filePath, 'text/plain', basename($filePath))
        ];

        $options = $this->curlOptions + [
            CURLOPT_URL => $this->baseUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields
        ];

        curl_setopt_array($curl, $options);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);

        curl_close($curl);

        if ($error) {
            throw new RuntimeException("cURL error: $error");
        }

        if ($httpCode !== 200) {
            throw new RuntimeException("HTTP error: $httpCode");
        }

        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException("JSON decode error: " . json_last_error_msg());
        }

        return $decoded;
    }

    public function checkTaskStatus(string $taskId, string $userId): array
    {
        $url = $this->baseUrl . "/$taskId?user_id=$userId";
        
        $curl = curl_init();

        $options = $this->curlOptions + [
            CURLOPT_URL => $url,
            CURLOPT_HTTPGET => true
        ];

        curl_setopt_array($curl, $options);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);

        curl_close($curl);

        if ($error) {
            throw new RuntimeException("cURL error: $error");
        }

        if ($httpCode !== 200) {
            throw new RuntimeException("HTTP error: $httpCode");
        }

        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException("JSON decode error: " . json_last_error_msg());
        }

        return $decoded;
    }

    public function pollTaskStatus(string $taskId, string $userId, int $intervalSeconds = 5): array
    {
        echo "🤖 Starting AI-powered avatar analysis...\n";
        
        while (true) {
            $response = $this->checkTaskStatus($taskId, $userId);
            
            if ($response['status'] === 'processing') {
                echo "🔄 AI Processing: {$response['success']}/{$response['total']} avatars analyzed\n";
            } else {
                echo "📊 Status: {$response['status']}, Success: {$response['success']}, Total: {$response['total']}\n";
            }

            switch ($response['status']) {
                case 'exported':
                    $resultUrl = $response['result_url'] ?? 'N/A';
                    echo "✅ Avatar analysis complete! Results: $resultUrl\n";
                    return $response;
                case 'failed':
                    throw new RuntimeException('Avatar analysis task failed');
                default:
                    sleep($intervalSeconds);
                    break;
            }
        }
    }

    public function createInputFile(array $phoneNumbers, string $filePath = 'input.txt'): string
    {
        $content = implode("\n", $phoneNumbers);
        return $this->createInputFileFromString($content, $filePath);
    }

    public function createInputFileFromString(string $content, string $filePath = 'input.txt'): string
    {
        if (file_put_contents($filePath, $content) === false) {
            throw new RuntimeException("Failed to create file: $filePath");
        }
        return $filePath;
    }

    public function downloadResults(string $resultUrl, string $outputPath = 'avatar_results.xlsx'): string
    {
        $curl = curl_init();

        $options = [
            CURLOPT_URL => $resultUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 300
        ];

        curl_setopt_array($curl, $options);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);

        curl_close($curl);

        if ($error) {
            throw new RuntimeException("cURL error: $error");
        }

        if ($httpCode !== 200) {
            throw new RuntimeException("HTTP error: $httpCode");
        }

        if (file_put_contents($outputPath, $response) === false) {
            throw new RuntimeException("Failed to save results to: $outputPath");
        }

        return $outputPath;
    }

    public function analyzeAvatarResults(array $results): array
    {
        echo "\n🤖 AI AVATAR ANALYSIS SUMMARY\n";
        echo str_repeat('=', 50) . "\n";

        $analysis = [
            'total_records' => count($results),
            'whatsapp_accounts' => 0,
            'available_avatars' => 0,
            'gender_distribution' => [],
            'age_distribution' => [],
            'hair_color_distribution' => [],
            'ethnicity_distribution' => [],
            'category_distribution' => []
        ];

        // Count WhatsApp accounts and analyze demographics
        foreach ($results as $result) {
            if (($result['whatsapp'] ?? '') === 'yes') {
                $analysis['whatsapp_accounts']++;
                
                if (!empty($result['avatar']) && $result['avatar'] !== 'unknown') {
                    $analysis['available_avatars']++;
                }

                // Count demographics for WhatsApp accounts only
                $demographics = [
                    'gender' => 'gender_distribution',
                    'age' => 'age_distribution',
                    'hair_color' => 'hair_color_distribution',
                    'skin_color' => 'ethnicity_distribution',
                    'category' => 'category_distribution'
                ];

                foreach ($demographics as $field => $distributionKey) {
                    $value = $result[$field] ?? '';
                    if ($value && $value !== 'unknown') {
                        if (!isset($analysis[$distributionKey][$value])) {
                            $analysis[$distributionKey][$value] = 0;
                        }
                        $analysis[$distributionKey][$value]++;
                    }
                }
            }
        }

        // Print basic statistics
        echo "📊 Total Records: " . number_format($analysis['total_records']) . "\n";
        $whatsappPercentage = ($analysis['whatsapp_accounts'] / $analysis['total_records']) * 100;
        echo "✅ WhatsApp Accounts: " . number_format($analysis['whatsapp_accounts']) . " (" . number_format($whatsappPercentage, 1) . "%)\n";
        $avatarPercentage = ($analysis['available_avatars'] / $analysis['total_records']) * 100;
        echo "🖼️ Available Avatars: " . number_format($analysis['available_avatars']) . " (" . number_format($avatarPercentage, 1) . "%)\n";

        // Gender analysis
        if (!empty($analysis['gender_distribution'])) {
            $totalGender = array_sum($analysis['gender_distribution']);
            echo "\n👥 GENDER ANALYSIS (" . number_format($totalGender) . " profiles)\n";
            echo str_repeat('-', 30) . "\n";
            
            arsort($analysis['gender_distribution']);
            foreach ($analysis['gender_distribution'] as $gender => $count) {
                $percentage = ($count / $totalGender) * 100;
                echo "   " . ucfirst($gender) . ": " . number_format($count) . " (" . number_format($percentage, 1) . "%)\n";
            }
        }

        // Age analysis
        if (!empty($analysis['age_distribution'])) {
            $totalAge = array_sum($analysis['age_distribution']);
            echo "\n🎂 AGE ANALYSIS (" . number_format($totalAge) . " profiles)\n";
            echo str_repeat('-', 25) . "\n";
            
            // Sort ages numerically
            uksort($analysis['age_distribution'], function($a, $b) {
                return $this->parseAge($a) <=> $this->parseAge($b);
            });
            
            $displayCount = 0;
            foreach ($analysis['age_distribution'] as $age => $count) {
                if ($displayCount >= 10) break; // Show top 10
                $percentage = ($count / $totalAge) * 100;
                echo "   $age: " . number_format($count) . " (" . number_format($percentage, 1) . "%)\n";
                $displayCount++;
            }
        }

        // Hair color analysis
        if (!empty($analysis['hair_color_distribution'])) {
            $totalHair = array_sum($analysis['hair_color_distribution']);
            echo "\n💇 HAIR COLOR ANALYSIS (" . number_format($totalHair) . " profiles)\n";
            echo str_repeat('-', 35) . "\n";
            
            arsort($analysis['hair_color_distribution']);
            $displayCount = 0;
            foreach ($analysis['hair_color_distribution'] as $color => $count) {
                if ($displayCount >= 8) break; // Show top 8
                $percentage = ($count / $totalHair) * 100;
                echo "   " . ucfirst($color) . ": " . number_format($count) . " (" . number_format($percentage, 1) . "%)\n";
                $displayCount++;
            }
        }

        // Ethnicity analysis
        if (!empty($analysis['ethnicity_distribution'])) {
            $totalEthnicity = array_sum($analysis['ethnicity_distribution']);
            echo "\n🌍 ETHNICITY ANALYSIS (" . number_format($totalEthnicity) . " profiles)\n";
            echo str_repeat('-', 35) . "\n";
            
            arsort($analysis['ethnicity_distribution']);
            foreach ($analysis['ethnicity_distribution'] as $ethnicity => $count) {
                $percentage = ($count / $totalEthnicity) * 100;
                echo "   " . ucfirst($ethnicity) . ": " . number_format($count) . " (" . number_format($percentage, 1) . "%)\n";
            }
        }

        // Category analysis
        if (!empty($analysis['category_distribution'])) {
            echo "\n📷 AVATAR CATEGORY ANALYSIS\n";
            echo str_repeat('-', 35) . "\n";
            
            arsort($analysis['category_distribution']);
            foreach ($analysis['category_distribution'] as $category => $count) {
                $percentage = ($count / $analysis['available_avatars']) * 100;
                $displayName = ucwords(str_replace('_', ' ', $category));
                echo "   $displayName: " . number_format($count) . " (" . number_format($percentage, 1) . "%)\n";
            }
        }

        echo "\n" . str_repeat('=', 50) . "\n";
        echo "💡 Use this data responsibly and in compliance with privacy laws!\n";

        return $analysis;
    }

    private function parseAge(string $ageStr): float
    {
        try {
            if (strpos($ageStr, '-') !== false) {
                // Handle age ranges like "25-30"
                return (float) explode('-', $ageStr)[0];
            }
            return (float) $ageStr;
        } catch (Exception $e) {
            return 999; // Put unparseable ages at the end
        }
    }

    public function exportDemographicsSummary(array $analysis, string $outputFile = 'demographics_summary.json'): string
    {
        $json = json_encode($analysis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (file_put_contents($outputFile, $json) === false) {
            throw new RuntimeException("Failed to export summary: $outputFile");
        }
        echo "📄 Demographics summary exported to: $outputFile\n";
        return $outputFile;
    }
}

// Usage example
function main(): void
{
    $apiKey = $_ENV['WHATSAPP_AVATAR_API_KEY'] ?? 'YOUR_API_KEY';
    
    echo "🚀 WhatsApp Avatar Checker with AI Analysis\n";
    echo "⚠️  This tool analyzes profile pictures and demographics\n";
    echo "🔒 Please ensure ethical and legal use\n\n";
    
    $checker = new WhatsAppAvatarChecker($apiKey);

    try {
        // Example phone numbers for avatar analysis
        $phoneNumbers = [
            '+1234567890',  // Example number with potential avatar
            '+9876543210',  // Example number with potential avatar
            '+1122334455'   // Example number with potential avatar
        ];

        // Create input file
        $inputFile = $checker->createInputFile($phoneNumbers, 'input.txt');
        echo "📁 Created input file: $inputFile\n";

        // Upload file
        echo "📤 Uploading file for AI avatar analysis...\n";
        $uploadResponse = $checker->uploadFile($inputFile);
        echo "🆔 Task ID: {$uploadResponse['task_id']}\n";
        echo "📊 Initial Status: {$uploadResponse['status']}\n";

        // Poll for completion (avatar analysis takes longer due to AI processing)
        echo "\n🔄 Starting avatar analysis (this may take several minutes)...\n";
        $finalResponse = $checker->pollTaskStatus($uploadResponse['task_id'], $uploadResponse['user_id']);

        echo "\n✅ Avatar analysis completed successfully!\n";

        // Download and analyze results
        if (!empty($finalResponse['result_url'])) {
            echo "\n📥 Downloading comprehensive avatar analysis results...\n";
            $resultsFile = $checker->downloadResults($finalResponse['result_url'], 'avatar_analysis_results.xlsx');
            echo "💾 Results saved to: $resultsFile\n";

            // Note: In a real implementation, you'd parse the Excel file
            // For demo purposes, we'll create sample data
            $sampleResults = [
                ['number' => '+1234567890', 'whatsapp' => 'yes', 'gender' => 'male', 'age' => '25', 'category' => 'individual portrait'],
                ['number' => '+9876543210', 'whatsapp' => 'yes', 'gender' => 'female', 'age' => '30', 'category' => 'individual portrait'],
                ['number' => '+1122334455', 'whatsapp' => 'no']
            ];

            // Perform demographic analysis
            echo "\n🤖 Analyzing demographic data...\n";
            $analysis = $checker->analyzeAvatarResults($sampleResults);

            // Export summary
            $summaryFile = $checker->exportDemographicsSummary($analysis);

            echo "\n📋 Analysis complete! Files created:\n";
            echo "   • Avatar results: $resultsFile\n";
            echo "   • Demographics summary: $summaryFile\n";

            echo "\n🎯 INSIGHTS:\n";
            echo "   • Profile pictures provide rich demographic data\n";
            echo "   • Use findings to enhance marketing personalization\n";
            echo "   • Remember to comply with privacy regulations\n";
            echo "   • Consider demographic diversity in your strategies\n";
        }

        // Clean up input file
        if (unlink($inputFile)) {
            echo "\n🧹 Cleaned up temporary files\n";
        }

    } catch (Exception $e) {
        echo "\n❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

// Avatar Analysis Utilities
class AvatarAnalysisUtils
{
    public static function calculateInsights(array $analysis): array
    {
        $insights = [];

        // Gender insights
        if (!empty($analysis['gender_distribution'])) {
            $totalGender = array_sum($analysis['gender_distribution']);
            if ($totalGender > 0) {
                $femaleRatio = ($analysis['gender_distribution']['female'] ?? 0) / $totalGender;
                
                if ($femaleRatio > 0.6) {
                    $insights[] = '👩 Female-dominant audience';
                } elseif ($femaleRatio < 0.4) {
                    $insights[] = '👨 Male-dominant audience';
                } else {
                    $insights[] = '⚖️ Balanced gender distribution';
                }
            }
        }

        // Age insights
        if (!empty($analysis['age_distribution'])) {
            $ages = array_keys($analysis['age_distribution']);
            $numericAges = array_map(function($age) {
                return strpos($age, '-') !== false ? (float)explode('-', $age)[0] : (float)$age;
            }, array_filter($ages, function($age) {
                return $age !== 'unknown';
            }));

            if (!empty($numericAges)) {
                $avgAge = array_sum($numericAges) / count($numericAges);
                
                if ($avgAge < 25) {
                    $insights[] = '🎯 Young audience (< 25)';
                } elseif ($avgAge > 45) {
                    $insights[] = '🎯 Mature audience (> 45)';
                } else {
                    $insights[] = '🎯 Adult audience (25-45)';
                }
            }
        }

        // Category insights
        if (!empty($analysis['category_distribution'])) {
            $topCategory = array_keys($analysis['category_distribution'], max($analysis['category_distribution']))[0];
            $insights[] = "📷 Most common: " . ucwords(str_replace('_', ' ', $topCategory));
        }

        return $insights;
    }

    public static function generateReport(array $analysis, array $insights): string
    {
        $report = "🤖 WhatsApp Avatar Analysis Report\n";
        $report .= str_repeat('=', 50) . "\n\n";
        
        $report .= "📊 SUMMARY STATISTICS\n";
        $report .= "Total Records: " . number_format($analysis['total_records']) . "\n";
        $report .= "WhatsApp Accounts: " . number_format($analysis['whatsapp_accounts']) . "\n";
        $report .= "Available Avatars: " . number_format($analysis['available_avatars']) . "\n\n";
        
        $report .= "🎯 KEY INSIGHTS\n";
        foreach ($insights as $insight) {
            $report .= "• $insight\n";
        }
        
        $report .= "\n⚠️ PRIVACY REMINDER\n";
        $report .= "This analysis contains demographic data. Use responsibly and comply with privacy laws.\n";
        
        return $report;
    }
}

// Run if called directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'] ?? '')) {
    main();
}

?>
