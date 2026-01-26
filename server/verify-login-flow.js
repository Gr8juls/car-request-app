const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function verifyLoginData() {
    try {
        console.log('--- Verifying Login Data Flow ---');

        // 1. Create a temporary manager
        const managerEmail = 'verify_mgr_' + Date.now() + '@test.com';
        const password = 'password123';

        console.log(`1. Registering manager: ${managerEmail}`);
        await axios.post(`${API_URL}/auth/register`, {
            email: managerEmail,
            password: password,
            full_name: 'Test Verify Manager',
            role: 'manager',
            manager_level: 'sub_department',
            department_id: 1, // Assume existence
            sub_department_id: 1 // Assume existence
        });

        // 2. Login
        console.log('2. Attempting login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: managerEmail,
            password: password
        });

        console.log('   Response Data:', JSON.stringify(loginRes.data, null, 2));

        if (loginRes.data.manager_level === 'sub_department') {
            console.log('   PASSED: manager_level "sub_department" is correctly returned.');
        } else {
            console.error('   FAILED: manager_level is incorrect or missing:', loginRes.data.manager_level);
        }

        console.log('--- Verification Complete ---');
    } catch (error) {
        console.error('ERROR:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    } finally {
        process.exit();
    }
}

verifyLoginData();
