const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send a generic email.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
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
        // Don't throw — email failure should not break the main flow
    }
};

/**
 * Send a password reset email.
 * @param {string} to - Recipient email
 * @param {string} resetUrl - The full reset URL
 * @param {string} name - User's full name
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
 * @param {string} to - Recipient email
 * @param {string} name - Recipient's full name
 * @param {string} subject - Email subject
 * @param {string} message - Notification message
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

module.exports = { sendEmail, sendPasswordReset, sendRequestNotification };
