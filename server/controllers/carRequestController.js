const db = require('../config/db');
const approvalMatrix = require('../utils/approvalMatrix');
const { sendRequestNotification } = require('../utils/emailService');

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
        time_back,
        assigned_to: selected_manager_id
    } = req.body;
    try {
        let status = 'pending';

        // Fetch user's manager_level and line_manager_id
        const [userRows] = await db.query('SELECT manager_level, line_manager_id FROM users WHERE id = ?', [req.user.id]);
        let assigned_to = selected_manager_id || null;

        if (userRows.length > 0) {
            const { manager_level, line_manager_id } = userRows[0];

            // Set default assigned_to to line_manager_id IF not manually selected
            if (!assigned_to) {
                assigned_to = line_manager_id;
            }

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

        // --- Notification: Notify the assigned approver ---
        if (assigned_to) {
            const approverMsg = `New car request (#${requestId}) from ${req.user.full_name || 'User'} requires your approval.`;
            await db.query(
                'INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                [assigned_to, requestId, approverMsg]
            );
        } else if (status === 'approved_by_md') {
            // If it reached MD level and passed (like for MD's own request), notify HC
            const [hcUsers] = await db.query('SELECT id FROM users WHERE role = "hc"');
            for (const hc of hcUsers) {
                await db.query(
                    'INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                    [hc.id, requestId, `New car request (#${requestId}) from ${req.user.full_name || 'User'} is ready for HC allocation.`]
                );
            }
        }

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
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.user_id = ? 
                    ORDER BY r.created_at DESC
                `;
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
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
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
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.status IN ('approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_hc')
                    AND u.manager_level NOT IN ('none', 'board', 'md') 
                    ORDER BY r.created_at DESC
                `;
                params = [];
            } else if (manager_level === 'md') {
                // MD sees requests assigned to them that need their approval
                // Exclude requests already approved by MD (status='approved_by_md')
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.assigned_to = ?
                      AND r.status NOT IN ('approved_by_md', 'approved_by_hc', 'completed', 'rejected')
                    ORDER BY r.created_at DESC
                `;
                params = [req.user.id];
            } else if (manager_level === 'board') {
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.user_id = ? 
                    ORDER BY r.created_at DESC
                `;
                params = [req.user.id];
            } else {
                query = `
                    SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                    FROM car_requests r 
                    JOIN users u ON r.user_id = u.id 
                    LEFT JOIN users m ON r.assigned_to = m.id
                    WHERE r.user_id = ? 
                    ORDER BY r.created_at DESC
                `;
                params = [req.user.id];
            }

            const [rows] = await db.query(query, params);
            return res.json(rows);

        } else if (req.user.role === 'hc' || req.user.department_name === 'Human Capital') {
            // HC sees all requests.
            query = `
                SELECT r.*, u.full_name, u.manager_level as requester_manager_level, m.full_name as assigned_to_name
                FROM car_requests r 
                JOIN users u ON r.user_id = u.id 
                LEFT JOIN users m ON r.assigned_to = m.id
                WHERE 1=1
            `;

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
        const [approverRows] = await db.query('SELECT id, role, department_id, sub_department_id, manager_level, line_manager_id, full_name FROM users WHERE id = ?', [req.user.id]);
        const approver = approverRows[0];

        if (status === 'rejected') {
            updateQuery = 'UPDATE car_requests SET status = "rejected", assigned_to = NULL';
            params = []; // Initialized as [status] at l.271, but we overwrite
            updateQuery += ' WHERE id = ?';
            params = [requestId];

            await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                [currentRequest.user_id, requestId, `Your car request (#${requestId}) has been rejected by ${approver.full_name}.`]
            );
            // Send rejection email
            const [rejectedUserRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [currentRequest.user_id]);
            if (rejectedUserRows[0]) {
                await sendRequestNotification(
                    rejectedUserRows[0].email,
                    rejectedUserRows[0].full_name,
                    `Car Request #${requestId} Rejected`,
                    `Your car request (#${requestId}) has been <strong>rejected</strong> by ${approver.full_name}. Please log in to view details.`
                );
            }
        } else {
            const isHC = req.user.role === 'hc' || req.user.department_name === 'Human Capital';

            if (isHC && status === 'approved_by_hc') {
                updateQuery = 'UPDATE car_requests SET status = ?';
                params = [status];
                updateQuery += ', hr_comment = ?, driver_allocated = ?, assigned_driver_id = ?, vehicle_allocated = ?, reg_no = ?, assigned_to = NULL WHERE id = ?';
                params.push(comment, driver_allocated, req.body.assigned_driver_id || null, vehicle_allocated, reg_no, requestId);
            } else {
                const trimmedLevel = (currentRequest.requester_manager_level || 'none').trim();
                let nextStep = approvalMatrix.getNextStep(trimmedLevel, currentStatus);

            console.log('[MD APPROVAL DEBUG] Initial state:', {
                trimmedLevel,
                currentStatus,
                approverManagerLevel: req.user.manager_level,
                assignedTo: currentRequest.assigned_to,
                currentUserId: req.user.id,
                initialNextStep: nextStep
            });

            // MD Super-Approval: If MD is the assigned approver, find the MD-specific workflow step
            if (req.user.manager_level === 'md' && currentRequest.assigned_to === req.user.id) {
                console.log('[MD APPROVAL DEBUG] MD is assigned approver, searching for MD-specific step');
                const workflow = approvalMatrix.getWorkflow(trimmedLevel);
                console.log('[MD APPROVAL DEBUG] Full workflow:', JSON.stringify(workflow, null, 2));

                const mdStep = workflow.steps.find(step =>
                    step.status === currentStatus && step.approver_level === 'md'
                );
                console.log('[MD APPROVAL DEBUG] MD-specific step found:', mdStep);

                if (mdStep) {
                    nextStep = mdStep;
                    console.log('[MD APPROVAL DEBUG] Using MD-specific step');
                }
            }

            // MD Super-Approval Fallback: If no next step is found in the matrix but it's the MD approving, 
            // we allow it and default to approved_by_md
            if (!nextStep && req.user.manager_level === 'md') {
                console.log('[MD APPROVAL DEBUG] No next step found, using MD fallback');
                nextStep = {
                    status: currentStatus,
                    approver_level: 'md',
                    next_status: 'approved_by_md'
                };
            }

            console.log('[MD APPROVAL DEBUG] Final nextStep:', nextStep);

            if (!nextStep) {
                return res.status(400).json({
                    message: `Request is not at a valid stage for approval. (Level: ${trimmedLevel}, Status: ${currentStatus})`
                });
            }

            console.log('[MD APPROVAL DEBUG] nextStep.approver_level:', nextStep.approver_level);

            if (nextStep.approver_level === 'hc') {
                console.log('[MD APPROVAL DEBUG] Approver level is HC, checking if user is HC');
                if (approver.role !== 'hc' && req.user.department_name !== 'Human Capital') {
                    console.log('[MD APPROVAL DEBUG] User is NOT HC, returning error');
                    return res.status(403).json({ message: 'Only Human Capital can perform this final approval.' });
                }

                updateQuery = 'UPDATE car_requests SET status = ?';
                params = [status];
                updateQuery += ', hr_comment = ?, driver_allocated = ?, assigned_driver_id = ?, vehicle_allocated = ?, reg_no = ?, assigned_to = NULL WHERE id = ?';
                params.push(comment, driver_allocated, req.body.assigned_driver_id || null, vehicle_allocated, reg_no, requestId);
            } else {
                console.log('[MD APPROVAL DEBUG] Approver level is NOT HC, proceeding with manager approval');
                if (currentRequest.assigned_to !== req.user.id) {
                    return res.status(403).json({ message: 'You are not the assigned approver for this request.' });
                }

                let next_assigned_to = null;
                const nextStepAfterThis = approvalMatrix.getNextStep(currentRequest.requester_manager_level, nextStep.next_status);

                if (nextStepAfterThis && nextStepAfterThis.approver_level !== 'hc') {
                    next_assigned_to = approver.line_manager_id;
                    if (!next_assigned_to) {
                        return res.status(400).json({ message: 'Current approver has no line manager assigned for the next routing step.' });
                    }
                }

                updateQuery = 'UPDATE car_requests SET status = ?, manager_comment = ?, assigned_to = ? WHERE id = ?';
                params = [nextStep.next_status, comment, next_assigned_to, requestId];

                if (next_assigned_to) {
                    await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                        [next_assigned_to, requestId, `Car request (#${requestId}) from requester requires your approval.`]
                    );
                } else {
                    const [hcUsers] = await db.query('SELECT id FROM users WHERE role = "hc"');
                    for (const hc of hcUsers) {
                        await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                            [hc.id, requestId, `Car request (#${requestId}) has been approved by ${approver.full_name} and is ready for HC allocation.`]
                        );
                    }
                }

                await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                    [currentRequest.user_id, requestId, `Your car request (#${requestId}) has been approved by ${approver.full_name} and moved to the next stage.`]
                );
                const [approvedUserRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [currentRequest.user_id]);
                if (approvedUserRows[0]) {
                    await sendRequestNotification(
                        approvedUserRows[0].email,
                        approvedUserRows[0].full_name,
                        `Car Request #${requestId} Approved`,
                        `Your car request (#${requestId}) has been <strong>approved</strong> by ${approver.full_name} and moved to the next approval stage.`
                    );
                }
            }
        }
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
// Mark trip as started (Driver action)
exports.startTrip = async (req, res) => {
    try {
        const requestId = req.params.id;
        const [requestRows] = await db.query('SELECT * FROM car_requests WHERE id = ?', [requestId]);
        if (requestRows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = requestRows[0];

        if (req.user.role !== 'admin' && req.user.role !== 'hc' && request.assigned_driver_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to start this trip' });
        }

        if (request.status !== 'approved_by_hc') {
            return res.status(400).json({ message: 'Only HC-approved trips can be started' });
        }

        await db.query(
            'UPDATE car_requests SET status = ?, trip_started_at = NOW() WHERE id = ?',
            ['in_progress', requestId]
        );

        await db.query(
            'INSERT INTO request_logs (request_id, actor_id, action, status_before, status_after, comment) VALUES (?, ?, ?, ?, ?, ?)',
            [requestId, req.user.id, 'TRIP_STARTED', 'approved_by_hc', 'in_progress', 'Driver started the trip']
        );

        // Notify requester that trip is underway
        const [requesterRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [request.user_id]);
        if (requesterRows[0]) {
            await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)',
                [request.user_id, requestId, `Your trip (#${requestId}) has been started by the driver. You are on your way!`]
            );
            await sendRequestNotification(
                requesterRows[0].email,
                requesterRows[0].full_name,
                `Trip #${requestId} Has Started`,
                `Your car trip (#${requestId}) is now <strong>in progress</strong>. Your driver has started the journey.`
            );
        }

        res.json({ message: 'Trip started successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark trip as completed (Driver action)
exports.completeTrip = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { meter_reading_start, meter_reading_finish, fuel_status, trip_confirmed } = req.body;

        // Verify request exists and is assigned to this driver
        const [requestRows] = await db.query('SELECT * FROM car_requests WHERE id = ?', [requestId]);
        if (requestRows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = requestRows[0];

        // Authorization check: Only assigned driver or HC/Admin can complete
        if (req.user.role !== 'admin' && req.user.role !== 'hc' && request.assigned_driver_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to complete this trip' });
        }

        // Only approved trips can be completed
        if (request.status !== 'approved_by_hc') {
            return res.status(400).json({ message: 'Only HC approved trips can be marked as completed' });
        }

        await db.query(
            'UPDATE car_requests SET status = ?, meter_reading_start = ?, meter_reading_finish = ?, fuel_status = ?, trip_confirmed = ? WHERE id = ?',
            ['completed', meter_reading_start, meter_reading_finish, fuel_status, trip_confirmed ? 1 : 0, requestId]
        );

        // Log action
        await db.query(
            'INSERT INTO request_logs (request_id, actor_id, action, status_before, status_after, comment) VALUES (?, ?, ?, ?, ?, ?)',
            [requestId, req.user.id, 'COMPLETED', request.status, 'completed', `Trip marked as completed. Start: ${meter_reading_start}, Finish: ${meter_reading_finish}, Fuel: ${fuel_status}, Confirmed: ${trip_confirmed ? 'Yes' : 'No'}`]
        );

        // Notify requester and HC
        const [requesterRows] = await db.query('SELECT full_name FROM users WHERE id = ?', [request.user_id]);
        const requesterName = requesterRows[0]?.full_name || 'User';

        const requesterMsg = `Your trip (#${requestId}) has been marked as completed. Thank you!`;
        await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)', [request.user_id, requestId, requesterMsg]);

        // Find all HC users to notify
        const [hcUsers] = await db.query('SELECT id FROM users WHERE role = "hc"');
        for (const hc of hcUsers) {
            const hcMsg = `Trip #${requestId} for ${requesterName} completed. Readings: ${meter_reading_start} - ${meter_reading_finish}.`;
            await db.query('INSERT INTO notifications (user_id, request_id, message) VALUES (?, ?, ?)', [hc.id, requestId, hcMsg]);
        }

        res.json({ message: 'Trip marked as completed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get list of users who can approve (Managers, HC, or anyone with manager_level)
exports.getApprovers = async (req, res) => {
    try {
        const [managers] = await db.query(`
            SELECT id, full_name, email, manager_level, role 
            FROM users 
            WHERE (role = 'manager' OR manager_level != 'none') 
            AND is_active = 1 
            AND id != ?
        `, [req.user.id]);
        res.json(managers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
