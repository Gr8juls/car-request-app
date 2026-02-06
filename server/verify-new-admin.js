const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function verifyAdmin() {
    try {
        console.log('Verifying Admin user in database...');
        const [rows] = await db.query('SELECT full_name, email, role, manager_level, is_active FROM users WHERE email = ?', ['admin@oldmutual.rw']);

        if (rows.length > 0) {
            console.log('User found:');
            console.table(rows);
            if (rows[0].role === 'admin' && rows[0].manager_level === 'md') {
                console.log('SUCCESS: User has correct admin rights.');
            } else {
                console.log('WARNING: User found but rights are incorrect.');
            }
        } else {
            console.log('ERROR: Admin user not found.');
            process.exit(1);
        }
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyAdmin();
