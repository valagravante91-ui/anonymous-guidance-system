const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyCounselorToken } = require('../config/auth');

// Public routes
router.get('/active', scheduleController.getAllActiveSchedules);

// Protected routes
router.post('/create', verifyCounselorToken, scheduleController.createSchedule);
router.get('/counselor', verifyCounselorToken, scheduleController.getCounselorSchedules);
router.put('/update', verifyCounselorToken, scheduleController.updateSchedule);
router.delete('/delete', verifyCounselorToken, scheduleController.deleteSchedule);

module.exports = router;
