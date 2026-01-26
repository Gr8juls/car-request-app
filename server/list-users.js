const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function listUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.query('SELECT id, full_name, email, role, manager_level, department_id, sub_department_id FROM users');
        console.table(users);
    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

listUsers();
