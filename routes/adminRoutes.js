const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Mount auth middleware for all admin routes
router.use(requireAuth, requireRole('admin'));

// Stats
router.get('/stats', adminController.getStats);

// Hostels
router.get('/hostels', adminController.getHostels);
router.post('/hostels', adminController.addHostel);
router.delete('/hostels/:id', adminController.deleteHostel);

// Rooms
router.get('/rooms', adminController.getRooms);
router.post('/rooms', adminController.addRoom);
router.delete('/rooms/:id', adminController.deleteRoom);

// Students
router.get('/students', adminController.getStudents);
router.post('/students', adminController.addStudent);
router.delete('/students/:id', adminController.deleteStudent);

// Fees
router.get('/fees', adminController.getAllFees);
router.post('/fees', adminController.generateFee);

module.exports = router;
