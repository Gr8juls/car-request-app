const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

const getDbConnection = async () => {
    return await mysql.createConnection(dbConfig);
};

const logAudit = async (connection, userId, action, changedFields, adminId) => {
    try {
        await connection.query(
            'INSERT INTO audit_logs (user_id, action, changed_fields, acted_by_admin_id) VALUES (?, ?, ?, ?)',
            [userId, action, JSON.stringify(changedFields), adminId]
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

exports.getAllUsers = async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const [users] = await connection.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.sub_department_id, u.job_title, u.manager_level, u.line_manager_id, u.is_active,
                   d.name as department_name, sd.name as sub_department_name, lm.full_name as line_manager_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN sub_departments sd ON u.sub_department_id = sd.id
            LEFT JOIN users lm ON u.line_manager_id = lm.id
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.promoteToManager = async (req, res) => {
    const { userId, subDepartmentId } = req.body;
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction();

        // 1. Update user role and sub_department
        // Fetch sub-department to get department_id
        const [subDept] = await connection.query('SELECT department_id FROM sub_departments WHERE id = ?', [subDepartmentId]);
        if (subDept.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Sub-department not found' });
        }
        const departmentId = subDept[0].department_id;

        await connection.query(`
            UPDATE users 
            SET role = 'manager', department_id = ?, sub_department_id = ?, manager_level = 'sub_department'
            WHERE id = ?
        `, [departmentId, subDepartmentId, userId]);

        // 2. Update sub_departments table to set manager_id
        await connection.query(`
            UPDATE sub_departments 
            SET manager_id = ? 
            WHERE id = ?
        `, [userId, subDepartmentId]);

        await connection.commit();
        res.json({ message: 'User promoted to Manager of Others successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.createUser = async (req, res) => {
    const { email, password, role, full_name, department_id, sub_department_id, job_title, manager_level, line_manager_id } = req.body;
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction(); // Start transaction

        // Check if user exists
        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'User already exists' });
        }

        // Role Uniqueness Validations
        if (manager_level === 'md') {
            const [mdExists] = await connection.query('SELECT id FROM users WHERE manager_level = "md" AND is_active = TRUE');
            if (mdExists.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Only one Managing Director can be active at a time.' });
            }
        }
        if (manager_level === 'department' && department_id) {
            const [hodExists] = await connection.query('SELECT id FROM users WHERE manager_level = "department" AND department_id = ? AND is_active = TRUE', [department_id]);
            if (hodExists.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'A Head of Department already exists for this department.' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await connection.query(
            'INSERT INTO users (email, password, role, full_name, department_id, sub_department_id, job_title, manager_level, line_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, role || 'employee', full_name, department_id || null, sub_department_id || null, job_title, manager_level || 'none', line_manager_id || null]
        );

        const newUserId = result.insertId;

        // Log Audit
        await logAudit(connection, newUserId, 'CREATED', {
            after: { email, role, full_name, department_id, sub_department_id, job_title, manager_level }
        }, req.user.id);

        // If manager, update the respective level table
        if (role === 'manager') {
            if (manager_level === 'department' && department_id) {
                // Ensure no other manager is assigned strictly? Or just overwrite? Overwriting for now as per "total rights"
                await connection.query('UPDATE departments SET manager_id = ? WHERE id = ?', [newUserId, department_id]);
            } else if (manager_level === 'sub_department' && sub_department_id) {
                await connection.query('UPDATE sub_departments SET manager_id = ? WHERE id = ?', [newUserId, sub_department_id]);
            }
        }

        await connection.commit(); // Commit transaction
        res.status(201).json({ message: 'User created successfully', userId: newUserId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, role, full_name, department_id, sub_department_id, job_title, password, manager_level, line_manager_id, is_active } = req.body;
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction();

        // Fetch current values for audit
        const [oldUser] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
        if (oldUser.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found' });
        }
        const before = oldUser[0];

        // Role Uniqueness Validations
        if (manager_level === 'md' && before.manager_level !== 'md' && (is_active !== false)) {
            const [mdExists] = await connection.query('SELECT id FROM users WHERE manager_level = "md" AND is_active = TRUE AND id != ?', [id]);
            if (mdExists.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Only one Managing Director can be active at a time.' });
            }
        }
        if (manager_level === 'department' && department_id && (before.manager_level !== 'department' || before.department_id != department_id) && (is_active !== false)) {
            const [hodExists] = await connection.query('SELECT id FROM users WHERE manager_level = "department" AND department_id = ? AND is_active = TRUE AND id != ?', [department_id, id]);
            if (hodExists.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'A Head of Department already exists for this department.' });
            }
        }

        let query = 'UPDATE users SET email = ?, role = ?, full_name = ?, department_id = ?, sub_department_id = ?, job_title = ?, manager_level = ?, line_manager_id = ?, is_active = ?';
        let params = [
            email || before.email,
            role || before.role,
            full_name || before.full_name,
            (department_id === '' || department_id === null) ? null : (department_id || before.department_id),
            (sub_department_id === '' || sub_department_id === null) ? null : (sub_department_id || before.sub_department_id),
            job_title || before.job_title,
            manager_level || before.manager_level,
            (line_manager_id === '' || line_manager_id === null) ? null : (line_manager_id !== undefined ? line_manager_id : before.line_manager_id),
            is_active !== undefined ? is_active : before.is_active
        ];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        // Audit Logging
        const action = (is_active === false && before.is_active) ? 'DEACTIVATED' : 'UPDATED';
        await logAudit(connection, id, action, {
            before: {
                email: before.email, role: before.role, full_name: before.full_name,
                department_id: before.department_id, sub_department_id: before.sub_department_id,
                job_title: before.job_title, manager_level: before.manager_level, is_active: before.is_active
            },
            after: {
                email, role, full_name, department_id, sub_department_id,
                job_title, manager_level, is_active
            }
        }, req.user.id);

        // Handle Manager Allocation Logic
        // First, clear this user from any previous management positions to avoid stale data if they changed depts
        await connection.query('UPDATE departments SET manager_id = NULL WHERE manager_id = ?', [id]);
        await connection.query('UPDATE sub_departments SET manager_id = NULL WHERE manager_id = ?', [id]);

        // Then assign if they are currently a manager
        if ((role || before.role) === 'manager') {
            const currentManagerLevel = manager_level || before.manager_level;
            const currentDeptId = department_id || before.department_id;
            const currentSubDeptId = sub_department_id || before.sub_department_id;

            if (currentManagerLevel === 'department' && currentDeptId) {
                await connection.query('UPDATE departments SET manager_id = ? WHERE id = ?', [id, currentDeptId]);
            } else if (currentManagerLevel === 'sub_department' && currentSubDeptId) {
                await connection.query('UPDATE sub_departments SET manager_id = ? WHERE id = ?', [id, currentSubDeptId]);
            }
        }

        // Reassign pending requests if line manager changed
        if (line_manager_id !== undefined && line_manager_id !== before.line_manager_id) {
            // Also ensure we don't accidentally set assigned_to to null if it shouldn't be, 
            // but if line_manager_id IS null, then assigned_to becomes null (orphan).
            // We only reassign 'pending' requests as per FR-6.
            await connection.query(`
                UPDATE car_requests 
                SET assigned_to = ? 
                WHERE user_id = ? AND status IN ('pending', 'approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager')
             `, [line_manager_id, id]);
        }

        await connection.commit();
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction();

        // Remove user from managing sub-departments
        await connection.query('UPDATE sub_departments SET manager_id = NULL WHERE manager_id = ?', [id]);

        // Remove user from managing departments
        await connection.query('UPDATE departments SET manager_id = NULL WHERE manager_id = ?', [id]);

        // Delete user
        await connection.query('DELETE FROM users WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.getUserAuditHistory = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await getDbConnection();
        const [logs] = await connection.query(`
            SELECT a.*, u.full_name as admin_name 
            FROM audit_logs a 
            LEFT JOIN users u ON a.acted_by_admin_id = u.id 
            WHERE a.user_id = ? 
            ORDER BY a.created_at DESC
        `, [id]);
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};
