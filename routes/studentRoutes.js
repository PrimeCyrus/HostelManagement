const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('student'));

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.get('/room', studentController.getRoom);
router.get('/fees', studentController.getFees);
router.get('/complaints', studentController.getComplaints);
router.post('/complaints', studentController.submitComplaint);
router.get('/leaves', studentController.getLeaves);
router.post('/leaves', studentController.submitLeave);
router.put('/fees/:id/pay', studentController.payFee);
router.post('/fees/razorpay-order', studentController.createRazorpayOrder);
router.post('/fees/verify-payment', studentController.verifyRazorpayPayment);

module.exports = router;
