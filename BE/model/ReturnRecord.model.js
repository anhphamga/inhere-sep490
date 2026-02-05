const mongoose = require('mongoose');

const returnRecordSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  returnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  condition: {
    type: String,
    enum: ['Normal', 'Dirty', 'Damaged'],
    default: 'Normal'
  },
  washingFee: {
    type: Number,
    default: 0
  },
  damageFee: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    default: ''
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);
