const mongoose = require('mongoose');

const hasText = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.vi || value.en || '').trim().length > 0;
  }
  return false;
};

const productSchema = new mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: hasText,
      message: 'name is required',
    },
  },
  category: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: hasText,
      message: 'category is required',
    },
  },
  categoryPath: {
    parent: {
      type: String,
      default: ''
    },
    child: {
      type: String,
      default: ''
    },
    ancestors: {
      type: [String],
      default: []
    }
  },
  hasSizes: {
    type: Boolean,
    default: false
  },
  sizes: {
    type: [{
      size: { type: String, required: true },
      quantity: { type: Number, default: 0, min: 0 }
    }],
    default: []
  },
  color: {
    type: String,
    required: true
  },
  pricingMode: {
    type: String,
    enum: ['common', 'per_variant'],
    default: 'common'
  },
  commonRentPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  // Deprecated placeholders for backward compatibility on older documents.
  colorVariants: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  },
  variantMatrix: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  description: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  baseRentPrice: {
    type: Number,
    required: true
  },
  baseSalePrice: {
    type: Number,
    required: true
  },
  depositAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  buyoutValue: {
    type: Number,
    default: 0,
    min: 0
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
