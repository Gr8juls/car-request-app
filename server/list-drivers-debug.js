const db = require('./config/db');

async function listDrivers() {
    try {
        console.log('--- DRIVERS TABLE ---');
        const [drivers] = await db.query('SELECT * FROM drivers');
        console.table(drivers);

        console.log('\n--- USERS WITH ROLE DRIVER ---');
        const [userDrivers] = await db.query("SELECT id, full_name, email, role FROM users WHERE role = 'driver'");
        console.table(userDrivers);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

listDrivers();
