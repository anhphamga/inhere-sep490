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

const PRODUCT_INSTANCE_STATUSES = ['Available', 'Reserved', 'Rented', 'Sold', 'Lost'];
const OPERATIONAL_INSTANCE_STATUSES = ['Washing', 'Repair'];
const ALL_INSTANCE_STATUSES = [...PRODUCT_INSTANCE_STATUSES, ...OPERATIONAL_INSTANCE_STATUSES];

const productInstanceSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  size: {
    type: String,
    trim: true,
    default: '',
  },
  code: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
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
    enum: [0, 25, 50, 75, 100],
    default: 100
  },
  lifecycleStatus: {
    type: String,
    enum: ALL_INSTANCE_STATUSES,
    default: 'Available',
    alias: 'status'
  },
  soldOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SaleOrder',
    default: null
  },
  currentRentPrice: {
    type: Number,
    required: true
  },
  currentSalePrice: {
    type: Number,
    required: true
  },
  baseValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const ProductInstance = mongoose.model('ProductInstance', productInstanceSchema);

const getInstanceBaseValue = (instance, product = null) => {
  if (!instance) return 0;
  const baseValue = Number(instance.baseValue || 0);
  if (baseValue > 0) return baseValue;
  const salePrice = Number(instance.currentSalePrice || 0);
  if (salePrice > 0) return salePrice;
  const productSalePrice = Number(product?.baseSalePrice || 0);
  return productSalePrice > 0 ? productSalePrice : 0;
};

module.exports = ProductInstance;
module.exports.PRODUCT_INSTANCE_STATUSES = PRODUCT_INSTANCE_STATUSES;
module.exports.ALL_INSTANCE_STATUSES = ALL_INSTANCE_STATUSES;
module.exports.getInstanceBaseValue = getInstanceBaseValue;
