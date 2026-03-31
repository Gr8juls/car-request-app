const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Update users table role enum
        console.log('Updating users table role enum...');
        await db.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('employee', 'manager', 'hc', 'admin', 'driver') NOT NULL
        `);
        console.log('Users table updated.');

        // 2. Add assigned_driver_id to car_requests table
        console.log('Checking if assigned_driver_id column exists...');
        const [columns] = await db.query(`SHOW COLUMNS FROM car_requests LIKE 'assigned_driver_id'`);

        if (columns.length === 0) {
            console.log('Adding assigned_driver_id column...');
            await db.query(`
                ALTER TABLE car_requests 
                ADD COLUMN assigned_driver_id INT NULL
            `);

            console.log('Adding foreign key constraint...');
            await db.query(`
                ALTER TABLE car_requests 
                ADD CONSTRAINT fk_driver FOREIGN KEY (assigned_driver_id) REFERENCES users(id)
            `);
            console.log('Column and constraint added.');
        } else {
            console.log('assigned_driver_id column already exists.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
