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

async function debugNames() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [users] = await connection.query('SELECT full_name FROM users LIMIT 20');
        console.log('Sample DB Names:', users.map(u => u.full_name));

    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

debugNames();
