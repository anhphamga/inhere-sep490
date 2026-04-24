const mongoose = require('mongoose');

const SHIFT_STATUS = Object.freeze({
  OPEN: 'OPEN',
  FULL: 'FULL',
  CLOSED: 'CLOSED',
});

const shiftSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  requiredStaff: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'requiredStaff must be an integer',
    },
  },
  assignedStaffIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  status: {
    type: String,
    enum: Object.values(SHIFT_STATUS),
    default: SHIFT_STATUS.OPEN,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

shiftSchema.index({ date: 1 });
shiftSchema.index({ date: 1, startTime: 1, endTime: 1 }, { unique: true });
shiftSchema.index({ assignedStaffIds: 1, date: 1 });

module.exports = mongoose.model('Shift', shiftSchema);
module.exports.SHIFT_STATUS = SHIFT_STATUS;
