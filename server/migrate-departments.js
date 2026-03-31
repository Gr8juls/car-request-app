const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app',
    multipleStatements: true
};

const departmentsData = [
    { name: 'Risk and Compliance', sub: [{ name: 'Risk and Compliance', manager: 'NSHIMIYIMANA MUHAMADI' }] },
    { name: 'ICT', sub: [{ name: 'ICT', manager: 'GASHONGA JEAN MARIE' }] },
    {
        name: 'Underwriting-GI', sub: [
            { name: 'Underwriting-GI', manager: 'MUCHERU WAC MICHAEL' }, // Simplified default
            { name: 'Underwriting-GI - Unit 1', manager: 'NABIMANYA MOSES' },
            { name: 'Underwriting-GI - Unit 2', manager: 'ISABANE SANDRINE' }
        ]
    },
    { name: 'Customer Service', sub: [{ name: 'Customer Service', manager: 'MUKAKIBIBI CLAUDINE' }] },
    { name: 'Human Capital', sub: [{ name: 'Human Capital', manager: 'BUSYETE GERARD' }] },
    {
        name: 'Medical', sub: [
            { name: 'Medical', manager: 'AKIMANA DELPHIN' },
            { name: 'Medical Underwriting', manager: 'UWASE NOELLA' },
            { name: 'Medical Claims', manager: 'RUGIRA YVES ROBERT' }
        ]
    },
    { name: 'Executive', sub: [{ name: 'Executive', manager: 'HABIYAKARE CHANTAL' }] },
    { name: 'Claims-GI', sub: [{ name: 'Claims-GI', manager: 'NDAHIRO FRANCIS' }] },
    { name: 'Distribution', sub: [{ name: 'Distribution', manager: 'MUCYO JANUARIO' }] },
    { name: 'Digital&Innovation', sub: [{ name: 'Digital&Innovation', manager: 'RUDAKEMWA DERRICK' }] },
    { name: 'Bancassurance', sub: [{ name: 'Bancassurance', manager: 'NYIRUMURINGA CHRISTINE' }] },
    {
        name: 'Finance', sub: [
            { name: 'Finance', manager: 'NKEZABERA JOEL' },
            { name: 'Finance - Unit 1', manager: 'KAYISIRE OLIVIER' },
            { name: 'Finance - Unit 2', manager: 'NIYODUSENGA MODESTE' }
        ]
    },
    { name: 'Operations', sub: [{ name: 'Operations', manager: 'CHARLES BONGO MICHAEL GERI' }] },
    { name: 'Strategy&Sustainability', sub: [{ name: 'Strategy&Sustainability', manager: 'UMUHIRE AIMEE CHRISTELLE' }] },
    { name: 'Actuarial', sub: [{ name: 'Actuarial', manager: 'RUTAYISIRE SANDRA' }] },
    { name: 'Legal & Governance', sub: [{ name: 'Legal & Governance', manager: 'Mukashyaka Lydie' }] },
    { name: 'Internal Audit', sub: [{ name: 'Internal Audit', manager: 'Muhorakeye Clementine' }] },
    { name: 'Marketing', sub: [{ name: 'Marketing', manager: 'Umwari Sonia' }] }
];

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Update Users Table (Add columns first if they don't exist)
        // We use stored procedure or simple ALTER Ignore methodology
        console.log('Updating users table schema...');

        // Modify ENUM for role to include admin
        // Note: Changing ENUM in MySQL can be tricky if data exists, but we'll try direct alter.
        await connection.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('employee', 'manager', 'hc', 'admin') NOT NULL DEFAULT 'employee';
        `);

        // Add new columns
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN department_id INT;`);
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

        try {
            await connection.query(`ALTER TABLE users ADD COLUMN sub_department_id INT;`);
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

        try {
            await connection.query(`ALTER TABLE users ADD COLUMN job_title VARCHAR(100);`);
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

        console.log('Users table updated.');

        // 2. Create Departments Table
        console.log('Creating departments table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            );
        `);

        // 3. Create Sub-Departments Table
        console.log('Creating sub_departments table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sub_departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                department_id INT NOT NULL,
                manager_id INT, -- Can be null initially until manager is assigned
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
                FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        // 4. Seed Data
        console.log('Seeding departments...');
        for (const dept of departmentsData) {
            // Insert Department
            const [deptResult] = await connection.query(`
                INSERT INTO departments (name) VALUES (?)
                ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), name=VALUES(name);
            `, [dept.name]);

            const deptId = deptResult.insertId;

            // Insert Sub-Departments
            if (dept.sub) {
                for (const sub of dept.sub) {
                    await connection.query(`
                        INSERT INTO sub_departments (name, department_id) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE name=VALUES(name), department_id=VALUES(department_id);
                    `, [sub.name, deptId]);
                }
            }
        }

        // 5. Seed Admin User
        console.log('Seeding admin user...');
        const adminHash = await bcrypt.hash('admin123', 10);
        await connection.query(`
            INSERT INTO users (username, password, full_name, role, job_title) 
            VALUES ('admin', ?, 'System Administrator', 'admin', 'IT Admin')
            ON DUPLICATE KEY UPDATE role='admin';
        `, [adminHash]);

        console.log('Migration and seeding completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
