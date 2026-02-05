const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['Rent', 'Sale'],
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
