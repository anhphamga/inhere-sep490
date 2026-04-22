const mongoose = require('mongoose');

/**
 * Lưu lịch sử mỗi lần staff đổi sản phẩm trong đơn thuê.
 * Hỗ trợ 3 loại đổi: size_swap / model_swap / upgrade.
 */
const itemSwapHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentOrder',
      required: true,
      index: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentOrderItem',
      required: true,
    },
    swapType: {
      type: String,
      enum: ['size_swap', 'model_swap', 'upgrade'],
      required: true,
    },
    // Sản phẩm cũ
    oldInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductInstance',
      required: true,
    },
    oldProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    oldSize: { type: String, default: '' },
    oldColor: { type: String, default: '' },
    oldDailyPrice: { type: Number, default: 0 },
    // Sản phẩm mới
    newInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductInstance',
      required: true,
    },
    newProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    newSize: { type: String, default: '' },
    newColor: { type: String, default: '' },
    newDailyPrice: { type: Number, default: 0 },
    // Chênh lệch giá tổng đơn sau khi đổi
    oldOrderTotal: { type: Number, default: 0 },
    newOrderTotal: { type: Number, default: 0 },
    // Lý do / ghi chú của staff
    reason: { type: String, default: '' },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItemSwapHistory', itemSwapHistorySchema);
