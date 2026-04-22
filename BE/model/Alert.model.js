const mongoose = require('mongoose');
const {
  ALERT_TYPES,
  ALERT_PRIORITY,
  ALERT_STATUS,
  ALERT_TARGET_TYPES,
} = require('../constants/alert.constants');

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
    enum: [...Object.values(ALERT_STATUS), ''],
    default: ''
  },
  toStatus: {
    type: String,
    enum: [...Object.values(ALERT_STATUS), ''],
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
    enum: Object.values(ALERT_TYPES),
    required: true
  },
  targetType: {
    type: String,
    enum: Object.values(ALERT_TARGET_TYPES),
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  status: {
    type: String,
    enum: Object.values(ALERT_STATUS),
    default: ALERT_STATUS.NEW
  },
  priority: {
    type: String,
    enum: Object.values(ALERT_PRIORITY),
    default: ALERT_PRIORITY.MEDIUM
  },
  message: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  groupKey: {
    type: String,
    default: ''
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null
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

alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ groupKey: 1, createdAt: -1 });
alertSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: 'date' } },
  }
);

module.exports = mongoose.model('Alert', alertSchema);
