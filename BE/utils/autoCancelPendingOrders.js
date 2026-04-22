const mongoose = require('mongoose');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const { createAlert } = require('../services/alert.service');
const { ALERT_TYPES, ALERT_TARGET_TYPES } = require('../constants/alert.constants');
const { pendingDepositHoldMinutes, autoCancelIntervalMs } = require('../config/app.config');

const AUTO_CANCEL_MINUTES = pendingDepositHoldMinutes;
const INTERVAL_MS = autoCancelIntervalMs;

// Đồng bộ với TERMINAL_ORDER_STATUSES trong rent-order.controller: đơn kết thúc vòng đời
// thì không còn "giữ" instance.
const TERMINAL_ORDER_STATUSES = ['cancelled', 'completed', 'noshow', 'returned'];

/**
 * Release instance về Available chỉ khi không còn đơn active khác dùng nó. Dùng khi
 * auto-cancel đơn PendingDeposit.
 */
const safeReleaseInstances = async (instanceIds, excludeOrderId, options = {}) => {
  const ids = Array.from(new Set((instanceIds || []).filter(Boolean).map((id) => id.toString())));
  if (ids.length === 0) return;

  const releasable = [];
  for (const instanceId of ids) {
    const otherItems = await RentOrderItem.find({
      productInstanceId: instanceId,
      ...(excludeOrderId ? { orderId: { $ne: excludeOrderId } } : {}),
    }).populate({ path: 'orderId', select: 'status' }).lean();

    const hasOtherActive = otherItems.some((item) => {
      if (!item.orderId) return false;
      const status = String(item.orderId.status || '').toLowerCase();
      return !TERMINAL_ORDER_STATUSES.includes(status);
    });

    if (!hasOtherActive) releasable.push(instanceId);
  }

  if (releasable.length > 0) {
    await ProductInstance.updateMany(
      {
        _id: { $in: releasable.map((id) => new mongoose.Types.ObjectId(id)) },
        lifecycleStatus: { $in: ['Reserved', 'Rented'] },
      },
      { lifecycleStatus: 'Available' },
      options
    );
  }
};

let cachedTransactionSupport = null;
const detectTransactionSupport = async () => {
  if (cachedTransactionSupport !== null) return cachedTransactionSupport;
  try {
    const admin = mongoose.connection.db?.admin?.();
    if (!admin) {
      cachedTransactionSupport = false;
      return cachedTransactionSupport;
    }
    const info = await admin.command({ hello: 1 });
    cachedTransactionSupport = Boolean(info?.setName) || info?.msg === 'isdbgrid';
  } catch (err) {
    console.warn('Auto-cancel transaction detection failed, fallback to non-transactional mode:', err?.message || err);
    cachedTransactionSupport = false;
  }
  return cachedTransactionSupport;
};

const cancelOrder = async (order) => {
  const orderId = order._id;
  const supportsTransaction = await detectTransactionSupport();

  if (!supportsTransaction) {
    const items = await RentOrderItem.find({ orderId }).lean();
    const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

    order.status = 'Cancelled';
    await order.save();

    if (instanceIds.length > 0) {
      await safeReleaseInstances(instanceIds, orderId);
    }

    await Deposit.updateMany({ orderId, status: 'Held' }, { status: 'Refunded' });

    await createAlert({
      type: ALERT_TYPES.TASK,
      targetType: ALERT_TARGET_TYPES.RENT_ORDER,
      targetId: orderId,
      title: 'Don bi huy tu dong',
      message: `Don ${orderId} bi huy tu dong do qua han dat coc`,
      actionRequired: false,
      groupKey: `rent-order-autocancel:${orderId}`,
      data: { orderId, reason: 'pending_deposit_timeout' },
    });
    return;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const items = await RentOrderItem.find({ orderId }).session(session).lean();
    const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

    order.status = 'Cancelled';
    await order.save({ session });

    if (instanceIds.length > 0) {
      await safeReleaseInstances(instanceIds, orderId, { session });
    }

    await Deposit.updateMany({ orderId, status: 'Held' }, { status: 'Refunded' }, { session });

    await createAlert({
      type: ALERT_TYPES.TASK,
      targetType: ALERT_TARGET_TYPES.RENT_ORDER,
      targetId: orderId,
      title: 'Don bi huy tu dong',
      message: `Don ${orderId} bi huy tu dong do qua han dat coc`,
      actionRequired: false,
      groupKey: `rent-order-autocancel:${orderId}`,
      data: { orderId, reason: 'pending_deposit_timeout' },
    }, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const runAutoCancel = async () => {
  const threshold = new Date(Date.now() - AUTO_CANCEL_MINUTES * 60 * 1000);
  const orders = await RentOrder.find({
    status: 'PendingDeposit',
    createdAt: { $lte: threshold }
  });

  if (!orders || orders.length === 0) return;

  for (const order of orders) {
    try {
      await cancelOrder(order);
    } catch (error) {
      console.error('Auto-cancel order failed:', order._id, error.message);
    }
  }
};

const startAutoCancelJob = () => {
  runAutoCancel().catch((err) => console.error('Auto-cancel initial run error:', err.message));
  setInterval(() => runAutoCancel().catch((err) => console.error('Auto-cancel run error:', err.message)), INTERVAL_MS);
};

module.exports = { startAutoCancelJob };
