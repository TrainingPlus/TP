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
        handleGetStudents($pdo);
        break;
    case 'add_student':
        handleAddStudent($pdo);
        break;
    case 'update_student':
        handleUpdateStudent($pdo);
        break;
    case 'delete_student':
        handleDeleteStudent($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid API Action."]);
        break;
}

function handleGetStudents($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM students ORDER BY created_at DESC");
        $students = $stmt->fetchAll();
        echo json_encode(["status" => "success", "data" => $students]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

function handleAddStudent($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['cpr']) || empty(trim($data['cpr']))) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "CPR is required."]);
        return;
    }

    $cpr = trim($data['cpr']);
    $name = isset($data['name']) ? trim($data['name']) : '';
    $email = isset($data['email']) ? trim($data['email']) : '';

    try {
        $stmt = $pdo->prepare("INSERT INTO students (cpr, name, email) VALUES (:cpr, :name, :email)");
        $stmt->execute([':cpr' => $cpr, ':name' => $name, ':email' => $email]);
        echo json_encode(["status" => "success", "message" => "Student added successfully."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

function handleUpdateStudent($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Student ID is required."]);
        return;
    }

    try {
        $stmt = $pdo->prepare("UPDATE students SET name = :name, email = :email, major = :major WHERE id = :id");
        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':major' => $data['major'],
            ':id' => $data['id']
        ]);
        echo json_encode(["status" => "success", "message" => "Student updated."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

function handleDeleteStudent($pdo) {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing Student ID."]);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM students WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(["status" => "success", "message" => "Student deleted."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
