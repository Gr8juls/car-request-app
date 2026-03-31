const db = require('./config/db');

async function debugData() {
    try {
        const [depts] = await db.query('SELECT id, name FROM departments WHERE name LIKE ?', ['%Risk%']);
        console.log('Departments found:', depts);

        const [users] = await db.query('SELECT id, full_name, email, role, manager_level, department_id FROM users WHERE id IN (53, 54)');
        console.log('Users found:', users);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugData();
