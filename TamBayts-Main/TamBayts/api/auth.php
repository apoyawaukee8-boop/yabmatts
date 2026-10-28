<?php
declare(strict_types=1);
require_once __DIR__ . '/http.php';

function publicUser(array $user): array { unset($user['password_hash']); return $user; }
function authLogin(PDO $db, int $id, string $role): array
{
    startAuthSession();
    $legacyUser = sessionUser($db);
    if ($legacyUser !== null) {
        $_SESSION['user_ids'] = is_array($_SESSION['user_ids'] ?? null) ? $_SESSION['user_ids'] : [];
        $_SESSION['user_ids'][$legacyUser['role']] = $legacyUser['id'];
        unset($_SESSION['user_id']);
    }
    $_SESSION['user_ids'] = is_array($_SESSION['user_ids'] ?? null) ? $_SESSION['user_ids'] : [];
    session_regenerate_id(true);
    $_SESSION['user_ids'][$role] = $id;
    $user = sessionUser($db, $role) ?? [];
    session_write_close();
    return $user;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
try {
    $db = database();
    if ($method === 'GET') {
        $configured = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() > 0;
        $localRequest = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
        $role = in_array($_GET['role'] ?? null, ['admin', 'student'], true) ? $_GET['role'] : null;
        jsonResponse(['user' => sessionUser($db, $role), 'adminSetupAvailable' => !$configured && $localRequest]);
    }
    if ($method !== 'POST') { header('Allow: GET, POST'); jsonResponse(['error' => 'Method not allowed.'], 405); }
    $payload = requestJson();
    $action = $payload['action'] ?? 'login';
    if ($action === 'logout') {
        startAuthSession();
        $role = in_array($payload['role'] ?? null, ['admin', 'student'], true) ? $payload['role'] : null;
        if ($role === null) {
            $_SESSION = [];
        } else {
            if (isset($_SESSION['user_ids']) && is_array($_SESSION['user_ids'])) unset($_SESSION['user_ids'][$role]);
        }
        if ($role !== null && isset($_SESSION['user_id'])) {
            $legacyUser = sessionUser($db);
            if ($legacyUser === null || $legacyUser['role'] === $role) unset($_SESSION['user_id']);
        }
        if ($role !== null && !empty($_SESSION['user_ids'])) {
            session_write_close();
            jsonResponse(['message' => 'Signed out.']);
        }
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'domain' => $params['domain'], 'secure' => $params['secure'], 'httponly' => $params['httponly'], 'samesite' => $params['samesite'] ?? 'Lax']);
        }
        session_destroy();
        jsonResponse(['message' => 'Signed out.']);
    }
    if ($action === 'update-profile') {
        $user = requireRole($db, 'student');
        $name = trim((string)($payload['name'] ?? $user['name']));
        $course = trim((string)($payload['course'] ?? $user['course'] ?? ''));
        if ($name === '' || strlen($name) > 120 || strlen($course) > 120) {
            jsonResponse(['error' => 'Enter a name and keep both fields within 120 characters.'], 400);
        }
        $update = $db->prepare('UPDATE users SET name = ?, course = ? WHERE id = ?');
        $update->execute([$name, $course ?: null, $user['id']]);
        jsonResponse(['user' => sessionUser($db, 'student')]);
    }
    if ($action === 'setup-admin') {
        if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) jsonResponse(['error' => 'Initial administrator setup is available only from this computer.'], 403);
        $name = trim((string)($payload['name'] ?? ''));
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');
        if ($name === '' || strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($password) < 12 || strlen($password) > 200) jsonResponse(['error' => 'Enter your name, a valid email, and a password with at least 12 characters.'], 400);
        $lock = $db->query("SELECT GET_LOCK('tambayts-first-admin', 8)")->fetchColumn();
        if ((int)$lock !== 1) jsonResponse(['error' => 'Administrator setup is busy. Try again.'], 503);
        $existing = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($existing > 0) { $db->query("SELECT RELEASE_LOCK('tambayts-first-admin')"); jsonResponse(['error' => 'An administrator account is already configured.'], 409); }
        try {
            $insert = $db->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')");
            $insert->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            $newId = (int)$db->lastInsertId();
            $db->query("SELECT RELEASE_LOCK('tambayts-first-admin')");
            jsonResponse(['user' => authLogin($db, $newId, 'admin')], 201);
        } catch (PDOException $e) {
            $db->query("SELECT RELEASE_LOCK('tambayts-first-admin')");
            if ($e->getCode() === '23000') jsonResponse(['error' => 'That email is already registered.'], 409);
            throw $e;
        }
    }
    if ($action === 'register') {
        $name = trim((string)($payload['name'] ?? ''));
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');
        $course = trim((string)($payload['course'] ?? ''));
        if ($name === '' || strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($password) < 8 || strlen($password) > 200 || strlen($course) > 120) {
            jsonResponse(['error' => 'Enter a name, valid email, course (optional), and password with at least 8 characters.'], 400);
        }
        $clientId = sprintf('%04x%04x-%04x-4%03x-%x%03x-%012x', random_int(0, 65535), random_int(0, 65535), random_int(0, 65535), random_int(0, 4095), random_int(8, 11), random_int(0, 4095), random_int(0, 0xffffffffffff));
        try {
            $insert = $db->prepare("INSERT INTO users (name,email,password_hash,role,client_id,course) VALUES (?,?,?,'student',?,?)");
            $insert->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $clientId, $course ?: null]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') jsonResponse(['error' => 'That email is already registered.'], 409);
            throw $e;
        }
        jsonResponse(['user' => authLogin($db, (int)$db->lastInsertId(), 'student')], 201);
    }
    if ($action !== 'login') jsonResponse(['error' => 'Unknown authentication action.'], 400);
    $email = strtolower(trim((string)($payload['email'] ?? '')));
    $password = (string)($payload['password'] ?? '');
    $role = $payload['role'] ?? '';
    if (!in_array($role, ['admin', 'student'], true) || !filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(['error' => 'Enter a valid email, password, and account type.'], 400);
    $query = $db->prepare('SELECT id, password_hash, role FROM users WHERE email = ? LIMIT 1');
    $query->execute([$email]);
    $account = $query->fetch();
    if (!$account || !password_verify($password, $account['password_hash']) || $account['role'] !== $role) jsonResponse(['error' => 'Email, password, or account type is incorrect.'], 401);
    jsonResponse(['user' => authLogin($db, (int)$account['id'], $role)]);
} catch (Throwable $e) {
    error_log('TamBayts auth API failed: ' . $e->getMessage());
    jsonResponse(['error' => 'Unable to complete sign in. Check the server and database configuration.'], 500);
}
