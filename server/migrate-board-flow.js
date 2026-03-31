const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Update users table manager_level ENUM
        console.log('Updating users.manager_level ENUM...');
        await connection.query(`
            ALTER TABLE users 
            MODIFY COLUMN manager_level ENUM('none', 'sub_department', 'department', 'operation', 'board', 'md') DEFAULT 'none';
        `);

        // Update car_requests status ENUM
        console.log('Updating car_requests.status ENUM...');
        await connection.query(`
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM('pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_md', 'approved_by_hc', 'rejected') DEFAULT 'pending';
        `);

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
