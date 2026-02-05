const mongoose = require('mongoose');

const productInstanceSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  conditionLevel: {
    type: String,
    enum: ['New', 'Good', 'Used', 'Damaged'],
    default: 'New'
  },
  conditionScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  lifecycleStatus: {
    type: String,
    enum: ['Available', 'Rented', 'Washing', 'Repair', 'Lost'],
    default: 'Available'
  },
  currentRentPrice: {
    type: Number,
    required: true
  },
  currentSalePrice: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductInstance', productInstanceSchema);
