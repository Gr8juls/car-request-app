const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_request_app'
};

async function migrateAssignedTo() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        // 1. Add columns if not exist
        console.log('Checking columns...');
        const [columns] = await connection.query(`DESCRIBE car_requests`);
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('assigned_to')) {
            console.log('Adding assigned_to column...');
            await connection.query(`ALTER TABLE car_requests ADD COLUMN assigned_to INT NULL AFTER user_id`);
        } else {
            console.log('assigned_to column already exists.');
        }

        if (!columnNames.includes('last_updated_at')) {
            console.log('Adding last_updated_at column...');
            await connection.query(`ALTER TABLE car_requests ADD COLUMN last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER status`);
        } else {
            console.log('last_updated_at column already exists.');
        }

        // 2. Backfill existing pending requests
        console.log('Backfilling assigned_to for pending requests...');

        // Use a join update if supported, or fetch and update loop for safety and logic visibility
        // Let's do a join update for efficiency
        const [updateResult] = await connection.query(`
            UPDATE car_requests r
            JOIN users u ON r.user_id = u.id
            SET r.assigned_to = u.line_manager_id
            WHERE r.status = 'pending' AND r.assigned_to IS NULL AND u.line_manager_id IS NOT NULL
        `);

        console.log(`Backfilled assigned_to for ${updateResult.affectedRows} requests.`);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

migrateAssignedTo();
