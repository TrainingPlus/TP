<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    
    // Check or create user profile after Google Login
    case 'sync_user':
        $uid = $input['uid'] ?? '';
        $email = $input['email'] ?? '';
        $displayName = $input['displayName'] ?? 'User';

        if (empty($uid) || empty($email)) {
            echo json_encode(["status" => "error", "message" => "Missing user parameters"]);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM users WHERE uid = :uid");
        $stmt->execute(['uid' => $uid]);
        $user = $stmt->fetch();

        if (!$user) {
            $stmt = $conn->prepare("INSERT INTO users (uid, email, display_name, role) VALUES (:uid, :email, :displayName, 'employee')");
            $stmt->execute(['uid' => $uid, 'email' => $email, 'displayName' => $displayName]);
            $role = 'employee';
        } else {
            $role = $user['role'];
        }

        echo json_encode(["status" => "success", "role" => $role]);
        break;

    // Register Student CPR
    case 'add_cpr':
        $cpr = $input['cpr'] ?? '';
        $uid = $input['uid'] ?? '';

        if (!preg_match('/^\d{9}$/', $cpr)) {
            echo json_encode(["status" => "error", "message" => "CPR must be exactly 9 digits."]);
            exit();
        }

        try {
            $stmt = $conn->prepare("INSERT INTO students (cpr, created_by_uid) VALUES (:cpr, :uid)");
            $stmt->execute(['cpr' => $cpr, 'uid' => $uid]);
            echo json_encode(["status" => "success"]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "CPR already registered or database error."]);
        }
        break;

    // Fetch All Students
    case 'get_students':
        $stmt = $conn->prepare("SELECT id, cpr, full_name, created_at FROM students ORDER BY created_at DESC");
        $stmt->execute();
        $students = $stmt->fetchAll();
        echo json_encode(["status" => "success", "data" => $students]);
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid endpoint"]);
        break;
}
?>
