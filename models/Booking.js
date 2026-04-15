const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    counselorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counselor',
        required: true
    },
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    bookingDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String, // Format: HH:MM
        required: true
    },
    endTime: {
        type: String, // Format: HH:MM
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    sessionNotes: {
        type: String,
        default: ''
    },
    referralOffice: {
        type: String,
        enum: ['none', 'clinic', 'registrar', 'program_head'],
        default: 'none'
    },
    referralReason: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
