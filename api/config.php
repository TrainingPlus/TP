<?php
// =========================================================
// Optional PHP backend config.
// NOTE: Firebase Hosting only serves static files — it cannot run PHP.
// This folder is provided as an ALTERNATIVE to the Cloud Functions in
// /functions, for teams that prefer a classic PHP host (e.g. cPanel,
// shared hosting) instead of Firebase Functions for emails/exports.
// You do not need this folder if you're using Firebase Functions.
// See README.md → "Option B: PHP backend" for setup.
// =========================================================

// Gmail SMTP (use an App Password, not your normal password)
define('GMAIL_USER', getenv('GMAIL_USER') ?: 'your-account@gmail.com');
define('GMAIL_APP_PASSWORD', getenv('GMAIL_APP_PASSWORD') ?: 'xxxx xxxx xxxx xxxx');

// Firebase service account JSON path, for verifying the caller's Firebase
// ID token and reading Firestore from PHP (download from
// Firebase Console → Project settings → Service accounts).
define('FIREBASE_SERVICE_ACCOUNT_PATH', __DIR__ . '/service-account.json');
define('FIREBASE_PROJECT_ID', 'YOUR_PROJECT_ID');
