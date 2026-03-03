const mongoose = require('mongoose');

const colorVariantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'Each color variant must have at least one image',
      },
      default: undefined,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  sizes: {
    type: [String],
    default: []
  },
  color: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  colorVariants: {
    type: [colorVariantSchema],
    default: []
  },
  variantPricingMode: {
    type: String,
    enum: ['common', 'custom'],
    default: 'common'
  },
  commonRentPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  variantRentPrices: {
    type: Map,
    of: Number,
    default: {}
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
