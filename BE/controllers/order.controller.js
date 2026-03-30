const mongoose = require('mongoose');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const GuestVerification = require('../model/GuestVerification.model');
const Voucher = require('../model/Voucher.model');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const { normalizeIdempotencyKey, isDuplicateIdempotencyError } = require('../utils/idempotency');
const { verifyGuestVerificationToken } = require('../utils/jwt');
const { sendOrderConfirmationEmail } = require('../services/mailService');
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

const normalizePaymentMethod = (value = '') => {
  if (value === 'BankTransfer') return 'BankTransfer';
  if (value === 'Online' || value === 'PayOS') return 'Online';
  return 'COD';
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

const normalizeHistory = (order) => {
  const source = Array.isArray(order?.history) && order.history.length > 0
    ? order.history
    : buildFallbackHistory(order);

  return source
    .map((item) => {
      const status = String(item?.status || order?.status || '').trim();
      const statusMeta = getSaleStatusMeta(status);
      return {
        status,
        statusLabel: statusMeta.label,
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

const mapSaleOrderForOwner = (order) => {
  const statusMeta = getSaleStatusMeta(order?.status);
  return {
    ...order,
    statusLabel: statusMeta.label,
    statusBadgeClass: statusMeta.badgeClass,
    availableNextStatuses: SALE_ORDER_TRANSITIONS[order?.status] || [],
    history: normalizeHistory(order),
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
    };
  });
};

const ensureSaleStockAvailable = async (normalizedItems = []) => {
  const requestedByProduct = normalizedItems.reduce((acc, item) => {
    const key = String(item.productId);
    acc[key] = (acc[key] || 0) + Number(item.quantity || 0);
    return acc;
  }, {});

  const productIds = Object.keys(requestedByProduct);
  if (productIds.length === 0) return;

  const availableRows = await ProductInstance.aggregate([
    {
      $match: {
        productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
        lifecycleStatus: 'Available',
        conditionScore: 100,
      },
    },
    {
      $group: {
        _id: '$productId',
        count: { $sum: 1 },
      },
    },
  ]);

  const availableByProduct = availableRows.reduce((acc, row) => {
    acc[String(row._id)] = Number(row.count || 0);
    return acc;
  }, {});

  const outOfStockProductId = productIds.find((productId) => {
    const requested = Number(requestedByProduct[productId] || 0);
    const available = Number(availableByProduct[productId] || 0);
    return requested > available;
  });

  if (outOfStockProductId) {
    throw new Error('OUT_OF_STOCK');
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
    paymentMethod: normalizedMethod,
    totalAmount,
    shippingFee,
    shippingAddress,
    shippingPhone,
    orderType: 'Buy',
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
        status: 'PendingConfirmation',
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
    totalAmount: saleOrder.totalAmount,
  },
});

const findSaleOrderByIdempotencyKey = async (idempotencyKey) => {
  if (!idempotencyKey) return null;
  return SaleOrder.findOne({ idempotencyKey }).sort({ createdAt: -1 });
};

const runSaleCheckoutTransaction = async ({
  createOrderPayload,
  voucherId = null,
}) => {
  const runWithoutTransaction = async () => {
    const saleOrder = await createSaleOrderWithItems(createOrderPayload);

    if (voucherId) {
      await Voucher.findByIdAndUpdate(voucherId, {
        $inc: { usedCount: 1 },
      });
    }

    return saleOrder;
  };

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Keep order creation, order items, and voucher usage update in one transaction
    // so either all of them succeed or all of them roll back together.
    const saleOrder = await createSaleOrderWithItems({
      ...createOrderPayload,
      session,
    });

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
      console.warn('MongoDB transactions are not supported in this environment. Falling back to non-transaction sale checkout.');
      return runWithoutTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const isTransactionNotSupportedError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();
  const codeName = String(error?.codeName || '').toLowerCase();

  return (
    message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are not supported') ||
    message.includes('cannot use transactions') ||
    message.includes('replica set') ||
    message.includes('mongos') ||
    name.includes('mongoservererror') ||
    codeName.includes('illegaloperation')
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

const buildOrderEmailPayload = ({ saleOrder, items, customer }) => {
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const orderUrl = `${frontendUrl}/cart`;

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
      return res.status(400).json({ success: false, message: 'Thieu token xac minh guest.' });
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
      return res.status(401).json({ success: false, message: 'Token xac minh guest khong hop le hoac da het han.' });
    }

    const verification = await GuestVerification.findById(tokenPayload.verificationId);
    if (
      !verification ||
      !verification.verified ||
      verification.consumedAt ||
      verification.method !== tokenPayload.method
    ) {
      return res.status(401).json({ success: false, message: 'Phien xac minh guest khong hop le.' });
    }

    if (!verification.expiresAt || new Date(verification.expiresAt) <= new Date()) {
      return res.status(401).json({ success: false, message: 'Phien xac minh guest da het han.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Gio hang mua dang trong.' });
    }

    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = String(address || '').trim();

    if (!normalizedName || !normalizedAddress || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Vui long nhap day du ten, email va dia chi nhan hang.' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'So dien thoai nhan hang khong hop le.' });
    }

    if (!isValidEmail(verification.method === 'email' ? (verification.email || normalizedEmail) : normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email nhan hang khong hop le.' });
    }

    if (verification.method === 'email' && !isValidEmail(verification.email || normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email xac minh khong hop le.' });
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isDraft: { $ne: true } }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== productIds.length) {
      return res.status(400).json({ success: false, message: 'Co san pham khong hop le hoac da ngung ban.' });
    }

    const normalizedItems = buildNormalizedSaleItems(items, productMap);
    await ensureSaleStockAvailable(normalizedItems);

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const voucherApplication = await applyVoucherForSaleOrder({
      voucherCode,
      user: null,
      items,
      subtotal,
    });
    if (voucherApplication.error) {
      return res.status(400).json(voucherApplication.error);
    }

    const normalizedShippingFee = Math.max(Number(shippingFee || 0), 0);
    const totalAmount = voucherApplication.finalSubtotal + normalizedShippingFee;

    const saleOrder = await runSaleCheckoutTransaction({
      createOrderPayload: {
      customerId: null,
      paymentMethod,
      totalAmount,
      shippingFee: normalizedShippingFee,
      shippingAddress: normalizedAddress,
      shippingPhone: normalizedPhone,
      guestName: normalizedName,
      guestEmail: verification.method === 'email' ? (verification.email || normalizedEmail) : normalizedEmail,
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

    verification.consumedAt = new Date();
    await verification.save();

    await sendOrderConfirmationEmailSafely({
      saleOrder,
      customer: {
        name: normalizedName,
        email: verification.method === 'email' ? (verification.email || normalizedEmail) : normalizedEmail,
        phone: normalizedPhone,
        address: normalizedAddress,
      },
    });

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
      ? 'Khong the xac thuc du lieu san pham trong gio hang.'
      : error.message === 'OUT_OF_STOCK'
        ? 'Co san pham da het hang hoac khong du so luong de mua.'
        : 'Khong the tao don mua guest luc nay.';

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
      return res.status(400).json({ success: false, message: 'Gio hang mua dang trong.' });
    }

    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = String(address || '').trim();

    if (!normalizedName || !normalizedAddress || !normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Vui long nhap day du ten, email va dia chi nhan hang.' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'So dien thoai nhan hang khong hop le.' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email nhan hang khong hop le.' });
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isDraft: { $ne: true } }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== productIds.length) {
      return res.status(400).json({ success: false, message: 'Co san pham khong hop le hoac da ngung ban.' });
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

    const normalizedShippingFee = Math.max(Number(shippingFee || 0), 0);
    const totalAmount = voucherApplication.finalSubtotal + normalizedShippingFee;

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
      ? 'Khong the xac thuc du lieu san pham trong gio hang.'
      : error.message === 'OUT_OF_STOCK'
        ? 'Co san pham da het hang hoac khong du so luong de mua.'
        : 'Khong the tao don mua luc nay.';

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

    const normalizedStatus = String(status || '').trim();
    const normalizedKeyword = String(keyword || '').trim();
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const query = { orderType: 'Buy' };
    if (normalizedStatus && SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      query.status = normalizedStatus;
    }

    const skip = (currentPage - 1) * pageSize;
    const [orders, total] = await Promise.all([
      SaleOrder.find(query)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email')
        .populate('history.updatedBy', 'name email')
        .sort({ createdAt: -1 })
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

    const mappedData = data.map((order) => mapSaleOrderForOwner(order));

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
        statusOptions: Object.keys(SALE_ORDER_TRANSITIONS).map((status) => ({
          value: status,
          label: getSaleStatusMeta(status).label,
          badgeClass: getSaleStatusMeta(status).badgeClass,
        })),
      },
    });
  } catch (error) {
    console.error('Get owner sale orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the lay danh sach don mua luc nay.',
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

    const normalizedStatus = String(status || '').trim();
    const query = {
      customerId,
      orderType: 'Buy',
    };

    if (normalizedStatus && SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      query.status = normalizedStatus;
    }

    const orders = await SaleOrder.find(query)
      .populate('history.updatedBy', 'name email')
      .sort({ createdAt: -1 });

    const attachedOrders = await attachSaleOrderItems(orders);
    const ordersWithReviewState = await attachReviewStatesForCustomer(attachedOrders, customerId);

    return res.json({
      success: true,
      data: ordersWithReviewState.map((order) => mapSaleOrderForOwner(order)),
    });
  } catch (error) {
    console.error('Get my sale orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the lay lich su don mua luc nay.',
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
      orderType: 'Buy',
    })
      .populate('customerId', 'name phone email')
      .populate('staffId', 'name phone email')
      .populate('history.updatedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don mua.',
      });
    }

    const [attachedOrder] = await attachSaleOrderItems([order]);
    const [orderWithReviewState] = await attachReviewStatesForCustomer([attachedOrder], customerId);

    return res.json({
      success: true,
      data: mapSaleOrderForOwner(orderWithReviewState),
    });
  } catch (error) {
    console.error('Get my sale order detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the lay chi tiet don mua luc nay.',
    });
  }
};

