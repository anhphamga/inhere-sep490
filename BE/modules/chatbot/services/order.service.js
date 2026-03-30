const mongoose = require('mongoose');
const SaleOrder = require('../../../model/SaleOrder.model');
const RentOrder = require('../../../model/RentOrder.model');
const SaleOrderItem = require('../../../model/SaleOrderItem.model');
const RentOrderItem = require('../../../model/RentOrderItem.model');
const Product = require('../../../model/Product.model');
const ProductInstance = require('../../../model/ProductInstance.model');

const DEFAULT_RECENT_LIMIT = 5;

const toDateValue = (value) => {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const mapSaleOrder = (order) => ({
  id: String(order._id),
  orderType: 'sale',
  status: order.status || '',
  totalAmount: Number(order.totalAmount || 0),
  createdAt: order.createdAt || null,
  detailUrl: `/orders/${String(order._id)}`,
});

const mapRentOrder = (order) => ({
  id: String(order._id),
  orderType: 'rent',
  status: order.status || '',
  rentStartDate: order.rentStartDate || null,
  rentEndDate: order.rentEndDate || null,
  totalAmount: Number(order.totalAmount || 0),
  createdAt: order.createdAt || null,
  detailUrl: `/rental/${String(order._id)}`,
});

const pickLocalizedText = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return String(value.vi || value.en || '').trim();
  }

  return '';
};

const buildOrderIndex = (orders = []) => {
  return orders.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
};

const getOrderById = async (orderId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const [saleOrder, rentOrder] = await Promise.all([
    SaleOrder.findOne({ _id: orderId, customerId: userId })
      .select('_id status totalAmount createdAt')
      .lean(),
    RentOrder.findOne({ _id: orderId, customerId: userId })
      .select('_id status rentStartDate rentEndDate totalAmount createdAt')
      .lean(),
  ]);

  if (saleOrder) {
    return mapSaleOrder(saleOrder);
  }

  if (rentOrder) {
    return mapRentOrder(rentOrder);
  }

  return null;
};

const getRecentSaleOrders = async (userId, options = {}) => {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : DEFAULT_RECENT_LIMIT;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  const orders = await SaleOrder.find({ customerId: userId })
    .select('_id status totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(Math.max(limit, 1))
    .lean();

  return orders.map(mapSaleOrder);
};

const getRecentRentOrders = async (userId, options = {}) => {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : DEFAULT_RECENT_LIMIT;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  const orders = await RentOrder.find({ customerId: userId })
    .select('_id status rentStartDate rentEndDate totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(Math.max(limit, 1))
    .lean();

  return orders.map(mapRentOrder);
};

const mapSaleOrderItem = (item) => ({
  orderType: 'sale',
  productId: item.productId ? String(item.productId) : null,
  quantity: Number(item.quantity || 1),
  price: Number(item.unitPrice || 0),
  size: item.size || '',
  color: item.color || '',
  productName: item.productName || '',
});

const mapRentOrderItem = (item) => ({
  orderType: 'rent',
  productId: item.productInstanceId ? String(item.productInstanceId) : null,
  quantity: 1,
  price: Number(item.finalPrice || item.baseRentPrice || 0),
  size: item.size || '',
  color: item.color || '',
  productName: item.productName || '',
});

const enrichSaleItemsWithProductName = async (saleItems) => {
  const productIds = saleItems
    .map((item) => item.productId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!productIds.length) {
    return saleItems;
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select('_id name')
    .lean();

  const productNameMap = products.reduce((acc, item) => {
    acc[String(item._id)] = pickLocalizedText(item.name);
    return acc;
  }, {});

  return saleItems.map((item) => ({
    ...item,
    productName: productNameMap[String(item.productId)] || '',
  }));
};

const enrichRentItemsWithProductName = async (rentItems) => {
  const instanceIds = rentItems
    .map((item) => item.productInstanceId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!instanceIds.length) {
    return rentItems;
  }

  const instances = await ProductInstance.find({ _id: { $in: instanceIds } })
    .select('_id productId')
    .lean();

  const productIds = instances
    .map((item) => item.productId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } })
      .select('_id name')
      .lean()
    : [];

  const instanceProductMap = instances.reduce((acc, item) => {
    acc[String(item._id)] = item.productId ? String(item.productId) : null;
    return acc;
  }, {});

  const productNameMap = products.reduce((acc, item) => {
    acc[String(item._id)] = pickLocalizedText(item.name);
    return acc;
  }, {});

  return rentItems.map((item) => {
    const productId = instanceProductMap[String(item.productInstanceId)] || null;
    return {
      ...item,
      productName: productId ? (productNameMap[productId] || '') : '',
    };
  });
};

const getOrderItems = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return [];
  }

  const [saleItemsRaw, rentItemsRaw] = await Promise.all([
    SaleOrderItem.find({ orderId })
      .select('productId quantity unitPrice size color')
      .lean(),
    RentOrderItem.find({ orderId })
      .select('productInstanceId finalPrice baseRentPrice size color')
      .lean(),
  ]);

  const [saleItems, rentItems] = await Promise.all([
    enrichSaleItemsWithProductName(saleItemsRaw),
    enrichRentItemsWithProductName(rentItemsRaw),
  ]);

  return [
    ...saleItems.map(mapSaleOrderItem),
    ...rentItems.map(mapRentOrderItem),
  ];
};

const getRecentOrders = async (userId, options = {}) => {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : DEFAULT_RECENT_LIMIT;

  const [saleOrders, rentOrders] = await Promise.all([
    getRecentSaleOrders(userId, { limit }),
    getRecentRentOrders(userId, { limit }),
  ]);

  return [...saleOrders, ...rentOrders]
    .sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt))
    .slice(0, Math.max(limit, 1));
};

const getOrderDetails = async (orderId, userId) => {
  const order = await getOrderById(orderId, userId);
  if (!order) {
    return null;
  }

  const items = await getOrderItems(order.id);
  return {
    ...order,
    items,
  };
};

const getOrderDetailsByOrderIds = async (orderIds = [], userId) => {
  const normalizedOrderIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!normalizedOrderIds.length) {
    return [];
  }

  const details = await Promise.all(normalizedOrderIds.map((orderId) => getOrderDetails(orderId, userId)));
  return details.filter(Boolean);
};

module.exports = {
  getRecentSaleOrders,
  getRecentRentOrders,
  getOrderItems,
  getRecentOrders,
  getOrderById,
  getOrderDetails,
  getOrderDetailsByOrderIds,
  buildOrderIndex,
};
