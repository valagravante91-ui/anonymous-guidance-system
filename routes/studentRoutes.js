const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyStudentToken } = require('../config/auth');

// Public routes
router.post('/register', studentController.registerStudent);
router.post('/login', studentController.loginStudent);

// Protected routes
router.get('/profile', verifyStudentToken, studentController.getStudentProfile);
router.get('/bookings', verifyStudentToken, studentController.getStudentBookings);

module.exports = router;
