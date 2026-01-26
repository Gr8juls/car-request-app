const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createHCUser() {
    try {
        console.log('Creating HC user...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        // check if exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', ['hc@test.com']);
        if (existing.length > 0) {
            console.log('HC user already exists. Updating role...');
            await db.query('UPDATE users SET role = "hc", password = ? WHERE email = ?', [hashedPassword, 'hc@test.com']);
        } else {
            await db.query(`
                INSERT INTO users (full_name, email, password, role, department_id, sub_department_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['HC Test User', 'hc@test.com', hashedPassword, 'hc', 1, 1]); // Assuming dept ID 1 exists
        }
        console.log('HC User ready: hc@test.com / password123');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create HC user:', err);
        process.exit(1);
    }
}

createHCUser();
