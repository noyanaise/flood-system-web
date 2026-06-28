<?php
session_start();
header('Content-Type: application/json');

// Checks if session contains valid access keys matching active logging rules
if (isset($_SESSION['user_role'])) {
    // Synchronize both session keys so that all parts of your app speak the same language
    $_SESSION['role'] = $_SESSION['user_role']; 

    echo json_encode([
        'logged_in' => true,
        'username'  => $_SESSION['username'],
        'role'      => $_SESSION['user_role']
    ]);
} else {
    echo json_encode([
        'logged_in' => false
    ]);
}
exit;
?>