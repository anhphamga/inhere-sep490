const mongoose = require('mongoose');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const User = require('../model/User.model');
const GuestVerification = require('../model/GuestVerification.model');
const Voucher = require('../model/Voucher.model');
const bcrypt = require('bcryptjs');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const { normalizeIdempotencyKey, isDuplicateIdempotencyError } = require('../utils/idempotency');
const {
  verifyGuestVerificationToken,
  signGuestOrderViewToken,
  verifyGuestOrderViewToken,
  extractBearerToken,
} = require('../utils/jwt');
const { sendOrderConfirmationEmail } = require('../services/mailService');
const { runPostPaymentInvoiceFlow } = require('../services/postPaymentInvoice.service');
const {
  validateVoucher,
  getVoucherByCode,
  normalizeVoucherCode,
  buildVoucherSnapshot,
  repairVoucherUsageCounterIfNeeded,
} = require('../services/voucher.service');
const {
  SALE_ORDER_ALLOWED_STATUSES,
  SALE_ORDER_TRANSITIONS,
  getSaleStatusMeta,
} = require('../constants/sale-order.constants');
const {
  REVIEWABLE_SALE_STATUSES,
  getReviewedMapForOrders,
} = require('../services/review.service');
const {
  notifySaleOrderCreated,
  notifySaleOrderCancelled,
  notifyLowStockForProducts,
} = require('../services/alert.dispatcher.service');
const { ORDER_TYPE } = require('../constants/order.constants');
const { frontendUrl } = require('../config/app.config');
const {
  normalizeSaleOrderStatusInput,
  isRefundedSaleStatus,
  resolveSaleOrderUserStatus,
  getSaleOrderUserStatusLabel,
} = require('../utils/saleOrderStatus');

const normalizePaymentMethod = (value = '') => {
  if (value === 'BankTransfer') return 'BankTransfer';
  if (value === 'Online' || value === 'PayOS' || value === 'PayPal') return 'Online';
  return 'COD';
};

// Guest sale checkout doesn't create a user by default, but voucher per-user limits require a stable identity.
// We reuse the same strategy as rent guest flow: create/find a "walk_in" customer by verified email.
const findOrCreateGuestCustomer = async ({ email, name, phone }) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const updates = {};
    if (name && String(existing.name || '').trim() !== String(name).trim()) {
      updates.name = String(name).trim();
    }
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && existing.phone !== normalizedPhone) {
      updates.phone = normalizedPhone;
    }
    if (Object.keys(updates).length > 0) {
      await User.updateOne({ _id: existing._id }, { $set: updates }).catch(() => null);
    }
    return existing;
  }

  const randomPassword = Math.random().toString(36).slice(2, 12);
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  return User.create({
    name: String(name || '').trim() || 'Khách vãng lai',
    phone: normalizePhone(phone) || null,
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
    segment: 'walk_in',
    status: 'active',
  });
};

const buildFallbackHistory = (order) => {
  const history = [
    {
      status: order?.status || '',
      action: 'order_created',
      description: 'Đơn hàng được tạo',
      updatedBy: order?.staffId || null,
      updatedAt: order?.createdAt || null,
    },
  ];

  const createdAt = new Date(order?.createdAt || 0).getTime();
  const updatedAt = new Date(order?.updatedAt || 0).getTime();
  if (updatedAt && createdAt && updatedAt > createdAt) {
    history.push({
      status: order?.status || '',
      action: 'status_synced',
      description: `Trạng thái hiện tại: ${order?.status || 'N/A'}`,
      updatedBy: order?.staffId || null,
      updatedAt: order?.updatedAt,
    });
  }

  return history;
};

const normalizeHistory = (order, options = {}) => {
  const customerFacing = options.customerFacing === true;
  const source = Array.isArray(order?.history) && order.history.length > 0
    ? order.history
    : buildFallbackHistory(order);

  return source
    .map((item) => {
      const status = String(item?.status || order?.status || '').trim();
      const statusMeta = getSaleStatusMeta(status);
      const userStatus = resolveSaleOrderUserStatus(status, order?.userStatus);
      const userStatusLabel = getSaleOrderUserStatusLabel(userStatus);
      const shouldUseUserFacingReturned = customerFacing && isRefundedSaleStatus(status);
      return {
        status,
        statusLabel: shouldUseUserFacingReturned
          ? userStatusLabel
          : (item?.statusLabel || statusMeta.label),
        userStatus,
        userStatusLabel,
        action: item?.action || '',
        description: item?.description || '',
        updatedAt: item?.updatedAt || null,
        updatedBy: item?.updatedBy
          ? {
            _id: item.updatedBy?._id || item.updatedBy,
            name: item.updatedBy?.name || '',
            email: item.updatedBy?.email || '',
          }
          : null,
      };
    })
    .sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
};

const mapSaleOrderForOwner = (order, options = {}) => {
  const customerFacing = options.customerFacing === true;
  const statusMeta = getSaleStatusMeta(order?.status);
  const userStatus = resolveSaleOrderUserStatus(order?.status, order?.userStatus);
  const userStatusLabel = getSaleOrderUserStatusLabel(userStatus);
  const shouldUseUserFacingReturned = customerFacing && isRefundedSaleStatus(order?.status);
  return {
    ...order,
    statusLabel: shouldUseUserFacingReturned ? userStatusLabel : statusMeta.label,
    userStatus,
    userStatusLabel,
    statusBadgeClass: statusMeta.badgeClass,
    availableNextStatuses: SALE_ORDER_TRANSITIONS[order?.status] || [],
    history: normalizeHistory(order, { customerFacing }),
  };
};

const buildNormalizedSaleItems = (items = [], productMap = new Map()) => {
  return items.map((item) => {
    const product = productMap.get(String(item.productId));
    const quantity = Math.max(Number(item.quantity || 1), 1);
    const unitPrice = Number(item.salePrice || product?.baseSalePrice || 0);

    if (!product || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('INVALID_PRODUCT_DATA');
    }

    return {
      productId: product._id,
      quantity,
      size: String(item.size || 'FREE SIZE').trim() || 'FREE SIZE',
      color: String(item.color || 'Default').trim() || 'Default',
      note: String(item.note || '').trim(),
      unitPrice,
      conditionLevel: item.conditionLevel === 'Used' ? 'Used' : 'New',
      productInstanceId: item?.productInstanceId || null,
    };
  });
};

