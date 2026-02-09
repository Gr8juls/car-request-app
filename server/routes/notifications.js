const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, notificationController.getNotifications);
router.put('/:id', auth, notificationController.markAsRead);
router.put('/mark-all/read', auth, notificationController.markAllAsRead);

module.exports = router;
