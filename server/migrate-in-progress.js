// Migration: Add 'in_progress' status to car_requests, and add 'trip_started_at' column
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Adding in_progress to status enum...');
        await db.query(`
            ALTER TABLE car_requests 
            MODIFY COLUMN status ENUM(
                'pending',
                'approved_by_line_manager',
                'approved_by_dept_head',
                'approved_by_ops_manager',
                'approved_by_md',
                'approved_by_hc',
                'in_progress',
                'completed',
                'rejected'
            ) DEFAULT 'pending'
        `);

        console.log('Checking for trip_started_at column...');
        const [cols] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'car_requests' 
              AND COLUMN_NAME = 'trip_started_at'
        `);
        if (cols.length === 0) {
            await db.query(`ALTER TABLE car_requests ADD COLUMN trip_started_at DATETIME NULL`);
            console.log('trip_started_at column added.');
        } else {
            console.log('trip_started_at already exists, skipping.');
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