// CHANGED: Validate products against unique product ids, because checkout items can repeat
// the same productId across different conditions (New/Used) and still be valid.
const getUniqueProductIds = (items = []) =>
  Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => item?.productId)
        .filter(Boolean)
        .map((id) => String(id))
    )
  );

// Sale: chặn bán nếu instance còn nằm trong bất kỳ `RentOrderItem` chưa kết thúc (so với "today").
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
const toVnCalendarDay = (d) => Math.floor((new Date(d).getTime() + VN_TZ_OFFSET_MS) / DAY_IN_MS);
const RENT_ORDER_TERMINAL_STATUSES_LOWER = ['cancelled', 'completed', 'noshow', 'returned'];

const getBlockedInstanceIdsForFutureRent = async (instanceIds = []) => {
  if (!Array.isArray(instanceIds) || instanceIds.length === 0) return new Set();

  const rentItems = await RentOrderItem.find({
    productInstanceId: { $in: instanceIds },
  }).select('productInstanceId orderId rentEndDate rentStartDate').lean();

  if (!rentItems.length) return new Set();

  const orderIds = Array.from(new Set(rentItems.map((i) => String(i.orderId)).filter(Boolean)));
  if (!orderIds.length) return new Set();

  const orders = await RentOrder.find({ _id: { $in: orderIds } })
    .select('status rentStartDate rentEndDate')
    .lean();
  const orderById = new Map(orders.map((o) => [String(o._id), o]));

  const todayDay = toVnCalendarDay(new Date());
  const blocked = new Set();

  for (const item of rentItems) {
    const order = orderById.get(String(item.orderId));
    if (!order) continue;
    const status = String(order.status || '').toLowerCase();
    if (RENT_ORDER_TERMINAL_STATUSES_LOWER.includes(status)) continue;

    const effectiveEnd = item.rentEndDate || order.rentEndDate;
    if (!effectiveEnd) continue;
    const endDay = toVnCalendarDay(effectiveEnd);
    // Ngày kết thúc thuê (inclusive) >= hôm nay theo lịch VN → instance vẫn phải phục vụ đơn thuê, không bán.
    if (endDay < todayDay) continue;

    blocked.add(String(item.productInstanceId));
  }

  return blocked;
};

const ensureSaleStockAvailable = async (normalizedItems = []) => {
  // Group by productId + conditionLevel + size to check real stock buckets.
  const requestedByKey = {};
  for (const item of normalizedItems) {
    const conditionLevel = item.conditionLevel === 'Used' ? 'Used' : 'New';
    const normalizedSize = String(item?.size || '').trim().toUpperCase();
    const size = normalizedSize || 'FREE SIZE';
    const key = `${String(item.productId)}::${conditionLevel}::${size}`;
    if (!requestedByKey[key]) {
      requestedByKey[key] = { productId: item.productId, conditionLevel, size, count: 0 };
    }
    requestedByKey[key].count += Number(item.quantity || 0);
  }

  const grouped = Object.values(requestedByKey);
  const requestedProductIds = Array.from(new Set(grouped.map((g) => String(g.productId)))).map((id) => new mongoose.Types.ObjectId(id));
  const requestedConditionLevels = Array.from(new Set(grouped.map((g) => g.conditionLevel)));

  const candidateInstances = await ProductInstance.find({
    productId: { $in: requestedProductIds },
    lifecycleStatus: 'Available',
    conditionLevel: { $in: requestedConditionLevels },
  }).select('_id productId conditionLevel size').lean();

  const blockedInstanceIds = await getBlockedInstanceIdsForFutureRent(candidateInstances.map((i) => i._id).filter(Boolean));
  const unblockedCandidates = candidateInstances.filter((i) => !blockedInstanceIds.has(String(i._id)));

  const matchesSize = (instance, size) => {
    const instanceSize = String(instance?.size || '').trim().toUpperCase() || 'FREE SIZE';
    return instanceSize === (size || 'FREE SIZE');
  };

  for (const { productId, conditionLevel, size, count } of grouped) {
    const available = unblockedCandidates.filter((i) => (
      String(i.productId) === String(productId)
      && i.conditionLevel === conditionLevel
      && matchesSize(i, size)
    )).length;
    if (available < count) throw new Error('OUT_OF_STOCK');
  }
};

const assignSaleInstances = async (normalizedItems = [], saleOrderId = null, session = null) => {
  const txOptions = session ? { session } : {};

  const requestedProductIds = Array.from(new Set(normalizedItems.map((i) => String(i.productId)))).map((id) => new mongoose.Types.ObjectId(id));
  const requestedConditionLevels = Array.from(new Set(normalizedItems.map((i) => i.conditionLevel)));

  const candidateInstances = await ProductInstance.find({
    productId: { $in: requestedProductIds },
    lifecycleStatus: 'Available',
    conditionLevel: { $in: requestedConditionLevels },
  }).select('_id conditionLevel productId').lean();

  const blockedInstanceIds = await getBlockedInstanceIdsForFutureRent(candidateInstances.map((i) => i._id).filter(Boolean));
  const blockedObjectIds = Array.from(blockedInstanceIds).map((id) => new mongoose.Types.ObjectId(id));

  for (const item of normalizedItems) {
    const qty = Number(item.quantity || 1);
    const conditionLevel = item.conditionLevel === 'Used' ? 'Used' : 'New';
    const normalizedSize = String(item?.size || '').trim().toUpperCase();
    const size = normalizedSize || 'FREE SIZE';
    const requestedInstanceId = mongoose.isValidObjectId(item?.productInstanceId)
      ? new mongoose.Types.ObjectId(item.productInstanceId)
      : null;
    for (let i = 0; i < qty; i++) {
      const query = {
        productId: item.productId,
        lifecycleStatus: 'Available',
        conditionLevel,
        size,
        ...(blockedObjectIds.length ? { _id: { $nin: blockedObjectIds } } : {}),
      };

      if (requestedInstanceId && i === 0) {
        query._id = requestedInstanceId;
      }

      const instance = await ProductInstance.findOneAndUpdate(
        query,
        { lifecycleStatus: 'Sold', soldOrderId: saleOrderId || null },
        { new: true, sort: { conditionScore: -1 }, ...txOptions }
      );
      if (!instance) throw new Error('OUT_OF_STOCK');
    }
  }
};

