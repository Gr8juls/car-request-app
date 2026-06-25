const db = require('./config/db');

async function fixFk() {
    try {
        console.log('Inspecting all foreign keys on car_requests...');
        const [constraints] = await db.query(`
            SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'car_requests'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.table(constraints);

        for (const c of constraints) {
            if (c.COLUMN_NAME === 'assigned_driver_id') {
                console.log(`Dropping foreign key constraint: ${c.CONSTRAINT_NAME}...`);
                await db.query(`ALTER TABLE car_requests DROP FOREIGN KEY ${c.CONSTRAINT_NAME}`);
                console.log(`Successfully dropped ${c.CONSTRAINT_NAME}.`);
            }
        }
        
        console.log('Done!');
    } catch (error) {
        console.error('Error fixing foreign key constraint:', error);
    } finally {
        process.exit();
    }
}

fixFk();
