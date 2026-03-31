const axios = require('axios');

async function testHrFlow() {
    const baseUrl = 'http://localhost:5000/api';
    let empToken, mgrToken, hrToken;
    let requestId;

    try {
        // 1. Register Users
        console.log('Registering users...');
        await register('emp1', 'employee');
        await register('mgr1', 'manager');
        await register('hr1', 'hr');

        // 2. Login & Get Tokens
        console.log('Logging in...');
        empToken = await login('emp1');
        mgrToken = await login('mgr1');
        hrToken = await login('hr1');

        // 3. Employee creates request
        console.log('Creating request as Employee...');
        const reqRes = await axios.post(`${baseUrl}/cars`, {
            car_model: 'Toyota Camry',
            reason: 'Client meeting',
            start_date: '2023-12-01',
            end_date: '2023-12-02'
        }, { headers: { 'x-auth-token': empToken } });
        console.log('Request Created.');

        // Get Request ID (Need to fetch list)
        const listRes = await axios.get(`${baseUrl}/cars`, { headers: { 'x-auth-token': empToken } });
        requestId = listRes.data[0].id;
        console.log('Request ID:', requestId);

        // 4. Manager attempts to approve (Should FAIL)
        console.log('Manager attempting to approve...');
        try {
            await axios.put(`${baseUrl}/cars/${requestId}`, {
                status: 'approved_by_manager',
                comment: 'Looks good'
            }, { headers: { 'x-auth-token': mgrToken } });
            console.error('ERROR: Manager WAS able to approve! This should have failed.');
        } catch (err) {
            console.log('Success: Manager could not approve. Status:', err.response.status);
        }

        // 5. HR attempts to approve (Should SUCCEED)
        console.log('HR attempting to approve...');
        await axios.put(`${baseUrl}/cars/${requestId}`, {
            status: 'approved_by_hr',
            comment: 'Approved by HR'
        }, { headers: { 'x-auth-token': hrToken } });
        console.log('Success: HR approved.');

        console.log('test-hr-flow PASSED');

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response data:', error.response.data);
    }
}

async function register(userPrefix, role) {
    try {
        await axios.post('http://localhost:5000/api/auth/register', {
            username: `${userPrefix}_${Date.now()}`,
            password: 'password123',
            role: role,
            full_name: `${userPrefix} User`
        });
    } catch (e) { /* Ignore content-type or duplicate errors for simplicity */ }
}

async function login(userPrefix) {
    // We need the exact username used in register.
    // For simplicity, let's assume register created a predictable one or we catch duplicates.
    // Actually, to make it robust, let's just register random users every time.
    // Wait, let's just login. If register failed because exists, login should work.
    // But I used Date.now() in username.
    // Let's refactor register to return the username it used.
    // Actually simplicity:
    const username = `${userPrefix}_test`;
    try {
        await axios.post('http://localhost:5000/api/auth/register', {
            username, password: 'password123', role, full_name: 'Test'
        });
    } catch (e) { }

    const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password: 'password123'
    });
    return res.data.token;
}

// Rewriting clean runner
const runner = async () => {
    const suffix = Date.now();
    const registerAndLogin = async (role) => {
        const username = `${role}_${suffix}`;
        await axios.post('http://localhost:5000/api/auth/register', {
            username, password: 'password123', role, full_name: `${role.toUpperCase()} User`
        });
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username, password: 'password123'
        });
        return res.data.token;
    }

    const baseUrl = 'http://localhost:5000/api';

    try {
        const empToken = await registerAndLogin('employee');
        const mgrToken = await registerAndLogin('manager');
        const hrToken = await registerAndLogin('hr');

        console.log('Users created and logged in.');

        // Employee creates request
        await axios.post(`${baseUrl}/cars`, {
            car_model: 'Test Car',
            reason: 'Test Reason',
            start_date: '2023-01-01',
            end_date: '2023-01-02'
        }, { headers: { 'x-auth-token': empToken } });

        // Get ID
        const list = await axios.get(`${baseUrl}/cars`, { headers: { 'x-auth-token': empToken } });
        const reqId = list.data[0].id;
        console.log('Request created with ID:', reqId);

        // Manager Try Reject
        try {
            await axios.put(`${baseUrl}/cars/${reqId}`, { status: 'rejected' }, {
                headers: { 'x-auth-token': mgrToken }
            });
            console.error('FAIL: Manager was able to update status');
        } catch (e) {
            console.log('PASS: Manager blocked with status', e.response.status);
        }

        // HR Try Approve
        await axios.put(`${baseUrl}/cars/${reqId}`, { status: 'approved_by_hr', comment: 'HR OK' }, {
            headers: { 'x-auth-token': hrToken }
        });
        console.log('PASS: HR approved request');

    } catch (err) {
        console.error('Test Failed', err);
    }
};

runner();
