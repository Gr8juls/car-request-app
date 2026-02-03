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

async function verify() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        console.log('Verifying line_manager_id updates...');

        const [rows] = await connection.query(`
            SELECT 
                u.full_name as Employee, 
                m.full_name as Manager, 
                u.manager_level as EmpLevel,
                m.manager_level as MgrLevel
            FROM users u
            LEFT JOIN users m ON u.line_manager_id = m.id
            WHERE u.line_manager_id IS NOT NULL
            LIMIT 10;
        `);

        if (rows.length === 0) {
            console.log('No line_manager_id relationships found. Migration might have failed to match names.');
        } else {
            console.log('Sample relationships found:');
            console.table(rows);
        }

        const [count] = await connection.query('SELECT COUNT(*) as count FROM users WHERE line_manager_id IS NOT NULL');
        console.log(`Total users with assigned Line Manager: ${count[0].count}`);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

verify();
