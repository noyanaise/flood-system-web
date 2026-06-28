<?php
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:;");

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'],
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

function validate_input($data, $max_length = 255) {
    if (empty($data)) return false;
    $data = trim($data);
    $data = stripslashes($data);
    if (strlen($data) > $max_length) return false;
    return preg_match('/^[a-zA-Z0-9_]+$/', $data) ? $data : false;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $host = 'localhost';
    $db   = 'flood_system'; 
    $user = 'root';
    $pass = '';
    $dsn  = "mysql:host=$host;dbname=$db;charset=utf8mb4";

    $username = validate_input($_POST['username'] ?? '');
    $email    = trim($_POST['email'] ?? ''); 
    $password = trim($_POST['password'] ?? '');
    
    // HARDCODED FIX: Overrides any client parameters to secure user level assignment
    $role     = 'user'; 

    if (!$username || empty($password)) {
        header("Location: register.html?error=invalid_input");
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: register.html?error=invalid_email");
        exit;
    }

    if (strlen($password) < 6) {
        header("Location: register.html?error=weak_password");
        exit;
    }

    try {
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
        $checkStmt->execute([$username, $email]);
        if ($checkStmt->fetch()) {
            header("Location: register.html?error=exists");
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$username, $email, $hashedPassword, $role]);

        header("Location: login.html?success=registered");
        exit;

    } catch (PDOException $e) {
        header("Location: register.html?error=db_fault");
        exit;
    }
} else {
    header("Location: register.html");
    exit;
}
?>