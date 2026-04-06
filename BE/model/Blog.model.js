const mongoose = require('mongoose');

const BLOG_STATUSES = ['draft', 'pending', 'published', 'rejected'];

const toSlug = (value = '') =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
    thumbnail: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: 'draft',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.pre('validate', async function autoGenerateSlug() {
  if (!this.isModified('title') && this.slug) {
    return;
  }

  const baseSlug = toSlug(this.slug || this.title);
  const normalizedBase = baseSlug || `blog-${Date.now()}`;

  if (!this.isNew && this.slug && !this.isModified('title')) {
    return;
  }

  let nextSlug = normalizedBase;
  let suffix = 1;
  const Blog = mongoose.model('Blog');
  while (await Blog.exists({ slug: nextSlug, _id: { $ne: this._id } })) {
    suffix += 1;
    nextSlug = `${normalizedBase}-${suffix}`;
  }

  this.slug = nextSlug;
});

module.exports = mongoose.model('Blog', blogSchema);
module.exports.BLOG_STATUSES = BLOG_STATUSES;
