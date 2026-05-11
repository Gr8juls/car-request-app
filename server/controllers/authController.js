const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordReset, sendOtpEmail, sendUnrequestedResetAlert } = require('../utils/emailService');

// ─────────────────────────────────────────────────────────────
// In-memory rate-limit store: { email -> { count, resetAt } }
// Max 3 OTP requests per email per 15 minutes
// ─────────────────────────────────────────────────────────────
const otpRateLimit = new Map();
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const OTP_RATE_MAX = 3;

function checkRateLimit(email) {
    const now = Date.now();
    const entry = otpRateLimit.get(email);

    if (!entry || now > entry.resetAt) {
        otpRateLimit.set(email, { count: 1, resetAt: now + OTP_RATE_WINDOW_MS });
        return true; // allowed
    }

    if (entry.count >= OTP_RATE_MAX) {
        return false; // blocked
    }

    entry.count += 1;
    return true; // allowed
}

// ─────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
    const { email, password, role, full_name, department_id, sub_department_id, job_title, manager_level } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let assignedRole = role || 'employee';
        if (department_id) {
            const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
            if (deptRows.length > 0 && deptRows[0].name === 'Human Capital') {
                assignedRole = 'hc';
            }
        }

        const [result] = await db.query(
            'INSERT INTO users (email, password, role, full_name, department_id, sub_department_id, job_title, manager_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, assignedRole, full_name, department_id, sub_department_id, job_title, manager_level || 'none']
        );

        const userId = result.insertId;

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

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
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

        if (!user.is_active) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

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

// ─────────────────────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
    const { full_name, email, currentPassword, newPassword } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = rows[0];

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

// ─────────────────────────────────────────────────────────────
// STEP 1 — REQUEST OTP  (POST /api/auth/forgot-password)
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const GENERIC_MSG = 'If an account with that email exists, a 6-digit code has been sent.';

    try {
        // Rate-limit check (per email)
        if (!checkRateLimit(email)) {
            return res.status(429).json({
                message: 'Too many reset attempts. Please wait 15 minutes before trying again.'
            });
        }

        const [rows] = await db.query('SELECT id, full_name FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            // Don't reveal account existence — still return generic message
            // Optionally send a security alert to the submitted address
            console.log(`[OTP] Reset requested for non-existent email: ${email}`);
            return res.json({ message: GENERIC_MSG });
        }

        const user = rows[0];

        // Generate a 6-digit numeric OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Hash the OTP before storing (same security level as passwords)
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);

        // Store in DB, reset attempt counter
        await db.query(
            'UPDATE users SET otp_code = ?, otp_expires = ?, otp_attempts = 0 WHERE id = ?',
            [hashedOtp, otpExpires, user.id]
        );

        // Log OTP for dev convenience (remove in production)
        console.log('------------------------------------------');
        console.log(`[OTP] Reset code for ${email}: ${otp}`);
        console.log(`[OTP] Expires at: ${new Date(otpExpires).toISOString()}`);
        console.log('------------------------------------------');

        // Send OTP email
        await sendOtpEmail(email, user.full_name, otp);

        return res.json({ message: GENERIC_MSG });
    } catch (error) {
        console.error('[OTP] forgotPassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────
// STEP 2 — VERIFY OTP  (POST /api/auth/verify-otp)
// ─────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    const MAX_ATTEMPTS = 5;

    try {
        const [rows] = await db.query(
            'SELECT id, otp_code, otp_expires, otp_attempts FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid request.' });
        }

        const user = rows[0];

        // Check if OTP exists
        if (!user.otp_code || !user.otp_expires) {
            return res.status(400).json({ message: 'No active reset code found. Please request a new one.' });
        }

        // Check expiry
        if (Date.now() > Number(user.otp_expires)) {
            // Clear the expired OTP
            await db.query('UPDATE users SET otp_code = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(400).json({ message: 'Your reset code has expired. Please request a new one.' });
        }

        // Check attempt count
        if (user.otp_attempts >= MAX_ATTEMPTS) {
            await db.query('UPDATE users SET otp_code = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new reset code.' });
        }

        // Compare OTP
        const isMatch = await bcrypt.compare(otp, user.otp_code);

        if (!isMatch) {
            // Increment attempt counter
            await db.query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', [user.id]);
            const remaining = MAX_ATTEMPTS - (user.otp_attempts + 1);
            return res.status(400).json({
                message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'No attempts remaining. Please request a new code.'}`
            });
        }

        // OTP is valid — clear it immediately (single-use)
        await db.query('UPDATE users SET otp_code = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);

        // Issue a short-lived reset session token (5 minutes)
        const resetToken = jwt.sign(
            { userId: user.id, purpose: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        return res.json({
            message: 'Code verified successfully.',
            resetToken
        });
    } catch (error) {
        console.error('[OTP] verifyOtp error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — RESET PASSWORD  (POST /api/auth/reset-password)
// ─────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    const { resetToken, password } = req.body;

    try {
        // Verify the short-lived reset token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: 'Your reset session has expired. Please start over.' });
        }

        if (decoded.purpose !== 'password_reset') {
            return res.status(400).json({ message: 'Invalid reset token.' });
        }

        // Enforce minimum password length
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear any residual OTP fields
        await db.query(
            'UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL, otp_attempts = 0, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, decoded.userId]
        );

        console.log(`[OTP] Password successfully reset for user ID: ${decoded.userId}`);
        return res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('[OTP] resetPassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
