<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$LAWYER_PIN = '188572';
$LAWYER_PASS = 'SaadLawyer@2026';

// Check Auth
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$pinParam = $_GET['pin'] ?? $_POST['pin'] ?? '';

$isAuthorized = false;
if ($pinParam === $LAWYER_PIN || $pinParam === $LAWYER_PASS) {
    $isAuthorized = true;
} elseif (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = trim($matches[1]);
    if ($token === $LAWYER_PIN || $token === $LAWYER_PASS) {
        $isAuthorized = true;
    }
}

if (!$isAuthorized) {
    http_response_code(401);
    echo json_encode(['status' => 'unauthorized', 'message' => 'رمز الدخول غير صحيح']);
    exit();
}

$dataFile = __DIR__ . '/../data/consultations.json';
$existing = [];

if (file_exists($dataFile)) {
    $content = file_get_contents($dataFile);
    $existing = json_decode($content, true) ?: [];
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    echo json_encode([
        'status' => 'success',
        'count' => count($existing),
        'dockets' => $existing
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;
    $action = $input['action'] ?? $action;

    if ($action === 'update_status') {
        $docketId = $input['docketId'] ?? '';
        $newStatus = $input['status'] ?? '';
        $notes = $input['notes'] ?? null;

        $updated = false;
        foreach ($existing as &$sub) {
            if ($sub['docketId'] === $docketId) {
                if ($newStatus) $sub['status'] = $newStatus;
                if ($notes !== null) $sub['notes'] = $notes;
                $updated = true;
                break;
            }
        }
        if ($updated) {
            file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(['status' => 'success', 'message' => 'تم التحديث بنجاح']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'الإضبارة غير موجودة']);
        }
        exit();
    }

    if ($action === 'delete') {
        $docketId = $input['docketId'] ?? '';
        $existing = array_values(array_filter($existing, function($sub) use ($docketId) {
            return $sub['docketId'] !== $docketId;
        }));
        file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['status' => 'success', 'message' => 'تم الحذف']);
        exit();
    }

    if ($action === 'add_manual') {
        $manual = [
            'docketId' => 'IQ-' . date('Y') . '-MANUAL-' . rand(100, 999),
            'date' => date('Y-m-d H:i:s'),
            'timestamp' => date('c'),
            'titlePrefix' => htmlspecialchars($input['titlePrefix'] ?? 'السيد'),
            'name' => htmlspecialchars($input['name'] ?? ''),
            'phone' => htmlspecialchars($input['phone'] ?? ''),
            'location' => htmlspecialchars($input['location'] ?? 'بغداد'),
            'topic' => htmlspecialchars($input['topic'] ?? 'دعوى مكتبية'),
            'opponentName' => htmlspecialchars($input['opponentName'] ?? ''),
            'opponentPhone' => htmlspecialchars($input['opponentPhone'] ?? ''),
            'summary' => htmlspecialchars($input['summary'] ?? ''),
            'receiptBase64' => '',
            'paymentMethod' => 'مكتبي',
            'status' => 'تم التوكيل',
            'notes' => htmlspecialchars($input['notes'] ?? '')
        ];
        array_unshift($existing, $manual);
        file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['status' => 'success', 'docketId' => $manual['docketId']]);
        exit();
    }
}

echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
