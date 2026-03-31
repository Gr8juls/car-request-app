const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration: HR to HC...');

        // 1. Update users role
        console.log('Updating users role...');
        // First add 'hc' to the enum (preserve 'admin')
        await db.query(`ALTER TABLE users MODIFY COLUMN role ENUM('employee', 'manager', 'hr', 'hc', 'admin') NOT NULL`);
        // Update values
        await db.query(`UPDATE users SET role = 'hc' WHERE role = 'hr'`);
        // Remove 'hr' from enum (preserve 'admin')
        await db.query(`ALTER TABLE users MODIFY COLUMN role ENUM('employee', 'manager', 'hc', 'admin') NOT NULL`);

        console.log('Updating car_requests status...');
        // First add 'approved_by_hc' to the enum
        await db.query(`ALTER TABLE car_requests MODIFY COLUMN status ENUM('pending', 'approved_by_manager', 'approved_by_hr', 'approved_by_hc', 'rejected') DEFAULT 'pending'`);
        // Update values
        await db.query(`UPDATE car_requests SET status = 'approved_by_hc' WHERE status = 'approved_by_hr'`);
        // Remove 'approved_by_hr' from enum
        await db.query(`ALTER TABLE car_requests MODIFY COLUMN status ENUM('pending', 'approved_by_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending'`);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
