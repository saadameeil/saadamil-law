<?php
declare(strict_types=1);
require_once __DIR__ . '/admin-auth-core.php';
sa_start();
if (!sa_authenticated()) {
    session_write_close();
    header('Location: /admin.html', true, 303);
    exit;
}
session_write_close();
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) { header('Allow: GET, HEAD'); sa_error(405, 'method_not_allowed'); }
$path = __DIR__ . '/../data/admin-panel.html';
if (!is_file($path)) sa_error(503, 'administration_unavailable');
header('Content-Type: text/html; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'GET') readfile($path);
