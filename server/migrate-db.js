const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add new columns
        const columnsToAdd = [
            'ALTER TABLE car_requests ADD COLUMN department VARCHAR(100)',
            'ALTER TABLE car_requests ADD COLUMN location VARCHAR(100)',
            'ALTER TABLE car_requests ADD COLUMN purpose TEXT',
            'ALTER TABLE car_requests ADD COLUMN date_out DATE',
            'ALTER TABLE car_requests ADD COLUMN time_out TIME',
            'ALTER TABLE car_requests ADD COLUMN date_back DATE',
            'ALTER TABLE car_requests ADD COLUMN time_back TIME',
            'ALTER TABLE car_requests ADD COLUMN driver_allocated VARCHAR(100)',
            'ALTER TABLE car_requests ADD COLUMN vehicle_allocated VARCHAR(100)',
            'ALTER TABLE car_requests ADD COLUMN reg_no VARCHAR(20)',
            'ALTER TABLE car_requests ADD COLUMN meter_reading_start INT',
            'ALTER TABLE car_requests ADD COLUMN meter_reading_finish INT'
        ];

        for (const sql of columnsToAdd) {
            try {
                await db.query(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists, skipping: ${sql}`);
                } else {
                    throw err;
                }
            }
        }

        // Handle NOT NULL requirements for the new fields if needed
        // For now, let's keep them nullable to avoid breaking entries that don't have them yet,
        // or update them if the app requires them.

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
