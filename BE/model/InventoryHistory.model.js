const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  productInstanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductInstance',
    required: true
  },
  status: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);
