const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const registrationController = require('../controllers/registrationController');

router.post('/login', authController.login);
router.post('/register', registrationController.registerStudent);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

module.exports = router;
