const db = require('./config/db');

(async () => {
    try {
        console.log('=== Testing MD Approval with Real Request ===\n');

        // Find a pending request assigned to MD
        const [requests] = await db.query(`
            SELECT r.id, r.status, r.assigned_to, 
                   u.full_name as requester, u.manager_level as requester_level,
                   a.full_name as assigned_to_name, a.manager_level as assigned_to_level
            FROM car_requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users a ON r.assigned_to = a.id
            WHERE r.status = 'pending'
              AND a.manager_level = 'md'
            ORDER BY r.created_at DESC
            LIMIT 1
        `);

        if (requests.length === 0) {
            console.log('No pending requests assigned to MD found.');
            console.log('Creating a test scenario...\n');

            // Get MD user
            const [mdUsers] = await db.query('SELECT id, full_name FROM users WHERE manager_level = "md" LIMIT 1');
            if (mdUsers.length === 0) {
                console.log('ERROR: No MD user found in database');
                process.exit(1);
            }
            const md = mdUsers[0];
            console.log('MD User:', md);

            // Get a user with MD as line manager
            const [testUsers] = await db.query('SELECT id, full_name, manager_level FROM users WHERE line_manager_id = ? LIMIT 1', [md.id]);
            if (testUsers.length === 0) {
                console.log('ERROR: No users with MD as line manager found');
                process.exit(1);
            }
            const testUser = testUsers[0];
            console.log('Test User:', testUser);
            console.log('');
        } else {
            const request = requests[0];
            console.log('Found pending request:');
            console.log('Request ID:', request.id);
            console.log('Requester:', request.requester, '(manager_level:', request.requester_level + ')');
            console.log('Status:', request.status);
            console.log('Assigned To:', request.assigned_to_name, '(manager_level:', request.assigned_to_level + ')');
            console.log('');

            // Simulate the approval logic
            const approvalMatrix = require('./utils/approvalMatrix');

            const trimmedLevel = (request.requester_level || 'none').trim();
            const currentStatus = request.status;
            const mdId = request.assigned_to;

            console.log('=== Simulating Approval Logic ===');
            console.log('Requester Level:', trimmedLevel);
            console.log('Current Status:', currentStatus);
            console.log('');

            // Step 1: Get next step
            let nextStep = approvalMatrix.getNextStep(trimmedLevel, currentStatus);
            console.log('Step 1 - getNextStep result:', nextStep);

            // Step 2: MD Super-Approval logic
            const mdManagerLevel = 'md';
            const assignedToMD = true;

            if (mdManagerLevel === 'md' && assignedToMD) {
                const workflow = approvalMatrix.getWorkflow(trimmedLevel);
                console.log('Step 2 - Full workflow for level "' + trimmedLevel + '":', JSON.stringify(workflow, null, 2));

                const mdStep = workflow.steps.find(step =>
                    step.status === currentStatus && step.approver_level === 'md'
                );
                console.log('Step 3 - MD-specific step found:', mdStep);

                if (mdStep) {
                    nextStep = mdStep;
                    console.log('Step 4 - Using MD-specific step');
                }
            }

            console.log('');
            console.log('Final nextStep:', nextStep);
            console.log('');

            if (nextStep) {
                console.log('✓ Approval should succeed');
                console.log('  New status will be:', nextStep.next_status);
            } else {
                console.log('✗ Approval will fail - no valid next step found');
            }
        }

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
})();
