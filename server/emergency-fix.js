const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function fixChantal() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log("Restoring Chantal as MD...");
        // id 53 is Chantal Habiyakare
        await connection.query(`
            UPDATE users 
            SET manager_level = 'md', line_manager_id = NULL 
            WHERE id = 53
        `);
        console.log("Chantal restored.");

        console.log("Fixing Charles (Ops Manager) routing...");
        // id 47 is Charles. Set his line manager to Chantal (53)
        await connection.query(`
            UPDATE users 
            SET line_manager_id = 53 
            WHERE id = 47
        `);

        // Reassign his orphaned requests to MD
        await connection.query(`
            UPDATE car_requests 
            SET assigned_to = 53 
            WHERE user_id = 47 AND status = 'approved_by_ops_manager'
        `);
        console.log("Charles fixed.");

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

fixChantal();
