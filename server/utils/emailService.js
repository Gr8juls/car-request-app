const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send a generic email.
 */
const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"Old Mutual Car Requests" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err.message);
    }
};

/**
 * Send OTP email with the 6-digit code.
 */
const sendOtpEmail = async (to, name, otp) => {
    const subject = 'Your Password Reset Code — Old Mutual Car Requests';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #009639; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 1.6rem;">Old Mutual</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Vehicle Requisition System</p>
            </div>
            <div style="padding: 32px;">
                <h2 style="color: #333;">Password Reset Code</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>We received a request to reset your password. Use the code below to continue. This code <strong>expires in 10 minutes</strong> and can only be used once.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <div style="display: inline-block; background-color: #f4f4f4; border: 2px dashed #009639; border-radius: 12px; padding: 20px 40px;">
                        <p style="margin: 0; font-size: 2.5rem; font-weight: bold; letter-spacing: 12px; color: #009639; font-family: monospace;">${otp}</p>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem;">Enter this code on the password reset page. Do <strong>not</strong> share this code with anyone.</p>
                <div style="background-color: #fff8e1; border-left: 4px solid #f9a825; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0; color: #5d4037; font-size: 0.85rem;">
                        ⚠️ <strong>Security notice:</strong> If you did not request a password reset, your account may be at risk. Please contact your administrator immediately.
                    </p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 0.8rem;">This is an automated message from the Old Mutual Vehicle Requisition System. Please do not reply.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

/**
 * Send a security alert when a reset was requested for an unknown email,
 * or to notify the real account owner of an unrequested attempt.
 */
const sendUnrequestedResetAlert = async (to, name) => {
    const subject = 'Security Alert: Unrecognised Password Reset Attempt — Old Mutual';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #c62828; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 1.6rem;">⚠ Security Alert</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Old Mutual Vehicle Requisition System</p>
            </div>
            <div style="padding: 32px;">
                <p>Hello <strong>${name}</strong>,</p>
                <p>Someone attempted to reset the password for your account but the process was not completed. <strong>No changes have been made to your account.</strong></p>
                <p>If this was you, please try again. If you did <strong>not</strong> make this request, your account credentials may have been compromised. We recommend:</p>
                <ul style="color: #333; line-height: 1.8;">
                    <li>Change your password immediately via your profile settings.</li>
                    <li>Contact your system administrator.</li>
                    <li>Do not share your login details with anyone.</li>
                </ul>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 0.8rem;">This is an automated security notification. Please do not reply to this email.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

/**
 * Send a password reset email (legacy link-based — kept for compatibility).
 */
const sendPasswordReset = async (to, resetUrl, name) => {
    const subject = 'Password Reset Request — Old Mutual Car Requests';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #009639; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 1.6rem;">Old Mutual</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Vehicle Requisition System</p>
            </div>
            <div style="padding: 32px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="background-color: #009639; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 1rem;">
                        Reset My Password
                    </a>
                </div>
                <p style="color: #666; font-size: 0.85rem;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 0.8rem;">This is an automated message from the Old Mutual Vehicle Requisition System. Please do not reply.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

/**
 * Send a notification email about a car request action.
 */
const sendRequestNotification = async (to, name, subject, message) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #009639; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 1.6rem;">Old Mutual</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Vehicle Requisition System</p>
            </div>
            <div style="padding: 32px;">
                <p>Hello <strong>${name}</strong>,</p>
                <p style="font-size: 1rem; color: #333;">${message}</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background-color: #009639; color: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: bold;">
                        View in System
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 0.8rem;">This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

module.exports = { sendEmail, sendPasswordReset, sendOtpEmail, sendUnrequestedResetAlert, sendRequestNotification };
