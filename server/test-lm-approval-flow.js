const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function testLMApprovalFlow() {
    try {
        console.log('--- Verifying Line Manager Approval Flow Programmatically ---');

        // 1. Login as Employee (Test Employee)
        console.log('1. Logging in as Employee (emp_test@example.com)...');
        const empLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'emp_test@example.com',
            password: 'password123'
        });
        const empToken = empLogin.data.token;
        const empId = empLogin.data.id;
        console.log(`   Logged in successfully. User ID: ${empId}`);

        // 2. Submit a request
        console.log('2. Submitting car request as Employee...');
        const tripData = {
            department: 'Medical',
            location: 'Rubavu',
            purpose: 'Client Consultation',
            car_model: 'Toyota RAV4',
            reason: 'Official Visit',
            date_out: '2026-07-01',
            time_out: '08:00',
            date_back: '2026-07-02',
            time_back: '17:00',
            assigned_to: 73 // Test Manager
        };
        await axios.post(`${API_URL}/cars`, tripData, {
            headers: { 'x-auth-token': empToken }
        });

        // 3. Fetch the latest request ID as Employee
        console.log('3. Fetching requests for Employee to get the Request ID...');
        const empReqs = await axios.get(`${API_URL}/cars`, {
            headers: { 'x-auth-token': empToken }
        });
        const request = empReqs.data.find(r => r.car_model === 'Toyota RAV4' && r.status === 'pending');
        if (!request) {
            throw new Error('Created request not found or not in pending status!');
        }
        const reqId = request.id;
        console.log(`   Found pending request. Request ID: ${reqId}, Assigned To: ${request.assigned_to}`);

        // 4. Login as Manager (Test Manager)
        console.log('4. Logging in as Line Manager (mgr_test@example.com)...');
        const mgrLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'mgr_test@example.com',
            password: 'password123'
        });
        const mgrToken = mgrLogin.data.token;
        const mgrId = mgrLogin.data.id;
        console.log(`   Logged in successfully. Manager ID: ${mgrId}`);

        // 5. Fetch Manager's Requests (should see the assigned request)
        console.log("5. Fetching Manager's pending requests queue...");
        const mgrReqs = await axios.get(`${API_URL}/cars`, {
            headers: { 'x-auth-token': mgrToken }
        });
        const assignedRequest = mgrReqs.data.find(r => r.id === reqId);
        if (!assignedRequest) {
            throw new Error(`Request #${reqId} is not visible in the Line Manager's dashboard queue!`);
        }
        console.log(`   PASSED: Request #${reqId} is successfully shown in the Line Manager's dashboard.`);

        // 6. Approve the request as Line Manager
        console.log('6. Approving the request as Line Manager...');
        await axios.put(`${API_URL}/cars/${reqId}`, {
            status: 'approved_by_line_manager',
            comment: 'Approved by Line Manager - Proceed to HC'
        }, {
            headers: { 'x-auth-token': mgrToken }
        });
        console.log('   Approval request submitted.');

        // 7. Verify request status is now 'approved_by_line_manager' and assigned_to is null (passed to HC)
        console.log('7. Verifying request status update...');
        const verifyReqs = await axios.get(`${API_URL}/cars`, {
            headers: { 'x-auth-token': empToken }
        });
        const updatedRequest = verifyReqs.data.find(r => r.id === reqId);
        console.log(`   Updated Request details - Status: ${updatedRequest.status}, Assigned To: ${updatedRequest.assigned_to}`);

        if (updatedRequest.status !== 'approved_by_line_manager') {
            throw new Error(`Expected status 'approved_by_line_manager', got '${updatedRequest.status}'`);
        }
        if (updatedRequest.assigned_to !== null) {
            throw new Error(`Expected assigned_to to be null (sent to HC), got '${updatedRequest.assigned_to}'`);
        }
        console.log('   PASSED: Request status successfully updated to "approved_by_line_manager" and assigned_to cleared (sent to HC).');

        // 8. Login as HC (Test HC)
        console.log('8. Logging in as HC (hc_test@example.com)...');
        const hcLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'hc_test@example.com',
            password: 'password123'
        });
        const hcToken = hcLogin.data.token;

        // 9. Verify request is visible to HC for final approval
        console.log('9. Checking if HC can view and process the request...');
        const hcReqs = await axios.get(`${API_URL}/cars`, {
            headers: { 'x-auth-token': hcToken }
        });
        const hcRequest = hcReqs.data.find(r => r.id === reqId);
        if (!hcRequest) {
            throw new Error(`Request #${reqId} is not visible to HC!`);
        }
        console.log(`   PASSED: Request is visible in HC's panel with status: ${hcRequest.status}`);

        console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (error.response) {
            console.error('   Response data:', error.response.data);
        }
        process.exit(1);
    }
}

testLMApprovalFlow();
