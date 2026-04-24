const mongoose = require('mongoose');

const shiftReportSchema = new mongoose.Schema({
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
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  bankAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

shiftReportSchema.index({ shiftId: 1, staffId: 1 });

module.exports = mongoose.model('ShiftReport', shiftReportSchema);

