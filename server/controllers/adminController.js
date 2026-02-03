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

exports.getAllUsers = async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const [users] = await connection.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.sub_department_id, u.job_title, u.manager_level,
                   d.name as department_name, sd.name as sub_department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN sub_departments sd ON u.sub_department_id = sd.id
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
    const { email, password, role, full_name, department_id, sub_department_id, job_title, manager_level } = req.body;
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await connection.query(
            'INSERT INTO users (email, password, role, full_name, department_id, sub_department_id, job_title, manager_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, role || 'employee', full_name, department_id || null, sub_department_id || null, job_title, manager_level || 'none']
        );

        const newUserId = result.insertId;

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
    const { email, role, full_name, department_id, sub_department_id, job_title, password, manager_level } = req.body;
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction();

        let query = 'UPDATE users SET email = ?, role = ?, full_name = ?, department_id = ?, sub_department_id = ?, job_title = ?, manager_level = ?';
        let params = [email, role, full_name, department_id || null, sub_department_id || null, job_title, manager_level || 'none'];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        // Handle Manager Allocation Logic
        // First, clear this user from any previous management positions to avoid stale data if they changed depts
        await connection.query('UPDATE departments SET manager_id = NULL WHERE manager_id = ?', [id]);
        await connection.query('UPDATE sub_departments SET manager_id = NULL WHERE manager_id = ?', [id]);

        // Then assign if they are currently a manager
        if (role === 'manager') {
            if (manager_level === 'department' && department_id) {
                await connection.query('UPDATE departments SET manager_id = ? WHERE id = ?', [id, department_id]);
            } else if (manager_level === 'sub_department' && sub_department_id) {
                await connection.query('UPDATE sub_departments SET manager_id = ? WHERE id = ?', [id, sub_department_id]);
            }
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
