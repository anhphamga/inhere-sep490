const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    lang: {
      type: String,
      enum: ['vi', 'en'],
      default: 'vi',
    },
    intent: {
      type: String,
      default: '',
    },
    sources: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

