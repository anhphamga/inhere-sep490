const mongoose = require('mongoose');

const collateralSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  type: {
    type: String,
    enum: ['CCCD', 'GPLX', 'CAVET', 'CASH'],
    required: true
  },
  documentNumber: {
    type: String,
    default: '',
    required: function requiredDocumentNumber() {
      return this.type !== 'CASH';
    }
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0,
    required: function requiredCashAmount() {
      return this.type === 'CASH';
    }
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
    enum: ['Held', 'Returned', 'Deducted'],
    default: 'Held'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collateral', collateralSchema);
