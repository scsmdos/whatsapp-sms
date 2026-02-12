<?php
// Test file to diagnose the issue
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

$results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'tests' => []
];

// Test 1: PHP is working
$results['tests']['php_working'] = 'YES';

// Test 2: Check if we can connect to database
try {
    $host = '127.0.0.1';
    $db = 'u243980834_bulk_sms';
    $user = 'u243980834_bulksms';
    $pass = 'Bulksms@2026';
    
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $results['tests']['database_connection'] = 'SUCCESS';
    
    // Test 3: Check if users table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        $results['tests']['users_table_exists'] = 'YES';
        
        // Test 4: Count users
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        $results['tests']['users_count'] = $count['count'];
    } else {
        $results['tests']['users_table_exists'] = 'NO - TABLE MISSING!';
    }
    
} catch (Exception $e) {
    $results['tests']['database_connection'] = 'FAILED: ' . $e->getMessage();
}

// Test 5: Check Laravel installation
$results['tests']['laravel_vendor_exists'] = file_exists(__DIR__ . '/../../vendor/autoload.php') ? 'YES' : 'NO';
$results['tests']['laravel_public_path'] = __DIR__;

echo json_encode($results, JSON_PRETTY_PRINT);
