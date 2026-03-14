const Product = require('../model/Product.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const GuestVerification = require('../model/GuestVerification.model');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const { verifyGuestVerificationToken } = require('../utils/jwt');

const SALE_ORDER_ALLOWED_STATUSES = new Set([
  'Draft',
  'PendingPayment',
  'PendingConfirmation',
  'Paid',
  'Confirmed',
  'Shipping',
  'Completed',
  'Cancelled',
  'Returned',
  'Unpaid',
  'Failed',
  'Refunded',
]);

const normalizePaymentMethod = (value = '') => {
  if (value === 'BankTransfer') return 'BankTransfer';
  if (value === 'Online') return 'Online';
  return 'COD';
};

const buildNormalizedSaleItems = (items = [], productMap = new Map()) => {
  return items.map((item) => {
    const product = productMap.get(String(item.productId));
    const quantity = Math.max(Number(item.quantity || 1), 1);
    const unitPrice = Number(product?.baseSalePrice || item.salePrice || 0);

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
}) => {
  const saleOrder = await SaleOrder.create({
    customerId,
    staffId: null,
    status: 'PendingConfirmation',
    paymentMethod: normalizePaymentMethod(paymentMethod),
    totalAmount,
    shippingFee,
    shippingAddress,
    shippingPhone,
    orderType: 'Buy',
    guestName,
    guestEmail,
    guestVerificationMethod,
    guestVerificationId,
    discountAmount: 0,
  });

  await SaleOrderItem.insertMany(
    items.map((item) => ({
      orderId: saleOrder._id,
      productId: item.productId,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      note: note ? `${item.note}${item.note ? ' | ' : ''}${note}` : item.note,
    }))
  );

  return saleOrder;
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

exports.guestCheckout = async (req, res) => {
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
    } = req.body || {};

    if (!verificationToken) {
      return res.status(400).json({ success: false, message: 'Thieu token xac minh guest.' });
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

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const normalizedShippingFee = Math.max(Number(shippingFee || 0), 0);
    const totalAmount = subtotal + normalizedShippingFee;

    const saleOrder = await createSaleOrderWithItems({
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
    });

    verification.consumedAt = new Date();
    await verification.save();

    return res.status(201).json({
      success: true,
      data: {
        orderId: saleOrder._id,
        orderType: saleOrder.orderType,
        status: saleOrder.status,
        totalAmount: saleOrder.totalAmount,
      },
    });
  } catch (error) {
    console.error('Guest checkout error:', error);
    const message = error.message === 'INVALID_PRODUCT_DATA'
      ? 'Khong the xac thuc du lieu san pham trong gio hang.'
      : 'Khong the tao don mua guest luc nay.';

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

exports.checkout = async (req, res) => {
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
    } = req.body || {};

    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
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
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const normalizedShippingFee = Math.max(Number(shippingFee || 0), 0);
    const totalAmount = subtotal + normalizedShippingFee;

    const saleOrder = await createSaleOrderWithItems({
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
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: saleOrder._id,
        orderType: saleOrder.orderType,
        status: saleOrder.status,
        totalAmount: saleOrder.totalAmount,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error.message === 'INVALID_PRODUCT_DATA'
      ? 'Khong the xac thuc du lieu san pham trong gio hang.'
      : 'Khong the tao don mua luc nay.';

    return res.status(500).json({
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

    return res.json({
      success: true,
      data,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: normalizedKeyword ? data.length : total,
        pages: Math.max(Math.ceil((normalizedKeyword ? data.length : total) / pageSize), 1),
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

    order.status = normalizedStatus;
    if (!order.staffId) {
      order.staffId = req.user?.id || null;
    }
    await order.save();

    const [detail] = await attachSaleOrderItems([
      await SaleOrder.findById(id)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone email'),
    ]);

    return res.json({
      success: true,
      message: 'Cap nhat trang thai don mua thanh cong.',
      data: detail,
    });
  } catch (error) {
    console.error('Update sale order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the cap nhat trang thai don mua luc nay.',
    });
  }
};
