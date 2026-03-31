const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

// Test Data
const employee = { full_name: 'History Tester', email: 'history@test.com', password: 'password123', role: 'employee' };
const manager = { full_name: 'History Manager', email: 'manager_hist@test.com', password: 'password123', role: 'manager', manager_level: 'sub_department', department_id: 1 };
let tokenEmp, tokenMgr, reqId;

async function verifyHistory() {
    try {
        console.log('--- Verifying Request Logs ---');

        // 1. Register Manager
        console.log('1. Registering/Logging in Manager...');
        try {
            await axios.post(`${API_URL}/auth/register`, manager);
        } catch (e) { /* Ignore if exists */ }
        const resMgr = await axios.post(`${API_URL}/auth/login`, { email: manager.email, password: manager.password });
        tokenMgr = resMgr.data.token;
        const mgrId = JSON.parse(atob(tokenMgr.split('.')[1])).user.id; // Decode token payload for ID

        // 2. Register Employee
        console.log('2. Registering/Logging in Employee...');
        try {
            employee.line_manager_id = mgrId; // Set manager for routing
            await axios.post(`${API_URL}/auth/register`, employee);
        } catch (e) { /* Ignore */ }
        const resEmp = await axios.post(`${API_URL}/auth/login`, { email: employee.email, password: employee.password });
        tokenEmp = resEmp.data.token;
        const empId = JSON.parse(atob(tokenEmp.split('.')[1])).user.id; // Decode token payload for ID

        // Admin Token (Need admin access to assign manager)
        // For simplicity in this test, we'll assume there is a way or we can reuse `verify-routing.js` logic of using an existing admin
        // OR we just create a temp admin
        const admin = { full_name: 'Admin User', email: 'admin_hist@test.com', password: 'password123', role: 'admin', manager_level: 'none' };
        try { await axios.post(`${API_URL}/auth/register`, admin); } catch (e) { }
        const resAdmin = await axios.post(`${API_URL}/auth/login`, { email: admin.email, password: admin.password });
        const tokenAdmin = resAdmin.data.token;

        // Assign Manager to Employee via Admin
        console.log(`   Assigning Manager (${mgrId}) to Employee (${empId})...`);
        await axios.put(`${API_URL}/admin/users/${empId}`, {
            line_manager_id: mgrId
        }, { headers: { 'x-auth-token': tokenAdmin } });

        // 3. Create Request
        console.log('3. Creating Request...');
        const reqData = {
            department: 'IT', location: 'Nairobi', purpose: 'Log Test', car_model: 'Subaru', reason: 'Testing',
            date_out: '2025-01-01', time_out: '10:00', date_back: '2025-01-02', time_back: '10:00'
        };
        await axios.post(`${API_URL}/cars`, reqData, { headers: { 'x-auth-token': tokenEmp } });

        // Get Request ID (Latest from employee)
        const allReqs = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': tokenEmp } });
        reqId = allReqs.data[0].id;
        console.log(`   Created Request ID: ${reqId}`);

        // 4. Verify CREATED log
        console.log('4. Verifying CREATED log...');
        const logs1 = await axios.get(`${API_URL}/cars/${reqId}/logs`, { headers: { 'x-auth-token': tokenEmp } });
        const createdLog = logs1.data.find(l => l.action === 'CREATED');
        if (createdLog) console.log('   PASSED: CREATED log found.');
        else throw new Error('CREATED log missing!');

        // 5. Manager Approves
        console.log('5. Manager Approving...');
        await axios.put(`${API_URL}/cars/${reqId}`, { status: 'approved_by_line_manager', comment: 'Looks good' }, { headers: { 'x-auth-token': tokenMgr } });

        // 6. Verify APPROVED log
        console.log('6. Verifying APPROVED log...');
        const logs2 = await axios.get(`${API_URL}/cars/${reqId}/logs`, { headers: { 'x-auth-token': tokenEmp } });
        const approvedLog = logs2.data.find(l => l.action === 'APPROVED');

        if (approvedLog && approvedLog.comment === 'Looks good') {
            console.log('   PASSED: APPROVED log found with correct comment.');
        } else {
            throw new Error('APPROVED log missing or incorrect!');
        }

        // 7. Check Order
        console.log('7. Verifying Log Order...');
        if (logs2.data[0].action === 'CREATED' && logs2.data[1].action === 'APPROVED') {
            console.log('   PASSED: Logs are in correct chronological order.');
        } else {
            throw new Error('Log order incorrect!');
        }

        console.log('--- Verification Complete: SUCCESS ---');

    } catch (error) {
        console.error('VERIFICATION FAILED:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

verifyHistory();
