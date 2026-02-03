const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app',
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Step 1: Add line_manager_id column
        console.log('Adding line_manager_id column...');
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN line_manager_id INT NULL,
                ADD FOREIGN KEY (line_manager_id) REFERENCES users(id) ON DELETE SET NULL;
            `);
            console.log('Column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column line_manager_id already exists.');
            } else {
                throw e;
            }
        }

        // Step 2: Read approval matrix json
        const matrixPath = path.join(__dirname, 'data', 'approval_matrix.json');
        if (!fs.existsSync(matrixPath)) {
            throw new Error('Approval matrix file not found at ' + matrixPath);
        }
        const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

        console.log(`Processing ${matrixData.length} records...`);

        // Helper to normalize string for comparison (sort tokens)
        function normalize(str) {
            if (!str) return '';
            return str.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(' ').filter(x => x).sort().join(' ');
        }

        // Map normalized names to IDs
        const [users] = await connection.query('SELECT id, full_name FROM users');
        const tokenMap = new Map(); // "SORTED NAMETOKENS" -> id

        users.forEach(u => {
            const tokenKey = normalize(u.full_name);
            if (tokenKey) {
                tokenMap.set(tokenKey, u.id);
            }
        });

        // Function to find best match
        function findUserId(name) {
            if (!name) return null;
            const tokenKey = normalize(name);
            return tokenMap.get(tokenKey) || null;
        }

        let updatedCount = 0;
        let missingUsers = [];
        let missingManagers = [];

        for (const entry of matrixData) {
            const empId = findUserId(entry.employee);
            const mgrId = findUserId(entry.manager);

            if (!empId) {
                // Try simpler partial match? No, let's just log
                missingUsers.push(entry.employee);
                continue;
            }
            if (!mgrId) {
                missingManagers.push({ employee: entry.employee, manager: entry.manager });
                continue;
            }

            // Update user
            await connection.query('UPDATE users SET line_manager_id = ? WHERE id = ?', [mgrId, empId]);
            updatedCount++;
        }

        console.log(`Updated relationships for ${updatedCount} users.`);

        if (missingUsers.length > 0) {
            console.warn('Could not find the following employees in DB:', missingUsers);
        }
        if (missingManagers.length > 0) {
            console.warn('Could not find managers for these employees:', missingManagers);
        }

        // Step 3: Identify managers and ensure they have 'manager' role if appropriate
        const managerNames = [...new Set(matrixData.map(d => d.manager))];

        for (const mgrName of managerNames) {
            const mgrId = findUserId(mgrName);
            if (!mgrId) continue;

            const [rows] = await connection.query('SELECT role, manager_level FROM users WHERE id = ?', [mgrId]);
            const user = rows[0];

            // If they are listed as a manager, they should at least be a manager role
            if (user.role === 'employee') {
                await connection.query(`UPDATE users SET role = 'manager', manager_level = 'sub_department' WHERE id = ?`, [mgrId]);
                console.log(`Promoted ${mgrName} to manager role.`);
            }
        }

        console.log('Migration completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
