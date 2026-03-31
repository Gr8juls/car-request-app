const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function checkUsers() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log("--- USERS SCHEMA ---");
        const [columns] = await connection.query("SHOW COLUMNS FROM users");
        console.table(columns);

        console.log("\n--- CURRENT MDs IN DB ---");
        const [mds] = await connection.query("SELECT id, full_name, role, manager_level, is_active FROM users WHERE manager_level = 'md'");
        console.table(mds);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkUsers();
