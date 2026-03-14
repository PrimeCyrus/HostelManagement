const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('warden'));

router.get('/stats', wardenController.getStats);
router.get('/rooms', wardenController.getRooms);
router.get('/students', wardenController.getStudents);
router.get('/complaints', wardenController.getComplaints);
router.put('/complaints/:id', wardenController.updateComplaint);
router.post('/allocate', wardenController.allocateRoom);
router.delete('/deallocate/:id', wardenController.deallocateRoom);
router.put('/reallocate/:id', wardenController.reallocateRoom);
router.get('/fees', wardenController.getFees);
router.get('/leaves', wardenController.getLeaves);
router.put('/leaves/:id/status', wardenController.updateLeaveStatus);

module.exports = router;
