const db = require('./config/db');

async function cleanup() {
    try {
        console.log('Starting cleanup...');

        // Drop columns that are no longer needed or cause issues
        const columnsToDrop = [
            'ALTER TABLE car_requests DROP COLUMN start_date',
            'ALTER TABLE car_requests DROP COLUMN end_date'
        ];

        for (const sql of columnsToDrop) {
            try {
                await db.query(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                console.log(`Error dropping column (might already be gone): ${err.message}`);
            }
        }

        console.log('Cleanup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
