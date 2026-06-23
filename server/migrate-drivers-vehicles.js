require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'car_request_app'
    });

    try {
        console.log('Creating vehicles table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT NOT NULL AUTO_INCREMENT,
                vehicle_name VARCHAR(100) NOT NULL,
                reg_no VARCHAR(20) NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY (reg_no)
            )
        `);
        console.log('vehicles table created.');

        console.log('Creating drivers table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS drivers (
                id INT NOT NULL AUTO_INCREMENT,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        `);
        console.log('drivers table created.');

        // Alter car_requests to drop foreign key constraint on assigned_driver_id if it exists,
        // or just let it be since we'll store driver_allocated and reg_no directly in car_requests.
        // Wait, assigned_driver_id might be constrained to users table.
        // Let's check if there's a foreign key constraint. We'll just leave assigned_driver_id as an INT that refers to drivers.id now, instead of users.id.
        // Since we are changing what assigned_driver_id means (now it points to drivers table instead of users table), we might need to remove any FK constraint on it.
        // Let's just try to remove the constraint.
        try {
            await connection.execute(`ALTER TABLE car_requests DROP FOREIGN KEY car_requests_ibfk_assigned_driver`);
            console.log('Dropped foreign key on assigned_driver_id.');
        } catch (e) {
            console.log('No foreign key constraint found for assigned_driver_id, or another error:', e.message);
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
