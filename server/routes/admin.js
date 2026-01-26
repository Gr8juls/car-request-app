const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
// Check for admin middleware needs to be added here eventually
// router.use(verifyAdmin); 

router.get('/users', adminController.getAllUsers);
router.post('/promote', adminController.promoteToManager);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
