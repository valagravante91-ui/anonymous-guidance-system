const Booking = require('../models/Booking');
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

const getStartAndEndOfUtcDay = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return { start, end };
};

// Create a new booking
exports.createBooking = async (req, res) => {
    try {
        const { counselorId, scheduleId, bookingDate, startTime, endTime } = req.body;

        if (!counselorId || !scheduleId || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({ message: 'All booking details are required' });
        }

        if (!isValidDateInput(bookingDate)) {
            return res.status(400).json({ message: 'Booking date must be in valid YYYY-MM-DD format' });
        }

        const schedule = await Schedule.findOne({ _id: scheduleId, counselorId, isActive: true });
        if (!schedule) {
            return res.status(404).json({ message: 'Selected schedule is not available' });
        }

        const [year, month, day] = bookingDate.split('-').map(Number);
        const requestedDateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        if (schedule.scheduleDate) {
            const scheduleDateUtc = new Date(schedule.scheduleDate);
            const requestedDateOnly = requestedDateUtc.toISOString().split('T')[0];
            const scheduleDateOnly = scheduleDateUtc.toISOString().split('T')[0];

            if (requestedDateOnly !== scheduleDateOnly) {
                return res.status(400).json({ message: `This slot is only available on ${scheduleDateOnly}` });
            }
        } else {
            const utcDayName = dayNames[requestedDateUtc.getUTCDay()];
            if (utcDayName !== schedule.dayOfWeek) {
                return res.status(400).json({ message: `Selected date must fall on ${schedule.dayOfWeek}` });
            }
        }

        if (startTime !== schedule.startTime || endTime !== schedule.endTime) {
            return res.status(400).json({ message: 'Selected time does not match the counselor schedule' });
        }

        const { start: bookingDayStart, end: bookingDayEnd } = getStartAndEndOfUtcDay(bookingDate);
        const now = new Date();
        const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        if (bookingDayStart < todayUtcStart) {
            return res.status(400).json({ message: 'Booking date cannot be in the past' });
        }

        // Check if slot is already booked
        const existingBooking = await Booking.findOne({
            scheduleId,
            bookingDate: { $gte: bookingDayStart, $lte: bookingDayEnd },
            startTime,
            endTime,
            status: { $in: ['scheduled', 'ongoing'] }
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'This time slot is already booked' });
        }

        const booking = new Booking({
            studentId: req.studentId,
            counselorId,
            scheduleId,
            bookingDate: bookingDayStart,
            startTime,
            endTime
        });

        await booking.save();
        res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Error creating booking', error: error.message });
    }
};

// Get booking details
exports.getBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate('counselorId', 'name specialization')
            .populate('studentId', 'nickname');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching booking', error: error.message });
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            { status: 'cancelled', updatedAt: new Date() },
            { new: true }
        );

        res.json({ message: 'Booking cancelled successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error: error.message });
    }
};

// Get upcoming bookings for notifications
exports.getUpcomingBookings = async (req, res) => {
    try {
        const now = new Date();
        const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);

        const bookings = await Booking.find({
            bookingDate: { $gte: now, $lte: fiveMinutesLater },
            status: 'scheduled'
        }).populate('studentId', 'nickname').populate('counselorId', 'name');

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching upcoming bookings', error: error.message });
    }
};
