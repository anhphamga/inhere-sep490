const mongoose = require('mongoose');

const rentOrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: [
      'Draft',
      'PendingDeposit',
      'Deposited',
      'Confirmed',
      'WaitingPickup',
      'Renting',
      'WaitingReturn',
      'Returned',
      'Completed',
      'NoShow',
      'Late',
      'Compensation',
      'Cancelled'
    ],
    default: 'Draft'
  },
  rentStartDate: {
    type: Date,
    required: true
  },
  rentEndDate: {
    type: Date,
    required: true
  },
  depositAmount: {
    type: Number,
    required: true
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  washingFee: {
    type: Number,
    default: 0
  },
  damageFee: {
    type: Number,
    default: 0
  },
  lateDays: {
    type: Number,
    default: 0,
    min: 0
  },
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  compensationFee: {
    type: Number,
    default: 0,
    min: 0
  },
  depositForfeited: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  pickupAt: {
    type: Date,
    default: null
  },
  returnedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  noShowAt: {
    type: Date,
    default: null
  },
  totalAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentOrder', rentOrderSchema);
