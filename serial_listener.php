<?php
// 1. Setup Database Connection
$dsn = "mysql:host=localhost;dbname=flood_system;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// 2. Setup Serial Port
$port = "COM4";

if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    exec("mode $comPort BAUD=9600 PARITY=N data=8 stop=1 xon=off");
}

$fp = fopen($comPort, "w+");
if (!$fp) {
    die("Error: Could not open serial port $comPort\n");
}

echo "Actively listening to Arduino on $comPort...\n";

// 3. Infinite Loop
while (true) {
    $buffer = fgets($fp);
    if ($buffer !== false) {
        $buffer = trim($buffer);
        
        if (strpos($buffer, "DATA,") === 0) {
            $parts = explode(",", $buffer);
            if (count($parts) == 4) {
                $distance = (float)$parts[1];
                $barrier = (int)$parts[2];
                $level = trim($parts[3]);
                
                $max_distance = 9.4;
                $water_level = $max_distance - $distance;
                if ($water_level < 0) $water_level = 0;

                // FIX: Map strictly to uppercase DISTANCE column
                $stmt = $pdo->prepare("INSERT INTO records (DISTANCE, water_level, barrier, scondition) VALUES (?, ?, ?, ?)");
                $stmt->execute([$distance, $water_level, $barrier, $level]);
                echo "Logged: Dist: $distance cm | Water: $water_level cm | Barrier: $barrier | Status: $level\n";
            }
        }
    }
    usleep(100000); // 100ms yield to protect host processing resources
}
fclose($fp);
?>