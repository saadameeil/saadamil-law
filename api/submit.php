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
    echo json_encode(['status' => 'error', 'message' => 'طريقة الطلب غير مسموح بها']);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data && !empty($_POST)) {
    $data = $_POST;
}

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'لم يتم استلام أي بيانات في الطلب']);
    exit();
}

$name = trim($data['name'] ?? '');
$rawPhone = trim($data['phone'] ?? '');

// Convert Arabic-Indic / Persian digits to standard 0-9
$arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
$persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
$latin = ['0','1','2','3','4','5','6','7','8','9'];
$phone = str_replace($persian, $latin, str_replace($arabic, $latin, $rawPhone));
$phone = preg_replace('/[\s\-\(\)\.]/', '', $phone);
$rawDigits = ltrim($phone, '+');

// Check all same digit (e.g. 11111111111, 00000000000)
$allSame = (strlen($rawDigits) > 1 && count(array_unique(str_split($rawDigits))) === 1);
$consecutiveRep = preg_match('/(.)\1{5,}/', $rawDigits);
$dummySeq = preg_match('/^(?:012345678|123456789|987654321)/', $rawDigits);

// Strict Iraqi phone validation:
$startsWithIraqi = preg_match('/^(?:\+964|00964|964|07)/', $phone);
$isIraqiValid = false;

if ($startsWithIraqi) {
    $isIraqiValid = (bool)preg_match('/^(?:\+964|00964|964|0)?7[3-9]\d{8}$/', $phone);
    if (!$isIraqiValid) {
        http_response_code(422);
        echo json_encode([
            'status' => 'error',
            'message' => 'رقم الهاتف يبدأ برمز العراق (+964) لكنه غير مكتمل أو غير صحيح. يرجى إدخال 11 رقماً تبدأ بـ 07.'
        ]);
        exit();
    }
}

// Strictly non-Iraqi international
$isIntlValid = (bool)preg_match('/^(?:\+|00)(?!964)[1-9]\d{8,14}$/', $phone);

if (mb_strlen($name) < 2 || $allSame || $consecutiveRep || $dummySeq || (!$isIraqiValid && !$isIntlValid)) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'يرجى إدخال اسم كامل ورقم هاتف حقيقي وفعال للتواصل.'
    ]);
    exit();
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
    // Create htaccess to protect data directory from direct web download
    file_put_contents($dataDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}

$dataFile = $dataDir . '/consultations.json';
$existing = [];

if (file_exists($dataFile)) {
    $content = file_get_contents($dataFile);
    $existing = json_decode($content, true) ?: [];
}

// Format submission record
$docketId = !empty($data['docketId']) ? htmlspecialchars($data['docketId']) : ('IQ-SA-' . rand(10000, 99999));
$fee = !empty($data['fee']) ? htmlspecialchars((string)$data['fee']) : '75000';
$currency = !empty($data['currency']) ? htmlspecialchars((string)$data['currency']) : 'IQD';
$paymentMethod = !empty($data['paymentMethod']) ? htmlspecialchars((string)$data['paymentMethod']) : 'qi_super';

$submission = [
    'docketId' => $docketId,
    'date' => $data['date'] ?? date('Y-m-d H:i:s'),
    'timestamp' => $data['timestamp'] ?? date('c'),
    'titlePrefix' => htmlspecialchars($data['titlePrefix'] ?? 'السيد'),
    'name' => htmlspecialchars($name),
    'phone' => htmlspecialchars($phone),
    'deadline' => htmlspecialchars($data['deadline'] ?? ''),
    'location' => htmlspecialchars($data['location'] ?? 'بغداد'),
    'topic' => htmlspecialchars($data['topic'] ?? 'استشارة عامة'),
    'planName' => htmlspecialchars($data['planName'] ?? ($currency === 'USD' ? 'استشارة دولية للمغتربين' : 'استشارة قانونية ودراسة ملف')),
    'fee' => $fee,
    'currency' => $currency,
    'paymentMethod' => $paymentMethod,
    'opponentName' => htmlspecialchars($data['opponentName'] ?? ''),
    'opponentPhone' => htmlspecialchars($data['opponentPhone'] ?? ''),
    'opponentLocation' => htmlspecialchars($data['opponentLocation'] ?? ''),
    'summary' => htmlspecialchars($data['summary'] ?? ''),
    'receiptBase64' => $data['receiptBase64'] ?? '',
    'status' => 'جديدة - بانتظار مراجعة الإشعار',
    'notes' => ''
];

// Prepend to top
array_unshift($existing, $submission);

// Save safely
file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'status' => 'success',
    'message' => 'تم تسجيل طلب الاستشارة في السجل الرسمي للمكتب بنجاح.',
    'docketId' => $submission['docketId'],
    'fee' => $fee,
    'currency' => $currency
], JSON_UNESCAPED_UNICODE);