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
router.put('/hostels/:id', adminController.editHostel);
router.delete('/hostels/:id', adminController.deleteHostel);

// Rooms
router.get('/rooms', adminController.getRooms);
router.post('/rooms', adminController.addRoom);
router.put('/rooms/:id', adminController.editRoom);
router.delete('/rooms/:id', adminController.deleteRoom);

// Students
router.get('/students', adminController.getStudents);
router.post('/students', adminController.addStudent);
router.put('/students/:id', adminController.editStudent);
router.delete('/students/:id', adminController.deleteStudent);

// Fees
router.get('/fees', adminController.getAllFees);
router.post('/fees', adminController.generateFee);
router.post('/fees/bulk', adminController.generateBulkFee);
router.put('/fees/:id', adminController.editFee);
router.delete('/fees/:id', adminController.deleteFee);
router.put('/fees/:id/fine', adminController.applyFine);
router.put('/fees/:id/warning', adminController.sendWarning);

// Wardens
router.get('/wardens', adminController.getWardens);
router.post('/wardens', adminController.addWarden);
router.put('/wardens/:id', adminController.editWarden);
router.delete('/wardens/:id', adminController.deleteWarden);

// Applications
router.get('/applications/pending', adminController.getPendingApplications);
router.put('/applications/:id/approve', adminController.approveApplication);
router.put('/applications/:id/approve-with-room', adminController.approveWithRoom);
router.put('/applications/:id/reject', adminController.rejectApplication);

module.exports = router;
