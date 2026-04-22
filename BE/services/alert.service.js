const Alert = require('../model/Alert.model');
const {
  ALERT_TYPES,
  ALERT_PRIORITY,
  ALERT_STATUS,
} = require('../constants/alert.constants');

const DEDUPE_WINDOW_MS = Math.max(Number(process.env.ALERT_DEDUPE_WINDOW_MS || 120000), 0);

const DEFAULT_TEMPLATE_BY_TYPE = {
  [ALERT_TYPES.ORDER_NEW]: {
    title: 'Đơn mới',
    message: 'Có đơn hàng mới cần xử lý.',
    priority: ALERT_PRIORITY.HIGH,
    actionRequired: true,
  },
  [ALERT_TYPES.ORDER_CANCELLED]: {
    title: 'Đơn hủy',
    message: 'Có đơn hàng vừa bị hủy.',
    priority: ALERT_PRIORITY.MEDIUM,
    actionRequired: false,
  },
  [ALERT_TYPES.RENT_PICKUP_SOON]: {
    title: 'Sắp đến lịch nhận đồ',
    message: 'Đơn thuê sắp đến lịch nhận đồ.',
    priority: ALERT_PRIORITY.HIGH,
    actionRequired: true,
  },
  [ALERT_TYPES.STOCK_LOW]: {
    title: 'Tồn kho thấp',
    message: 'Sản phẩm sắp hết hàng.',
    priority: ALERT_PRIORITY.HIGH,
    actionRequired: true,
  },
  [ALERT_TYPES.VOUCHER_EXPIRING]: {
    title: 'Voucher sắp hết hạn',
    message: 'Voucher sắp đến hạn kết thúc.',
    priority: ALERT_PRIORITY.MEDIUM,
    actionRequired: false,
  },
  [ALERT_TYPES.SYSTEM]: {
    title: 'Thông báo hệ thống',
    message: 'Thông báo hệ thống mới.',
    priority: ALERT_PRIORITY.LOW,
    actionRequired: false,
  },
};

const toText = (value) => String(value || '').trim();

const resolveTemplate = (type) => {
  return DEFAULT_TEMPLATE_BY_TYPE[type] || DEFAULT_TEMPLATE_BY_TYPE[ALERT_TYPES.SYSTEM];
};

const buildLogEntry = ({ action, actorId = null, actorRole = '', note = '', fromStatus = '', toStatus = '' }) => ({
  action,
  actor: actorId,
  actorRole: toText(actorRole),
  note: toText(note),
  fromStatus,
  toStatus,
  at: new Date(),
});

const findDedupedAlert = async ({ groupKey, targetType, targetId }) => {
  if (!groupKey) return null;
  const lowerBound = new Date(Date.now() - DEDUPE_WINDOW_MS);
  return Alert.findOne({
    groupKey,
    targetType,
    targetId,
    createdAt: { $gte: lowerBound },
  })
    .sort({ createdAt: -1 })
    .lean();
};

const createAlert = async (payload = {}, options = {}) => {
  const targetType = toText(payload.targetType);
  const targetId = payload.targetId || null;
  if (!targetType || !targetId) {
    throw new Error('INVALID_ALERT_TARGET');
  }

  const type = toText(payload.type) || ALERT_TYPES.SYSTEM;
  const template = resolveTemplate(type);
  const groupKey = toText(payload.groupKey);

  const deduped = await findDedupedAlert({
    groupKey,
    targetType,
    targetId,
  });
  if (deduped) return deduped;

  const actorId = options.actorId || payload.createdBy || null;
  const actorRole = toText(options.actorRole || payload.actorRole || '');
  const initialStatus = ALERT_STATUS.NEW;
  const created = await Alert.create([
    {
      type,
      targetType,
      targetId,
      status: initialStatus,
      priority: payload.priority || template.priority || ALERT_PRIORITY.MEDIUM,
      title: toText(payload.title || template.title),
      message: toText(payload.message || template.message),
      groupKey,
      data: payload.data && typeof payload.data === 'object' ? payload.data : {},
      expiresAt: payload.expiresAt || null,
      actionRequired: Boolean(
        payload.actionRequired !== undefined ? payload.actionRequired : template.actionRequired
      ),
      createdBy: actorId,
      activityLogs: [
        buildLogEntry({
          action: 'CREATED',
          actorId,
          actorRole,
          note: 'Tạo thông báo',
          fromStatus: '',
          toStatus: initialStatus,
        }),
      ],
    },
  ], options.session ? { session: options.session } : undefined);

  return created[0]?.toObject ? created[0].toObject() : created[0];
};

const createBulkAlerts = async (payloads = [], options = {}) => {
  if (!Array.isArray(payloads) || payloads.length === 0) return [];
  return Promise.all(payloads.map((payload) => createAlert(payload, options)));
};

const getAlerts = async (filters = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const query = {};
  if (toText(filters.status)) query.status = toText(filters.status);
  if (toText(filters.targetType)) query.targetType = toText(filters.targetType);

  const [items, total, unreadCount] = await Promise.all([
    Alert.find(query)
      .populate('handledBy', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('activityLogs.actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Alert.countDocuments(query),
    Alert.countDocuments({ ...query, status: ALERT_STATUS.NEW }),
  ]);

  return {
    data: items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const updateAlertStatus = async ({ alertId, status, actorId = null, actorRole = '' }) => {
  const existing = await Alert.findById(alertId).lean();
  if (!existing) return null;
  if (!Object.values(ALERT_STATUS).includes(status)) {
    throw new Error('INVALID_ALERT_STATUS');
  }
  if (existing.status === status) return existing;

  const payload = {
    status,
    handledBy: actorId,
    handledAt: new Date(),
    $push: {
      activityLogs: buildLogEntry({
        action: 'STATUS_CHANGED',
        actorId,
        actorRole,
        note: `Cập nhật trạng thái từ ${existing.status} sang ${status}`,
        fromStatus: existing.status || '',
        toStatus: status,
      }),
    },
  };

  return Alert.findByIdAndUpdate(alertId, payload, { new: true, runValidators: true })
    .populate('handledBy', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('activityLogs.actor', 'name email role')
    .lean();
};

const markAllAlertsAsSeen = async ({ actorId = null, actorRole = '' } = {}) => {
  const now = new Date();
  const result = await Alert.updateMany(
    { status: ALERT_STATUS.NEW },
    {
      $set: {
        status: ALERT_STATUS.SEEN,
        handledBy: actorId,
        handledAt: now,
      },
      $push: {
        activityLogs: buildLogEntry({
          action: 'STATUS_CHANGED',
          actorId,
          actorRole,
          note: 'Đánh dấu đã xem hàng loạt',
          fromStatus: ALERT_STATUS.NEW,
          toStatus: ALERT_STATUS.SEEN,
        }),
      },
    }
  );

  return result.modifiedCount || 0;
};

const deleteAlert = async (alertId) => {
  return Alert.findByIdAndDelete(alertId).lean();
};

module.exports = {
  createAlert,
  createBulkAlerts,
  getAlerts,
  updateAlertStatus,
  markAllAlertsAsSeen,
  deleteAlert,
};
