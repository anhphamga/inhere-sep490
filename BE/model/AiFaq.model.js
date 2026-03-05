const mongoose = require('mongoose');

const aiFaqSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    patterns: {
      type: [String],
      default: [],
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AiFaq', aiFaqSchema, 'ai_faqs');