const normalizeSaleItemCondition = (value) => {
  if (value === 'Used') return 'Used';
  if (value === 'New') return 'New';
  return null;
};

const releaseSaleOrderInstances = async (orderId, session = null) => {
  if (!orderId) return;

  const txOptions = session ? { session } : {};
  const items = await SaleOrderItem.find({ orderId }).select('productId quantity conditionLevel').lean();
  if (!items.length) return;

  const grouped = new Map();
  for (const item of items) {
    const productId = String(item?.productId || '').trim();
    if (!productId) continue;
    const conditionLevel = normalizeSaleItemCondition(item?.conditionLevel);
    const qty = Math.max(Number(item?.quantity || 1), 1);
    const key = `${productId}::${conditionLevel || 'ANY'}`;
    const current = grouped.get(key) || { productId, conditionLevel, quantity: 0 };
    current.quantity += qty;
    grouped.set(key, current);
  }

  for (const { productId, conditionLevel, quantity } of grouped.values()) {
    let remaining = quantity;

    const linkedQuery = {
      productId: new mongoose.Types.ObjectId(productId),
      lifecycleStatus: 'Sold',
      soldOrderId: orderId,
      ...(conditionLevel ? { conditionLevel } : {}),
    };
    const linkedInstances = await ProductInstance.find(linkedQuery).sort({ updatedAt: -1 }).limit(remaining).select('_id').lean();
    if (linkedInstances.length > 0) {
      const linkedIds = linkedInstances.map((item) => item._id);
      await ProductInstance.updateMany(
        { _id: { $in: linkedIds } },
        { lifecycleStatus: 'Available', soldOrderId: null },
        txOptions
      );
      remaining -= linkedIds.length;
    }

    if (remaining <= 0) continue;

    const fallbackQuery = {
      productId: new mongoose.Types.ObjectId(productId),
      lifecycleStatus: 'Sold',
      ...(conditionLevel ? { conditionLevel } : {}),
      $or: [{ soldOrderId: null }, { soldOrderId: { $exists: false } }],
    };
    const fallbackInstances = await ProductInstance.find(fallbackQuery).sort({ updatedAt: -1 }).limit(remaining).select('_id').lean();
    if (!fallbackInstances.length) continue;

    const fallbackIds = fallbackInstances.map((item) => item._id);
    await ProductInstance.updateMany(
      { _id: { $in: fallbackIds } },
      { lifecycleStatus: 'Available', soldOrderId: null },
      txOptions
    );
  }
};

const createSaleOrderWithItems = async ({
  customerId = null,
  paymentMethod = 'COD',
  totalAmount = 0,
  shippingFee = 0,
  shippingAddress = '',
  shippingPhone = '',
  guestName = '',
  guestEmail = '',
  guestVerificationMethod = null,
  guestVerificationId = null,
  note = '',
  items = [],
  idempotencyKey = null,
  voucherCode = null,
  voucherId = null,
  voucherSnapshot = null,
  discountAmount = 0,
  session = null,
}) => {
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  // Đơn thanh toán online (PayOS): cần xác nhận thanh toán trước khi chuyển sang PendingConfirmation
  const initialStatus = normalizedMethod === 'Online' ? 'PendingPayment' : 'PendingConfirmation';

  const [saleOrder] = await SaleOrder.create([{
    customerId,
    staffId: null,
    status: initialStatus,
    userStatus: resolveSaleOrderUserStatus(initialStatus),
    paymentMethod: normalizedMethod,
    totalAmount,
    shippingFee,
    shippingAddress,
    shippingPhone,
    orderType: ORDER_TYPE.BUY,
    guestName,
    guestEmail,
    guestVerificationMethod,
    guestVerificationId,
    idempotencyKey,
    voucherCode,
    voucherId,
    voucherSnapshot,
    discountAmount,
    history: [
      {
        status: initialStatus,
        action: 'order_created',
        description: 'Đơn hàng được tạo',
        updatedBy: customerId || null,
        updatedAt: new Date(),
      },
    ],
  }], session ? { session } : {});

  await SaleOrderItem.insertMany(
    items.map((item) => ({
      orderId: saleOrder._id,
      productId: item.productId,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      conditionLevel: item.conditionLevel === 'Used' ? 'Used' : 'New',
      size: item.size,
      color: item.color,
      note: note ? `${item.note}${item.note ? ' | ' : ''}${note}` : item.note,
    })),
    session ? { session } : {}
  );

  return saleOrder;
};

const buildCheckoutSuccessResponse = (saleOrder) => ({
  success: true,
  totalPrice: saleOrder.totalAmount,
  discountAmount: saleOrder.discountAmount || 0,
  voucherCode: saleOrder.voucherCode,
  data: {
    orderId: saleOrder._id,
    orderType: saleOrder.orderType,
    status: saleOrder.status,
    userStatus: resolveSaleOrderUserStatus(saleOrder.status, saleOrder.userStatus),
    totalAmount: saleOrder.totalAmount,
  },
});

const findSaleOrderByIdempotencyKey = async (idempotencyKey) => {
  if (!idempotencyKey) return null;
  return SaleOrder.findOne({ idempotencyKey }).sort({ createdAt: -1 });
};

/** Đã xác nhận MongoDB (standalone) không dùng được transaction cho sale checkout — tránh gọi startTransaction lặp lại. */
let saleMongoTransactionsUnsupported = false;
let saleMongoTransactionsFallbackLogged = false;

const shouldForceSaleCheckoutWithoutTransaction = () =>
  ['1', 'true', 'yes'].includes(String(process.env.DISABLE_SALE_MONGO_TRANSACTIONS || '').toLowerCase());

