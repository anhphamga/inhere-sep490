const mongoose = require('mongoose');

const chatUnansweredSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedMessage: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pageContext: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    matchedLayer: {
      type: String,
      enum: ['FAQ', 'POLICY', 'TOOL', 'FALLBACK'],
      default: 'FALLBACK',
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    reason: {
      type: String,
      default: 'no_match',
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
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

chatUnansweredSchema.index({ normalizedMessage: 1 }, { unique: true });
chatUnansweredSchema.index({ count: -1, lastSeenAt: -1 });

module.exports = mongoose.model('ChatUnanswered', chatUnansweredSchema, 'chat_unanswered');

