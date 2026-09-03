<?php
// =========================================================
// Run once a day via cron, e.g.:
//   0 7 * * *  php /path/to/api/check-reminders.php
//
// This is the PHP equivalent of functions/index.js → dailyReminderCheck.
// It talks to Firestore over its REST API using a service account.
//
// Requires:  composer require google/apiclient phpmailer/phpmailer
// Also requires FIREBASE_SERVICE_ACCOUNT_PATH (see config.php) pointing
// at a service-account.json downloaded from
// Firebase Console → Project settings → Service accounts → Generate key.
//
// If you're using Firebase Functions instead (recommended, simplest),
// you do NOT need this file — delete it.
// =========================================================
require __DIR__ . '/config.php';
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;

function getAccessToken(): string {
    $client = new Google_Client();
    $client->setAuthConfig(FIREBASE_SERVICE_ACCOUNT_PATH);
    $client->addScope('https://www.googleapis.com/auth/datastore');
    $client->fetchAccessTokenWithAssertion();
    return $client->getAccessToken()['access_token'];
}

function firestoreRequest(string $method, string $path, ?array $body = null): array {
    $token = getAccessToken();
    $url = "https://firestore.googleapis.com/v1/projects/" . FIREBASE_PROJECT_ID . "/databases/(default)/documents" . $path;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token, 'Content-Type: application/json']);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true) ?: [];
}

function fsValue($field) {
    if (isset($field['stringValue'])) return $field['stringValue'];
    if (isset($field['booleanValue'])) return $field['booleanValue'];
    return null;
}

function sendMail(string $to, string $subject, string $html): void {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = GMAIL_USER;
    $mail->Password = GMAIL_APP_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->setFrom(GMAIL_USER, 'Student Management System');
    $mail->addAddress($to);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->send();
}

$today = new DateTime('today');
$studentsResp = firestoreRequest('GET', '/students');

foreach (($studentsResp['documents'] ?? []) as $doc) {
    $f = $doc['fields'];
    $trackingStart = fsValue($f['trackingStartDate'] ?? []);
    $addedBy = fsValue($f['addedBy'] ?? []);
    $name = fsValue($f['name'] ?? []);
    if (!$trackingStart || !$addedBy) continue;

    $start = new DateTime($trackingStart);
    $yearEnd = (clone $start)->modify('+12 months');
    $oneMonthBefore = (clone $yearEnd)->modify('-1 month');
    $threeDaysBefore = (clone $yearEnd)->modify('-3 days');

    $remindKey = null;
    if ($today->format('Y-m-d') === $oneMonthBefore->format('Y-m-d')) $remindKey = 'oneMonth';
    elseif ($today->format('Y-m-d') === $threeDaysBefore->format('Y-m-d')) $remindKey = 'threeDays';
    if (!$remindKey) continue;

    $flagField = 'reminderSent_' . $remindKey;
    if (fsValue($f[$flagField] ?? []) === true) continue;

    $docId = basename($doc['name']);
    $userResp = firestoreRequest('GET', '/users/' . $addedBy);
    $email = fsValue($userResp['fields']['email'] ?? []);
    if (!$email) continue;

    $remaining = $remindKey === 'oneMonth' ? '1 month' : '3 days';
    sendMail($email, "Reminder: {$name} — {$remaining} left before the year ends",
        "<p>Student <b>{$name}</b> has <b>{$remaining}</b> remaining before completing one year of tracking.</p>");

    firestoreRequest('PATCH', "/students/{$docId}?updateMask.fieldPaths={$flagField}", [
        'fields' => [ $flagField => ['booleanValue' => true] ]
    ]);

    echo "Reminded for {$name} ({$remindKey})\n";
}
