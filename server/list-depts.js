const db = require('./config/db');

async function listDepartments() {
    try {
        const [departments] = await db.query('SELECT * FROM departments');
        console.table(departments);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listDepartments();
