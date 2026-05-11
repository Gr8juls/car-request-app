const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

// Register is admin-only (no public sign-ups)
router.post('/register', auth, adminOnly, authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);

// OTP-based password reset (3-step flow)
router.post('/forgot-password', authController.forgotPassword);   // Step 1: request OTP
router.post('/verify-otp', authController.verifyOtp);             // Step 2: verify OTP
router.post('/reset-password', authController.resetPassword);     // Step 3: set new password

module.exports = router;
