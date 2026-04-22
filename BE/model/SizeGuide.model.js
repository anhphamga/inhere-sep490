const mongoose = require('mongoose');

const SIZE_LABELS = ['S', 'M', 'L', 'XL'];
const GENDERS = ['male', 'female'];
const GUIDE_TYPES = ['global', 'product'];

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const sizeGuideSchema = new mongoose.Schema({
  sizeLabel: {
    type: String,
    enum: SIZE_LABELS,
    required: true,
  },
  gender: {
    type: String,
    enum: GENDERS,
    required: true,
  },
  type: {
    type: String,
    enum: GUIDE_TYPES,
    required: true,
    default: 'global',
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  heightMin: {
    type: Number,
    required: true,
    min: 0,
  },
  heightMax: {
    type: Number,
    required: true,
    min: 0,
  },
  weightMin: {
    type: Number,
    required: true,
    min: 0,
  },
  weightMax: {
    type: Number,
    required: true,
    min: 0,
  },
  itemLength: {
    type: Number,
    default: null,
    set: toNumberOrNull,
    min: 0,
  },
  itemWidth: {
    type: Number,
    default: null,
    set: toNumberOrNull,
    min: 0,
  },
}, {
  timestamps: true,
});

sizeGuideSchema.pre('validate', function ensureTypeConsistency() {
  if (this.type === 'global') {
    this.productId = null;
  }

  if (this.type === 'product' && !this.productId) {
    throw new Error('productId is required when type=product');
  }
});

sizeGuideSchema.index({ type: 1, productId: 1, gender: 1, sizeLabel: 1 }, { unique: true });
sizeGuideSchema.index({ productId: 1, gender: 1, sizeLabel: 1 });

module.exports = mongoose.model('SizeGuide', sizeGuideSchema);
module.exports.SIZE_GUIDE_SIZE_LABELS = SIZE_LABELS;
module.exports.SIZE_GUIDE_GENDERS = GENDERS;
module.exports.SIZE_GUIDE_TYPES = GUIDE_TYPES;
