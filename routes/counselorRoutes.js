const express = require('express');
const router = express.Router();
const counselorController = require('../controllers/counselorController');
const { verifyCounselorToken } = require('../config/auth');

// Public routes
router.post('/register', counselorController.registerCounselor);
router.post('/login', counselorController.loginCounselor);
router.get('/all', counselorController.getAllCounselors);

// Protected routes
router.get('/profile', verifyCounselorToken, counselorController.getCounselorProfile);
router.get('/bookings', verifyCounselorToken, counselorController.getCounselorBookings);
router.put('/booking-status', verifyCounselorToken, counselorController.updateBookingStatus);

module.exports = router;