const runSaleCheckoutTransaction = async ({
  createOrderPayload,
  voucherId = null,
}) => {
  const normalizedItems = createOrderPayload.items || [];

  const runWithoutTransaction = async () => {
    const saleOrder = await createSaleOrderWithItems(createOrderPayload);
    try {
      await assignSaleInstances(normalizedItems, saleOrder._id);

      if (voucherId) {
        await Voucher.findByIdAndUpdate(voucherId, {
          $inc: { usedCount: 1 },
        });
      }

      return saleOrder;
    } catch (fallbackError) {
      // Best-effort rollback when not using transactions.
      await SaleOrderItem.deleteMany({ orderId: saleOrder._id });
      await SaleOrder.findByIdAndDelete(saleOrder._id);
      throw fallbackError;
    }
  };

  if (shouldForceSaleCheckoutWithoutTransaction() || saleMongoTransactionsUnsupported) {
    return runWithoutTransaction();
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const saleOrder = await createSaleOrderWithItems({
      ...createOrderPayload,
      session,
    });

    await assignSaleInstances(normalizedItems, saleOrder._id, session);

    if (voucherId) {
      await Voucher.findByIdAndUpdate(
        voucherId,
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    await session.commitTransaction();
    return saleOrder;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore abort errors; the original error/fallback path is more important here
    }

    if (isTransactionNotSupportedError(error)) {
      saleMongoTransactionsUnsupported = true;
      if (!saleMongoTransactionsFallbackLogged) {
        saleMongoTransactionsFallbackLogged = true;
        const wantLog = ['1', 'true', 'yes'].includes(String(process.env.LOG_SALE_CHECKOUT_TXN || '').toLowerCase());
        if (wantLog) {
          console.info(
            '[SaleCheckout] MongoDB không hỗ trợ transaction trên deployment này; đã bật chế độ không-transaction cho các lần checkout sau. ' +
            'Tuỳ chọn: DISABLE_SALE_MONGO_TRANSACTIONS=true (bỏ thử transaction) hoặc dùng replica set / Atlas.',
            error?.message || error
          );
        }
      }
      return runWithoutTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const isTransactionNotSupportedError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const codeName = String(error?.codeName || '').toLowerCase();

  if (codeName === 'illegaloperation') {
    return (
      message.includes('transaction') ||
      message.includes('replica set member') ||
      message.includes('mongos')
    );
  }

  return (
    message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are not supported') ||
    message.includes('cannot use transactions')
  );
};

const applyVoucherForSaleOrder = async ({
  voucherCode,
  user,
  items,
  subtotal,
}) => {
  const normalizedVoucherCode = normalizeVoucherCode(voucherCode);

  if (!normalizedVoucherCode) {
    return {
      voucher: null,
      voucherCode: null,
      discountAmount: 0,
      finalSubtotal: subtotal,
      voucherSnapshot: null,
    };
  }

  const voucherResult = await validateVoucher({
    code: normalizedVoucherCode,
    user,
    cartItems: items,
    subtotal,
    orderType: 'sale',
  });

  if (!voucherResult.valid) {
    return {
      error: voucherResult,
    };
  }

  const voucher = await getVoucherByCode(normalizedVoucherCode);
  if (!voucher) {
    return {
      error: { valid: false, reason: 'VOUCHER_NOT_FOUND' },
    };
  }

  return {
    voucher,
    voucherCode: voucher.code,
    discountAmount: Number(voucherResult.discountAmount || 0),
    finalSubtotal: Number(voucherResult.finalTotal || 0),
    voucherSnapshot: buildVoucherSnapshot({
      voucher,
      originalSubtotal: subtotal,
      finalSubtotal: Number(voucherResult.finalTotal || 0),
    }),
  };
};

const attachSaleOrderItems = async (orders = []) => {
  const orderIds = orders.map((order) => order?._id).filter(Boolean);
  if (orderIds.length === 0) return [];

  const items = await SaleOrderItem.find({ orderId: { $in: orderIds } })
    .populate('productId', 'name images baseSalePrice')
    .lean();

  const groupedItems = items.reduce((acc, item) => {
    const key = String(item.orderId);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return orders.map((order) => ({
    ...order.toObject(),
    items: groupedItems[String(order._id)] || [],
  }));
};

const attachReviewStatesForCustomer = async (orders = [], customerId = '') => {
  if (!Array.isArray(orders) || orders.length === 0 || !customerId) return orders;

  const orderIds = orders.map((order) => order?._id).filter(Boolean);
  const reviewMap = await getReviewedMapForOrders({
    userId: customerId,
    orderIds,
  });

  return orders.map((order) => {
    const canReviewByStatus = REVIEWABLE_SALE_STATUSES.has(String(order?.status || ''));
    const nextItems = Array.isArray(order?.items) ? order.items.map((item) => {
      const key = `${String(order?._id)}::${String(item?.productId?._id || item?.productId)}`;
      const matchedReview = reviewMap.get(key);

      if (matchedReview) {
        return {
          ...item,
          review: {
            isReviewed: true,
            canReview: false,
            reviewId: matchedReview._id,
            rating: matchedReview.rating,
            comment: matchedReview.comment || '',
            images: Array.isArray(matchedReview.images) ? matchedReview.images : [],
            createdAt: matchedReview.createdAt || null,
          },
        };
      }

      return {
        ...item,
        review: {
          isReviewed: false,
          canReview: canReviewByStatus,
          reviewId: null,
          reason: canReviewByStatus ? '' : 'Chỉ có thể đánh giá sau khi đơn hàng đã giao thành công',
        },
      };
    }) : [];

    return {
      ...order,
      items: nextItems,
    };
  });
};

const getProductDisplayName = (product = {}) => {
  if (typeof product?.name === 'string') return product.name;
  if (product?.name && typeof product.name === 'object') {
    return String(product.name.vi || product.name.en || '').trim();
  }
  return '';
};

const buildGuestOrderViewUrl = (saleOrder = {}) => {
  const orderId = String(saleOrder?._id || '').trim();
  if (!orderId) return `${frontendUrl}/cart`;

  const token = signGuestOrderViewToken({
    orderId,
    guestVerificationId: saleOrder?.guestVerificationId ? String(saleOrder.guestVerificationId) : '',
    guestEmail: String(saleOrder?.guestEmail || '').trim().toLowerCase(),
  });

  return `${frontendUrl}/orders/guest/${orderId}?token=${encodeURIComponent(token)}`;
};

const buildOrderEmailPayload = ({ saleOrder, items, customer }) => {
  const isGuestOrder = !saleOrder?.customerId;
  const orderUrl = isGuestOrder
    ? buildGuestOrderViewUrl(saleOrder)
    : `${frontendUrl}/orders/${saleOrder?._id}`;

  return {
    _id: saleOrder?._id,
    createdAt: saleOrder?.createdAt,
    status: saleOrder?.status,
    paymentMethod: saleOrder?.paymentMethod,
    totalAmount: saleOrder?.totalAmount,
    customer: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
    },
    items: (items || []).map((item) => ({
      productName: getProductDisplayName(item.productId) || 'Sản phẩm',
      size: [item.size, item.color].filter(Boolean).join(' / '),
      quantity: item.quantity || 1,
      price: item.unitPrice || 0,
      image: item.productId?.images?.[0] || '',
    })),
    orderUrl,
  };
};

const getGuestOrderViewTokenFromRequest = (req) => {
  const queryToken = String(req?.query?.token || '').trim();
  if (queryToken) return queryToken;
  return extractBearerToken(req?.headers?.authorization);
};

const sendOrderConfirmationEmailSafely = async ({ saleOrder, customer }) => {
  try {
    const orderItems = await SaleOrderItem.find({ orderId: saleOrder._id })
      .populate('productId', 'name images')
      .lean();

    const emailPayload = buildOrderEmailPayload({
      saleOrder,
      items: orderItems,
      customer,
    });

    await sendOrderConfirmationEmail(emailPayload);
  } catch (mailError) {
    console.error('Order confirmation email error:', mailError);
  }
};

exports.guestCheckout = async (req, res) => {
  let idempotencyKey = null;

  try {
    const {
      verificationToken,
      name = '',
      phone = '',
      email = '',
      address = '',
      paymentMethod = 'COD',
      note = '',
      items = [],
      shippingFee = 0,
      voucherCode = '',
    } = req.body || {};
    idempotencyKey = normalizeIdempotencyKey(req);

    if (!verificationToken) {
      return res.status(400).json({ success: false, message: 'Thiếu token xác minh guest.' });
    }

    const existingOrder = await findSaleOrderByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      if (existingOrder.voucherId || existingOrder.voucherCode) {
        await repairVoucherUsageCounterIfNeeded({
          voucherId: existingOrder.voucherId,
          voucherCode: existingOrder.voucherCode,
        });
      }
      return res.status(200).json(buildCheckoutSuccessResponse(existingOrder));
    }

    let tokenPayload;
    try {
      tokenPayload = verifyGuestVerificationToken(verificationToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Token xác minh guest không hợp lệ hoặc đã hết hạn.' });
    }

    const verification = await GuestVerification.findById(tokenPayload.verificationId);

    // Nếu token đã bị consumed, kiểm tra xem đơn hàng từ session đó có đang ở trạng thái
    // Failed hoặc PendingPayment không (user muốn thử lại sau khi thanh toán online thất bại).
    if (verification?.consumedAt) {
      const retryableOrder = await SaleOrder.findOne({
        guestVerificationId: verification._id,
        status: { $in: ['Failed', 'PendingPayment'] },
      }).lean();
      if (!retryableOrder) {
        return res.status(401).json({ success: false, message: 'Phiên xác minh guest không hợp lệ.' });
      }
      // Cho phép retry — reset consumedAt để checkout lại
      verification.consumedAt = null;
      await verification.save();
    }

    if (
      !verification ||
      !verification.verified ||
      verification.method !== tokenPayload.method
    ) {
      return res.status(401).json({ success: false, message: 'Phiên xác minh guest không hợp lệ.' });
    }

    if (!verification.expiresAt || new Date(verification.expiresAt) <= new Date()) {
      return res.status(401).json({ success: false, message: 'Phiên xác minh guest đã hết hạn.' });
    }

    if (verification.method !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'Đơn mua chưa đăng nhập chỉ hỗ trợ xác minh bằng email.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng mua đang trống.' });
    }

    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = String(address || '').trim();

    if (!normalizedName || !normalizedAddress || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên, email và địa chỉ nhận hàng.' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại nhận hàng không hợp lệ.' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email nhận hàng không hợp lệ.' });
    }

    const verifiedEmail = normalizeEmail(verification.email || normalizedEmail);
    if (!isValidEmail(verifiedEmail)) {
      return res.status(400).json({ success: false, message: 'Email xác minh không hợp lệ.' });
    }

    if (verifiedEmail !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email thanh toán phải trùng với email đã xác minh.',
      });
    }

    // CHANGED: use unique product ids to avoid false invalid-product errors for same product with different conditions.
    const uniqueProductIds = getUniqueProductIds(items);
    const products = await Product.find({ _id: { $in: uniqueProductIds }, isDraft: { $ne: true } }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== uniqueProductIds.length) {
      return res.status(400).json({ success: false, message: 'Có sản phẩm không hợp lệ hoặc đã ngừng bán.' });
    }

    const normalizedItems = buildNormalizedSaleItems(items, productMap);
    await ensureSaleStockAvailable(normalizedItems);

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // If a voucher is used in guest flow, attach a stable guest user id so per-user limits can be enforced.
    const normalizedVoucherCode = normalizeVoucherCode(voucherCode);
    const guestUser = normalizedVoucherCode
      ? await findOrCreateGuestCustomer({ email: verifiedEmail, name: normalizedName, phone: normalizedPhone })
      : null;
    const voucherApplication = await applyVoucherForSaleOrder({
      voucherCode,
      user: guestUser ? { id: guestUser._id, role: 'customer' } : null,
      items,
      subtotal,
    });
    if (voucherApplication.error) {
      return res.status(400).json(voucherApplication.error);
    }

    const normalizedShippingFee = 0;
    const totalAmount = voucherApplication.finalSubtotal;

    const saleOrder = await runSaleCheckoutTransaction({
      createOrderPayload: {
        customerId: guestUser?._id || null,
        paymentMethod,
        totalAmount,
        shippingFee: normalizedShippingFee,
        shippingAddress: normalizedAddress,
        shippingPhone: normalizedPhone,
        guestName: normalizedName,
        guestEmail: verifiedEmail,
        guestVerificationMethod: verification.method,
        guestVerificationId: verification._id,
        note,
        items: normalizedItems,
        idempotencyKey,
        voucherCode: voucherApplication.voucherCode,
        voucherId: voucherApplication.voucher?._id || null,
        voucherSnapshot: voucherApplication.voucherSnapshot,
        discountAmount: voucherApplication.discountAmount,
      },
      voucherId: voucherApplication.voucher?._id || null,
    });

    // Chỉ consume token ngay với COD (không cần xác nhận thanh toán).
    // Với online payment (PayOS/PayPal), giữ token để user có thể thử lại nếu cổng thanh toán thất bại.
    const normalizedPaymentMethodForToken = normalizePaymentMethod(paymentMethod);
    if (normalizedPaymentMethodForToken !== 'Online') {
      verification.consumedAt = new Date();
      await verification.save();
    }

    await sendOrderConfirmationEmailSafely({
      saleOrder,
      customer: {
        name: normalizedName,
        email: verifiedEmail,
        phone: normalizedPhone,
        address: normalizedAddress,
      },
    });
    await Promise.allSettled([
      notifySaleOrderCreated(saleOrder),
      notifyLowStockForProducts(uniqueProductIds),
    ]);

    // Trigger tạo hóa đơn + gửi email (non-blocking)
    // Chỉ trigger ngay cho COD; Online sẽ được trigger từ confirmSalePayment sau khi capture
    const guestPaymentMethod = normalizePaymentMethod(paymentMethod);
    if (guestPaymentMethod !== 'Online') {
      setImmediate(() => runPostPaymentInvoiceFlow(String(saleOrder._id)).catch(() => {}));
    }

    return res.status(201).json(buildCheckoutSuccessResponse(saleOrder));
  } catch (error) {
    if (idempotencyKey && isDuplicateIdempotencyError(error)) {
      const existingOrder = await findSaleOrderByIdempotencyKey(idempotencyKey);
      if (existingOrder) {
        if (existingOrder.voucherId || existingOrder.voucherCode) {
          await repairVoucherUsageCounterIfNeeded({
            voucherId: existingOrder.voucherId,
            voucherCode: existingOrder.voucherCode,
          });
        }
        return res.status(200).json(buildCheckoutSuccessResponse(existingOrder));
      }
    }

    console.error('Guest checkout error:', error);
    const message = error.message === 'INVALID_PRODUCT_DATA'
      ? 'Không thể xác thực dữ liệu sản phẩm trong giỏ hàng.'
      : error.message === 'OUT_OF_STOCK'
        ? 'Có sản phẩm đã hết hàng hoặc không đủ số lượng để mua.'
        : 'Không thể tạo đơn mua guest lúc này.';

    const statusCode = (error.message === 'INVALID_PRODUCT_DATA' || error.message === 'OUT_OF_STOCK') ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

exports.checkout = async (req, res) => {
  let idempotencyKey = null;

  try {
    const customerId = req.user?.id;
    const {
      name = '',
      phone = '',
      email = '',
      address = '',
      paymentMethod = 'COD',
      note = '',
      items = [],
      shippingFee = 0,
      voucherCode = '',
    } = req.body || {};
    idempotencyKey = normalizeIdempotencyKey(req);

    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const existingOrder = await findSaleOrderByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      if (existingOrder.voucherId || existingOrder.voucherCode) {
        await repairVoucherUsageCounterIfNeeded({
          voucherId: existingOrder.voucherId,
          voucherCode: existingOrder.voucherCode,
        });
      }
      return res.status(200).json(buildCheckoutSuccessResponse(existingOrder));
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng mua đang trống.' });
    }

    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = String(address || '').trim();

    if (!normalizedName || !normalizedAddress || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên, email và địa chỉ nhận hàng.' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại nhận hàng không hợp lệ.' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email nhận hàng không hợp lệ.' });
    }

    // CHANGED: use unique product ids to avoid false invalid-product errors for same product with different conditions.
    const uniqueProductIds = getUniqueProductIds(items);
    const products = await Product.find({ _id: { $in: uniqueProductIds }, isDraft: { $ne: true } }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== uniqueProductIds.length) {
      return res.status(400).json({ success: false, message: 'Có sản phẩm không hợp lệ hoặc đã ngừng bán.' });
    }

    const normalizedItems = buildNormalizedSaleItems(items, productMap);
    await ensureSaleStockAvailable(normalizedItems);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const voucherApplication = await applyVoucherForSaleOrder({
      voucherCode,
      user: req.user,
      items,
      subtotal,
    });
    if (voucherApplication.error) {
      return res.status(400).json(voucherApplication.error);
    }

    const normalizedShippingFee = 0;
    const totalAmount = voucherApplication.finalSubtotal;

    const saleOrder = await runSaleCheckoutTransaction({
      createOrderPayload: {
        customerId,
        paymentMethod,
        totalAmount,
        shippingFee: normalizedShippingFee,
        shippingAddress: normalizedAddress,
        shippingPhone: normalizedPhone,
        guestName: normalizedName,
        guestEmail: normalizedEmail,
        guestVerificationMethod: null,
        guestVerificationId: null,
        note,
        items: normalizedItems,
        idempotencyKey,
        voucherCode: voucherApplication.voucherCode,
        voucherId: voucherApplication.voucher?._id || null,
        voucherSnapshot: voucherApplication.voucherSnapshot,
        discountAmount: voucherApplication.discountAmount,
      },
      voucherId: voucherApplication.voucher?._id || null,
    });

    await sendOrderConfirmationEmailSafely({
      saleOrder,
      customer: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        address: normalizedAddress,
      },
    });
    await Promise.allSettled([
      notifySaleOrderCreated(saleOrder),
      notifyLowStockForProducts(uniqueProductIds),
    ]);

    // Trigger tạo hóa đơn + gửi email tự động (non-blocking)
    // CHỈ trigger cho COD — Online sẽ được trigger trong confirmSalePayment sau khi capture thành công,
    // tránh gửi email 2 lần cho cùng một đơn.
    const checkoutPaymentMethod = normalizePaymentMethod(paymentMethod);
    if (checkoutPaymentMethod !== 'Online') {
      setImmediate(() => runPostPaymentInvoiceFlow(String(saleOrder._id)).catch(() => {}));
    }

    return res.status(201).json(buildCheckoutSuccessResponse(saleOrder));
  } catch (error) {
    if (idempotencyKey && isDuplicateIdempotencyError(error)) {
      const existingOrder = await findSaleOrderByIdempotencyKey(idempotencyKey);
      if (existingOrder) {
        if (existingOrder.voucherId || existingOrder.voucherCode) {
          await repairVoucherUsageCounterIfNeeded({
            voucherId: existingOrder.voucherId,
            voucherCode: existingOrder.voucherCode,
          });
        }
        return res.status(200).json(buildCheckoutSuccessResponse(existingOrder));
      }
    }

    console.error('Checkout error:', error);
    const message = error.message === 'INVALID_PRODUCT_DATA'
      ? 'Không thể xác thực dữ liệu sản phẩm trong giỏ hàng.'
      : error.message === 'OUT_OF_STOCK'
        ? 'Có sản phẩm đã hết hàng hoặc không đủ số lượng để mua.'
        : 'Không thể tạo đơn mua lúc này.';

    const statusCode = (error.message === 'INVALID_PRODUCT_DATA' || error.message === 'OUT_OF_STOCK') ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

exports.getOwnerSaleOrders = async (req, res) => {
  try {
    const {
      status,
      keyword = '',
      page = 1,
      limit = 20,
    } = req.query;

    const normalizedStatus = normalizeSaleOrderStatusInput(status);
    const normalizedKeyword = String(keyword || '').trim();
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const query = { orderType: ORDER_TYPE.BUY };
    if (normalizedStatus && SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      query.status = normalizedStatus;
    }

    const skip = (currentPage - 1) * pageSize;
    const [orders, total] = await Promise.all([
      SaleOrder.find(query)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email')
        .populate('history.updatedBy', 'name email')
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(pageSize),
      SaleOrder.countDocuments(query),
    ]);

    let data = await attachSaleOrderItems(orders);

    if (normalizedKeyword) {
      const loweredKeyword = normalizedKeyword.toLowerCase();
      data = data.filter((order) => {
        const customerName = String(order.customerId?.name || order.guestName || '').toLowerCase();
        const customerPhone = String(order.shippingPhone || order.customerId?.phone || '').toLowerCase();
        const orderId = String(order._id || '').toLowerCase();
        const itemNames = Array.isArray(order.items)
          ? order.items.map((item) => String(item.productId?.name || '')).join(' ').toLowerCase()
          : '';

        return (
          customerName.includes(loweredKeyword) ||
          customerPhone.includes(loweredKeyword) ||
          orderId.includes(loweredKeyword) ||
          itemNames.includes(loweredKeyword)
        );
      });
    }

    const mappedData = data.map((order) => mapSaleOrderForOwner(order, { customerFacing: false }));

    const statusOrder = Object.keys(SALE_ORDER_TRANSITIONS);
    const statusSet = new Set(
      (await SaleOrder.distinct('status', { orderType: ORDER_TYPE.BUY }))
        .map((item) => normalizeSaleOrderStatusInput(item))
        .filter((item) => item && SALE_ORDER_ALLOWED_STATUSES.has(item))
    );
    const statusOptions = statusOrder
      .filter((statusKey) => statusSet.has(statusKey))
      .map((statusKey) => ({
        value: statusKey,
        label: getSaleStatusMeta(statusKey).label,
        badgeClass: getSaleStatusMeta(statusKey).badgeClass,
      }));

    return res.json({
      success: true,
      data: mappedData,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: normalizedKeyword ? data.length : total,
        pages: Math.max(Math.ceil((normalizedKeyword ? data.length : total) / pageSize), 1),
      },
      meta: {
        statusOptions,
      },
    });
  } catch (error) {
    console.error('Get owner sale orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách đơn mua lúc này.',
    });
  }
};

