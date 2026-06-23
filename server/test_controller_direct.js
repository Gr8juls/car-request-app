const controller = require('./controllers/carRequestController');
const db = require('./config/db');

async function run() {
    const req = {
        params: { id: '56' },
        user: { id: 1, role: 'hc', department_name: 'Human Capital' },
        body: {
            status: 'approved_by_hc',
            comment: 'Done',
            driver_allocated: 'Innocent Kabanda',
            assigned_driver_id: '2',
            vehicle_allocated: 'Sedan - RAC106F',
            reg_no: 'RAC106F'
        }
    };
    
    const res = {
        status: function(code) {
            console.log('Status set:', code);
            return this;
        },
        json: function(data) {
            console.log('JSON sent:', data);
            return this;
        }
    };
    
    await controller.updateStatus(req, res);
    process.exit(0);
}
run();
