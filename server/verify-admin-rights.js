const axios = require('axios');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

const API_URL = 'http://localhost:5000/api';

async function runVerification() {
    let connection;
    try {
        console.log('--- Starting Admin Rights Verification ---');
        connection = await mysql.createConnection(dbConfig);

        // 1. Setup Admin User
        console.log('1. Registering/Logging in Admin...');
        const adminEmail = 'verify_admin_' + Date.now() + '@test.com';
        const adminPassword = 'password123';

        let token;

        try {
            await axios.post(`${API_URL}/auth/register`, {
                email: adminEmail,
                password: adminPassword,
                full_name: 'Verify Admin',
                role: 'admin'
            });
            console.log('   Admin registered.');
        } catch (e) {
            console.log('   Admin registration failed (might exist):', e.response?.data?.message || e.message);
        }

        // Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password: adminPassword
        });
        token = loginRes.data.token;
        console.log('   Admin logged in. Token acquired.');

        const authHeader = { headers: { 'x-auth-token': token } };

        // 2. Get a Department ID
        const [depts] = await connection.query('SELECT id, name FROM departments LIMIT 1');
        if (depts.length === 0) throw new Error('No departments found in DB.');
        const deptId = depts[0].id;
        console.log(`2. Using Department ID: ${deptId} (${depts[0].name})`);

        // 3. Create Department Head User
        console.log('3. Creating Department Head User via Admin API...');
        const headEmail = 'head_' + Date.now() + '@test.com';
        const createRes = await axios.post(`${API_URL}/admin/users`, {
            email: headEmail,
            full_name: 'Test Dept Head',
            password: 'password123',
            role: 'manager',
            manager_level: 'department',
            department_id: deptId,
            job_title: 'Head of Testing'
        }, authHeader);

        const newUserId = createRes.data.userId;
        console.log(`   User created. ID: ${newUserId}`);

        // 4. Verify DB - Department Manager ID
        const [deptRows] = await connection.query('SELECT manager_id FROM departments WHERE id = ?', [deptId]);
        console.log(`   DB Check: Department Manager ID is ${deptRows[0].manager_id}`);
        if (deptRows[0].manager_id !== newUserId) {
            console.error('   FAILED: Department manager_id was not updated!');
        } else {
            console.log('   PASSED: Department manager_id matched.');
        }

        // 5. Update User - Change to Line Manager (Sub-Dept)
        // First get a sub-dept
        const [subDepts] = await connection.query('SELECT id, name FROM sub_departments WHERE department_id = ? LIMIT 1', [deptId]);
        if (subDepts.length === 0) {
            console.log('   Skipping update test (no sub-depts for this dept).');
        } else {
            const subDeptId = subDepts[0].id;
            console.log(`5. Updating User to Line Manager for Sub-Dept ID: ${subDeptId}...`);
            await axios.put(`${API_URL}/admin/users/${newUserId}`, {
                email: headEmail,
                full_name: 'Test Line Manager',
                role: 'manager',
                manager_level: 'sub_department',
                department_id: deptId,
                sub_department_id: subDeptId
            }, authHeader);

            // 6. Verify DB - Sub-Dept Manager ID & Dept Manager ID (should be null or different)
            const [subDeptRows] = await connection.query('SELECT manager_id FROM sub_departments WHERE id = ?', [subDeptId]);
            const [deptRowsAfter] = await connection.query('SELECT manager_id FROM departments WHERE id = ?', [deptId]);

            console.log(`   DB Check: Sub-Dept Manager ID is ${subDeptRows[0].manager_id}`);
            console.log(`   DB Check: Department Manager ID is ${deptRowsAfter[0].manager_id}`);

            if (subDeptRows[0].manager_id === newUserId && deptRowsAfter[0].manager_id !== newUserId) {
                console.log('   PASSED: Sub-Dept manager set, Dept manager cleared.');
            } else {
                console.error('   FAILED: DB state incorrect after update.');
            }
        }

        // 7. Delete User
        console.log('7. Deleting User...');
        await axios.delete(`${API_URL}/admin/users/${newUserId}`, authHeader);

        // 8. Verify DB - IDs should be NULL
        const [subDeptCheck] = await connection.query('SELECT manager_id FROM sub_departments WHERE manager_id = ?', [newUserId]);
        const [deptCheck] = await connection.query('SELECT manager_id FROM departments WHERE manager_id = ?', [newUserId]);

        if (subDeptCheck.length === 0 && deptCheck.length === 0) {
            console.log('   PASSED: User removed from all manager roles in DB.');
        } else {
            console.error('   FAILED: Stale manager_id references found.');
        }

        console.log('--- Verification Complete ---');

    } catch (error) {
        console.error('ERROR:', error);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setup:', error.message);
        }
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

runVerification();
