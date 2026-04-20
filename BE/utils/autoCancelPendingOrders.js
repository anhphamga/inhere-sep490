const mongoose = require('mongoose');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const Alert = require('../model/Alert.model');
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

    await Alert.create([{
      type: 'Task',
      targetType: 'RentOrder',
      targetId: orderId,
      status: 'New',
      message: `Đơn ${orderId} bị hủy tự động do quá hạn đặt cọc`,
      actionRequired: false
    }], { session });

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
