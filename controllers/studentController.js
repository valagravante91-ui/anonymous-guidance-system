const Student = require('../models/Student');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');

// Register a new student
exports.registerStudent = async (req, res) => {
    try {
        const { nickname, password } = req.body;

        if (!nickname || !password) {
            return res.status(400).json({ message: 'Nickname and password are required' });
        }

        // Check if nickname already exists
        const existingStudent = await Student.findOne({ nickname });
        if (existingStudent) {
            return res.status(400).json({ message: 'Nickname already taken' });
        }

        // Create new student
        const student = new Student({ nickname, password });
        await student.save();

        // Generate JWT token
        const token = jwt.sign(
            { studentId: student._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Student registered successfully',
            token,
            student: { id: student._id, nickname: student.nickname }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering student', error: error.message });
    }
};

// Login student
exports.loginStudent = async (req, res) => {
    try {
        const { nickname, password } = req.body;

        if (!nickname || !password) {
            return res.status(400).json({ message: 'Nickname and password are required' });
        }

        // Find student by nickname
        const student = await Student.findOne({ nickname });
        if (!student) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isPasswordValid = await student.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { studentId: student._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            student: { id: student._id, nickname: student.nickname }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

// Get student profile
exports.getStudentProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.studentId).select('-password');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

// Get student booking history
exports.getStudentBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ studentId: req.studentId })
            .populate('counselorId', 'name specialization')
            .sort({ createdAt: -1 });
        
        // Filter out any bookings where the counselor might have been deleted (orphaned records)
        const validBookings = bookings.filter(b => b.counselorId !== null);
            
        res.json(validBookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
};
