const db = require('c:/Users/jrubagumya/OneDrive - Old Mutual Africa Regions/Desktop/car-request-app/server/config/db');

async function setupTestData() {
    try {
        console.log('Updating Test Manager (id 73) level to sub_department...');
        await db.query(`
            UPDATE users 
            SET manager_level = 'sub_department', role = 'manager' 
            WHERE id = 73
        `);

        console.log('Assigning Test Manager (id 73) as Line Manager for Test Employee (id 72)...');
        await db.query(`
            UPDATE users 
            SET line_manager_id = 73 
            WHERE id = 72
        `);

        console.log('Setup complete!');
    } catch (error) {
        console.error('Error setting up test data:', error);
    } finally {
        process.exit();
    }
}

setupTestData();
