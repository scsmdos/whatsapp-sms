-- SQL to create your admin user
-- Run this in phpMyAdmin on Hostinger

-- First, delete any existing test users
DELETE FROM users WHERE email = 'smssecure@gmail.com';

-- Create your admin user
INSERT INTO users (name, email, password, email_verified_at, created_at, updated_at) 
VALUES (
    'Admin', 
    'smssecure@gmail.com', 
    '$2y$12$vFQE3Z7pB5YxKzN8qHm5guO7YKZKJr5nE3xW.8dY6Uw7mZJQKZqKi',
    NOW(),
    NOW(),
    NOW()
);

-- Password is: Patna@2026
