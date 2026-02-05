const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['Online', 'Cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['Held', 'Refunded'],
    default: 'Held'
  },
  paidAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Deposit', depositSchema);
