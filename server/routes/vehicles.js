const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Only HC can manage vehicles
router.get('/', auth, authorize('hc'), vehicleController.getVehicles);
router.post('/', auth, authorize('hc'), vehicleController.createVehicle);
router.put('/:id', auth, authorize('hc'), vehicleController.updateVehicle);
router.delete('/:id', auth, authorize('hc'), vehicleController.deleteVehicle);

module.exports = router;
