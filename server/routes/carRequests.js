const express = require('express');
const router = express.Router();
const carRequestController = require('../controllers/carRequestController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, carRequestController.createRequest);
router.get('/', auth, carRequestController.getRequests);
router.get('/drivers', auth, carRequestController.getDrivers);
router.put('/:id', auth, carRequestController.updateStatus);
router.get('/:id/logs', auth, carRequestController.getRequestLogs);

module.exports = router;
