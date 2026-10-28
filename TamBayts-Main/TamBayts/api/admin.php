<?php
declare(strict_types=1);

require_once __DIR__ . '/http.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST', 'PATCH', 'DELETE'], true)) {
    header('Allow: GET, POST, PATCH, DELETE');
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

try {
    $db = database();
    requireRole($db, 'admin');

    if ($method === 'GET') {
        $menu = $db->query(
            'SELECT id, name, price, stall, category, image_url, is_available FROM menu_items ORDER BY name, id'
        )->fetchAll();

        $orderRows = $db->query(
            "SELECT o.id, o.order_code, o.status, o.total, o.payment_method, o.payment_status, o.created_at, u.name AS student
             FROM orders o JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC, o.id DESC LIMIT 8"
        )->fetchAll();
        $itemsQuery = $db->prepare('SELECT item_name FROM order_items WHERE order_id = ? ORDER BY id');
        $orders = [];
        foreach ($orderRows as $row) {
            $itemsQuery->execute([$row['id']]);
            $orders[] = [
                'id' => $row['order_code'],
                'names' => $itemsQuery->fetchAll(PDO::FETCH_COLUMN),
                'total' => (float) $row['total'],
                'paymentMethod' => $row['payment_method'] === 'cash_on_pickup' ? 'Cash on pickup' : 'Cash',
                'paymentStatus' => $row['payment_status'],
                'status' => $row['status'] === 'Completed' ? 'Picked up' : $row['status'],
                'student' => $row['student'],
                'createdAt' => $row['created_at'],
            ];
        }

        $students = $db->query(
            "SELECT name, CASE WHEN client_id IS NULL THEN email ELSE 'Guest checkout' END AS email, course
             FROM users ORDER BY created_at DESC LIMIT 8"
        )->fetchAll();
        $summary = $db->query(
            "SELECT COUNT(*) AS orders_today,
                    COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total ELSE 0 END), 0) AS sales_today
             FROM orders WHERE created_at >= CURRENT_DATE()"
        )->fetch();

        jsonResponse([
            'menu' => array_map(static fn(array $item): array => [
                'id' => (int) $item['id'],
                'name' => $item['name'],
                'price' => (float) $item['price'],
                'stall' => $item['stall'],
                'category' => $item['category'],
                'imageUrl' => $item['image_url'],
                'available' => (bool) $item['is_available'],
            ], $menu),
            'orders' => $orders,
            'students' => $students,
            'summary' => [
                'ordersToday' => (int) $summary['orders_today'],
                'salesToday' => (float) $summary['sales_today'],
                'studentCount' => (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn(),
            ],
        ]);
    }

    $payload = requestJson();
    $action = $payload['action'] ?? '';

    if ($method === 'POST' && $action === 'add-menu') {
        $name = trim((string) ($payload['name'] ?? ''));
        $category = strtolower(trim((string) ($payload['category'] ?? '')));
        $stall = trim((string) ($payload['stall'] ?? 'Campus Stall'));
        $price = filter_var($payload['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $allowedCategories = ['meals', 'drinks', 'snacks', 'healthy', 'pasta'];
        if ($name === '' || strlen($name) > 120 || !in_array($category, $allowedCategories, true)
            || $stall === '' || strlen($stall) > 80
            || $price === false || $price < 0 || $price > 99999999.99) {
            jsonResponse(['error' => 'Choose a valid category and enter a valid name, stall, and non-negative price.'], 400);
        }
        $duplicate = $db->prepare('SELECT id FROM menu_items WHERE LOWER(name) = LOWER(?) LIMIT 1');
        $duplicate->execute([$name]);
        if ($duplicate->fetchColumn() !== false) {
            jsonResponse(['error' => 'A menu item with that name already exists.'], 409);
        }
        $insert = $db->prepare(
            'INSERT INTO menu_items (name, price, stall, category, image_url, is_available) VALUES (?, ?, ?, ?, ?, 1)'
        );
        $insert->execute([$name, number_format((float) $price, 2, '.', ''), $stall, $category, null]);
        jsonResponse(['message' => 'Menu item added.', 'id' => (int) $db->lastInsertId(), 'imageUrl' => null], 201);
    }

    if ($method === 'PATCH' && $action === 'set-menu-availability') {
        $id = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT);
        $available = $payload['available'] ?? null;
        if ($id === false || $id < 1 || !is_bool($available)) {
            jsonResponse(['error' => 'Menu item ID and availability are required.'], 400);
        }
        $update = $db->prepare('UPDATE menu_items SET is_available = ? WHERE id = ?');
        $update->execute([$available ? 1 : 0, $id]);
        if ($update->rowCount() === 0 && !$db->query("SELECT 1 FROM menu_items WHERE id = " . (int) $id)->fetchColumn()) {
            jsonResponse(['error' => 'Menu item not found.'], 404);
        }
        jsonResponse(['message' => 'Menu availability updated.']);
    }

    if ($method === 'DELETE' && $action === 'delete-menu') {
        $id = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) {
            jsonResponse(['error' => 'A valid menu item ID is required.'], 400);
        }
        $findImage = $db->prepare('SELECT image_url FROM menu_items WHERE id = ?');
        $findImage->execute([$id]);
        $imageUrl = $findImage->fetchColumn();
        $delete = $db->prepare('DELETE FROM menu_items WHERE id = ?');
        $delete->execute([$id]);
        if ($delete->rowCount() === 0) {
            jsonResponse(['error' => 'Menu item not found.'], 404);
        }
        if (is_string($imageUrl) && preg_match('#^uploads/menu/food-[a-f0-9]{32}\.(?:jpg|png|webp)$#', $imageUrl) === 1) {
            @unlink(dirname(__DIR__) . '/' . $imageUrl);
        }
        jsonResponse(['message' => 'Menu item removed.']);
    }

    if ($method === 'PATCH' && $action === 'advance-order') {
        $orderCode = trim((string) ($payload['orderCode'] ?? ''));
        $nextStatus = match ($payload['nextStatus'] ?? '') {
            'Preparing' => 'Preparing',
            'Ready' => 'Ready',
            'Picked up' => 'Completed',
            default => null,
        };
        $previousStatus = match ($nextStatus) {
            'Preparing' => 'Pending',
            'Ready' => 'Preparing',
            'Completed' => 'Ready',
            default => null,
        };
        if ($orderCode === '' || $nextStatus === null) {
            jsonResponse(['error' => 'A valid order code and next status are required.'], 400);
        }
        if ($nextStatus === 'Completed') {
            $update = $db->prepare("UPDATE orders SET status = ?, payment_status = 'paid' WHERE order_code = ? AND status = ?");
        } else {
            $update = $db->prepare('UPDATE orders SET status = ? WHERE order_code = ? AND status = ?');
        }
        $update->execute([$nextStatus, $orderCode, $previousStatus]);
        if ($update->rowCount() !== 1) {
            jsonResponse(['error' => 'Order status could not be advanced. Refresh the dashboard and try again.'], 409);
        }
        jsonResponse(['message' => 'Order status updated.']);
    }

    jsonResponse(['error' => 'Unknown admin action.'], 400);
} catch (Throwable $exception) {
    error_log('TamBayts admin API failed: ' . $exception->getMessage());
    jsonResponse(['error' => 'Unable to complete the admin request. Check the server and database configuration.'], 500);
}
