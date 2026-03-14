const mongoose = require('mongoose');

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
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online', 'BankTransfer'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['Buy', 'Rent'],
    default: 'Buy'
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
