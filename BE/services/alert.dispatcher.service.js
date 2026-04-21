const Product = require('../model/Product.model');
const RentOrder = require('../model/RentOrder.model');
const Voucher = require('../model/Voucher.model');
const {
  ALERT_TYPES,
  ALERT_PRIORITY,
  ALERT_TARGET_TYPES,
} = require('../constants/alert.constants');
const { createBulkAlerts } = require('./alert.service');

const STOCK_LOW_THRESHOLD = Math.max(Number(process.env.ALERT_STOCK_LOW_THRESHOLD || 5), 0);
const RENT_PICKUP_SOON_HOURS = Math.max(Number(process.env.ALERT_RENT_PICKUP_SOON_HOURS || 24), 1);
const VOUCHER_EXPIRING_DAYS = Math.max(Number(process.env.ALERT_VOUCHER_EXPIRING_DAYS || 3), 1);

const toText = (value) => String(value || '').trim();

const resolveProductName = (product) => {
  const name = product?.name;
  if (typeof name === 'string') return toText(name);
  if (name && typeof name === 'object') return toText(name.vi || name.en);
  return '';
};

const getProductTotalQuantity = (product) => {
  const sized = Array.isArray(product?.sizes)
    ? product.sizes.reduce((sum, row) => sum + Math.max(Number(row?.quantity || 0), 0), 0)
    : 0;
  const standalone = Math.max(Number(product?.quantity || 0), 0);
  return Math.max(sized, standalone);
};

const notifySaleOrderCreated = async (saleOrder) => {
  if (!saleOrder?._id) return [];
  return createBulkAlerts([
    {
      type: ALERT_TYPES.ORDER_NEW,
      targetType: ALERT_TARGET_TYPES.SALE_ORDER,
      targetId: saleOrder._id,
      title: 'Don moi',
      message: `Don ban moi #${saleOrder._id} can xu ly`,
      priority: ALERT_PRIORITY.HIGH,
      actionRequired: true,
      groupKey: `sale-order-new:${saleOrder._id}`,
      data: { orderId: saleOrder._id, orderType: 'sale' },
    },
  ]);
};

const notifySaleOrderCancelled = async (saleOrder, reason = '') => {
  if (!saleOrder?._id) return [];
  return createBulkAlerts([
    {
      type: ALERT_TYPES.ORDER_CANCELLED,
      targetType: ALERT_TARGET_TYPES.SALE_ORDER,
      targetId: saleOrder._id,
      title: 'Don huy',
      message: `Don ban #${saleOrder._id} da bi huy${reason ? ` (${reason})` : ''}`,
      priority: ALERT_PRIORITY.MEDIUM,
      actionRequired: false,
      groupKey: `sale-order-cancelled:${saleOrder._id}`,
      data: { orderId: saleOrder._id, reason: toText(reason) },
    },
  ]);
};

const notifyLowStockForProducts = async (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(productIds.map((id) => String(id)).filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const products = await Product.find({ _id: { $in: uniqueIds } })
    .select('_id name sizes quantity isDraft')
    .lean();

  const payloads = products
    .filter((product) => !product?.isDraft)
    .map((product) => ({
      product,
      total: getProductTotalQuantity(product),
    }))
    .filter((item) => item.total <= STOCK_LOW_THRESHOLD)
    .map(({ product, total }) => ({
      type: ALERT_TYPES.STOCK_LOW,
      targetType: ALERT_TARGET_TYPES.PRODUCT,
      targetId: product._id,
      title: 'Ton kho thap',
      message: `${resolveProductName(product) || 'San pham'} con ${total} trong kho`,
      priority: ALERT_PRIORITY.HIGH,
      actionRequired: true,
      groupKey: `stock-low:${product._id}`,
      data: { productId: product._id, totalQuantity: total, threshold: STOCK_LOW_THRESHOLD },
    }));

  if (payloads.length === 0) return [];
  return createBulkAlerts(payloads);
};

const notifyRentPickupSoon = async () => {
  const now = new Date();
  const upperBound = new Date(now.getTime() + RENT_PICKUP_SOON_HOURS * 60 * 60 * 1000);

  const orders = await RentOrder.find({
    status: { $in: ['Confirmed', 'WaitingPickup'] },
    rentStartDate: { $gte: now, $lte: upperBound },
  })
    .select('_id rentStartDate')
    .lean();

  if (!orders.length) return [];

  const payloads = orders.map((order) => ({
    type: ALERT_TYPES.RENT_PICKUP_SOON,
    targetType: ALERT_TARGET_TYPES.RENT_ORDER,
    targetId: order._id,
    title: 'Sap den lich pickup',
    message: `Don thue #${order._id} sap den lich nhan do`,
    priority: ALERT_PRIORITY.HIGH,
    actionRequired: true,
    groupKey: `rent-pickup-soon:${order._id}`,
    data: { rentOrderId: order._id, rentStartDate: order.rentStartDate },
  }));

  return createBulkAlerts(payloads);
};

const notifyVoucherExpiringSoon = async () => {
  const now = new Date();
  const upperBound = new Date(now.getTime() + VOUCHER_EXPIRING_DAYS * 24 * 60 * 60 * 1000);

  const vouchers = await Voucher.find({
    isActive: true,
    endDate: { $gte: now, $lte: upperBound },
  })
    .select('_id code endDate')
    .lean();

  if (!vouchers.length) return [];

  const payloads = vouchers.map((voucher) => ({
    type: ALERT_TYPES.VOUCHER_EXPIRING,
    targetType: ALERT_TARGET_TYPES.VOUCHER,
    targetId: voucher._id,
    title: 'Voucher sap het han',
    message: `Voucher ${voucher.code || ''} sap het han`,
    priority: ALERT_PRIORITY.MEDIUM,
    actionRequired: false,
    groupKey: `voucher-expiring:${voucher._id}`,
    data: { voucherId: voucher._id, code: voucher.code, endDate: voucher.endDate },
  }));

  return createBulkAlerts(payloads);
};

module.exports = {
  notifySaleOrderCreated,
  notifySaleOrderCancelled,
  notifyLowStockForProducts,
  notifyRentPickupSoon,
  notifyVoucherExpiringSoon,
};
