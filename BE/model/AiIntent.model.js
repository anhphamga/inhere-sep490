const mongoose = require('mongoose');

const aiIntentSchema = new mongoose.Schema(
  {
    intent: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    sampleUtterances: {
      type: [String],
      default: [],
    },
    tool: {
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

module.exports = mongoose.model('AiIntent', aiIntentSchema, 'ai_intents');

