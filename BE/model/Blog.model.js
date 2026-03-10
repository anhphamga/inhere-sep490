const mongoose = require('mongoose');

const hasText = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.vi || value.en || '').trim().length > 0;
  }
  return false;
};

const blogSchema = new mongoose.Schema({
  title: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: hasText,
      message: 'title is required',
    },
  },
  slug: {
    type: String,
    trim: true,
    default: ''
  },
  thumbnail: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Hidden'],
    default: 'Draft'
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: hasText,
      message: 'content is required',
    },
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema);
