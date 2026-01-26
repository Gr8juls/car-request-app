const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function fixHcRoles() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('Updating roles for Human Capital department users...');

        // Find Human Capital Department ID
        const [deptRows] = await connection.query("SELECT id FROM departments WHERE name = 'Human Capital'");
        if (deptRows.length === 0) {
            console.log('Human Capital department not found!');
            return;
        }
        const hcDeptId = deptRows[0].id;
        console.log(`Human Capital Department ID: ${hcDeptId}`);

        // Update Users
        const [result] = await connection.query(
            "UPDATE users SET role = 'hc' WHERE department_id = ? AND role != 'hc'",
            [hcDeptId]
        );

        console.log(`Updated ${result.changedRows} user(s) to 'hc' role.`);

    } catch (error) {
        console.error('Error updating roles:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixHcRoles();
