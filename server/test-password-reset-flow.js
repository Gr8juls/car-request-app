const axios = require('axios');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

async function runTest() {
    let capturedOtp = null;
    const email = 'emp_test@example.com';
    const originalPassword = 'password123';
    const newPassword = 'NewPasswordTemp2026!';
    
    // Intercept console.log to grab the OTP
    const originalLog = console.log;
    console.log = function (...args) {
        // Output to original log so developer can see
        originalLog.apply(console, args);
        
        // Match the OTP log: "[OTP] Reset code for emp_test@example.com: 123456"
        const message = args.join(' ');
        if (message.includes('[OTP] Reset code for')) {
            const match = message.match(/Reset code for [^:]+:\s*(\d{6})/);
            if (match) {
                capturedOtp = match[1];
                originalLog(`\n[TEST HELPER] Captured OTP: ${capturedOtp}\n`);
            }
        }
    };

    console.log('=== STARTING PASSWORD RESET INTEGRATION TEST ===');

    // Mock sendOtpEmail to speed up test and avoid SMTP timeout
    const emailService = require('./utils/emailService');
    emailService.sendOtpEmail = async (to, name, otp) => {
        originalLog(`[MOCK EMAIL] sendOtpEmail called for ${to} with OTP: ${otp}`);
    };

    // Start server programmatically on port 5001
    process.env.PORT = 5001;
    require('./index.js');

    // Wait briefly for the server to spin up
    await new Promise(resolve => setTimeout(resolve, 1500));

    const API_URL = 'http://localhost:5001/api/auth';

    try {
        // 1. Verify initial login works with original password
        console.log('\n--- 1. Testing login with original password ---');
        const loginRes1 = await axios.post(`${API_URL}/login`, {
            email,
            password: originalPassword
        });
        console.log('✓ Initial login succeeded!');
        
        // 2. Request OTP (Forgot Password)
        console.log('\n--- 2. Triggering /forgot-password (Step 1) ---');
        const forgotRes = await axios.post(`${API_URL}/forgot-password`, { email });
        console.log('Response:', forgotRes.data);
        
        if (!capturedOtp) {
            throw new Error('Failed to capture OTP from console log interceptor.');
        }

        // 3. Verify OTP
        console.log('\n--- 3. Verifying OTP (Step 2) ---');
        console.log(`Sending OTP: ${capturedOtp}`);
        const verifyRes = await axios.post(`${API_URL}/verify-otp`, {
            email,
            otp: capturedOtp
        });
        console.log('Response:', verifyRes.data);
        const { resetToken } = verifyRes.data;
        if (!resetToken) {
            throw new Error('No resetToken returned in verify-otp response.');
        }
        console.log('✓ OTP verified and resetToken obtained!');

        // 4. Reset Password
        console.log('\n--- 4. Resetting password (Step 3) ---');
        const resetRes = await axios.post(`${API_URL}/reset-password`, {
            resetToken,
            password: newPassword
        });
        console.log('Response:', resetRes.data);
        console.log('✓ Password reset successfully!');

        // 5. Test login with old password (should fail)
        console.log('\n--- 5. Testing login with OLD password (should fail) ---');
        try {
            await axios.post(`${API_URL}/login`, {
                email,
                password: originalPassword
            });
            throw new Error('Login with old password succeeded but should have failed!');
        } catch (err) {
            if (err.response && (err.response.status === 400 || err.response.status === 401)) {
                console.log('✓ Correctly failed login with old password (status', err.response.status + ').');
            } else {
                throw err;
            }
        }

        // 6. Test login with NEW password (should succeed)
        console.log('\n--- 6. Testing login with NEW password (should succeed) ---');
        const loginRes2 = await axios.post(`${API_URL}/login`, {
            email,
            password: newPassword
        });
        console.log('✓ Login with new password succeeded!');
        console.log('User Role:', loginRes2.data.role);

        // Restore original password directly via DB to leave the environment clean
        console.log('\n--- 7. Restoring original password via DB for clean environment ---');
        const connection = await mysql.createConnection(dbConfig);
        const salt = await bcrypt.genSalt(10);
        const hashedOriginalPassword = await bcrypt.hash(originalPassword, salt);
        await connection.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedOriginalPassword, email]
        );
        await connection.end();
        console.log('✓ Password restored successfully.');
        console.log('\n=============================================');
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! Reset password feature is fully functional!');
        console.log('=============================================');

        // Restore console.log before exiting
        console.log = originalLog;
        process.exit(0);

    } catch (error) {
        console.log = originalLog;
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        // Attempt clean up just in case
        try {
            const connection = await mysql.createConnection(dbConfig);
            const salt = await bcrypt.genSalt(10);
            const hashedOriginalPassword = await bcrypt.hash(originalPassword, salt);
            await connection.query(
                'UPDATE users SET password = ? WHERE email = ?',
                [hashedOriginalPassword, email]
            );
            await connection.end();
            console.log('✓ Clean-up: original password restored.');
        } catch (dbErr) {
            console.error('Failed to restore password in cleanup:', dbErr.message);
        }
        
        process.exit(1);
    }
}

runTest();
