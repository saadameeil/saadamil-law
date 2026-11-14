<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'طريقة الطلب غير مسموح بها']);
    exit();
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'لم يتم استلام أي بيانات في الطلب']);
    exit();
}

// 1. Idempotency Check by Request ID
$dataDir = __DIR__ . '/../data';
$receiptsDir = $dataDir . '/receipts';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
    file_put_contents($dataDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}
if (!is_dir($receiptsDir)) {
    mkdir($receiptsDir, 0755, true);
    file_put_contents($receiptsDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}

$dataFile = $dataDir . '/consultations.json';
$existing = [];
if (file_exists($dataFile)) {
    $existing = json_decode(file_get_contents($dataFile), true) ?: [];
}

$requestId = trim($data['requestId'] ?? '');
if (!empty($requestId)) {
    foreach ($existing as $rec) {
        if (!empty($rec['requestId']) && $rec['requestId'] === $requestId) {
            // Return existing record (idempotency success)
            echo json_encode([
                'status' => 'success',
                'docketId' => $rec['docketId'],
                'duplicate' => true,
                'message' => 'تم استرجاع الطلب المسجل مسبقاً بنجاح'
            ]);
            exit();
        }
    }
}

// 2. Client Inputs Validation
$name = trim($data['name'] ?? '');
$rawPhone = trim($data['phone'] ?? '');

// Convert Arabic-Indic / Persian digits to standard 0-9
$arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
$persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
$latin = ['0','1','2','3','4','5','6','7','8','9'];
$phone = str_replace($persian, $latin, str_replace($arabic, $latin, $rawPhone));
$phone = preg_replace('/[\s\-\(\)\.]/', '', $phone);
$rawDigits = ltrim($phone, '+');

// Check dummy / repeated patterns
$allSame = (strlen($rawDigits) > 1 && count(array_unique(str_split($rawDigits))) === 1);
$consecutiveRep = (bool)preg_match('/(.)\1{5,}/', $rawDigits);
$dummySeq = (bool)preg_match('/^(?:012345678|123456789|987654321)/', $rawDigits);

// Strict Iraqi phone validation:
$startsWithIraqi = (bool)preg_match('/^(?:\+964|00964|964|07)/', $phone);
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

// Non-Iraqi international
$isIntlValid = (bool)preg_match('/^(?:\+|00)(?!964)[1-9]\d{8,14}$/', $phone);

if (mb_strlen($name) < 2 || $allSame || $consecutiveRep || $dummySeq || (!$isIraqiValid && !$isIntlValid)) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'يرجى إدخال اسم كامل ورقم هاتف حقيقي وفعال للتواصل.'
    ]);
    exit();
}

// 3. Server Truth for Pricing & Plans (Never trust client fee!)
$SERVER_PLANS = [
    'iraq' => [
        'name' => 'استشارة قانونية ودراسة ملف',
        'fee' => 75000,
        'currency' => 'IQD',
        'formatted' => '75,000 د.ع'
    ],
    'international' => [
        'name' => 'استشارة قانونية ودراسة ملف للمغتربين',
        'fee' => 100,
        'currency' => 'USD',
        'formatted' => '$100 USD'
    ]
];

$requestedPlanId = trim($data['planId'] ?? 'iraq');
$planKey = ($requestedPlanId === 'international' || ($data['category'] ?? '') === 'diaspora') ? 'international' : 'iraq';
$validatedPlan = $SERVER_PLANS[$planKey];

// 4. File Content & Magic Bytes Verification
$receiptBase64 = $data['receiptBase64'] ?? '';
if (empty($receiptBase64)) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'إرفاق إشعار أو وصل التحويل إلزامي لتأكيد حجز الاستشارة ومباشرة دراسة الملف.'
    ]);
    exit();
}

if (!preg_match('/^data:([^;]+);base64,(.+)$/', $receiptBase64, $m)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'تنسيق ترميز الملف المرفق غير صالح.']);
    exit();
}

