const mongoose = require('mongoose');

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
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
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

