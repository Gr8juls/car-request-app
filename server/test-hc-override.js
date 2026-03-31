const axios = require('axios');

async function testHCOverride() {
    const API_URL = 'http://localhost:5000/api';

    try {
        // 1. Login as Employee (Test Employee)
        console.log('Logging in as employee...');
        const empLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'emp_test@example.com',
            password: 'password123'
        });
        const empToken = empLogin.data.token;

        // 2. Create a request
        console.log('Creating car request as employee...');
        await axios.post(`${API_URL}/cars`, {
            department: 'Medical',
            location: 'Kigali',
            purpose: 'Site Visit',
            car_model: 'Toyota Hilux',
            reason: 'Testing HC override',
            date_out: '2026-02-01',
            time_out: '08:00',
            date_back: '2026-02-01',
            time_back: '17:00'
        }, { headers: { 'x-auth-token': empToken } });

        // 3. Get the latest request ID
        console.log('Fetching requests...');
        const empRequests = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': empToken } });
        const latestRequest = empRequests.data[0];
        console.log(`Latest request status: ${latestRequest.status} (ID: ${latestRequest.id})`);

        if (latestRequest.status !== 'pending') {
            throw new Error(`Expected status 'pending', got '${latestRequest.status}'`);
        }

        // 4. Login as HC
        console.log('Logging in as HC...');
        const hcLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'hc@test.com',
            password: 'password123'
        });
        const hcToken = hcLogin.data.token;

        // 5. Approve as HC (Override LM)
        console.log('Approving as HC (Override LM)...');
        await axios.put(`${API_URL}/cars/${latestRequest.id}`, {
            status: 'approved_by_hc',
            comment: 'Overriding Line Manager as requested',
            driver_allocated: 'John Driver',
            vehicle_allocated: 'Toyota Hilux',
            reg_no: 'RAE 123 B'
        }, { headers: { 'x-auth-token': hcToken } });

        // 6. Verify status
        console.log('Verifying final status...');
        const finalRequests = await axios.get(`${API_URL}/cars`, { headers: { 'x-auth-token': hcToken } });
        const finalRequest = finalRequests.data.find(r => r.id === latestRequest.id);
        console.log(`Final status: ${finalRequest.status}`);

        if (finalRequest.status === 'approved_by_hc') {
            console.log('✅ TEST PASSED: HC successfully overrode pending employee request.');
        } else {
            console.log(`❌ TEST FAILED: Expected 'approved_by_hc', got '${finalRequest.status}'`);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
    }
}

testHCOverride();
