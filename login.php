<?php
// Include PHPMailer classes at the top
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/Exception.php';
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';

// Security headers and session configuration
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:;");

// Secure session configuration
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'],
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

// CSRF Protection
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Validate CSRF token function
function validate_csrf_token($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Input validation function
function validate_input($data, $max_length = 255, $type = 'string') {
    if (empty($data)) return false;
    
    $data = trim($data);
    $data = stripslashes($data);
    
    if (strlen($data) > $max_length) return false;
    
    switch ($type) {
        case 'email':
            $data = filter_var($data, FILTER_SANITIZE_EMAIL);
            if (!filter_var($data, FILTER_VALIDATE_EMAIL)) return false;
            break;
        case 'int':
            if (!filter_var($data, FILTER_VALIDATE_INT)) return false;
            $data = (int)$data;
            break;
        case 'alphanum':
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $data)) return false;
            break;
        case 'phone':
            if (!preg_match('/^[0-9\-\+\(\)\s]+$/', $data)) return false;
            break;
        default:
            $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    
    return $data;
}

// Regenerate session ID periodically
if (!isset($_SESSION['created'])) {
    session_regenerate_id(true);
    $_SESSION['created'] = time();
} else if (time() - $_SESSION['created'] > 1800) {
    session_regenerate_id(true);
    $_SESSION['created'] = time();
}

// ========================================================
// ROUTE REGION: CONSOLIDATED DE-AUTHENTICATION EXPLICIT ACTION
// ========================================================
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    $_SESSION = array();

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    session_destroy();
    header("Location: login.html");
    exit;
}

// Automatic Routing Guard
if (isset($_SESSION['user_role'])) {
    header("Location: index.html");
    exit;
}

// ========================================================
// ROUTE REGION: POST REQUEST VALIDATION & RUNTIME CHECK
// ========================================================
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $host = 'localhost';
    $db   = 'flood_system'; 
    $user = 'root';
    $pass = '';
    $dsn  = "mysql:host=$host;dbname=$db;charset=utf8mb4";

    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        header("Location: login.html?error=empty");
        exit;
    }

    try {
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        // MODIFIED: Added 'email' to the SELECT statement
        $stmt = $pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($userRow && password_verify($password, $userRow['password_hash'])) {
            session_regenerate_id(true); // Neutralize session-fixation vectors

            // 1. Generate 6-digit cryptographic OTP
            $otp = sprintf("%06d", random_int(100000, 999999));
            $expiry = date("Y-m-d H:i:s", strtotime('+10 minutes'));

            // 2. Save OTP and Expiry into the user's row
            $updateStmt = $pdo->prepare("UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?");
            $updateStmt->execute([$otp, $expiry, $userRow['id']]);

            // 3. Send email via PHPMailer
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                // Force XAMPP to resolve Gmail using IPv4 instead of failing on IPv6
$mail->Host       = gethostbyname('smtp.gmail.com'); 

$mail->SMTPAuth   = true;
$mail->Username   = 'floodsystem6246@gmail.com';       // Your actual Gmail address
$mail->Password   = 'ssco dghg qmfl crrq';        // Your 16-character App Password
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
$mail->Port       = 587;                          

// ADD THIS BLOCK BELOW TO BYPASS LOCAL SSL CERTIFICATE BLOCKS
$mail->SMTPOptions = array(
    'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true
    )
);                  // Changed from 587             

                $mail->setFrom('floodsystem6246@gmail.com', 'Flood System Security');
                $mail->addAddress($userRow['email']); 

                $mail->isHTML(true);
                $mail->Subject = 'Your Login Verification Code';
                $mail->Body    = "Your One-Time Password (OTP) for login is <b>$otp</b>. It will expire in 10 minutes.";
                $mail->AltBody = "Your One-Time Password (OTP) for login is $otp. It will expire in 10 minutes.";

                $mail->send();

                // 4. Put the identity metadata into temporary stage variables.
                // Critical: Do NOT set $_SESSION['user_role'] yet, otherwise your routing guard will bypass OTP.
                $_SESSION['temp_user_id']  = $userRow['id'];
                $_SESSION['temp_username'] = $userRow['username'];
                $_SESSION['temp_role']     = $userRow['role'];

                // Redirect user to the OTP form page
                header("Location: otp.html");
                exit;

            } catch (Exception $e) {
                die("Mailer Error: " . $e->getMessage());
            }
        } else {
            header("Location: login.html?error=failed");
            exit;
        }

    } catch (PDOException $e) {
        die("Database Error: " . $e->getMessage());
    }
} else {
    header("Location: login.html");
    exit;
}
?>