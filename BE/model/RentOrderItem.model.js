const mongoose = require('mongoose');

const rentOrderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentOrder',
    required: true
  },
  productInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductInstance',
    required: true
  },
  baseRentPrice: {
    type: Number,
    required: true
  },
  finalPrice: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    default: ''
  },
  appliedRuleIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'PricingRule',
    default: []
  },
  selectLevel: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentOrderItem', rentOrderItemSchema);
