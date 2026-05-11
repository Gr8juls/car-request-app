const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function addColumnSafe(columnName, definition) {
    try {
        await db.query(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
        console.log(`✓ Added column: ${columnName}`);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠ Column already exists (skipping): ${columnName}`);
        } else {
            throw err;
        }
    }
}

async function migrateOtp() {
    try {
        console.log('Running OTP migration...');

        await addColumnSafe('otp_code', 'VARCHAR(255) NULL DEFAULT NULL');
        await addColumnSafe('otp_expires', 'BIGINT NULL DEFAULT NULL');
        await addColumnSafe('otp_attempts', 'TINYINT NOT NULL DEFAULT 0');

        console.log('\n✅ OTP migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrateOtp();
