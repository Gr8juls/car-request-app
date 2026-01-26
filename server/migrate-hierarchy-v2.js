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
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('Updating departments table...');
        try {
            await connection.query(`ALTER TABLE departments ADD COLUMN manager_id INT;`);
            await connection.query(`ALTER TABLE departments ADD FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_FK_DUP_NAME') {
                console.log('Note: manager_id column or FK might already exist.');
            }
        }

        console.log('Updating users table manager_level...');
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN manager_level ENUM('none', 'sub_department', 'department') DEFAULT 'none';`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        console.log('Updating car_requests status ENUM...');
        // We need to modify the ENUM to include all stages
        await connection.query(`
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM('pending', 'approved_by_sub_manager', 'approved_by_dept_manager', 'approved_by_hc', 'rejected') DEFAULT 'pending';
        `);

        console.log('Hierarchy migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
