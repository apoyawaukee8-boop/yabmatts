<?php
declare(strict_types=1);

require_once __DIR__ . '/http.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

try {
    $items = database()->query(
        'SELECT id, name, price, stall, category, image_url, is_available FROM menu_items ORDER BY id'
    )->fetchAll();
    $menu = array_map(static fn(array $item): array => [
        'id' => (int) $item['id'],
        'name' => $item['name'],
        'price' => (float) $item['price'],
        'stall' => $item['stall'],
        'category' => $item['category'],
        'imageUrl' => $item['image_url'],
        'available' => (bool) $item['is_available'],
    ], $items);
    jsonResponse(['menu' => $menu]);
} catch (Throwable $exception) {
    error_log('TamBayts menu API failed: ' . $exception->getMessage());
    jsonResponse(['error' => 'Unable to load the menu. Check the database configuration.'], 500);
}
