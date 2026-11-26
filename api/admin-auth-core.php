<?php
declare(strict_types=1);

// All production secrets are loaded from protected server storage, never HTML.
function sa_config(): array {
    static $config = null;
    if ($config !== null) return $config;
    $path = __DIR__ . '/../data/admin-auth-config.php';
    if (!is_file($path)) sa_error(503, 'administration_unavailable');
    // Credential rotation must not wait for the PHP opcode cache to revalidate.
    if (function_exists('opcache_invalidate')) @opcache_invalidate($path, true);
    $loaded = require $path;
    if (!is_array($loaded) || !is_string($loaded['password_hash'] ?? null)
        || !is_string($loaded['version'] ?? null) || !is_string($loaded['rate_secret'] ?? null)
        || strlen($loaded['version']) < 32 || strlen($loaded['rate_secret']) < 32
        || !str_starts_with($loaded['password_hash'], '$2y$')) sa_error(503, 'administration_unavailable');
    $config = $loaded;
    return $config;
}

function sa_private_headers(): void {
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}

function sa_json(int $status, array $data): never {
    sa_private_headers();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function sa_error(int $status, string $code): never {
    sa_json($status, ['status' => 'error', 'code' => $code]);
}

function sa_start(): void {
    sa_private_headers();
    if (($_SERVER['HTTPS'] ?? '') !== 'on' && (int)($_SERVER['SERVER_PORT'] ?? 0) !== 443) {
        sa_error(400, 'https_required');
    }
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') sa_error(403, 'cross_site_request');
    if (session_status() !== PHP_SESSION_ACTIVE) {
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.cookie_secure', '1');
        ini_set('session.cookie_httponly', '1');
        session_name('__Host-SaadAdmin');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => true,
            'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) sa_error(503, 'session_unavailable');
    }
    if (!is_string($_SESSION['csrf'] ?? null)) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function sa_forget(): void {
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
    setcookie('__Host-SaadAdmin', '', ['expires' => time() - 3600, 'path' => '/',
        'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
}

function sa_authenticated(): bool {
    $config = sa_config();
    $now = time();
    $version = $_SESSION['admin_version'] ?? '';
    $created = $_SESSION['admin_created'] ?? 0;
    $last = $_SESSION['admin_last'] ?? 0;
    if (!is_string($version) || !hash_equals($config['version'], $version)
        || !is_int($created) || !is_int($last) || $created > $now || $last > $now
        || $now - $created > 28800 || $now - $last > 1800) return false;
    $_SESSION['admin_last'] = $now;
    return true;
}

function sa_csrf(): void {
    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== 'https://saadamil.com') sa_error(403, 'origin_required');
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || $token === '' || !hash_equals($_SESSION['csrf'], $token)) sa_error(403, 'csrf_required');
}

function sa_require_admin(bool $write = false): void {
    sa_start();
    if (!sa_authenticated()) sa_error(401, 'authentication_required');
    if ($write) sa_csrf();
    session_write_close();
}

function sa_input(int $limit = 4096): array {
    if (!preg_match('~^application/json(?:\s*;|$)~i', $_SERVER['CONTENT_TYPE'] ?? '')) sa_error(415, 'json_required');
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $limit) sa_error(413, 'request_too_large');
    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) sa_error(413, 'request_too_large');
    try { $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { sa_error(400, 'invalid_json'); }
    if (!is_array($input) || array_is_list($input)) sa_error(400, 'invalid_object');
    return $input;
}

// The HMAC key and rate file stay server-side. No raw IPs or passwords are stored.
function sa_rate_attempt(bool $clearClient = false): bool {
    $config = sa_config();
    $key = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $config['rate_secret']);
    $path = __DIR__ . '/../data/admin-auth-rate.php';
    $file = fopen($path, 'c+');
    if ($file === false || !flock($file, LOCK_EX)) sa_error(503, 'login_unavailable');
    try {
        @chmod($path, 0600);
        $prefix = "<?php exit; ?>\n";
        $raw = stream_get_contents($file);
        if ($raw === false || strlen($raw) > 1048576) sa_error(503, 'login_unavailable');
        $state = $raw === '' ? [] : json_decode(substr($raw, strlen($prefix)), true);
        if (!is_array($state)) sa_error(503, 'login_unavailable');
        $now = time();
        $state = array_filter($state, fn($v) => is_array($v) && ($v['until'] ?? 0) > $now);
        $global = $state['global'] ?? ['count' => 0, 'until' => $now + 900];
        $client = $state[$key] ?? ['count' => 0, 'until' => $now + 900];
        $allowed = ($global['count'] ?? 120) < 120 && ($client['count'] ?? 5) < 5;
        if ($clearClient) {
            unset($state[$key]);
        } elseif ($allowed) {
            $global['count']++;
            $client['count']++;
            $state['global'] = $global;
            $state[$key] = $client;
        }
        $encoded = $prefix . json_encode($state, JSON_THROW_ON_ERROR);
        rewind($file);
        if (fwrite($file, $encoded) !== strlen($encoded) || !ftruncate($file, strlen($encoded)) || !fflush($file)) sa_error(503, 'login_unavailable');
        return $clearClient || $allowed;
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}
