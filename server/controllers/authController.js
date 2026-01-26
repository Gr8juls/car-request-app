const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { email, password, role, full_name, department_id, sub_department_id, job_title, manager_level } = req.body;
    try {
        // Check if user exists
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if department is 'Human Capital' to assign 'hc' role automatically
        let assignedRole = role || 'employee';
        if (department_id) {
            const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
            if (deptRows.length > 0 && deptRows[0].name === 'Human Capital') {
                assignedRole = 'hc';
            }
        }

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (email, password, role, full_name, department_id, sub_department_id, job_title, manager_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, assignedRole, full_name, department_id, sub_department_id, job_title, manager_level || 'none']
        );

        const userId = result.insertId;

        // If manager, update the respective level table
        if (manager_level === 'department' && department_id) {
            await db.query('UPDATE departments SET manager_id = ? WHERE id = ?', [userId, department_id]);
        } else if (manager_level === 'sub_department' && sub_department_id) {
            await db.query('UPDATE sub_departments SET manager_id = ? WHERE id = ?', [userId, sub_department_id]);
        }

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Join with departments to get department name
        const [rows] = await db.query(`
            SELECT u.*, d.name as department_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.email = ?
        `, [email]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create Token
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                department_name: user.department_name,
                manager_level: user.manager_level
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    role: user.role,
                    department: user.department_name,
                    manager_level: user.manager_level
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
