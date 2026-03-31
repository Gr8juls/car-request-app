const db = require('./config/db');

async function listUsers() {
    try {
        const [users] = await db.query('SELECT id, full_name, email, role, manager_level, department_id FROM users');
        console.table(users);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
