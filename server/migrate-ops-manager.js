const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app',
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Alter car_requests table to update ENUM
        // We include all previous values + new one to match schema.sql update intent (though schema.sql in view was slightly different from replace content, I should be careful).
        // The view_file output for schema.sql showed: status ENUM('pending', 'approved_by_manager', 'approved_by_hc', 'rejected') 
        // But my replace used 'approved_by_line_manager', 'approved_by_dept_head' etc.
        // Wait, the previous view_file of schema.sql (Step 21) showed:
        // 30:     status ENUM('pending', 'approved_by_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending',
        // It seems the schema.sql file I viewed earlier was NOT updated with 'approved_by_line_manager' etc from previous tasks? 
        // Or maybe I missed that. 
        // Actually, the Conversation History says "The user has approved the implementation plan...".
        // In the previous conversation (f75baee1), the user wanted to implement approval matrix.
        // It seems schema.sql might be out of sync with actual DB if the app is running with those statuses.
        // Let's check what the APP code uses. 
        // carRequestController.js uses: 'approved_by_line_manager', 'approved_by_dept_head'.
        // So the DB *must* support these.
        // My replace_file_content used 'approved_by_line_manager', 'approved_by_dept_head' which implies I assumed they were there OR I was replacing the old set?
        // Wait, my target content in replace_file_content was: 
        // "status ENUM('pending', 'approved_by_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending',"
        // If the file content WAS that, then the file was indeed old/outdated.
        // BUT the controller code (Step 22) DEFINITELY uses 'approved_by_line_manager'.
        // So the schema.sql file was stale. 
        // Therefore, my migration script MUST ensure the DB has ALL the correct statuses:
        // 'pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_hc', 'rejected'.

        const alterQuery = `
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM('pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending';
        `;

        await connection.query(alterQuery);
        console.log('Successfully updated status ENUM in car_requests table.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
