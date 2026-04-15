const Counselor = require('../models/Counselor');
const Schedule = require('../models/Schedule');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');

// Register a new counselor (admin only - simplified for demo)
exports.registerCounselor = async (req, res) => {
    try {
        const { name, email, password, specialization, secretKey } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Validate secret key
        const AUTHORIZED_KEY = "ESSUC@Guidance_2026";
        if (secretKey !== AUTHORIZED_KEY) {
            return res.status(403).json({ message: 'Unauthorized: Invalid secret key for counselor registration' });
        }

        // Check if email already exists
        const existingCounselor = await Counselor.findOne({ email });
        if (existingCounselor) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new counselor
        const counselor = new Counselor({ name, email, password, specialization });
        await counselor.save();

        // Generate JWT token
        const token = jwt.sign(
            { counselorId: counselor._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Counselor registered successfully',
            token,
            counselor: { id: counselor._id, name: counselor.name, email: counselor.email }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering counselor', error: error.message });
    }
};

// Login counselor
exports.loginCounselor = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find counselor by email
        const counselor = await Counselor.findOne({ email });
        if (!counselor) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isPasswordValid = await counselor.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { counselorId: counselor._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            counselor: { id: counselor._id, name: counselor.name, email: counselor.email }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

// Get counselor profile
exports.getCounselorProfile = async (req, res) => {
    try {
        const counselor = await Counselor.findById(req.counselorId).select('-password');
        if (!counselor) {
            return res.status(404).json({ message: 'Counselor not found' });
        }
        res.json(counselor);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

// Get all counselors (for student view)
exports.getAllCounselors = async (req, res) => {
    try {
        const counselors = await Counselor.find().select('-password');
        res.json(counselors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching counselors', error: error.message });
    }
};

// Get counselor bookings
exports.getCounselorBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ counselorId: req.counselorId })
            .populate('studentId', 'nickname')
            .sort({ bookingDate: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingId, status, sessionNotes, referralOffice, referralReason } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (sessionNotes !== undefined) updateData.sessionNotes = sessionNotes;
        if (referralOffice !== undefined) updateData.referralOffice = referralOffice;
        if (referralReason !== undefined) updateData.referralReason = referralReason;
        updateData.updatedAt = new Date();

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true }
        );

        res.json({ message: 'Booking updated successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking', error: error.message });
    }
};
