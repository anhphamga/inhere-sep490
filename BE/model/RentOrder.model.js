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
    enum: ['Draft', 'PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup', 'Renting', 'Waiting'],
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
