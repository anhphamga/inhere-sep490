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
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
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

module.exports = mongoose.model('User', userSchema);
