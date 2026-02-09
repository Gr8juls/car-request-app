const db = require('../config/db');

// Create a new request
exports.createRequest = async (req, res) => {
    const {
        department,
        location,
        purpose,
        car_model,
        reason,
        date_out,
        time_out,
        date_back,
        time_back
    } = req.body;
    try {
        let status = 'pending';

        // Fetch user's manager_level and line_manager_id
        const [userRows] = await db.query('SELECT manager_level, line_manager_id FROM users WHERE id = ?', [req.user.id]);
        let assigned_to = null;

        if (userRows.length > 0) {
            const { manager_level, line_manager_id } = userRows[0];

            // Set default assigned_to to line_manager_id (can be overridden below)
            assigned_to = line_manager_id;

            if (manager_level === 'sub_department') {
                status = 'approved_by_line_manager';
                // If auto-approved by LM, next step is Dept Head. 
                // We should technically assign to Dept Head here if we want to track next step provided we know who that is.
                // But for Phase 1, we just care about initial assignment validation.
            } else if (manager_level === 'department') {
                status = 'approved_by_dept_head';
            } else if (manager_level === 'operation') {
                status = 'approved_by_ops_manager';
            } else if (manager_level === 'board') {
                status = 'pending';
                // Board reports to MD. We assume line_manager_id for Board points to MD.
            } else if (manager_level === 'md') {
                status = 'approved_by_md';
            } else {
                // Regular Employee
                if (!line_manager_id) {
                    return res.status(400).json({ message: 'No Line Manager is assigned. Please contact Admin.' });
                }
            }
        }

        await db.query(
            `INSERT INTO car_requests (
                user_id, department, location, purpose, car_model, reason, 
                date_out, time_out, date_back, time_back, status, assigned_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, department, location, purpose, car_model, reason,
                date_out, time_out, date_back, time_back, status, assigned_to
            ]
        );

        const requestId = (await db.query('SELECT LAST_INSERT_ID() as id'))[0][0].id;

        // Log creation
        await db.query(
            `INSERT INTO request_logs (request_id, actor_id, action, status_after, comment) VALUES (?, ?, 'CREATED', ?, 'Request submitted')`,
            [requestId, req.user.id, status]
        );

        res.status(201).json({ message: 'Car request created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get requests (differs by role)
exports.getRequests = async (req, res) => {
    try {
        let query;
        let params = [];
        const { status, department, startDate, endDate, sortBy, order } = req.query;


        if (req.user.role === 'driver') {
            query = `
                SELECT r.*, u.full_name, u.manager_level as requester_manager_level
                FROM car_requests r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.assigned_driver_id = ? 
                ORDER BY r.created_at DESC
            `;
            params = [req.user.id];
            const [rows] = await db.query(query, params);
            return res.json(rows);
        }

        if (req.user.role === 'employee' || !req.user.role) {
            // If they are strictly employee (no manager_level), or just checking their own
            // Actually, managers might also want to see their own requests. 
            // Let's check if the requester is ONLY regular employee first.
            // If we want them to see ONLY their own, we'd need another route or refined logic.
            // But usually Dashboard shows user's own requests.

            // Check if user is JUST an employee
            const [userRows] = await db.query('SELECT manager_level, role FROM users WHERE id = ?', [req.user.id]);
            const userDetail = userRows[0];

            if (userDetail.role === 'employee' && userDetail.manager_level === 'none') {
                query = 'SELECT * FROM car_requests WHERE user_id = ? ORDER BY created_at DESC';
                params = [req.user.id];
                const [rows] = await db.query(query, params);
                return res.json(rows);
            }
        }

        if (req.user.role === 'manager' || (req.user.role === 'employee' && req.user.manager_level !== 'none')) {
            // Fetch manager's details to get department, sub_department and manager_level
            const [managerRows] = await db.query('SELECT department_id, sub_department_id, manager_level FROM users WHERE id = ?', [req.user.id]);
            if (managerRows.length === 0) return res.status(404).json({ message: 'User not found' });

            const { department_id, sub_department_id, manager_level } = managerRows[0];

            if (manager_level === 'sub_department') {
                // Line Manager sees requests from their direct reports (using line_manager_id)
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.assigned_to = ? 
                    ORDER BY r.created_at DESC
                `;
                params = [req.user.id];
            } else if (manager_level === 'department') {
                // Dept Head sees requests from their entire department
                // They ALSO might be the direct Line Manager for some people (e.g. Line Managers themselves)
                // So we can include:
                // 1. Everyone in their department (broad view - current logic)
                // 2. OR Just their direct reports?
                // The requirement implies a hierarchy: Employee -> LM -> DH.
                // If we strictly follow the 'line manager' approval step, the DH only acts as 'Line Manager' for the LMs.
                // But for the 'Department Head' approval step, they see requests approved by LMs in their Dept.

                // Let's keep the broad department view for now so they can see everything,
                // but we need to ensure they can Approve as 'Line Manager' if they are the direct supervisor.

                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    WHERE u.department_id = ? 
                    ORDER BY r.created_at DESC
                `;
                params = [department_id];
            } else if (manager_level === 'operation') {
                // Operation Manager sees requests that have passed Department Head approval
                // Showing all requests that are 'approved_by_dept_head' (needing their action)
                // or 'approved_by_ops_manager' (approved by them) or 'approved_by_hc' (completed)
                // that originated from managers (who follow this path).
                // Assuming they want to see the queue.
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    WHERE r.status IN ('approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_hc')
                    AND u.manager_level NOT IN ('none', 'board', 'md') 
                    ORDER BY r.created_at DESC
                `;
                params = [];
            } else if (manager_level === 'md') {
                // MD sees requests from Board Members
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.assigned_to = ?
                    ORDER BY r.created_at DESC
                `;
                params = [req.user.id];
            } else if (manager_level === 'board') {
                // Board member sees their own requests
                query = 'SELECT r.*, u.full_name, u.manager_level as requester_manager_level FROM car_requests r JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC';
                params = [req.user.id];
            } else {
                // Fallback for employee with manager_level none (their own only)
                query = 'SELECT r.*, u.full_name, u.manager_level as requester_manager_level FROM car_requests r JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC';
                params = [req.user.id];
            }

            const [rows] = await db.query(query, params);
            return res.json(rows);

        } else if (req.user.role === 'hc' || req.user.department_name === 'Human Capital') {
            // HC sees all requests.
            query = 'SELECT r.*, u.full_name, u.manager_level as requester_manager_level FROM car_requests r JOIN users u ON r.user_id = u.id WHERE 1=1';

            if (status) {
                query += ' AND r.status = ?';
                params.push(status);
            }
            if (department) {
                query += ' AND r.department LIKE ?';
                params.push(`%${department}%`);
            }
            if (startDate) {
                query += ' AND r.date_out >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND r.date_back <= ?';
                params.push(endDate);
            }

            const validSortFields = ['date_out', 'car_model', 'created_at', 'status'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

            query += ` ORDER BY r.${sortField} ${sortOrder}`;

            const [rows] = await db.query(query, params);
            return res.json(rows);
        }

        res.json([]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Status (Approve/Reject)
exports.updateStatus = async (req, res) => {
    const {
        status,
        comment,
        driver_allocated,
        vehicle_allocated,
        reg_no
    } = req.body;
    const requestId = req.params.id;

    try {
        // Fetch current request and requester details
        const [requestRows] = await db.query(`
            SELECT r.id, r.status, r.user_id, r.assigned_to, u.department_id, u.sub_department_id, u.manager_level as requester_manager_level
            FROM car_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ?
        `, [requestId]);

        if (requestRows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const currentRequest = requestRows[0];

        // Fetch logs
        const [logs] = await db.query(`
            SELECT l.*, u.full_name as actor_name 
            FROM request_logs l 
            JOIN users u ON l.actor_id = u.id 
            WHERE l.request_id = ? 
            ORDER BY l.created_at ASC
        `, [requestId]);

        currentRequest.logs = logs;
        const currentStatus = currentRequest.status;

        let updateQuery = 'UPDATE car_requests SET status = ?';
        let params = [status];

        // Fetch approver details
        const [approverRows] = await db.query('SELECT role, department_id, sub_department_id, manager_level FROM users WHERE id = ?', [req.user.id]);
        const approver = approverRows[0];

        if (approver.role === 'hc' || (req.user.department_name === 'Human Capital')) {
            // HC can approve after Line Manager OR Department Head depending on requester
            // Path 1: Employee -> Line Manager -> HC
            // Path 2: Line Manager -> Dept Head -> HC

            if (status === 'approved_by_hc') {
                // Path 1: Employee -> Line Manager -> HC
                const isEmployeePathOk = (currentRequest.requester_manager_level === 'none' && currentStatus === 'approved_by_line_manager');

                // Path 2: Line Manager -> Head of Department -> HC
                const isLMPathOk = (currentRequest.requester_manager_level === 'sub_department' && currentStatus === 'approved_by_dept_head');

                // Path 3: Head of Department -> Operation Manager -> HC
                const isDHPathOk = (currentRequest.requester_manager_level === 'department' && currentStatus === 'approved_by_ops_manager');

                // Path 4: Operation Manager -> Managing Director -> HC
                const isOMPathOk = (currentRequest.requester_manager_level === 'operation' && currentStatus === 'approved_by_md');

                // Board Path (Original): Board -> MD -> HC
                const isBoardPathOk = (currentRequest.requester_manager_level === 'board' && currentStatus === 'approved_by_md');

                // MD Path
                const isMDPathOk = (currentRequest.requester_manager_level === 'md' && currentStatus === 'approved_by_md');

                if (!isEmployeePathOk && !isLMPathOk && !isDHPathOk && !isOMPathOk && !isBoardPathOk && !isMDPathOk && currentStatus !== 'approved_by_hc') {
                    return res.status(400).json({ message: 'Request must follow the approved workflow path' });
                }
            }

            updateQuery += ', hr_comment = ?, driver_allocated = ?, assigned_driver_id = ?, vehicle_allocated = ?, reg_no = ? WHERE id = ?';
            params.push(comment, driver_allocated, req.body.assigned_driver_id || null, vehicle_allocated, reg_no, requestId);
        } else if (approver.manager_level === 'sub_department') {
            // Line Manager (manages specific people directly)

            // Check if this approver is the assigned line manager
            if (currentRequest.assigned_to !== req.user.id) {
                return res.status(403).json({ message: 'You are not the assigned approver for this request' });
            }

            // Line Manager only approves 'pending' requests from employees
            if (status === 'approved_by_line_manager') {
                if (currentStatus !== 'pending' || currentRequest.requester_manager_level !== 'none') {
                    return res.status(400).json({ message: 'Can only approve pending requests from regular employees' });
                }
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else if (approver.manager_level === 'department') {
            // Department Head (manages entire department)
            if (approver.department_id !== currentRequest.department_id) {
                return res.status(403).json({ message: 'Not authorized to approve for this department' });
            }

            // Department Head only approves requests that are 'approved_by_line_manager' 
            // AND the requester is a Line Manager
            if (status === 'approved_by_dept_head') {
                if (currentStatus !== 'approved_by_line_manager' || currentRequest.requester_manager_level !== 'sub_department') {
                    return res.status(400).json({ message: 'Can only approve requests from Line Managers that have started' });
                }
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else if (approver.manager_level === 'operation') {
            // Operation Manager

            // Only approves requests that are 'approved_by_dept_head' from Department Heads
            if (status === 'approved_by_ops_manager') {
                if (currentStatus !== 'approved_by_dept_head' || currentRequest.requester_manager_level !== 'department') {
                    return res.status(400).json({ message: 'Can only approve requests from Department Heads' });
                }
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else if (approver.manager_level === 'md') {
            // Managing Director

            // Only approves requests from Board Members
            // Approves requests from Board Members (pending) or Operation Managers (approved_by_ops_manager)
            if (status === 'approved_by_md') {
                const isBoardOk = (currentRequest.requester_manager_level === 'board' && currentStatus === 'pending');
                const isOpsOk = (currentRequest.requester_manager_level === 'operation' && currentStatus === 'approved_by_ops_manager');

                if (!isBoardOk && !isOpsOk) {
                    return res.status(400).json({ message: 'Request is not at the correct stage for MD approval' });
                }
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else {
            return res.status(403).json({ message: 'Not authorized to update status' });
        }

        await db.query(updateQuery, params);

        // Log action
        const actionLog = status === 'rejected' ? 'REJECTED' : 'APPROVED';
        await db.query(
            `INSERT INTO request_logs (request_id, actor_id, action, status_before, status_after, comment) VALUES (?, ?, ?, ?, ?, ?)`,
            [requestId, req.user.id, actionLog, currentStatus, status, comment]
        );

        // --- NEW: Notification Logic ---
        if (status === 'approved_by_hc' && (approver.role === 'hc' || req.user.department_name === 'Human Capital')) {
            // 1. Notify Requester
            const requesterMsg = `Your car request (#${requestId}) for ${currentRequest.car_model} has been approved and allocated. Vehicle: ${vehicle_allocated}, Reg: ${reg_no}, Driver: ${driver_allocated}.`;
            await db.query(
                'INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                [currentRequest.user_id, requestId, requesterMsg]
            );

            // 2. Notify Driver (if assigned_driver_id is provided)
            const assigned_driver_id = req.body.assigned_driver_id;
            if (assigned_driver_id) {
                const driverMsg = `New Trip Assignment: You have been assigned to trip #${requestId} (${currentRequest.car_model}) for ${currentRequest.full_name || 'User'}.`;
                await db.query(
                    'INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                    [assigned_driver_id, requestId, driverMsg]
                );
            }
        }
        // --- End Notification Logic ---

        res.json({ message: 'Request updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get logs for a request
exports.getRequestLogs = async (req, res) => {
    try {
        const requestId = req.params.id;

        // Include actor name for display
        const [logs] = await db.query(`
            SELECT l.*, u.full_name as actor_name 
            FROM request_logs l 
            JOIN users u ON l.actor_id = u.id 
            WHERE l.request_id = ? 
            ORDER BY l.created_at ASC
        `, [requestId]);

        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
// Get list of drivers (for HC allocation)
exports.getDrivers = async (req, res) => {
    try {
        const [drivers] = await db.query('SELECT id, full_name, email FROM users WHERE role = "driver" AND is_active = 1');
        res.json(drivers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
