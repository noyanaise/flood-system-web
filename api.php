<?php
// Safely start the session ONLY if it hasn't been started yet to prevent server crashes
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * ==========================================================
 * BACKEND ROLE-BASED ACCESS CONTROL (RBAC) FIREWALL
 * ==========================================================
 */

// 1. Define the exact actions that ONLY Administrators are allowed to perform
$admin_only_actions = ['insert', 'create', 'update', 'delete', 'restore', 'command', 'force', 'mode'];
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

// 2. Only block the request if they are trying to MODIFY data (we let "fetch" pass through automatically)
if (in_array($action, $admin_only_actions)) {
    // Fallback alignment: check both $_SESSION['role'] and $_SESSION['user_role']
    $current_role = $_SESSION['role'] ?? $_SESSION['user_role'] ?? '';
    
    if (empty($current_role) || strtolower(trim($current_role)) !== 'admin') {
        http_response_code(403); 
        echo json_encode(['error' => 'Access Denied: Administrator privileges strictly required.']);
        exit;
    }
}

// ========================================================
// DATABASE CONFIGURATION (OPTIMIZED FOR RAILWAY & LOCAL)
// ========================================================
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$host = getenv("MYSQLHOST");
$port = getenv("MYSQLPORT");
$db   = getenv("MYSQLDATABASE");
$user = getenv("MYSQLUSER");
$pass = getenv("MYSQLPASSWORD");

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";

$pdo = new PDO($dsn,$user,$pass,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
]);
$method = $_SERVER['REQUEST_METHOD'];

// Helper to get raw POST data inputs safely
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true);

if (!$inputData && $method === 'POST') {
    $inputData = $_POST; 
}

// ========================================================
// 1. HARDWARE AUTO LINKER (USED BY WEB SERIAL / BRIDGE)
// ========================================================
if ($action === 'create_record' && $method === 'POST') {
    $distance    = $inputData['DISTANCE'] ?? null;
    $water_level = $inputData['water_level'] ?? null;
    $barrier     = $inputData['barrier'] ?? null;
    $scondition  = $inputData['scondition'] ?? null;

    if ($distance !== null && $water_level !== null && $barrier !== null && $scondition !== null) {
        try {
            $stmt = $pdo->prepare("INSERT INTO records (DISTANCE, water_level, barrier, scondition) VALUES (?, ?, ?, ?)");
            $stmt->execute([$distance, $water_level, $barrier, $scondition]);
            echo json_encode(["status" => "success", "message" => "Telemetry registered successfully"]);
        } catch (PDOException $e) {
            echo json_encode(["error" => "Database write error: " . $e->getMessage()]);
        }
    } else {
        echo json_encode(["error" => "Incomplete request signature keys received."]);
    }
    exit;
}

