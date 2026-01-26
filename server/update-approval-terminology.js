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

        console.log('Starting approval terminology migration...');

        // Step 1: Check current status values
        console.log('Checking existing status values...');
        const [existingStatuses] = await connection.query(`
            SELECT DISTINCT status FROM car_requests;
        `);
        console.log('Current statuses:', existingStatuses);

        // Step 2: Create temporary column to store original values
        console.log('Creating backup column...');
        try {
            await connection.query(`ALTER TABLE car_requests ADD COLUMN status_backup VARCHAR(50);`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        // Step 3: Backup current status values
        console.log('Backing up current status values...');
        await connection.query(`UPDATE car_requests SET status_backup = status;`);

        // Step 4: Temporarily change status column to VARCHAR to allow data migration
        console.log('Converting status column to VARCHAR for migration...');
        await connection.query(`
            ALTER TABLE car_requests 
            MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending';
        `);

        // Step 5: Update status values to new terminology
        console.log('Updating status values to new terminology...');
        
        await connection.query(`
            UPDATE car_requests 
            SET status = 'approved_by_line_manager' 
            WHERE status = 'approved_by_sub_manager';
        `);

        await connection.query(`
            UPDATE car_requests 
            SET status = 'approved_by_dept_head' 
            WHERE status = 'approved_by_dept_manager';
        `);

        // Step 6: Convert status column back to ENUM with new values
        console.log('Converting status column back to ENUM with updated values...');
        await connection.query(`
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM(
                'pending', 
                'approved_by_line_manager', 
                'approved_by_dept_head', 
                'approved_by_hc', 
                'rejected'
            ) DEFAULT 'pending';
        `);

        // Step 7: Verify the migration
        console.log('Verifying migration...');
        const [newStatuses] = await connection.query(`
            SELECT status, COUNT(*) as count 
            FROM car_requests 
            GROUP BY status;
        `);
        console.log('Updated status distribution:', newStatuses);

        // Step 8: Drop backup column (optional - comment out if you want to keep it)
        console.log('Removing backup column...');
        await connection.query(`ALTER TABLE car_requests DROP COLUMN status_backup;`);

        console.log('✅ Approval terminology migration completed successfully!');
        console.log('Status values updated:');
        console.log('  - approved_by_sub_manager → approved_by_line_manager');
        console.log('  - approved_by_dept_manager → approved_by_dept_head');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('\nIf migration failed, you can restore from status_backup column.');
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
