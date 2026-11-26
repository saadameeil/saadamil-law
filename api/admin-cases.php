<?php
declare(strict_types=1);
require_once __DIR__ . '/admin-auth-core.php';
sa_require_admin();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { header('Allow: GET'); sa_error(405, 'method_not_allowed'); }
$path = __DIR__ . '/../data/cases.json';
if (!is_file($path)) sa_json(200, []);
$raw = file_get_contents($path);
if ($raw === false || !is_array(json_decode($raw, true))) sa_error(503, 'cases_unavailable');
header('Content-Type: application/json; charset=utf-8');
echo $raw;
