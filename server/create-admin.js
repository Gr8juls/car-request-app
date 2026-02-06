const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        console.log('Creating Admin user...');
        const adminEmail = 'admin@oldmutual.rw';
        const adminPassword = 'Admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // check if exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [adminEmail]);

        if (existing.length > 0) {
            console.log('Admin user already exists. Updating credentials and rights...');
            await db.query(`
                UPDATE users 
                SET full_name = ?, password = ?, role = ?, manager_level = ?, is_active = 1
                WHERE email = ?
            `, ['Admin', hashedPassword, 'admin', 'md', adminEmail]);
        } else {
            console.log('Inserting new Admin user...');
            await db.query(`
                INSERT INTO users (full_name, email, password, role, manager_level, department_id, sub_department_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, ['Admin', adminEmail, hashedPassword, 'admin', 'md', 1, 1, 1]);
        }

        console.log(`Admin User ready: ${adminEmail} / ${adminPassword}`);
        console.log('Role: admin, Manager Level: md');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create Admin user:', err);
        process.exit(1);
    }
}

createAdmin();