// ========================================================
// 2. DATA VISUALIZATION FEED (FETCH LOOP)
// ========================================================
elseif ($action === 'fetch' && $method === 'GET') {
    $trash = isset($_GET['trash']) ? (int)$_GET['trash'] : 0;
    
    // Extract filter variables from the URL query parameters
    $condition = $_GET['condition'] ?? $_GET['scondition'] ?? $_GET['status'] ?? '';
    $start = $_GET['start'] ?? '';
    $end = $_GET['end'] ?? '';

    try {
        $sql = "SELECT * FROM records WHERE is_deleted = ?";
        $params = [$trash];

        if (!empty($condition)) {
            $sql .= " AND UPPER(scondition) = ?";
            $params[] = strtoupper($condition);
        }

        if (!empty($start)) {
            $sql .= " AND tStamp >= ?";
            $params[] = $start . " 00:00:00";
        }

        if (!empty($end)) {
            $sql .= " AND tStamp <= ?";
            $params[] = $end . " 23:59:59";
        }

        $sql .= " ORDER BY tStamp DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($records);
    } catch (PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

// ========================================================
// 3. LIVE METRICS WORKER (LATEST RECORD SINGLETON)
// ========================================================
elseif ($action === 'latest' && $method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM records WHERE is_deleted = 0 ORDER BY tStamp DESC LIMIT 1");
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($record ? $record : ["error" => "No telemetry logs found inside cluster memory."]);
    } catch (PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

// ========================================================
// 4. ADMINISTRATIVE MANUAL RECORD INJECTION
// ========================================================
elseif ($action === 'create' && $method === 'POST') {
    $distance = $inputData['distance'] ?? null;
    
    if ($distance !== null) {
        $max_distance = 9.4;
        $water_level = $max_distance - $distance;
        if ($water_level < 0) $water_level = 0;
        
        $scondition = "SAFE";
        if ($water_level >= 2.0 && $water_level < 3.0) {
            $scondition = "WARNING";
        } 
        elseif ($water_level >= 3.0) {
            $scondition = "DANGER";
        }
        
        $barrier = ($scondition === "DANGER") ? 1 : 0;
        
        try {
            $stmt = $pdo->prepare("INSERT INTO records (DISTANCE, water_level, barrier, scondition) VALUES (?, ?, ?, ?)");
            $stmt->execute([$distance, $water_level, $barrier, $scondition]);
            echo json_encode(["status" => "success"]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
    } else {
        echo json_encode(["error" => "Form entry missing base metric constraints."]);
    }
    exit;
}

// ========================================================
// 4b. ADMINISTRATIVE MANUAL RECORD AMENDMENT (UPDATES)
// ========================================================
elseif ($action === 'update' && $method === 'POST') {
    $id = $inputData['id'] ?? null;
    $distance = $inputData['distance'] ?? null;
    
    if ($id !== null && $distance !== null) {
        $max_distance = 9.4;
        $water_level = $max_distance - $distance;
        if ($water_level < 0) $water_level = 0;
        
        $scondition = "SAFE";
        if ($water_level >= 2.0 && $water_level < 3.0) {
            $scondition = "WARNING";
        } 
        elseif ($water_level >= 3.0) {
            $scondition = "DANGER";
        }
        
        $barrier = ($scondition === "DANGER") ? 1 : 0;
        
        try {
            $stmt = $pdo->prepare("UPDATE records SET DISTANCE = ?, water_level = ?, barrier = ?, scondition = ? WHERE id = ?");
            $stmt->execute([$distance, $water_level, $barrier, $scondition, $id]);
            echo json_encode(["status" => "success"]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
    } else {
        echo json_encode(["error" => "Form entry missing base configuration constraints for modifications."]);
    }
    exit;
}

// ========================================================
// 5. DOWNSTREAM BRIDGE OVERRIDE (QUEUE INSTRUCTION)
// ========================================================
elseif (($action === 'send_command' || $action === 'command') && $method === 'POST') {
    if (isset($inputData['cmd'])) {
        file_put_contents('cmd.txt', trim($inputData['cmd']));
        echo json_encode(["status" => "command queued"]);
    } else {
        echo json_encode(["error" => "Missing command code specification."]);
    }
    exit;
} 

// ========================================================
// 6. ADMINISTRATIVE PURGE WORKER (SOFT-DELETE RECORD)
// ========================================================
elseif ($action === 'delete' && $method === 'POST') {
    if (isset($inputData['id'])) {
        $stmt = $pdo->prepare("UPDATE records SET is_deleted = 1 WHERE id = ?");
        $stmt->execute([$inputData['id']]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["error" => "Missing identification metric targeted for deletion."]);
    }
    exit;
}

// ========================================================
// 7. ADMINISTRATIVE RESTORATION WORKER (RESTORE RECORD)
// ========================================================
elseif ($action === 'restore' && $method === 'POST') {
    if (isset($inputData['id'])) {
        $stmt = $pdo->prepare("UPDATE records SET is_deleted = 0 WHERE id = ?");
        $stmt->execute([$inputData['id']]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["error" => "Missing identification metric targeted for restoration."]);
    }
    exit;
}

echo json_encode(["error" => "Invalid endpoint routing action target request requested."]);
?>
