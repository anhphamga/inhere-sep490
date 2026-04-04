const mongoose = require('mongoose');
const { ORDER_TYPE } = require('../constants/order.constants');

const saleOrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Draft', 'PendingPayment', 'PendingConfirmation', 'Paid', 'Confirmed', 'Shipping', 'Completed', 'Cancelled', 'Returned', 'Unpaid', 'Failed', 'Refunded'],
    default: 'Draft'
  },
  userStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'RETURNED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online', 'BankTransfer'],
    required: true
  },
  orderType: {
    type: String,
    enum: [ORDER_TYPE.BUY, ORDER_TYPE.RENT],
    default: ORDER_TYPE.BUY
  },
  guestName: {
    type: String,
    default: ''
  },
  guestEmail: {
    type: String,
    default: ''
  },
  guestVerificationMethod: {
    type: String,
    enum: ['phone', 'email', null],
    default: null
  },
  guestVerificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestVerification',
    default: null
  },
  idempotencyKey: {
    type: String,
    default: null
  },
  voucherCode: {
    type: String,
    default: null
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    default: null
  },
  voucherSnapshot: {
    name: { type: String, default: '' },
    voucherType: { type: String, default: '' },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    appliesTo: { type: String, default: '' },
    appliesOn: { type: String, default: '' },
    originalSubtotal: { type: Number, default: 0 },
    finalSubtotal: { type: Number, default: 0 },
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
  history: [{
    status: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

saleOrderSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

module.exports = mongoose.model('SaleOrder', saleOrderSchema);
