const db = require('./config/db');

async function findUsers() {
    try {
        const [users] = await db.query('SELECT id, full_name, email, role, manager_level FROM users WHERE email IN (?, ?) OR full_name LIKE ?', ['admin@oldmutual.rw', 'CHabiyakare@oldmutual.rw', '%Chantal%']);
        console.table(users);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

findUsers();
