const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  applyFor: {
    type: String,
    enum: ['Rent', 'Sale'],
    required: true
  },
  conditionLevel: {
    type: String,
    enum: ['New', 'Good', 'Used', 'Damaged'],
    default: null
  },
  modifyType: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    required: true
  },
  modifyValue: {
    type: Number,
    required: true
  },
  isHot: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  scope: {
    type: String,
    enum: ['Global', 'Product', 'Category'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
