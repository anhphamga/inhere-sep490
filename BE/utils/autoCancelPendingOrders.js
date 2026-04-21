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

const cancelOrder = async (order) => {
  const session = await mongoose.startSession();
  const orderId = order._id;

  try {
    session.startTransaction();

    const items = await RentOrderItem.find({ orderId }).session(session).lean();
    const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

    if (instanceIds.length > 0) {
      await ProductInstance.updateMany(
        { _id: { $in: instanceIds }, lifecycleStatus: 'Reserved' },
        { lifecycleStatus: 'Available' },
        { session }
      );
    }

    await Deposit.updateMany({ orderId, status: 'Held' }, { status: 'Refunded' }, { session });

    order.status = 'Cancelled';
    await order.save({ session });

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
