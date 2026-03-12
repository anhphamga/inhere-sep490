const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['PickupSoon', 'ReturnSoon', 'Late', 'NoShow', 'Compensation', 'Task'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['RentOrder', 'SaleOrder', 'Product', 'FittingBooking'],
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
  message: {
    type: String,
    default: ''
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  handledAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
