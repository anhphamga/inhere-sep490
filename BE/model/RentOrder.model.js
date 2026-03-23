const mongoose = require('mongoose');

const rentOrderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    default: null
  },
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
  idempotencyKey: {
    type: String,
    default: null
  },
  voucherCode: {
    type: String,
    default: null
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    default: null
  },
  voucherSnapshot: {
    name: { type: String, default: '' },
    voucherType: { type: String, default: '' },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    appliesTo: { type: String, default: '' },
    appliesOn: { type: String, default: '' },
    originalSubtotal: { type: Number, default: 0 },
    finalSubtotal: { type: Number, default: 0 },
  },
  discountAmount: {
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

rentOrderSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

rentOrderSchema.index(
  { orderCode: 1 },
  {
    unique: true,
    partialFilterExpression: { orderCode: { $type: 'string' } }
  }
);

module.exports = mongoose.model('RentOrder', rentOrderSchema);
