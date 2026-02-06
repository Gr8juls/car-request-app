const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.use(auth);
router.use(admin);

router.get('/users', adminController.getAllUsers);
router.post('/promote', adminController.promoteToManager);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/audit/:id', adminController.getUserAuditHistory);

module.exports = router;
