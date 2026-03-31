const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function migrateStatusEnum() {
    let connection;
    try {
        console.log('--- Migrating Status Enum ---');
        connection = await mysql.createConnection(dbConfig);

        // Modify the status column to include new values
        // We keep existing values to avoid data loss during migration
        const query = `
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM(
                'pending', 
                'approved_by_manager', 
                'approved_by_line_manager', 
                'approved_by_dept_head', 
                'approved_by_hc', 
                'rejected'
            ) DEFAULT 'pending'
        `;

        await connection.query(query);
        console.log('Successfully updated status ENUM.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

migrateStatusEnum();
