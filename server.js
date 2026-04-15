require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*", // In production, consider restricting this to your frontend URL
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const { MongoMemoryServer } = require('mongodb-memory-server');
const Student = require('./models/Student');
const Counselor = require('./models/Counselor');
const Schedule = require('./models/Schedule');

let mongoServer;

const seedDatabase = async () => {
    try {
        const studentCount = await Student.countDocuments();
        if (studentCount === 0) {
            const student = new Student({ nickname: 'student123', password: 'password123' });
            await student.save();
            console.log('Seeded demo student: student123');
        }
        
        let counselorDoc;
        const counselorCount = await Counselor.countDocuments();
        if (counselorCount === 0) {
            counselorDoc = new Counselor({ 
                name: 'Dr. Smith',
                email: 'counselor@example.com',
                password: 'password123',
                specialization: 'General Guidance'
            });
            await counselorDoc.save();
            console.log('Seeded demo counselor: counselor@example.com');
        } else {
            counselorDoc = await Counselor.findOne();
        }

        const scheduleCount = await Schedule.countDocuments();
        if (scheduleCount === 0 && counselorDoc) {
            const schedule = new Schedule({
                counselorId: counselorDoc._id,
                dayOfWeek: 'Monday',
                startTime: '09:00',
                endTime: '12:00'
            });
            await schedule.save();
            console.log('Seeded demo schedule for Dr. Smith on Monday 09:00-12:00');
        }
    } catch (e) {
        console.error('Error seeding database:', e);
    }
};

const connectDB = async () => {
    try {
        const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guidance-counseling';
        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('MongoDB Connected successfully');
        await seedDatabase();
    } catch (err) {
        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: Failed to connect to production MongoDB:', err.message);
            process.exit(1);
        }
        console.log('Local MongoDB not found. Starting in-memory database fallback...');
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log(`In-Memory MongoDB connected at ${uri}`);
        await seedDatabase();
    }
};

connectDB();

// Socket.io for WebRTC signaling and notifications
io.on('connection', socket => {
    console.log('[Socket] New connection:', socket.id);

    // Join a room for call session
    socket.on('joinRoom', ({ roomId, userId }) => {
        const cleanRoomId = String(roomId);
        socket.join(cleanRoomId);
        console.log(`[Socket] User ${userId} (${socket.id}) joined room: ${cleanRoomId}`);
        
        // Notify others in the room
        socket.to(cleanRoomId).emit('user-connected', userId);
        
        // Acknowledge the join
        socket.emit('roomJoined', { roomId: cleanRoomId });
    });

    // Notify counselor that student is ready
    socket.on('student-ready', (roomId) => {
        const cleanRoomId = String(roomId);
        console.log(`[Signaling] Student is ready in room: ${cleanRoomId}`);
        socket.to(cleanRoomId).emit('student-ready');
    });

    // WebRTC signaling
    socket.on('offer', (payload) => {
        const cleanRoomId = String(payload.target);
        console.log(`[Signaling] Offer sent to room: ${cleanRoomId}`);
        socket.to(cleanRoomId).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        const cleanRoomId = String(payload.target);
        console.log(`[Signaling] Answer sent to room: ${cleanRoomId}`);
        socket.to(cleanRoomId).emit('answer', payload);
    });

    socket.on('ice-candidate', (incoming) => {
        const cleanRoomId = String(incoming.target);
        socket.to(cleanRoomId).emit('ice-candidate', incoming);
    });

    // Notification system
    socket.on('sendNotification', (data) => {
        io.emit('receiveNotification', data);
    });

    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        rooms.forEach(roomId => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected:', socket.id);
    });
});

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);

// Catch-all route to serve the frontend (for SPA-like behavior if needed)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
