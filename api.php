<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'get_students':
        if ($method !== 'GET') respondError("Method not allowed", 405);
        handleGetStudents($pdo);
        break;
    case 'add_student':
        if ($method !== 'POST') respondError("Method not allowed", 405);
        handleAddStudent($pdo);
        break;
    case 'update_student':
        if ($method !== 'PUT' && $method !== 'POST') respondError("Method not allowed", 405);
        handleUpdateStudent($pdo);
        break;
    case 'delete_student':
        if ($method !== 'DELETE' && $method !== 'GET') respondError("Method not allowed", 405);
        handleDeleteStudent($pdo);
        break;
    default:
        respondError("Invalid API Action.", 400);
        break;
}

// Helper function for structured JSON responses
function respondJson($status, $messageOrData, $code = 200) {
    http_response_code($code);
    $key = ($status === 'success') ? (is_array($messageOrData) ? 'data' : 'message') : 'message';
    echo json_encode(["status" => $status, $key => $messageOrData]);
    exit();
}

function respondError($message, $code = 400) {
    respondJson("error", $message, $code);
}

function handleGetStudents($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, cpr, name, email, major, created_at FROM students ORDER BY created_at DESC");
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respondJson("success", $students);
    } catch (PDOException $e) {
        respondError($e->getMessage(), 500);
    }
}

function handleAddStudent($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['cpr'])) {
        respondError("CPR is required.");
    }

    $cpr = trim($data['cpr']);
    
    // Validate 9-digit CPR format
    if (!preg_match('/^\d{9}$/', $cpr)) {
        respondError("CPR must be exactly 9 digits.");
    }

    $name = isset($data['name']) ? trim($data['name']) : '';
    $email = isset($data['email']) ? trim($data['email']) : '';
    $major = isset($data['major']) ? trim($data['major']) : '';

    try {
        $stmt = $pdo->prepare("INSERT INTO students (cpr, name, email, major) VALUES (:cpr, :name, :email, :major)");
        $stmt->execute([':cpr' => $cpr, ':name' => $name, ':email' => $email, ':major' => $major]);
        respondJson("success", "Student added successfully.", 201);
    } catch (PDOException $e) {
        // Handle Duplicate CPR Error (MySQL code 23000)
        if ($e->getCode() == 23000) {
            respondError("A student with this CPR already exists.", 409);
        }
        respondError($e->getMessage(), 500);
    }
}

function handleUpdateStudent($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || empty($data['id'])) {
        respondError("Student ID is required.");
    }

    $id = filter_var($data['id'], FILTER_VALIDATE_INT);
    if (!$id) {
        respondError("Invalid Student ID.");
    }

    $name = isset($data['name']) ? trim($data['name']) : '';
    $email = isset($data['email']) ? trim($data['email']) : '';
    $major = isset($data['major']) ? trim($data['major']) : '';

    try {
        $stmt = $pdo->prepare("UPDATE students SET name = :name, email = :email, major = :major WHERE id = :id");
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':major' => $major,
            ':id' => $id
        ]);
        respondJson("success", "Student updated successfully.");
    } catch (PDOException $e) {
        respondError($e->getMessage(), 500);
    }
}

function handleDeleteStudent($pdo) {
    // Check both GET query param and JSON body payload
    $data = json_decode(file_get_contents("php://input"), true);
    $id = isset($_GET['id']) ? $_GET['id'] : (isset($data['id']) ? $data['id'] : null);

    if (!$id || !filter_var($id, FILTER_VALIDATE_INT)) {
        respondError("Valid Student ID is required.");
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM students WHERE id = :id");
        $stmt->execute([':id' => $id]);
        
        if ($stmt->rowCount() === 0) {
            respondError("Student record not found.", 404);
        }

        respondJson("success", "Student deleted successfully.");
    } catch (PDOException $e) {
        respondError($e->getMessage(), 500);
    }
}
?>
