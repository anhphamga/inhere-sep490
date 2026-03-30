const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema({
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
        index: true
    },
    shiftCode: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING'
    },
    attendanceStatus: {
        type: String,
        enum: ['NOT_CHECKED_IN', 'CHECKED_IN', 'CHECKED_OUT', 'ABSENT'],
        default: 'NOT_CHECKED_IN'
    }
}, {
    timestamps: true
});

shiftAssignmentSchema.index({ shiftId: 1, staffId: 1 }, { unique: true });

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
