const mongoose = require('mongoose');

const CONDITION_LEVEL_ALIASES = {
  Good: 'New',
  Damaged: 'Used'
};

const normalizeConditionLevel = (value) => {
  if (value === undefined || value === null) return value;
  const raw = String(value).trim();
  return CONDITION_LEVEL_ALIASES[raw] || raw;
};

const productInstanceSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  conditionLevel: {
    type: String,
    enum: ['New', 'Used'],
    default: 'New',
    set: normalizeConditionLevel
  },
  conditionScore: {
    type: Number,
    min: 0,
    max: 100,
    enum: [0, 25, 50, 100],
    default: 100
  },
  lifecycleStatus: {
    type: String,
    enum: ['Available', 'Reserved', 'Rented', 'Washing', 'Repair', 'Lost'],
    default: 'Available'
  },
  currentRentPrice: {
    type: Number,
    required: true
  },
  currentSalePrice: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductInstance', productInstanceSchema);