$mime = strtolower(trim($m[1]));
$bin = base64_decode($m[2], true);
if ($bin === false || strlen($bin) < 50) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'الملف المرفق فارغ أو تالف. يرجى إرفاق إشعار تحويل صالح.']);
    exit();
}

if (strlen($bin) > 8.5 * 1024 * 1024) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'حجم الملف يتجاوز الحد الأقصى المسموح (8 ميغابايت).']);
    exit();
}

// Check magic bytes
$ext = '';
if (strpos($bin, '%PDF-') === 0) {
    $ext = 'pdf';
} elseif (substr($bin, 0, 3) === "\xFF\xD8\xFF") {
    $ext = 'jpg';
} elseif (substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n") {
    $ext = 'png';
} elseif (substr($bin, 0, 4) === 'RIFF' && substr($bin, 8, 4) === 'WEBP') {
    $ext = 'webp';
} else {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'بنية الملف المرفق لا تطابق مستندات PDF أو صور JPG/PNG/WebP الصالحة.'
    ]);
    exit();
}

// 5. Generate Official Docket ID and Save Record
$docketId = 'IQ-SA-' . date('Ymd') . '-' . mt_rand(1000, 9999);
$receiptFileName = $docketId . '.' . $ext;
file_put_contents($receiptsDir . '/' . $receiptFileName, $bin);

$record = [
    'docketId' => $docketId,
    'requestId' => $requestId ?: ('REQ-' . time() . '-' . mt_rand(100, 999)),
    'date' => $data['date'] ?? date('Y-m-d H:i:s'),
    'timestamp' => date('c'),
    'titlePrefix' => htmlspecialchars($data['titlePrefix'] ?? 'السيد'),
    'name' => htmlspecialchars($name),
    'phone' => htmlspecialchars($phone),
    'prefContact' => htmlspecialchars($data['prefContact'] ?? 'رسالة واتساب أولاً'),
    'prefTime' => htmlspecialchars($data['prefTime'] ?? 'أي وقت مناسب خلال ساعات الدوام'),
    'safeDiscreet' => htmlspecialchars($data['safeDiscreet'] ?? 'نعم'),
    'deadline' => htmlspecialchars($data['deadline'] ?? ''),
    'location' => htmlspecialchars($data['location'] ?? ''),
    'topic' => htmlspecialchars($data['topic'] ?? ''),
    'category' => htmlspecialchars($data['category'] ?? ''),
    'serviceTitle' => htmlspecialchars($data['serviceTitle'] ?? ''),
    'serviceId' => htmlspecialchars($data['serviceId'] ?? ''),
    'planId' => $planKey,
    'planName' => $validatedPlan['name'],
    'fee' => $validatedPlan['fee'],
    'currency' => $validatedPlan['currency'],
    'paymentMethod' => htmlspecialchars($data['paymentMethod'] ?? ($planKey === 'international' ? 'usd_chase' : 'qi_super')),
    'opponentName' => htmlspecialchars($data['opponentName'] ?? ''),
    'opponentPhone' => htmlspecialchars($data['opponentPhone'] ?? ''),
    'opponentLocation' => htmlspecialchars($data['opponentLocation'] ?? ''),
    'summary' => htmlspecialchars($data['summary'] ?? ''),
    'receiptFileName' => $receiptFileName,
    'receiptSize' => strlen($bin),
    'receiptMime' => $mime,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
];

array_unshift($existing, $record);
if (count($existing) > 500) {
    $existing = array_slice($existing, 0, 500);
}
file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'status' => 'success',
    'docketId' => $docketId,
    'planName' => $validatedPlan['name'],
    'fee' => $validatedPlan['fee'],
    'currency' => $validatedPlan['currency'],
    'formattedFee' => $validatedPlan['formatted'],
    'message' => 'تم حفظ طلب الاستشارة وإرفاق إشعار التحويل بنجاح في السجل الإداري للمكتب'
]);
exit();
