<?php
$host = '127.0.0.1';
$port = '3306';
$user = 'root';
$pass = ''; // Default XAMPP/Local password

try {
    $pdo = new PDO("mysql:host=$host;port=$port", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS bulk_whatsapp");
    echo "Database 'bulk_whatsapp' ensured successfully.\n";
} catch (PDOException $e) {
    echo "Warning: Could not connect to MySQL to create database. " . $e->getMessage() . "\n";
    echo "Please ensure MySQL is running and you have a database named 'bulk_whatsapp'.\n";
}
