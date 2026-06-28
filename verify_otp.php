<?php
// Inherit your exact session parameters from login.php
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'],
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

// Guard against access without completing password verification stage
if (!isset($_SESSION['temp_user_id'])) {
    header("Location: login.html");
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $entered_otp = trim($_POST['otp'] ?? '');

    $host = 'localhost';
    $db   = 'flood_system'; 
    $user = 'root';
    $pass = '';
    $dsn  = "mysql:host=$host;dbname=$db;charset=utf8mb4";

    try {
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        // Pull stored credentials for comparison
        $stmt = $pdo->prepare("SELECT otp, otp_expiry FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['temp_user_id']]);
        $dbData = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($dbData && $dbData['otp'] === $entered_otp) {
            $currentTime = date("Y-m-d H:i:s");

            if ($currentTime <= $dbData['otp_expiry']) {
                // OTP matches and is active! Wipe OTP database fields for security
                $clearStmt = $pdo->prepare("UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = ?");
                $clearStmt->execute([$_SESSION['temp_user_id']]);

                // Upgrade temporary flags to production login session parameters
                $_SESSION['user_id']   = $_SESSION['temp_user_id'];
                $_SESSION['username']  = $_SESSION['temp_username'];
                $_SESSION['user_role'] = $_SESSION['temp_role'];

                // Remove temporary flags
                unset($_SESSION['temp_user_id'], $_SESSION['temp_username'], $_SESSION['temp_role']);

                // Final Entry authorized
                header("Location: index.html");
                exit;
            } else {
                header("Location: otp.html?error=expired");
                exit;
            }
        } else {
            header("Location: otp.html?error=invalid");
            exit;
        }

    } catch (PDOException $e) {
        die("Security layer failed verification processing.");
    }
}
?>