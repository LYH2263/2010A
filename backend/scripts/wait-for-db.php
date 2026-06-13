<?php
/**
 * 等待 MySQL 就绪后再退出（供 Docker 启动时使用）
 * 使用环境变量：DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
 */
$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '3306';
$dbname = getenv('DB_DATABASE') ?: 'shop';
$user = getenv('DB_USERNAME') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: 'secret';

$dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
$max = 30;
$n = 0;

while ($n < $max) {
    try {
        new PDO($dsn, $user, $pass, [PDO::ATTR_TIMEOUT => 2]);
        exit(0);
    } catch (Throwable $e) {
        $n++;
        if ($n >= $max) {
            fwrite(STDERR, "Could not connect to DB after {$max} attempts: " . $e->getMessage() . "\n");
            exit(1);
        }
        sleep(2);
    }
}
