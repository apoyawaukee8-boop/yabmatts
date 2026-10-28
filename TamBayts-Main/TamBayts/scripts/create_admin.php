<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/database.php';

function ask(string $prompt): string
{
    fwrite(STDOUT, $prompt);
    return trim((string) fgets(STDIN));
}

$name = ask('Administrator name: ');
$email = strtolower(ask('Administrator email: '));
$password = ask('Password (at least 12 characters): ');
if ($name === '' || strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($password) < 12 || strlen($password) > 200) {
    fwrite(STDERR, "Invalid name, email, or password.\n"); exit(1);
}
try {
    $db = database();
    $insert = $db->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')");
    $insert->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Administrator account created. Sign in at /login.html and choose Administrator.\n");
} catch (PDOException $e) {
    if ($e->getCode() === '23000') fwrite(STDERR, "That email is already registered; no account was changed.\n");
    else fwrite(STDERR, "Could not create administrator account. Check the database configuration.\n");
    exit(1);
}
