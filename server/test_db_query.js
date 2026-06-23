const mysql = require('mysql2/promise');
async function run() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Kigali@2026',
            database: 'car_request_app'
        });
        const [rows] = await conn.execute('SELECT * FROM car_requests WHERE id = 56');
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
    }
}
run();
