const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    counselorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counselor',
        required: true
    },
    scheduleDate: {
        type: Date
    },
    dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
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
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
