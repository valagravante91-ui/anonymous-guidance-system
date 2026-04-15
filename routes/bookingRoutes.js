const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyStudentToken } = require('../config/auth');

// Protected routes
router.post('/create', verifyStudentToken, bookingController.createBooking);
router.get('/:bookingId', verifyStudentToken, bookingController.getBooking);
router.put('/cancel', verifyStudentToken, bookingController.cancelBooking);
router.get('/upcoming/notifications', bookingController.getUpcomingBookings);

module.exports = router;