exports.getMySaleOrders = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const { status = '' } = req.query || {};

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const normalizedStatus = normalizeSaleOrderStatusInput(status);
    const query = {
      customerId,
      orderType: ORDER_TYPE.BUY,
    };

    if (normalizedStatus && SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      query.status = normalizedStatus;
    }

    const orders = await SaleOrder.find(query)
      .populate('history.updatedBy', 'name email')
      .sort({ createdAt: -1 });

    const attachedOrders = await attachSaleOrderItems(orders);
    const ordersWithReviewState = await attachReviewStatesForCustomer(attachedOrders, customerId);
    // #region agent log
    fetch('http://127.0.0.1:7425/ingest/cae20d9c-252c-4f1d-b775-43cdb8f5040c', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '23dab3' }, body: JSON.stringify({ sessionId: '23dab3', runId: 'order-status-sync', hypothesisId: 'H3', location: 'BE/controllers/order.controller.js:getMySaleOrders', message: 'Customer orders payload snapshot', data: { customerId: String(customerId || ''), count: ordersWithReviewState.length, statuses: ordersWithReviewState.map((o) => ({ id: String(o?._id || ''), status: String(o?.status || ''), userStatus: String(o?.userStatus || '') })) }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion

    return res.json({
      success: true,
      data: ordersWithReviewState.map((order) => mapSaleOrderForOwner(order, { customerFacing: true })),
    });
  } catch (error) {
    console.error('Get my sale orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy lịch sử đơn mua lúc này.',
    });
  }
};

