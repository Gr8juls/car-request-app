const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function setupSharedViewTest() {
    try {
        console.log('Setting up shared view test...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Create second HC user
        const [existingHC] = await db.query('SELECT * FROM users WHERE email = ?', ['hc2@test.com']);
        if (existingHC.length === 0) {
            await db.query(`
                INSERT INTO users (full_name, email, password, role, department_id, sub_department_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['HC Test User 2', 'hc2@test.com', hashedPassword, 'hc', 1, 1]);
            console.log('Created hc2@test.com');
        } else {
            console.log('hc2@test.com already exists');
        }

        // 2. Create a Manager user (if needed for the request, though we can just insert the request directly)
        // Let's just insert a request that is 'approved_by_manager'

        // Check if we have a user to attach the request to. Let's use the first available user or create one.
        const [users] = await db.query('SELECT id FROM users LIMIT 1');
        let userId;
        if (users.length > 0) {
            userId = users[0].id;
        } else {
            // Create a dummy requester
            const [res] = await db.query(`
                INSERT INTO users (full_name, email, password, role, department_id, sub_department_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['Requester', 'requester@test.com', hashedPassword, 'employee', 1, 1]);
            userId = res.insertId;
        }

        // 3. Create/Reset a test request
        // We'll create a unique request for this test to identify it easily
        const uniqueModel = 'SharedViewTestCar-' + Date.now();

        await db.query(`
            INSERT INTO car_requests (
                user_id, department, location, purpose, car_model, reason, 
                date_out, time_out, date_back, time_back, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                userId, 'Sales', 'Kigali', 'Client Meeting', uniqueModel, 'Meeting client X',
                '2026-02-01', '10:00:00', '2026-02-01', '14:00:00', 'approved_by_manager'
            ]
        );

        console.log(`Created test request for car model: ${uniqueModel}`);
        console.log('Setup complete.');
        process.exit(0);

    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setupSharedViewTest();
