const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Only HC can manage drivers
router.get('/', auth, authorize('hc'), driverController.getDrivers);
router.post('/', auth, authorize('hc'), driverController.createDriver);
router.put('/:id', auth, authorize('hc'), driverController.updateDriver);
router.delete('/:id', auth, authorize('hc'), driverController.deleteDriver);

module.exports = router;
