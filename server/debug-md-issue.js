const db = require('./config/db');

(async () => {
    try {
        console.log('=== Users with Manager Levels ===');
        const [users] = await db.query(`
            SELECT id, full_name, manager_level, line_manager_id, 
                   (SELECT full_name FROM users u2 WHERE u2.id = users.line_manager_id) as line_manager_name
            FROM users 
            WHERE manager_level IN ('md', 'board', 'operation', 'department', 'sub_department')
            ORDER BY manager_level, full_name
        `);
        console.log(JSON.stringify(users, null, 2));

        console.log('\n=== Users who have MD as their line manager ===');
        const [mdReports] = await db.query(`
            SELECT u.id, u.full_name, u.manager_level, u.line_manager_id,
                   lm.full_name as line_manager_name, lm.manager_level as line_manager_level
            FROM users u
            JOIN users lm ON u.line_manager_id = lm.id
            WHERE lm.manager_level = 'md'
        `);
        console.log(JSON.stringify(mdReports, null, 2));

        console.log('\n=== Pending Requests Assigned to MD ===');
        const [requests] = await db.query(`
            SELECT r.id, r.status, r.assigned_to, 
                   u.full_name as requester, u.manager_level as requester_level,
                   a.full_name as assigned_to_name, a.manager_level as assigned_to_level
            FROM car_requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users a ON r.assigned_to = a.id
            WHERE r.status NOT IN ('rejected', 'completed', 'approved_by_hc')
              AND a.manager_level = 'md'
            ORDER BY r.created_at DESC
        `);
        console.log(JSON.stringify(requests, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
