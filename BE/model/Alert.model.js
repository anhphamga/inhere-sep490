const mongoose = require('mongoose');

const alertActivitySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATED', 'STATUS_CHANGED', 'NOTE_ADDED'],
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actorRole: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  fromStatus: {
    type: String,
    enum: ['New', 'Seen', 'Done', ''],
    default: ''
  },
  toStatus: {
    type: String,
    enum: ['New', 'Seen', 'Done', ''],
    default: ''
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activityLogs: {
    type: [alertActivitySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
