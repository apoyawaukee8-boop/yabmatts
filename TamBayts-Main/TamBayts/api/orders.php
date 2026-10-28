<?php
declare(strict_types=1);

require_once __DIR__ . '/http.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

try {
    $db = database();
    $user = requireRole($db, 'student');
    $clientId = $user['clientId'];
    if (!validClientId($clientId)) jsonResponse(['error' => 'Student account is not configured for orders.'], 403);

    if ($method === 'GET') {
        jsonResponse(['orders' => ordersForClient($db, $clientId)]);
    }

    $payload = requestJson();
    $rawItems = $payload['items'] ?? null;
    if (!is_array($rawItems) || count($rawItems) < 1 || count($rawItems) > 50) {
        jsonResponse(['error' => 'An order must contain between 1 and 50 items.'], 400);
    }

    $quantities = [];
    foreach ($rawItems as $item) {
        if (!is_array($item) || !is_string($item['name'] ?? null)) {
            jsonResponse(['error' => 'Each item must include a valid name and quantity.'], 400);
        }
        $name = trim($item['name']);
        $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
        if ($name === '' || strlen($name) > 120 || $quantity === false || $quantity < 1 || $quantity > 100) {
            jsonResponse(['error' => 'Item names and quantities are invalid. Quantity must be from 1 to 100.'], 400);
        }
        $quantities[$name] = ($quantities[$name] ?? 0) + $quantity;
        if ($quantities[$name] > 100) {
            jsonResponse(['error' => 'Combined quantity for an item cannot exceed 100.'], 400);
        }
    }

    $db->beginTransaction();
    $userId = $user['id'];
    $findMenuItem = $db->prepare(
        'SELECT id, name, price FROM menu_items WHERE name = ? AND is_available = 1 LIMIT 1 FOR UPDATE'
    );
    $orderItems = [];
    $total = 0.0;
    foreach ($quantities as $name => $quantity) {
        $findMenuItem->execute([$name]);
        $menuItem = $findMenuItem->fetch();
        if (!$menuItem) {
            $db->rollBack();
            jsonResponse(['error' => 'One or more items are unavailable. Refresh the menu and try again.'], 409);
        }
        $unitPrice = (float) $menuItem['price'];
        $total += $unitPrice * $quantity;
        $orderItems[] = [
            'menuItemId' => (int) $menuItem['id'],
            'name' => $menuItem['name'],
            'unitPrice' => $unitPrice,
            'quantity' => $quantity,
        ];
    }

    $orderCode = 'TB-' . strtoupper(bin2hex(random_bytes(6)));
    $createOrder = $db->prepare(
        "INSERT INTO orders (order_code, user_id, status, total, payment_method) VALUES (?, ?, 'Pending', ?, 'cash_on_pickup')"
    );
    $createOrder->execute([$orderCode, $userId, number_format($total, 2, '.', '')]);
    $orderId = (int) $db->lastInsertId();
    $createItem = $db->prepare(
        'INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($orderItems as $item) {
        $createItem->execute([
            $orderId,
            $item['menuItemId'],
            $item['name'],
            number_format($item['unitPrice'], 2, '.', ''),
            $item['quantity'],
        ]);
    }
    $db->commit();

    jsonResponse(['order' => orderForClient($db, $clientId, $orderCode)], 201);
} catch (Throwable $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('TamBayts order API failed: ' . $exception->getMessage());
    jsonResponse(['error' => 'Unable to process the order. Check the server and database configuration.'], 500);
}
