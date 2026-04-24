const mongoose = require('mongoose');

const SHIFT_REGISTRATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const shiftRegistrationSchema = new mongoose.Schema({
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(SHIFT_REGISTRATION_STATUS),
    required: true,
    default: SHIFT_REGISTRATION_STATUS.PENDING,
  },
  checkInAt: {
    type: Date,
    default: null,
  },
  checkOutAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

shiftRegistrationSchema.index({ shiftId: 1, staffId: 1 }, { unique: true });
shiftRegistrationSchema.index({ staffId: 1, status: 1 });
shiftRegistrationSchema.index({ shiftId: 1, status: 1 });

module.exports = mongoose.model('ShiftRegistration', shiftRegistrationSchema);
module.exports.SHIFT_REGISTRATION_STATUS = SHIFT_REGISTRATION_STATUS;
