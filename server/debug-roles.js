const db = require('./config/db');

async function checkRoles() {
    try {
        const [rows] = await db.query('SELECT id, role FROM users');
        console.log('Roles found:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkRoles();
