const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function diagnose() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log("--- REQUESTS ---");
        const [requests] = await connection.query(`
            SELECT r.id, r.status, r.user_id, r.assigned_to, u.full_name as requester_name, u.manager_level as requester_level, m.full_name as assigned_manager
            FROM car_requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users m ON r.assigned_to = m.id
            ORDER BY r.created_at DESC
        `);
        console.table(requests);

        console.log("\n--- MD USERS ---");
        const [mds] = await connection.query("SELECT id, full_name, role, manager_level FROM users WHERE manager_level = 'md'");
        console.table(mds);

        console.log("\n--- OPS MANAGER USERS ---");
        const [ops] = await connection.query("SELECT id, full_name, role, manager_level, line_manager_id FROM users WHERE manager_level = 'operation'");
        console.table(ops);

        console.log("\n--- REQUESTS BY OPS MANAGER (ID 47) ---");
        const [mdRequests] = await connection.query(`
            SELECT r.id, r.status, r.user_id, u.full_name as requester_name, u.manager_level as requester_level, r.assigned_to 
            FROM car_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.assigned_to = 53
        `);
        console.table(mdRequests);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

diagnose();
