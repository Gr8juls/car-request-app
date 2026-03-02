const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordReset } = require('../utils/emailService');

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

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
        }

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
                    id: user.id,
                    role: user.role,
                    department: user.department_name,
                    manager_level: user.manager_level,
                    line_manager_id: user.line_manager_id
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.email, u.role, u.full_name, u.job_title, u.manager_level, u.line_manager_id, 
                   d.name as department_name, lm.full_name as line_manager_name
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users lm ON u.line_manager_id = lm.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = rows[0];
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            job_title: user.job_title,
            manager_level: user.manager_level,
            line_manager_id: user.line_manager_id,
            line_manager_name: user.line_manager_name,
            department: user.department_name
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update own profile (name, email, password)
exports.updateProfile = async (req, res) => {
    const { full_name, email, currentPassword, newPassword } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = rows[0];

        // If changing password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set a new password.' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect.' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            await db.query('UPDATE users SET full_name = ?, email = ?, password = ? WHERE id = ?', [full_name, email, hashedPassword, req.user.id]);
        } else {
            await db.query('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [full_name, email, req.user.id]);
        }

        res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await db.query('SELECT id, full_name FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            // For security, don't reveal if user exists
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        const user = rows[0];
        const token = crypto.randomBytes(20).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour from now

        await db.query(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [token, expires, user.id]
        );

        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password/${token}`;

        // Log for dev convenience
        console.log('------------------------------------------');
        console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
        console.log(`RESET URL: ${resetUrl}`);
        console.log('------------------------------------------');

        // Send actual email
        await sendPasswordReset(email, resetUrl, user.full_name);

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        const user = rows[0];

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear token
        await db.query(
            'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
