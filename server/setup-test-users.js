const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function setupUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Employee (Dept 1, Sub 1)
        await connection.query(`
            INSERT INTO users (email, password, role, full_name, department_id, sub_department_id)
            VALUES ('emp_test@example.com', ?, 'employee', 'Test Employee', 1, 1)
            ON DUPLICATE KEY UPDATE password = VALUES(password);
        `, [hashedPassword]);

        // 2. Manager (Dept 1, Sub 1)
        await connection.query(`
            INSERT INTO users (email, password, role, full_name, department_id, sub_department_id)
            VALUES ('mgr_test@example.com', ?, 'manager', 'Test Manager', 1, 1)
            ON DUPLICATE KEY UPDATE password = VALUES(password);
        `, [hashedPassword]);

        // 3. HC
        await connection.query(`
            INSERT INTO users (email, password, role, full_name, department_id, sub_department_id)
            VALUES ('hc_test@example.com', ?, 'hc', 'Test HC', 5, 7) -- Assuming 5 is HC dept
            ON DUPLICATE KEY UPDATE password = VALUES(password);
        `, [hashedPassword]);

        console.log('Test users setup completed.');
    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

setupUsers();