exports.getMySaleOrderById = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const { id } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const order = await SaleOrder.findOne({
      _id: id,
      customerId,
      orderType: ORDER_TYPE.BUY,
    })
      .populate('customerId', 'name phone email')
      .populate('staffId', 'name phone email')
      .populate('history.updatedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn mua.',
      });
    }

    const [attachedOrder] = await attachSaleOrderItems([order]);
    const [orderWithReviewState] = await attachReviewStatesForCustomer([attachedOrder], customerId);

    return res.json({
      success: true,
      data: mapSaleOrderForOwner(orderWithReviewState, { customerFacing: true }),
    });
  } catch (error) {
    console.error('Get my sale order detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy chi tiết đơn mua lúc này.',
    });
  }
};

exports.getGuestSaleOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const guestOrderViewToken = getGuestOrderViewTokenFromRequest(req);

    if (!guestOrderViewToken) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu token xem đơn hàng guest.',
      });
    }

    let payload;
    try {
      payload = verifyGuestOrderViewToken(guestOrderViewToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token xem đơn hàng không hợp lệ hoặc đã hết hạn.',
      });
    }

    if (String(payload?.orderId || '') !== String(id || '')) {
      return res.status(403).json({
        success: false,
        message: 'Token không khớp với đơn hàng.',
      });
    }

    const order = await SaleOrder.findOne({
      _id: id,
      customerId: null,
      orderType: ORDER_TYPE.BUY,
    })
      .populate('staffId', 'name phone email')
      .populate('history.updatedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn mua guest.',
      });
    }

    if (payload?.guestVerificationId && String(order?.guestVerificationId || '') !== String(payload.guestVerificationId)) {
      return res.status(403).json({
        success: false,
        message: 'Token không hợp lệ cho đơn hàng này.',
      });
    }

    const payloadEmail = String(payload?.guestEmail || '').trim().toLowerCase();
    const orderEmail = String(order?.guestEmail || '').trim().toLowerCase();
    if (payloadEmail && orderEmail && payloadEmail !== orderEmail) {
      return res.status(403).json({
        success: false,
        message: 'Token không hợp lệ cho đơn hàng này.',
      });
    }

    const [attachedOrder] = await attachSaleOrderItems([order]);

    return res.json({
      success: true,
      data: mapSaleOrderForOwner(attachedOrder, { customerFacing: true }),
    });
  } catch (error) {
    console.error('Get guest sale order detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy chi tiết đơn mua guest lúc này.',
    });
  }
};

