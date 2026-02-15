const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['owner', 'customer'],
    required: true,
    default: 'customer'
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false,
    default: null
  },
  email: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  status: {
    type: String,
    enum: ['active', 'locked'],
    default: 'active'
  },
  avatarUrl: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1, authProvider: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
