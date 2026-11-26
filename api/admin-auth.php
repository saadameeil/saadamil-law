<?php
declare(strict_types=1);
require_once __DIR__ . '/admin-auth-core.php';
sa_start();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    $authenticated = sa_authenticated();
    if (!$authenticated) unset($_SESSION['admin_version'], $_SESSION['admin_created'], $_SESSION['admin_last']);
    sa_json(200, ['status' => 'success', 'authenticated' => $authenticated, 'csrf' => $_SESSION['csrf']]);
}
if ($method !== 'POST') { header('Allow: GET, POST'); sa_error(405, 'method_not_allowed'); }
sa_csrf();
$input = sa_input(1024);
$action = $input['action'] ?? '';
if ($action === 'logout') {
    sa_forget();
    sa_json(200, ['status' => 'success', 'authenticated' => false]);
}
if ($action !== 'login') sa_error(400, 'unknown_action');
if (array_diff(array_keys($input), ['action', 'password'])) sa_error(400, 'unknown_fields');
$password = $input['password'] ?? null;
if (!is_string($password) || strlen($password) < 1 || strlen($password) > 72) sa_error(400, 'invalid_password');
if (!sa_rate_attempt()) { header('Retry-After: 900'); sa_error(429, 'try_later'); }
$config = sa_config();
if (!password_verify($password, $config['password_hash'])) sa_error(401, 'invalid_credentials');
sa_rate_attempt(true);
if (!session_regenerate_id(true)) sa_error(503, 'session_unavailable');
$_SESSION = ['admin_version' => $config['version'], 'admin_created' => time(), 'admin_last' => time(), 'csrf' => bin2hex(random_bytes(32))];
sa_json(200, ['status' => 'success', 'authenticated' => true, 'csrf' => $_SESSION['csrf']]);
