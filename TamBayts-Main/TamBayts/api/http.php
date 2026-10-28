<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/database.php';

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestJson(): array
{
    $input = file_get_contents('php://input');
    $payload = json_decode($input ?: '', true);
    if (!is_array($payload)) {
        jsonResponse(['error' => 'Request body must be valid JSON.'], 400);
    }
    return $payload;
}

function validClientId(mixed $clientId): bool
{
    return is_string($clientId)
        && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $clientId) === 1;
}

function startAuthSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $sessionLifetime = 60 * 60 * 24 * 7;
    session_name('tambayts_session');
    ini_set('session.gc_maxlifetime', (string) $sessionLifetime);
    session_set_cookie_params([
        'lifetime' => $sessionLifetime,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function sessionUser(PDO $db, ?string $role = null): ?array
{
    startAuthSession();
    $userIds = $_SESSION['user_ids'] ?? [];
    if (!is_array($userIds)) $userIds = [];
    if ($role === null) {
        $requestedRole = $_GET['role'] ?? null;
        if (in_array($requestedRole, ['admin', 'student'], true)) {
            $role = $requestedRole;
        } elseif (!empty($_SESSION['user_id'])) {
            $id = $_SESSION['user_id'];
        } elseif (count($userIds) === 1) {
            $role = (string) array_key_first($userIds);
        } else {
            return null;
        }
    }
    if (!isset($id)) $id = $userIds[$role] ?? ($_SESSION['user_id'] ?? null);
    if (!is_int($id) && !ctype_digit((string) $id)) return null;
    $query = $db->prepare('SELECT id, name, email, role, client_id, course FROM users WHERE id = ? LIMIT 1');
    $query->execute([(int) $id]);
    $user = $query->fetch();
    if (!$user || ($role !== null && $user['role'] !== $role)) {
        if ($role !== null && isset($_SESSION['user_ids']) && is_array($_SESSION['user_ids'])) unset($_SESSION['user_ids'][$role]);
        else unset($_SESSION['user_id']);
        return null;
    }
    return [
        'id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'],
        'role' => $user['role'], 'clientId' => $user['client_id'], 'course' => $user['course'],
    ];
}

function requireRole(PDO $db, string $role): array
{
    $user = sessionUser($db, $role);
    if ($user === null) {
        jsonResponse(['error' => 'Please sign in with an authorized account.', 'loginRequired' => true], 401);
    }
    return $user;
}

function userForClient(PDO $db, string $clientId, string $studentName): int
{
    $find = $db->prepare('SELECT id FROM users WHERE client_id = ?');
    $find->execute([$clientId]);
    $userId = $find->fetchColumn();
    if ($userId !== false) {
        $update = $db->prepare('UPDATE users SET name = ? WHERE id = ?');
        $update->execute([$studentName, $userId]);
        return (int) $userId;
    }

    $guestEmail = 'guest-' . strtolower($clientId) . '@guest.tambayts.local';
    $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
    $insert = $db->prepare('INSERT INTO users (name, email, password_hash, client_id) VALUES (?, ?, ?, ?)');
    try {
        $insert->execute([$studentName, $guestEmail, $passwordHash, $clientId]);
        return (int) $db->lastInsertId();
    } catch (PDOException $exception) {
        // Another request for this browser may have created the guest row first.
        $find->execute([$clientId]);
        $userId = $find->fetchColumn();
        if ($userId !== false) {
            return (int) $userId;
        }
        throw $exception;
    }
}

function orderForClient(PDO $db, string $clientId, string $orderCode): ?array
{
    $query = $db->prepare(
        "SELECT o.id AS row_id, o.order_code AS id, o.status, o.total, o.payment_method, o.payment_status, o.created_at, u.name AS student
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE u.client_id = ? AND o.order_code = ?"
    );
    $query->execute([$clientId, $orderCode]);
    $row = $query->fetch();
    if (!$row) {
        return null;
    }
    $itemsQuery = $db->prepare('SELECT item_name FROM order_items WHERE order_id = ? ORDER BY id');
    $itemsQuery->execute([$row['row_id']]);
    return [
        'id' => $row['id'],
        'names' => $itemsQuery->fetchAll(PDO::FETCH_COLUMN),
        'total' => (float) $row['total'],
        'paymentMethod' => $row['payment_method'] === 'cash_on_pickup' ? 'Cash on pickup' : 'Cash',
        'paymentStatus' => $row['payment_status'],
        'status' => $row['status'] === 'Completed' ? 'Picked up' : $row['status'],
        'createdAt' => date('M j, Y g:i A', strtotime($row['created_at'])),
        'student' => $row['student'],
    ];
}

function ordersForClient(PDO $db, string $clientId): array
{
    $query = $db->prepare(
        "SELECT o.order_code
         FROM orders o JOIN users u ON u.id = o.user_id
         WHERE u.client_id = ?
         ORDER BY o.created_at DESC, o.id DESC"
    );
    $query->execute([$clientId]);
    $orders = [];
    foreach ($query->fetchAll(PDO::FETCH_COLUMN) as $orderCode) {
        $order = orderForClient($db, $clientId, (string) $orderCode);
        if ($order !== null) {
            $orders[] = $order;
        }
    }
    return $orders;
}
