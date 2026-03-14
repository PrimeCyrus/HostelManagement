const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// No auth middleware — these routes are public
router.get('/hostels', publicController.getHostelAvailability);
router.get('/hostels/available', publicController.getAvailableHostels);

module.exports = router;
