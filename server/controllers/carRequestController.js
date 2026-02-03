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

        // Fetch user's manager_level to set initial status
        // If requester is a Line Manager or Department Head, auto-approve their own level
        const [userRows] = await db.query('SELECT manager_level FROM users WHERE id = ?', [req.user.id]);
        if (userRows.length > 0) {
            const manager_level = userRows[0].manager_level;
            if (manager_level === 'sub_department') {
                // Line Manager's request bypasses Line Manager approval
                status = 'approved_by_line_manager';
            } else if (manager_level === 'department') {
                // Department Head's request bypasses both Line Manager and Dept Head approval
                status = 'approved_by_dept_head';
            }
        }

        await db.query(
            `INSERT INTO car_requests (
                user_id, department, location, purpose, car_model, reason, 
                date_out, time_out, date_back, time_back, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, department, location, purpose, car_model, reason,
                date_out, time_out, date_back, time_back, status
            ]
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
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    WHERE u.line_manager_id = ? 
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
            SELECT r.id, r.status, r.user_id, u.department_id, u.sub_department_id, u.manager_level as requester_manager_level
            FROM car_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ?
        `, [requestId]);

        if (requestRows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const currentRequest = requestRows[0];
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
                const isEmployeePathOk = (currentRequest.requester_manager_level === 'none' && (currentStatus === 'approved_by_line_manager' || currentStatus === 'pending'));
                const isManagerPathOk = (currentRequest.requester_manager_level !== 'none' && currentStatus === 'approved_by_dept_head');

                if (!isEmployeePathOk && !isManagerPathOk && currentStatus !== 'approved_by_hc') {
                    return res.status(400).json({ message: 'Request must follow the approved workflow path' });
                }
            }

            updateQuery += ', hr_comment = ?, driver_allocated = ?, vehicle_allocated = ?, reg_no = ? WHERE id = ?';
            params.push(comment, driver_allocated, vehicle_allocated, reg_no, requestId);
        } else if (approver.manager_level === 'sub_department') {
            // Line Manager (manages specific people directly)

            // Check if this approver is the direct line manager of the requester
            const [requesterRow] = await db.query('SELECT line_manager_id FROM users WHERE id = ?', [currentRequest.user_id]);
            if (!requesterRow.length || requesterRow[0].line_manager_id !== req.user.id) {
                return res.status(403).json({ message: 'You are not the assigned Line Manager for this user' });
            }

            // Line Manager only approves 'pending' requests
            if (status === 'approved_by_line_manager' && currentStatus !== 'pending') {
                return res.status(400).json({ message: 'Can only approve pending requests' });
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else if (approver.manager_level === 'department') {
            // Department Head (manages entire department)
            if (approver.department_id !== currentRequest.department_id) {
                return res.status(403).json({ message: 'Not authorized to approve for this department' });
            }

            // Department Head only approves requests that are 'approved_by_line_manager' 
            // AND the requester is a Line Manager (as per current workflow LM -> DH -> HC)
            if (status === 'approved_by_dept_head') {
                if (currentStatus !== 'approved_by_line_manager' || currentRequest.requester_manager_level === 'none') {
                    return res.status(400).json({ message: 'Request does not require Manager of Managers approval' });
                }
            }
            updateQuery += ', manager_comment = ? WHERE id = ?';
            params.push(comment, requestId);
        } else {
            return res.status(403).json({ message: 'Not authorized to update status' });
        }

        await db.query(updateQuery, params);
        res.json({ message: 'Request updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

