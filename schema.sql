-- Create Database
CREATE DATABASE IF NOT EXISTS car_request_app;
USE car_request_app;

-- Users Table
-- Roles: 'employee', 'manager', 'hc'
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed password
    role ENUM('employee', 'manager', 'hc') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Car Requests Table
-- Status: 'pending', 'approved_by_manager', 'approved_by_hc', 'rejected'
CREATE TABLE IF NOT EXISTS car_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    department VARCHAR(100),
    location VARCHAR(100),
    purpose TEXT,
    car_model VARCHAR(100) NOT NULL,
    reason TEXT,
    date_out DATE NOT NULL,
    time_out TIME,
    date_back DATE NOT NULL,
    time_back TIME,
    status ENUM('pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending',
    manager_comment TEXT,
    hr_comment TEXT,
    driver_allocated VARCHAR(100),
    vehicle_allocated VARCHAR(100),
    reg_no VARCHAR(20),
    meter_reading_start INT,
    meter_reading_finish INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed Data (Optional, for testing)
-- Passwords should be hashed in real app. For seed, we might inserting plain text and handle hash in code or assume specific hash.
-- Here we just create structure.
