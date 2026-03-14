const mongoose = require('mongoose');

const guestVerificationSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['phone', 'email'],
      required: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

guestVerificationSchema.index({ method: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('GuestVerification', guestVerificationSchema);
