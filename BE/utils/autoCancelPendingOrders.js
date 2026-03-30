const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const Alert = require('../model/Alert.model');

// Thời gian tối đa cho đơn PendingDeposit — đồng nhất với PENDING_DEPOSIT_HOLD_MINUTES
// Mặc định 5 phút để dễ test; production nên đặt 30 hoặc cao hơn
const AUTO_CANCEL_MINUTES = parseInt(process.env.PENDING_DEPOSIT_HOLD_MINUTES || '5', 10);
// Thời gian chạy cron (5 phút)
const INTERVAL_MS = 5 * 60 * 1000;

const cancelOrder = async (order) => {
  const orderId = order._id;

  const items = await RentOrderItem.find({ orderId }).lean();
  const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

  if (instanceIds.length > 0) {
    await ProductInstance.updateMany(
      { _id: { $in: instanceIds } },
      { lifecycleStatus: 'Available' }
    );
  }

  await Deposit.updateMany({ orderId, status: 'Held' }, { status: 'Refunded' });

  order.status = 'Cancelled';
  await order.save();

  await Alert.create({
    type: 'Cancelled',
    targetType: 'RentOrder',
    targetId: orderId,
    status: 'New',
    message: `Don ${orderId} bi huy tu dong do qua han dat coc`,
    actionRequired: false
  });
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
