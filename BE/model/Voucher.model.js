const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    required: false,
    default: null
  },
  discountValue: {
    type: Number,
    required: false,
    default: 0
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: false,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  voucherType: {
    type: String,
    enum: ['percent', 'fixed', null],
    default: null
  },
  value: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  appliesTo: {
    type: String,
    enum: ['both', 'rental', 'sale'],
    default: 'both'
  },
  appliesOn: {
    type: String,
    enum: ['subtotal'],
    default: 'subtotal'
  },
  usageLimitTotal: {
    type: Number,
    default: null
  },
  usageLimitPerUser: {
    type: Number,
    default: null
  },
  firstOrderOnly: {
    type: Boolean,
    default: false
  },
  eligibleCategories: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  excludedProducts: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  userSegments: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  strict: false
});

voucherSchema.pre('validate', function normalizeVoucherBeforeValidate(next) {
  if (typeof this.code === 'string') {
    this.code = this.code.trim().toUpperCase();
  }

  if (!this.voucherType && this.discountType) {
    this.voucherType = this.discountType === 'Percentage' ? 'percent' : 'fixed';
  }

  if ((!Number.isFinite(this.value) || this.value <= 0) && Number.isFinite(this.discountValue)) {
    this.value = this.discountValue;
  }

  if (!this.endDate && this.expiryDate) {
    this.endDate = this.expiryDate;
  }

  if (this.usageLimitTotal === null || this.usageLimitTotal === undefined) {
    this.usageLimitTotal = this.usageLimit;
  }

  next();
});

module.exports = mongoose.model('Voucher', voucherSchema);
