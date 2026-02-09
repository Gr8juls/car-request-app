const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration for Rafiki Gilbert and schema update...');

        // 1. Update car_requests status enum
        console.log('Updating car_requests status enum to include "completed"...');
        await db.query("ALTER TABLE car_requests MODIFY COLUMN status ENUM('pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_md', 'approved_by_hc', 'rejected', 'completed') DEFAULT 'pending'");
        console.log('Status enum updated.');

        // 2. Update Rafiki Gilbert's role and department
        // Assuming Department ID 13 is Operations as discovered earlier
        console.log('Updating Rafiki Gilbert role and department...');
        const [result] = await db.query("UPDATE users SET role = 'driver', department_id = 13 WHERE full_name = 'Rafiki Gilbert'");

        if (result.affectedRows > 0) {
            console.log('Rafiki Gilbert updated successfully.');
        } else {
            console.log('Rafiki Gilbert not found or no changes made.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
