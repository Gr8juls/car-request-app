const mysql = require('mysql2/promise');

async function fixDB() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Kigali@2026',
            database: 'car_request_app'
        });
        
        console.log("Dropping fk_driver constraint...");
        await conn.execute('ALTER TABLE car_requests DROP FOREIGN KEY fk_driver');
        console.log("Adding new constraint to drivers table...");
        await conn.execute('ALTER TABLE car_requests ADD CONSTRAINT fk_driver_new FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)');
        console.log("Success");
        process.exit(0);
    } catch (e) {
        console.error(e);
    }
}
fixDB();
