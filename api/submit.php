<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data && !empty($_POST)) {
    $data = $_POST;
}

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No data received']);
    exit();
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
    // Create htaccess to protect data directory from direct downloads
    file_put_contents($dataDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}

$dataFile = $dataDir . '/consultations.json';
$existing = [];

if (file_exists($dataFile)) {
    $content = file_get_contents($dataFile);
    $existing = json_decode($content, true) ?: [];
}

// Sanitize & Format submission
$submission = [
    'docketId' => $data['docketId'] ?? ('IQ-' . date('Y') . '-LAW-' . rand(1000, 9999)),
    'date' => $data['date'] ?? date('Y-m-d H:i:s'),
    'timestamp' => $data['timestamp'] ?? date('c'),
    'titlePrefix' => htmlspecialchars($data['titlePrefix'] ?? 'السيد'),
    'name' => htmlspecialchars($data['name'] ?? 'بدون اسم'),
    'phone' => htmlspecialchars($data['phone'] ?? ''),
    'location' => htmlspecialchars($data['location'] ?? 'بغداد'),
    'topic' => htmlspecialchars($data['topic'] ?? 'استشارة عامة'),
    'opponentName' => htmlspecialchars($data['opponentName'] ?? ''),
    'opponentPhone' => htmlspecialchars($data['opponentPhone'] ?? ''),
    'summary' => htmlspecialchars($data['summary'] ?? ''),
    'receiptBase64' => $data['receiptBase64'] ?? '',
    'paymentMethod' => htmlspecialchars($data['paymentMethod'] ?? 'qi_super'),
    'status' => 'جديدة',
    'notes' => ''
];

// Prepend to top
array_unshift($existing, $submission);

// Save safely
file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'status' => 'success',
    'message' => 'Consultation saved to server',
    'docketId' => $submission['docketId']
]);
