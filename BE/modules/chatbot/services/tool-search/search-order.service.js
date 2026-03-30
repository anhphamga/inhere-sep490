const mongoose = require('mongoose');
const RentOrder = require('../../../../model/RentOrder.model');
const SaleOrder = require('../../../../model/SaleOrder.model');
const ChatbotError = require('../../utils/chatbotError');
const { getToolSearchConfig } = require('../../utils/tool-search.config');

const ORDER_TYPE = {
  RENT: 'rent',
  SALE: 'sale',
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

const includesAny = (message, words) => {
  return words.some((word) => message.includes(word));
};

const isSelfOrderQuery = (query) => {
  const normalized = normalizeForMatch(query);
  const hasSelf = includesAny(normalized, ['cua toi', 'toi', 'my']);
  const hasOrder = includesAny(normalized, ['don', 'order', 'thue', 'rent', 'mua', 'sale']);

  return hasSelf && hasOrder;
};

const buildDateQuery = (filters) => {
  if (!filters.dateFrom && !filters.dateTo) {
    return null;
  }

  const result = {};
  if (filters.dateFrom) {
    result.$gte = filters.dateFrom;
  }
  if (filters.dateTo) {
    result.$lte = filters.dateTo;
  }

  return result;
};

const buildRentOrderQuery = ({ query, filters, actor, config }) => {
  const regex = new RegExp(escapeRegex(query), 'i');
  const customerSelfQuery = actor.role === 'customer' && isSelfOrderQuery(query);
  const mongoQuery = {};

  if (!customerSelfQuery) {
    mongoQuery.$or = [{ status: regex }];
  }

  if (!customerSelfQuery && mongoose.Types.ObjectId.isValid(query)) {
    mongoQuery.$or.push({ _id: query });
  }

  if (filters.status) {
    if (config.orderAllowedStatus.length > 0 && !config.orderAllowedStatus.includes(filters.status)) {
      throw new ChatbotError('Invalid order status filter', {
        statusCode: 400,
        code: 'INVALID_TOOL_ORDER_STATUS_FILTER',
        details: {
          status: filters.status,
          allowedStatus: config.orderAllowedStatus,
        },
      });
    }
    mongoQuery.status = filters.status;
  }

  const createdAtQuery = buildDateQuery(filters);
  if (createdAtQuery) {
    const dateFrom = createdAtQuery.$gte || createdAtQuery.$lte;
    const dateTo = createdAtQuery.$lte || createdAtQuery.$gte;

    const dateCondition = {
      $or: [
        { createdAt: createdAtQuery },
        {
          rentStartDate: { $lte: dateTo },
          rentEndDate: { $gte: dateFrom },
        },
      ],
    };

    if (Array.isArray(mongoQuery.$and)) {
      mongoQuery.$and.push(dateCondition);
    } else {
      mongoQuery.$and = [dateCondition];
    }
  }

  if (actor.role === 'customer') {
    mongoQuery.customerId = actor.id;
  }

  return mongoQuery;
};

const buildSaleOrderQuery = ({ query, filters, actor, config }) => {
  const regex = new RegExp(escapeRegex(query), 'i');
  const customerSelfQuery = actor.role === 'customer' && isSelfOrderQuery(query);
  const mongoQuery = {};

  if (!customerSelfQuery) {
    mongoQuery.$or = [
      { status: regex },
      { shippingPhone: regex },
      { guestEmail: regex },
      { guestName: regex },
    ];
  }

  if (!customerSelfQuery && mongoose.Types.ObjectId.isValid(query)) {
    mongoQuery.$or.push({ _id: query });
  }

  if (filters.status) {
    if (config.orderAllowedStatus.length > 0 && !config.orderAllowedStatus.includes(filters.status)) {
      throw new ChatbotError('Invalid order status filter', {
        statusCode: 400,
        code: 'INVALID_TOOL_ORDER_STATUS_FILTER',
        details: {
          status: filters.status,
          allowedStatus: config.orderAllowedStatus,
        },
      });
    }
    mongoQuery.status = filters.status;
  }

  const createdAtQuery = buildDateQuery(filters);
  if (createdAtQuery) {
    mongoQuery.createdAt = createdAtQuery;
  }

  if (actor.role === 'customer') {
    mongoQuery.customerId = actor.id;
  }

  return mongoQuery;
};

const mapRentOrder = (doc) => {
  return {
    id: String(doc._id),
    orderType: ORDER_TYPE.RENT,
    status: doc.status || '',
    customerId: doc.customerId ? String(doc.customerId) : null,
    totalAmount: Number(doc.totalAmount || 0),
    depositAmount: Number(doc.depositAmount || 0),
    remainingAmount: Number(doc.remainingAmount || 0),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
};

const mapSaleOrder = (doc) => {
  return {
    id: String(doc._id),
    orderType: ORDER_TYPE.SALE,
    status: doc.status || '',
    customerId: doc.customerId ? String(doc.customerId) : null,
    paymentMethod: doc.paymentMethod || '',
    guestEmail: doc.guestEmail || '',
    shippingPhone: doc.shippingPhone || '',
    totalAmount: Number(doc.totalAmount || 0),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
};

const searchOrderService = async ({ query, filters, actor }) => {
  const config = getToolSearchConfig();
  const page = filters.page;
  const limit = filters.limit;
  const fetchLimit = page * limit;
  const requestedOrderType = String(filters.orderType || 'all').toLowerCase();

  const shouldQueryRent = requestedOrderType === 'all' || requestedOrderType === ORDER_TYPE.RENT;
  const shouldQuerySale = requestedOrderType === 'all' || requestedOrderType === ORDER_TYPE.SALE;

  const rentQuery = buildRentOrderQuery({ query, filters, actor, config });
  const saleQuery = buildSaleOrderQuery({ query, filters, actor, config });

  const [rentOrders, saleOrders, totalRent, totalSale] = await Promise.all([
    shouldQueryRent
      ? RentOrder.find(rentQuery)
        .select('_id customerId status totalAmount depositAmount remainingAmount createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean()
      : Promise.resolve([]),
    shouldQuerySale
      ? SaleOrder.find(saleQuery)
        .select('_id customerId status paymentMethod guestEmail shippingPhone totalAmount createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean()
      : Promise.resolve([]),
    shouldQueryRent ? RentOrder.countDocuments(rentQuery) : Promise.resolve(0),
    shouldQuerySale ? SaleOrder.countDocuments(saleQuery) : Promise.resolve(0),
  ]);

  const merged = [
    ...rentOrders.map(mapRentOrder),
    ...saleOrders.map(mapSaleOrder),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const start = (page - 1) * limit;
  const records = merged.slice(start, start + limit);

  return {
    entity: 'order',
    page,
    limit,
    total: totalRent + totalSale,
    records,
  };
};

module.exports = {
  searchOrderService,
};
