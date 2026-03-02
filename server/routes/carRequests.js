const express = require('express');
const router = express.Router();
const carRequestController = require('../controllers/carRequestController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, carRequestController.createRequest);
router.get('/', auth, carRequestController.getRequests);
router.get('/drivers', auth, carRequestController.getDrivers);
router.get('/approvers', auth, carRequestController.getApprovers);
router.put('/:id', auth, carRequestController.updateStatus);
router.put('/:id/start', auth, carRequestController.startTrip);
router.put('/:id/complete', auth, carRequestController.completeTrip);
router.get('/:id/logs', auth, carRequestController.getRequestLogs);

module.exports = router;
