const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: {
      type: String,
      enum: ['owner', 'staff', 'customer', 'guest'],
      default: 'customer',
    },
    lang: {
      type: String,
      enum: ['vi', 'en'],
      default: 'vi',
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
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

chatConversationSchema.index({ sessionId: 1 });
chatConversationSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);

