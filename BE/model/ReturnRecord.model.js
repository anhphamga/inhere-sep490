const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    productInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductInstance',
      required: true,
    },
    condition: {
      type: String,
      enum: ['Normal', 'Dirty', 'Damaged', 'Lost'],
      default: 'Normal',
    },
    damageLevelKey: {
      type: String,
      default: '',
      trim: true,
    },
    damageLabel: {
      type: String,
      default: '',
      trim: true,
    },
    penaltyPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    baseValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    damageFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    triggerLifecycle: {
      type: String,
      default: '',
      trim: true,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DamagePolicy',
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const returnRecordSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  items: {
    type: [returnItemSchema],
    default: [],
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
