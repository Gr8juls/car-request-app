const db = require('./config/db');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        console.log('Connection successful. Result:', rows[0].result);

        console.log('Checking users table...');
        const [tables] = await db.query('SHOW TABLES LIKE "users"');
        if (tables.length > 0) {
            console.log('Users table exists.');
        } else {
            console.log('Users table DOES NOT exist.');
        }

    } catch (error) {
        console.error('Database connection failed:', error.message);
        console.error('Detailed error:', error);
    } finally {
        process.exit();
    }
}

testConnection();
