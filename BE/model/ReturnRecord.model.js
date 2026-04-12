const mongoose = require('mongoose');

const returnRecordSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  returnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  condition: {
    type: String,
    enum: ['Normal', 'Dirty', 'Damaged', 'Lost'],
    default: 'Normal'
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
  resolution: {
    type: String,
    enum: ['DepositRefunded', 'DepositDeducted', 'AdditionalCharge'],
    default: 'DepositDeducted'
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);
