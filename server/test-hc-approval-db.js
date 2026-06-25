const db = require('./config/db');

async function testHCApproval() {
    try {
        console.log('Fetching columns for car_requests...');
        const [columns] = await db.query('SHOW COLUMNS FROM car_requests');
        console.table(columns);

        // Find a request with status 'approved_by_line_manager' or 'pending'
        const [requests] = await db.query("SELECT id, status FROM car_requests ORDER BY id DESC LIMIT 1");
        if (requests.length === 0) {
            console.log('No requests found.');
            return;
        }

        const reqId = requests[0].id;
        const currentStatus = requests[0].status;
        console.log(`Testing with request ID ${reqId} (current status: ${currentStatus})`);

        // Test parameters
        const status = 'approved_by_hc';
        const comment = 'Done';
        const driver_allocated = 'Innocent Kabanda';
        const assigned_driver_id = 65; // Let's use id 65 (Rafiki Gilbert) or some driver ID
        const vehicle_allocated = 'Sedan';
        const reg_no = 'RAC106F';

        console.log('Executing UPDATE query...');
        const updateQuery = 'UPDATE car_requests SET status = ?, hr_comment = ?, driver_allocated = ?, assigned_driver_id = ?, vehicle_allocated = ?, reg_no = ?, assigned_to = NULL WHERE id = ?';
        const params = [status, comment, driver_allocated, assigned_driver_id, vehicle_allocated, reg_no, reqId];
        
        await db.query(updateQuery, params);
        console.log('UPDATE query succeeded!');
    } catch (error) {
        console.error('❌ Error caught:', error.message);
        console.error(error);
    } finally {
        process.exit();
    }
}

testHCApproval();
