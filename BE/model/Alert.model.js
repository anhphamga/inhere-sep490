const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['PickupSoon', 'ReturnSoon', 'Late', 'New', 'Seen', 'Done'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['RentOrder', 'SaleOrder', 'Product'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  status: {
    type: String,
    enum: ['New', 'Seen', 'Done'],
    default: 'New'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
