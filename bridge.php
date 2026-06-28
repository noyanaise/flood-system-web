<?php
set_time_limit(0);

$port = "\\\\.\\COM3"; // ⚠️ Update this if your Device Manager COM assignment changes!
$apiUrl = "https://flood-system-web-production.up.railway.app/api.php?action=create_record";

// This file will hold the current reading so your web frontend can look at it instantly
$liveCacheFile = "C:\\xampp\\htdocs\\appdev_final\\live_status.json"; 

// --- DYNAMIC CONTROL VARIABLES ---
$lastDistance = 0.0;
$lastLevel = ""; // Track previous warning status to catch state changes
$lastSentTime = 0;
$changeThreshold = 0.10; // Force database insert if distance changes by more than 0.10cm
$dbHeartbeatInterval = 300; // 🛡️ ANTI-FLOOD: Only insert identical rows to DB every 5 minutes (300s)

echo "🤖 Initializing Dynamic Smart-Filter PHP Bridge Router...\n";

while (true) {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        @exec("mode $port: BAUD=9600 PARITY=n DATA=8 STOP=1 to=on xon=off odsr=off octs=off dtr=on rts=on");
    }

    echo "🔌 Attempting hardware handshake on $port...\n";
    @$serialStream = fopen($port, "r+");

    if (!$serialStream) {
        echo "⏳ Hardware Link Offline. Re-trying in 3 seconds...\n";
        sleep(3);
        continue; 
    }

    echo "⏳ Arduino Booting... Waiting 3 seconds...\n";
    sleep(3);

    stream_set_blocking($serialStream, false);
    echo "📡 Connection Secure! Anti-flood system fully operational.\n\n";

    while (true) {
        if (!is_resource($serialStream)) {
            echo "❌ [HARDWARE FAULT] Serial connection resource lost!\n";
            break; 
        }

        $lineInput = fgets($serialStream);
        
        if ($lineInput !== false) {
            $lineInput = trim($lineInput);
            
            if (strpos($lineInput, "DATA,") === 0) {
                $dataSegments = explode(",", $lineInput);
                
                if (count($dataSegments) >= 4) {
                    $distance = floatval($dataSegments[1]);
                    $barrier = intval($dataSegments[2]);
                    $level = trim($dataSegments[3]);
                    
                    $water_level = max(0, 9.4 - $distance);
                    $currentTime = time();
                    $distanceDifference = abs($distance - $lastDistance);
                    $timeSinceLastLog = $currentTime - $lastSentTime;
                    
                    // 1. ALWAYS write the absolute latest data to a local JSON file for the website to read instantly
                    $liveData = [
                        'DISTANCE'    => $distance,
                        'water_level' => round($water_level, 2),
                        'barrier'     => $barrier,
                        'scondition'  => $level,
                        'timestamp'   => date('H:i:s')
                    ];
                    @file_put_contents($liveCacheFile, json_encode($liveData));

                    // 2. DETERMINE IF WE SHOULD INSERT INTO THE MYSQL DATABASE
                    $insertToDatabase = false;
                    
                    // Rule A: Fast Response -> Hand moved! Save immediately (with 2-second rate limit)
                    if ($distanceDifference >= $changeThreshold && $timeSinceLastLog >= 2) {
                        echo "📈 [FAST RESPONSE] Movement detected (+-{$distanceDifference}cm). Logging to MySQL...\n";
                        $insertToDatabase = true;
                    }
                    
                    // Rule B: CRITICAL FIX -> Status change occurred. (with 2-second cooldown to prevent spam)
                    if (strtoupper($level) !== strtoupper($lastLevel) && $timeSinceLastLog >= 2) {
                        echo "🚨 [STATUS CHANGE] Threat level transitioned from '{$lastLevel}' to '{$level}'. Forcing instant MySQL log...\n";
                        $insertToDatabase = true;
                    }
                    
                    // Rule C: Safe Heartbeat -> 5 minutes passed with flat data. Save a point to keep logs alive
                    if (($currentTime - $lastSentTime) >= $dbHeartbeatInterval) {
                        echo "⏱️ [LOG SAVED] 5-minute baseline log recorded to MySQL.\n";
                        $insertToDatabase = true;
                    }
                    
                    if ($insertToDatabase) {
                        $formData = http_build_query([
                            'DISTANCE'    => $distance,
                            'water_level' => round($water_level, 2),
                            'barrier'     => $barrier,
                            'scondition'  => $level
                        ]);
                        
                        $curlHook = curl_init($apiUrl);
                        curl_setopt($curlHook, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($curlHook, CURLOPT_POST, true);
                        curl_setopt($curlHook, CURLOPT_POSTFIELDS, $formData);
                        curl_setopt($curlHook, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
                        
                        $dbResponse = curl_exec($curlHook);
                        curl_close($curlHook);
                        
                        echo "    💾 Database Log: " . $dbResponse . "\n\n";
                        
                        $lastDistance = $distance;
                        $lastLevel = $level; 
                        $lastSentTime = $currentTime;
                    }
                }
            }
        }
        usleep(20000); // Super fast checking loop (0.02s) for responsive movement detection
    }

    @fclose($serialStream);
    sleep(2);
}
?>