exports.updateOwnerSaleOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const normalizedStatus = String(status || '').trim();

    if (!SALE_ORDER_ALLOWED_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trang thai don mua khong hop le.',
      });
    }

    const order = await SaleOrder.findById(id);
    if (!order || order.orderType !== 'Buy') {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don mua.',
      });
    }

    if (order.status === normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Don hang da o trang thai nay.',
      });
    }

    const allowedNextStatuses = SALE_ORDER_TRANSITIONS[order.status] || [];
    if (!allowedNextStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Khong the chuyen tu ${order.status} sang ${normalizedStatus}.`,
        allowedNextStatuses,
      });
    }

    order.status = normalizedStatus;
    if (!order.staffId) {
      order.staffId = req.user?.id || null;
    }
    order.history = Array.isArray(order.history) ? order.history : [];
    const actorRole = String(req.user?.role || '').trim().toLowerCase();
    order.history.push({
      status: normalizedStatus,
      action: actorRole === 'staff' ? 'staff_update_status' : 'owner_update_status',
      description: `Cập nhật trạng thái sang ${normalizedStatus}`,
      updatedBy: req.user?.id || null,
      updatedAt: new Date(),
    });
    await order.save();

    const [populated] = await attachSaleOrderItems([
      await SaleOrder.findById(id)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email')
        .populate('history.updatedBy', 'name email'),
    ]);

    return res.json({
      success: true,
      message: 'Cap nhat trang thai don mua thanh cong.',
      data: mapSaleOrderForOwner(populated),
    });
  } catch (error) {
    console.error('Update sale order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the cap nhat trang thai don mua luc nay.',
    });
  }
};
