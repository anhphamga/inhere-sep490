const mongoose = require('mongoose');
const { ORDER_TYPE } = require('../constants/order.constants');

const paymentSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: [ORDER_TYPE.RENT, ORDER_TYPE.SALE],
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'orderType'
  },
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['COD', 'Online', 'Cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  purpose: {
    type: String,
    enum: ['Deposit', 'Remaining', 'LateFee', 'Compensation', 'DamageFee', 'WashingFee', 'SalePayment', 'Refund', 'ExtraFee'],
    default: 'SalePayment'
  },
  transactionCode: {
    type: String,
    default: ''
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