exports.cancelMySaleOrder = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const { id } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const order = await SaleOrder.findOne({
      _id: id,
      customerId,
      orderType: ORDER_TYPE.BUY,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn mua.',
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã ở trạng thái này.',
      });
    }

    if (!['PendingPayment', 'PendingConfirmation'].includes(String(order.status || ''))) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn ở trạng thái "${order.status}".`,
      });
    }

    await releaseSaleOrderInstances(order._id);

    order.status = 'Cancelled';
    order.userStatus = resolveSaleOrderUserStatus('Cancelled', order.userStatus);
    order.history = Array.isArray(order.history) ? order.history : [];
    order.history.push({
      status: 'Cancelled',
      action: 'customer_cancel',
      description: 'Khách hàng đã hủy đơn',
      updatedBy: customerId,
      updatedAt: new Date(),
    });
    await order.save();
    await notifySaleOrderCancelled(order, 'customer_cancel');
    const [populated] = await attachSaleOrderItems([
      await SaleOrder.findById(id)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email')
        .populate('history.updatedBy', 'name email'),
    ]);

    return res.json({
      success: true,
      message: 'Hủy đơn thành công.',
      data: mapSaleOrderForOwner(populated, { customerFacing: true }),
    });
  } catch (error) {
    console.error('Cancel my sale order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể hủy đơn mua lúc này.',
    });
  }
};

exports.updateOwnerSaleOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const normalizedStatus = normalizeSaleOrderStatusInput(status);

    if (!SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn mua không hợp lệ.',
      });
    }

    const order = await SaleOrder.findById(id);
    // #region agent log
    fetch('http://127.0.0.1:7425/ingest/cae20d9c-252c-4f1d-b775-43cdb8f5040c', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '23dab3' }, body: JSON.stringify({ sessionId: '23dab3', runId: 'order-status-sync', hypothesisId: 'H1', location: 'BE/controllers/order.controller.js:updateOwnerSaleOrderStatus:before', message: 'Staff update status request', data: { orderId: String(id || ''), requestedStatus: String(status || ''), normalizedStatus: String(normalizedStatus || ''), currentStatus: String(order?.status || ''), currentUserStatus: String(order?.userStatus || ''), actorRole: String(req?.user?.role || '') }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion
    if (!order || order.orderType !== ORDER_TYPE.BUY) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn mua.',
      });
    }

    if (order.status === normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã ở trạng thái này.',
      });
    }

    const allowedNextStatuses = SALE_ORDER_TRANSITIONS[order.status] || [];
    if (!allowedNextStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ ${order.status} sang ${normalizedStatus}.`,
        allowedNextStatuses,
      });
    }

    if (normalizedStatus === 'Cancelled') {
      await releaseSaleOrderInstances(order._id);
    }

    if (isRefundedSaleStatus(normalizedStatus)) {
      order.status = 'Refunded';
      order.userStatus = 'RETURNED';
    } else {
      order.status = normalizedStatus;
      order.userStatus = resolveSaleOrderUserStatus(normalizedStatus, order.userStatus);
    }
    if (!order.staffId) {
      order.staffId = req.user?.id || null;
    }
    order.history = Array.isArray(order.history) ? order.history : [];
    const actorRole = String(req.user?.role || '').trim().toLowerCase();
    if (isRefundedSaleStatus(normalizedStatus)) {
      const refundedLabel = getSaleStatusMeta('Refunded').label;
      order.history.push({
        status: 'Refunded',
        action: actorRole === 'staff' ? 'staff_update_status' : 'owner_update_status',
        description: `Đơn hàng ${refundedLabel.toLowerCase()} và đã được đánh dấu trả hàng`,
        updatedBy: req.user?.id || null,
        updatedAt: new Date(),
      });
    } else {
      const statusLabel = getSaleStatusMeta(normalizedStatus).label;
      order.history.push({
        status: normalizedStatus,
        action: actorRole === 'staff' ? 'staff_update_status' : 'owner_update_status',
        description: `Cập nhật trạng thái sang ${statusLabel}`,
        updatedBy: req.user?.id || null,
        updatedAt: new Date(),
      });
    }
    await order.save();
    // #region agent log
    fetch('http://127.0.0.1:7425/ingest/cae20d9c-252c-4f1d-b775-43cdb8f5040c', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '23dab3' }, body: JSON.stringify({ sessionId: '23dab3', runId: 'order-status-sync', hypothesisId: 'H1', location: 'BE/controllers/order.controller.js:updateOwnerSaleOrderStatus:afterSave', message: 'Staff update status persisted', data: { orderId: String(order?._id || ''), savedStatus: String(order?.status || ''), savedUserStatus: String(order?.userStatus || ''), historyCount: Array.isArray(order?.history) ? order.history.length : 0, lastHistoryStatus: String(order?.history?.[order.history.length - 1]?.status || ''), lastHistoryAction: String(order?.history?.[order.history.length - 1]?.action || '') }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion
    if (normalizedStatus === 'Cancelled') {
      await notifySaleOrderCancelled(order, 'owner_or_staff_cancel');
    }
    const [populated] = await attachSaleOrderItems([
      await SaleOrder.findById(id)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email')
        .populate('history.updatedBy', 'name email'),
    ]);

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn mua thành công.',
      data: mapSaleOrderForOwner(populated),
    });
  } catch (error) {
    console.error('Update sale order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái đơn mua lúc này.',
    });
  }
};



