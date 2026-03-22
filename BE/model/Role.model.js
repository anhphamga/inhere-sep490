const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  level: {
    type: Number,
    required: true,
    default: 0,
  },
  inherits: {
    type: [String],
    default: [],
  },
  permissions: {
    type: [String],
    default: [],
  },
  isSystem: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Role', roleSchema);
