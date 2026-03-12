const mongoose = require('mongoose');

const hasText = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.vi || value.en || '').trim().length > 0;
  }
  return false;
};

/**
 * Banner model
 * Cho phép lưu cả:
 * - Đường dẫn file ảnh được upload lên server (`imagePath`)
 * - Hoặc link ảnh bên ngoài (`imageUrl`)
 * Có thể dùng 1 trong 2 trường, hoặc cả hai tùy nhu cầu.
 */

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: hasText,
        message: 'title is required',
      },
    },
    subtitle: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },

    // Link người dùng bấm vào banner sẽ được dẫn tới
    targetLink: {
      type: String,
      default: '',
      trim: true,
    },

    /**
     * TH1: Lưu file trên server (VD: /uploads/banners/abc.jpg)
     * -> API upload sẽ set vào imagePath
     */
    imagePath: {
      type: String,
      default: '',
      trim: true,
    },

    /**
     * TH2: Dùng link ảnh bên ngoài (VD: https://...)
     * -> Form FE chỉ cần gửi imageUrl
     */
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },

    // Vị trí hiển thị banner (hero, promo..., có thể mở rộng sau)
    position: {
      type: String,
      enum: ['hero', 'promo', 'other'],
      default: 'hero',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    startAt: {
      type: Date,
    },
    endAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Banner', bannerSchema);

