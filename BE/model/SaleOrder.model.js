const mongoose = require('mongoose');

const saleOrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  productInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductInstance',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'PendingPayment', 'Paid', 'Confirmed', 'Shipping', 'Completed', 'Cancelled', 'Returned', 'Unpaid', 'Failed', 'Refunded'],
    default: 'Draft'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online'],
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    type: String,
    required: true
  },
  shippingPhone: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SaleOrder', saleOrderSchema);
