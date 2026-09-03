<?php
// =========================================================
// POST /api/send-email.php
// Body (JSON): { "to": "person@gmail.com", "subject": "...", "html": "..." }
//
// Requires PHPMailer:  composer require phpmailer/phpmailer
// Run from the /api folder: composer install
// =========================================================
header('Content-Type: application/json');
require __DIR__ . '/config.php';
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['to']) || empty($input['subject'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing to/subject']);
    exit;
}

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = GMAIL_USER;
    $mail->Password   = GMAIL_APP_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom(GMAIL_USER, 'Student Management System');
    $mail->addAddress($input['to']);
    $mail->isHTML(true);
    $mail->Subject = $input['subject'];
    $mail->Body    = $input['html'] ?? $input['subject'];

    $mail->send();
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $mail->ErrorInfo]);
}
