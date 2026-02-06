const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:5000/api';

async function register(user) {
    try {
        await axios.post(`${API_URL}/auth/register`, user);
    } catch (e) {
        if (e.response && e.response.data && e.response.data.message !== 'User already exists') {
            console.error(`Registration failed for ${user.email}:`, e.response.data);
            throw e; // Rethrow if it's not "already exists"
        }
    }
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { email: user.email, password: user.password });
        return res.data.token;
    } catch (e) {
        console.error(`Login failed for ${user.email}:`, e.response ? e.response.data : e.message);
        throw e;
    }
}

async function verifyRouting() {
    try {
        console.log('--- Verifying Request Routing & Reassignment ---');

        const timestamp = Date.now();
        const mgrA = { email: `mgrA_${timestamp}@test.com`, password: 'password123', full_name: 'Manager A', role: 'manager', manager_level: 'sub_department', department_id: 1, sub_department_id: 1 };
        const mgrB = { email: `mgrB_${timestamp}@test.com`, password: 'password123', full_name: 'Manager B', role: 'manager', manager_level: 'sub_department', department_id: 1, sub_department_id: 2 }; // diff sub dept
        const emp = { email: `emp_${timestamp}@test.com`, password: 'password123', full_name: 'Employee E', role: 'employee', manager_level: 'none', department_id: 1, sub_department_id: 1 };

        // 1. Register Users
        console.log('1. Registering users...');
        const tokenA = await register(mgrA);
        const tokenB = await register(mgrB);

        // Get IDs
        const userA = (await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': tokenA } })).config.headers['x-auth-token'];
        // Logic to get ID is annoying without a dedicated /me endpoint. 
        // I'll rely on listing users via admin or assuming I can proceed.
        // Actually, create-admin script exists. I can use admin token to get IDs.

        const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@oldmutual.rw', password: 'Admin123' });
        const adminToken = adminRes.data.token;

        const usersRes = await axios.get(`${API_URL}/admin/users`, { headers: { 'x-auth-token': adminToken } });
        const users = usersRes.data;
        const idA = users.find(u => u.email === mgrA.email).id;
        const idB = users.find(u => u.email === mgrB.email).id;

        // Register Employee
        const tokenEmp = await register(emp);
        const usersApp = await axios.get(`${API_URL}/admin/users`, { headers: { 'x-auth-token': adminToken } });
        const idEmp = usersApp.data.find(u => u.email === emp.email).id;

        // Assign Manager A to Employee via Admin
        console.log(`   Assigning Manager A (${idA}) to Employee (${idEmp})...`);
        await axios.put(`${API_URL}/admin/users/${idEmp}`, {
            line_manager_id: idA
        }, { headers: { 'x-auth-token': adminToken } });

        // 2. Submit Request 1
        console.log('2. Employee submitting Request 1 (Manager A)...');
        await axios.post(`${API_URL}/cars`, {
            department: 'Sales', location: 'Kigali', purpose: 'Client Visit', car_model: 'Toyota', reason: 'Official',
            date_out: '2026-02-10', time_out: '08:00', date_back: '2026-02-10', time_back: '17:00'
        }, { headers: { 'x-auth-token': tokenEmp } });

        // 3. Verify Assignment to A
        console.log('3. Verifying assignment to Manager A...');
        let reqsA = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': tokenA } });
        if (reqsA.data.length > 0 && reqsA.data[0].assigned_to === idA) {
            console.log('   PASSED: Request assigned to Manager A');
        } else {
            console.error('   FAILED: Request not assigned to Manager A', reqsA.data);
        }

        // 4. Update Employee Manager to B
        console.log('4. Admin updating Employee Manager to B...');
        await axios.put(`${API_URL}/admin/users/${idEmp}`, {
            line_manager_id: idB
        }, { headers: { 'x-auth-token': adminToken } });

        // 5. Verify Reassignment of Pending Request
        console.log('5. Verifying reassignment to Manager B...');
        let reqsB = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': tokenB } });
        // The list returned to B should now include the request
        if (reqsB.data.length > 0 && reqsB.data[0].assigned_to === idB) {
            console.log('   PASSED: Request reassigned to Manager B');
        } else {
            console.error('   FAILED: Request not reassigned to Manager B', reqsB.data[0]);
        }

        // 6. Submit Request 2 -> Should go to B
        console.log('6. Employee submitting Request 2 (Manager B)...');
        // Need to update local token? No, token is stateless regarding DB fields usually, 
        // BUT logic relies on DB query for creating request. So it should work.
        await axios.post(`${API_URL}/cars`, {
            department: 'Sales', location: 'Rubavu', purpose: 'Field Work', car_model: 'Jeep', reason: 'Official',
            date_out: '2026-02-12', time_out: '08:00', date_back: '2026-02-12', time_back: '17:00'
        }, { headers: { 'x-auth-token': tokenEmp } });

        reqsB = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': tokenB } });
        if (reqsB.data.length >= 2) {
            console.log('   PASSED: New request routed to Manager B');
        } else {
            console.error('   FAILED: New request not routed to Manager B');
        }

        // 7. Test Blocking (Orphan)
        console.log('7. Testing blocking of orphan employee...');
        const orphan = { email: `orphan_${timestamp}@test.com`, password: 'password123', full_name: 'Orphan', role: 'employee', manager_level: 'none', department_id: 1, sub_department_id: 1 };
        // No line_manager_id
        const tokenOrphan = await register(orphan);

        try {
            await axios.post(`${API_URL}/cars`, {
                department: 'Sales', location: 'Huye', purpose: 'Visit', car_model: 'Toyota', reason: 'Official',
                date_out: '2026-02-15', time_out: '08:00', date_back: '2026-02-15', time_back: '17:00'
            }, { headers: { 'x-auth-token': tokenOrphan } });
            console.error('   FAILED: Request should have been blocked');
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.message.includes('No Line Manager')) {
                console.log('   PASSED: Orphan request blocked with correct message');
            } else {
                console.error('   FAILED: Unexpected error response', e.response ? e.response.data : e.message);
            }
        }

        console.log('--- Verification Complete ---');
        process.exit(0);

    } catch (e) {
        console.error('Verification Error:', e.message);
        if (e.response) console.error(e.response.data);
        process.exit(1);
    }
}

verifyRouting();
