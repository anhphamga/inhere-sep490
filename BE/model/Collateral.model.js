const mongoose = require('mongoose');

const collateralSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  type: {
    type: String,
    enum: ['ID', 'Cash', 'CCCD', 'GPLX'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true
  },
  documentImageUrl: {
    type: String,
    default: ''
  },
  receiveAt: {
    type: Date,
    default: Date.now
  },
  returnedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Returned', 'Deducted'],
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collateral', collateralSchema);
