const mongoose = require('mongoose');

const sellerReplySchema = new mongoose.Schema({
  content: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  repliedAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SaleOrder',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'hidden', 'rejected'],
    default: 'pending',
    index: true,
  },
  isHidden: {
    type: Boolean,
    default: false,
    index: true,
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  moderationReason: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  sellerReply: {
    type: sellerReplySchema,
    default: undefined,
  },
}, {
  timestamps: true,
});

reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
