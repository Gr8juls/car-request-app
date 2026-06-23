const axios = require('axios');
const jwt = require('jsonwebtoken');

async function run() {
    try {
        // Generate a valid HC token
        const payload = {
            user: {
                id: 1, // Assume HC user has id 1
                role: 'hc'
            }
        };
        const token = jwt.sign(payload, 'supersecretkey123', { expiresIn: '1h' });

        const config = { headers: { 'x-auth-token': token } };
        
        console.log("Sending PUT request with HC token...");
        const res = await axios.put('http://localhost:3000/api/cars/56', {
            status: 'approved_by_hc',
            comment: 'Done',
            driver_allocated: 'Innocent Kabanda',
            assigned_driver_id: '2',
            vehicle_allocated: 'Sedan - RAC106F',
            reg_no: 'RAC106F'
        }, config);

        console.log(res.status, res.data);
    } catch (e) {
        if (e.response) {
            console.error("Error Response:", e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
}
run();
