<?php
// =========================================================
// POST /api/export-excel.php
// Body (JSON): { "filename": "directory.xlsx", "sheet": "Directory",
//                "rows": [ { "Name": "...", "CPR": "...", ... }, ... ] }
// Streams back an .xlsx file.
//
// Requires PhpSpreadsheet:  composer require phpoffice/phpspreadsheet
// Run from the /api folder: composer install
//
// Note: the front-end already exports Excel client-side with SheetJS
// (see /public/js/export.js), which works out of the box on Firebase
// Hosting with no server at all. Use this endpoint only if you'd rather
// generate the file server-side.
// =========================================================
require __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['rows'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No rows provided']);
    exit;
}

$rows = $input['rows'];
$filename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $input['filename'] ?? 'export.xlsx');
$sheetName = substr($input['sheet'] ?? 'Sheet1', 0, 31);

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle($sheetName);

$headers = array_keys($rows[0]);
$sheet->fromArray($headers, null, 'A1');
$sheet->fromArray(array_map('array_values', $rows), null, 'A2');

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
