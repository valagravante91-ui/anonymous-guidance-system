const Schedule = require('../models/Schedule');

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isValidDateInput = (dateString) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day;
};

const parseUtcDateFromInput = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

// Create a new schedule
exports.createSchedule = async (req, res) => {
    try {
        const { scheduleDate, dayOfWeek, startTime, endTime } = req.body;

        if (!scheduleDate || !startTime || !endTime) {
            return res.status(400).json({ message: 'Date, start time, and end time are required' });
        }

        if (!isValidDateInput(scheduleDate)) {
            return res.status(400).json({ message: 'Schedule date must be in valid YYYY-MM-DD format' });
        }

        const scheduleDateUtc = parseUtcDateFromInput(scheduleDate);
        const now = new Date();
        const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        if (scheduleDateUtc < todayUtcStart) {
            return res.status(400).json({ message: 'Schedule date cannot be in the past' });
        }

        const computedDayOfWeek = dayNames[scheduleDateUtc.getUTCDay()];
        const finalDayOfWeek = dayOfWeek || computedDayOfWeek;

        if (finalDayOfWeek !== computedDayOfWeek) {
            return res.status(400).json({ message: `Day mismatch. ${scheduleDate} falls on ${computedDayOfWeek}` });
        }

        const schedule = new Schedule({
            counselorId: req.counselorId,
            scheduleDate: scheduleDateUtc,
            dayOfWeek: finalDayOfWeek,
            startTime,
            endTime
        });

        await schedule.save();
        res.status(201).json({ message: 'Schedule created successfully', schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error creating schedule', error: error.message });
    }
};

// Get all schedules for a counselor
exports.getCounselorSchedules = async (req, res) => {
    try {
        const schedules = await Schedule.find({ counselorId: req.counselorId });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedules', error: error.message });
    }
};

// Get all active schedules (for student view)
exports.getAllActiveSchedules = async (req, res) => {
    try {
        const now = new Date();
        const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

        const schedules = await Schedule.find({
            isActive: true,
            $or: [
                { scheduleDate: { $exists: false } },
                { scheduleDate: null },
                { scheduleDate: { $gte: todayUtcStart } }
            ]
        })
            .populate('counselorId', 'name specialization');

        const Booking = require('../models/Booking');
        const activeBookings = await Booking.find({ status: { $in: ['scheduled', 'ongoing'] } });
        const bookedScheduleIds = activeBookings.map(b => b.scheduleId.toString());

        const availableSchedules = schedules.filter(s => 
            s.counselorId !== null && !bookedScheduleIds.includes(s._id.toString())
        );

        res.json(availableSchedules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedules', error: error.message });
    }
};

// Update schedule
exports.updateSchedule = async (req, res) => {
    try {
        const { scheduleId, scheduleDate, dayOfWeek, startTime, endTime, isActive } = req.body;
        const updateData = { dayOfWeek, startTime, endTime, isActive };

        if (scheduleDate !== undefined) {
            if (!isValidDateInput(scheduleDate)) {
                return res.status(400).json({ message: 'Schedule date must be in valid YYYY-MM-DD format' });
            }

            const scheduleDateUtc = parseUtcDateFromInput(scheduleDate);
            const now = new Date();
            const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
            if (scheduleDateUtc < todayUtcStart) {
                return res.status(400).json({ message: 'Schedule date cannot be in the past' });
            }
            const computedDayOfWeek = dayNames[scheduleDateUtc.getUTCDay()];
            updateData.scheduleDate = scheduleDateUtc;
            updateData.dayOfWeek = dayOfWeek || computedDayOfWeek;
        }

        const schedule = await Schedule.findByIdAndUpdate(
            scheduleId,
            updateData,
            { new: true }
        );

        res.json({ message: 'Schedule updated successfully', schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error updating schedule', error: error.message });
    }
};

// Delete schedule
exports.deleteSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.body;

        await Schedule.findByIdAndDelete(scheduleId);
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting schedule', error: error.message });
    }
};
