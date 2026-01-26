const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('Adding email column...');
        // Add email column if it doesn't exist
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;`);
            console.log('Email column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Email column already exists.');
            } else {
                throw e;
            }
        }

        console.log('Updating existing users with dummy emails...');
        // Update existing users to have an email based on their username (temporary fix for existing data)
        await connection.query(`UPDATE users SET email = CONCAT(username, '@example.com') WHERE email IS NULL`);
        console.log('Existing users updated.');

        console.log('Modifying email column to be NOT NULL...');
        await connection.query(`ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL UNIQUE;`);

        console.log('Dropping username column...');
        try {
            await connection.query(`ALTER TABLE users DROP COLUMN username;`);
            console.log('Username column dropped.');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('Username column already dropped or cannot be dropped.');
            } else {
                console.warn('Could not drop username column, might be referenced:', e.message);
            }
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
