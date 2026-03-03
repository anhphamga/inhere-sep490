const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    original: {
      type: String,
      required: true,
    },
    translated: {
      type: String,
      required: true,
    },
    hits: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'translations',
  }
);

translationSchema.index({ source: 1, target: 1, updatedAt: -1 });

module.exports = mongoose.model('Translation', translationSchema);
