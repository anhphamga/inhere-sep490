const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    displayName: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      trim: true,
      default: 'rent',
    },
  },
  {
    collection: 'categories',
    timestamps: true,
    strict: false,
  }
);

module.exports = mongoose.model('Category', categorySchema);
