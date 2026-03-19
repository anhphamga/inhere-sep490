const mongoose = require('mongoose');
const Voucher = require('../model/Voucher.model');
const User = require('../model/User.model');
const SaleOrder = require('../model/SaleOrder.model');
const RentOrder = require('../model/RentOrder.model');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const Category = require('../model/Category.model');

const VALID_SALE_STATUSES = ['Paid', 'Completed'];
const VALID_RENT_STATUSES = ['Completed'];
const ALLOWED_VOUCHER_TYPES = ['percent', 'fixed'];
const ALLOWED_APPLIES_TO = ['both', 'sale', 'rental'];
const ALLOWED_APPLIES_ON = ['subtotal'];

const normalizeVoucherCode = (value = '') => String(value || '').trim().toUpperCase();

const toFiniteNumber = (value, fallback = 0) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const normalizeNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : NaN;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const normalizeArray = (value) => (Array.isArray(value) ? value.filter((item) => item !== undefined) : []);

const normalizeOrderType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['rent', 'rental'].includes(normalized)) return 'rental';
  if (['sale', 'buy'].includes(normalized)) return 'sale';
  return normalized;
};

const isObjectIdLike = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const collectNormalizedTokens = (value, bucket = new Set()) => {
  if (value === null || value === undefined) return bucket;

  if (value instanceof mongoose.Types.ObjectId || isObjectIdLike(value)) {
    bucket.add(String(value).trim().toLowerCase());
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNormalizedTokens(item, bucket));
    return bucket;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectNormalizedTokens(item, bucket));
    return bucket;
  }

  const token = String(value).trim();
  if (token) bucket.add(token.toLowerCase());
  return bucket;
};

const createHttpError = (status, message, details = null) => {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
};

const getVoucherType = (voucher) => {
  if (voucher?.voucherType) return String(voucher.voucherType).trim().toLowerCase();
  if (voucher?.discountType === 'Percentage') return 'percent';
  if (voucher?.discountType === 'Fixed') return 'fixed';
  return '';
};

const getVoucherValue = (voucher) => {
  const value = normalizeNullableNumber(voucher?.value);
  if (Number.isFinite(value) && value > 0) return value;
  return Math.max(toFiniteNumber(voucher?.discountValue, 0), 0);
};

const getVoucherEndDate = (voucher) => voucher?.endDate || voucher?.expiryDate || null;

const parseVoucherDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getVoucherUsageLimitTotal = (voucher) => {
  if (voucher?.usageLimitTotal === null || voucher?.usageLimitTotal === undefined) {
    return voucher?.usageLimit ?? null;
  }
  return voucher.usageLimitTotal;
};

const getVoucherMessage = (reason, context = {}) => {
  const minOrderValue = toFiniteNumber(context?.voucher?.minOrderValue, 0);
  const code = context?.code || context?.voucher?.code || '';

  const map = {
    VOUCHER_NOT_FOUND: 'Khong tim thay voucher.',
    VOUCHER_INACTIVE: 'Voucher hien khong hoat dong.',
    VOUCHER_NOT_STARTED: 'Voucher chua den thoi gian ap dung.',
    VOUCHER_EXPIRED: 'Voucher da het han.',
    VOUCHER_NOT_APPLICABLE: 'Voucher khong ap dung cho loai don hang nay.',
    INVALID_ORDER_TYPE: 'Loai don hang khong hop le.',
    MIN_ORDER_NOT_MET: `Don hang chua dat gia tri toi thieu ${minOrderValue}.`,
    USAGE_LIMIT_TOTAL_EXCEEDED: 'Voucher da het luot su dung.',
    USAGE_LIMIT_PER_USER_EXCEEDED: 'Ban da dung het so lan su dung voucher nay.',
    FIRST_ORDER_ONLY: 'Voucher chi ap dung cho don dau tien.',
    USER_REQUIRED: 'Voucher nay yeu cau dang nhap tai khoan hop le.',
    USER_SEGMENT_NOT_ELIGIBLE: 'Tai khoan hien tai khong thuoc nhom duoc ap dung voucher.',
    CATEGORY_NOT_ELIGIBLE: 'Gio hang khong co san pham thuoc danh muc duoc ap dung.',
    ALL_PRODUCTS_EXCLUDED: 'Tat ca san pham trong gio hang deu bi loai tru khoi voucher.',
    INVALID_DISCOUNT: 'Gia tri giam gia cua voucher khong hop le.',
    INTERNAL_SERVER_ERROR: 'Khong the kiem tra voucher luc nay.',
    VOUCHER_APPLIED: 'Ap dung voucher thanh cong.',
  };

  if (reason === 'VOUCHER_NOT_FOUND' && code) {
    return `Khong tim thay voucher ${code}.`;
  }

  return map[reason] || 'Khong the xu ly voucher luc nay.';
};

const buildInvalidResponse = (reason, context = {}) => {
  const code = normalizeVoucherCode(context?.code || context?.voucher?.code || '');
  const finalTotal = Math.max(toFiniteNumber(context?.finalTotal, context?.subtotal ?? 0), 0);

  return {
    valid: false,
    code: code || undefined,
    reason,
    message: getVoucherMessage(reason, { ...context, code }),
    discountAmount: 0,
    finalTotal,
  };
};

const buildValidResponse = ({ voucher, discountAmount, finalTotal }) => ({
  valid: true,
  code: voucher?.code,
  voucherName: voucher?.name || '',
  voucherType: getVoucherType(voucher),
  value: getVoucherValue(voucher),
  discountAmount,
  finalTotal,
  appliedOn: voucher?.appliesOn || 'subtotal',
  appliesTo: voucher?.appliesTo || 'both',
  message: getVoucherMessage('VOUCHER_APPLIED', { voucher }),
});

const serializeVoucher = (voucher, extra = {}) => ({
  _id: voucher?._id,
  code: voucher?.code || '',
  name: voucher?.name || '',
  description: voucher?.description || '',
  isActive: Boolean(voucher?.isActive),
  voucherType: getVoucherType(voucher),
  value: getVoucherValue(voucher),
  maxDiscount: voucher?.maxDiscount ?? null,
  appliesTo: voucher?.appliesTo || 'both',
  appliesOn: voucher?.appliesOn || 'subtotal',
  minOrderValue: toFiniteNumber(voucher?.minOrderValue, 0),
  startDate: voucher?.startDate || null,
  endDate: getVoucherEndDate(voucher),
  usageLimitTotal: getVoucherUsageLimitTotal(voucher),
  usageLimitPerUser: voucher?.usageLimitPerUser ?? null,
  usedCount: Math.max(toFiniteNumber(voucher?.usedCount, 0), 0),
  effectiveUsageCount: Math.max(
    toFiniteNumber(extra?.effectiveUsageCount, toFiniteNumber(voucher?.usedCount, 0)),
    Math.max(toFiniteNumber(voucher?.usedCount, 0), 0)
  ),
  firstOrderOnly: Boolean(voucher?.firstOrderOnly),
  eligibleCategories: normalizeArray(voucher?.eligibleCategories),
  excludedProducts: normalizeArray(voucher?.excludedProducts),
  userSegments: normalizeArray(voucher?.userSegments),
  createdAt: voucher?.createdAt || null,
  updatedAt: voucher?.updatedAt || null,
});

const buildVoucherSnapshot = ({ voucher, originalSubtotal, finalSubtotal }) => {
  if (!voucher) return null;

  return {
    name: voucher.name || '',
    voucherType: getVoucherType(voucher),
    value: getVoucherValue(voucher),
    maxDiscount: voucher.maxDiscount ?? null,
    appliesTo: voucher.appliesTo || 'both',
    appliesOn: voucher.appliesOn || 'subtotal',
    originalSubtotal: Math.max(toFiniteNumber(originalSubtotal, 0), 0),
    finalSubtotal: Math.max(toFiniteNumber(finalSubtotal, 0), 0),
  };
};

const getVoucherByCode = async (code) => {
  const normalizedCode = normalizeVoucherCode(code);
  if (!normalizedCode) return null;
  return Voucher.findOne({ code: normalizedCode }).lean();
};

const getVoucherById = async (id) => {
  if (!id || !isObjectIdLike(id)) return null;
  return Voucher.findById(id).lean();
};

const normalizeUserDocument = async (user) => {
  if (!user) return null;
  if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
    return User.findById(user).lean();
  }
  if (user?._id || user?.id) {
    const hasExtendedProfileData = [
      'segment',
      'segments',
      'membershipSegment',
      'memberSegment',
      'membershipTier',
      'tier',
      'membership',
      'customerSegment',
    ].some((key) => user[key] !== undefined);

    if (hasExtendedProfileData) return user;
    return User.findById(user._id || user.id).lean();
  }
  return null;
};

const getProductIdFromCartItem = (item = {}) => {
  const candidates = [item.productId, item.product?._id, item.product?.id];
  for (const candidate of candidates) {
    if (candidate) return String(candidate);
  }
  return null;
};

const getProductInstanceIdFromCartItem = (item = {}) => {
  const candidates = [item.productInstanceId, item.productInstance?._id, item.productInstance?.id];
  for (const candidate of candidates) {
    if (candidate) return String(candidate);
  }
  return null;
};

const resolveCartProducts = async (cartItems = []) => {
  const directProductIds = new Set();
  const productInstanceIds = new Set();

  cartItems.forEach((item) => {
    const productId = getProductIdFromCartItem(item);
    const productInstanceId = getProductInstanceIdFromCartItem(item);

    if (productId) directProductIds.add(productId);
    if (productInstanceId) productInstanceIds.add(productInstanceId);
  });

  let instanceProductIds = [];
  if (productInstanceIds.size > 0) {
    const instances = await ProductInstance.find({ _id: { $in: Array.from(productInstanceIds) } })
      .select('productId')
      .lean();
    instanceProductIds = instances
      .map((instance) => instance?.productId)
      .filter(Boolean)
      .map((value) => String(value));
  }

  const allProductIds = Array.from(new Set([...Array.from(directProductIds), ...instanceProductIds]));
  if (allProductIds.length === 0) return [];

  return Product.find({ _id: { $in: allProductIds } }).lean();
};

const getCategoryIdCandidates = (product = {}) => {
  const tokens = new Set();
  collectNormalizedTokens(product?.category, tokens);
  collectNormalizedTokens(product?.categoryPath, tokens);
  return tokens;
};

const getUserSegmentCandidates = (user = {}) => {
  const tokens = new Set();
  [
    user?.segment,
    user?.segments,
    user?.membershipSegment,
    user?.memberSegment,
    user?.membershipTier,
    user?.tier,
    user?.membership?.segment,
    user?.membership?.tier,
    user?.customerSegment,
  ].forEach((source) => collectNormalizedTokens(source, tokens));
  return tokens;
};

const checkUserSegmentEligibility = (voucher, user) => {
  const requiredSegments = normalizeArray(voucher?.userSegments)
    .map((segment) => String(segment || '').trim().toLowerCase())
    .filter(Boolean);

  if (requiredSegments.length === 0) return true;
  if (!user) return false;

  const userSegments = getUserSegmentCandidates(user);
  return requiredSegments.some((segment) => userSegments.has(segment));
};

const buildVoucherOrderQuery = ({ voucher, userId, orderType }) => {
  const voucherId = voucher?._id ? new mongoose.Types.ObjectId(voucher._id) : null;
  const code = normalizeVoucherCode(voucher?.code);

  const query = {
    $or: [
      ...(voucherId ? [{ voucherId }, { voucher: voucherId }, { appliedVoucherId: voucherId }] : []),
      { voucherCode: code },
      { appliedVoucherCode: code },
      { discountCode: code },
    ],
  };

  if (userId) query.customerId = userId;

  if (orderType === 'sale') {
    query.status = { $in: VALID_SALE_STATUSES };
    query.orderType = 'Buy';
  } else if (orderType === 'rental') {
    query.status = { $in: VALID_RENT_STATUSES };
  }

  return query;
};

const countUsageForModel = async (Model, query) => {
  try {
    return await Model.countDocuments(query);
  } catch {
    return 0;
  }
};

const countVoucherUsage = async ({ voucher, userId }) => {
  const [saleUsageCount, rentUsageCount] = await Promise.all([
    countUsageForModel(SaleOrder, buildVoucherOrderQuery({ voucher, userId, orderType: 'sale' })),
    countUsageForModel(RentOrder, buildVoucherOrderQuery({ voucher, userId, orderType: 'rental' })),
  ]);

  return saleUsageCount + rentUsageCount;
};

const countTotalVoucherUsageFromOrders = async ({ voucher, voucherId, voucherCode }) => {
  const effectiveVoucher = voucher || { _id: voucherId, code: voucherCode };
  if (!effectiveVoucher?._id && !effectiveVoucher?.code) return 0;

  const [saleCount, rentCount] = await Promise.all([
    countUsageForModel(SaleOrder, buildVoucherOrderQuery({ voucher: effectiveVoucher, orderType: 'sale' })),
    countUsageForModel(RentOrder, buildVoucherOrderQuery({ voucher: effectiveVoucher, orderType: 'rental' })),
  ]);

  return saleCount + rentCount;
};

const repairVoucherUsageCounterIfNeeded = async ({ voucherId, voucherCode }) => {
  const voucher = voucherId ? await getVoucherById(voucherId) : await getVoucherByCode(voucherCode);
  if (!voucher) return null;

  const actualUsageCount = await countTotalVoucherUsageFromOrders({
    voucher,
    voucherId: voucher._id,
    voucherCode: voucher.code,
  });

  const currentUsedCount = Math.max(toFiniteNumber(voucher.usedCount, 0), 0);
  const effectiveUsageCount = Math.max(currentUsedCount, actualUsageCount);

  if (actualUsageCount > currentUsedCount) {
    await Voucher.findByIdAndUpdate(voucher._id, { usedCount: actualUsageCount });
  }

  return {
    voucher: {
      ...voucher,
      usedCount: effectiveUsageCount,
    },
    actualUsageCount,
    effectiveUsageCount,
  };
};

const hasEligibleHistoricalOrders = async ({ userId }) => {
  if (!userId) return false;

  const [saleOrderCount, rentOrderCount] = await Promise.all([
    SaleOrder.countDocuments({
      customerId: userId,
      orderType: 'Buy',
      status: { $in: VALID_SALE_STATUSES },
    }),
    RentOrder.countDocuments({
      customerId: userId,
      status: { $in: VALID_RENT_STATUSES },
    }),
  ]);

  return saleOrderCount + rentOrderCount > 0;
};

const enrichUserWithDefaultSegmentIfEligible = async (user) => {
  if (!user?._id && !user?.id) return user;

  const normalizedUser = { ...user };
  const existingSegments = getUserSegmentCandidates(normalizedUser);

  if (existingSegments.size > 0) {
    return normalizedUser;
  }

  const userId = normalizedUser._id || normalizedUser.id;
  const hasPreviousOrder = await hasEligibleHistoricalOrders({ userId });

  if (hasPreviousOrder) {
    return normalizedUser;
  }

  normalizedUser.segment = 'new_user';

  if (normalizedUser._id) {
    await User.findByIdAndUpdate(normalizedUser._id, {
      $set: { segment: 'new_user' },
    }).catch(() => null);
  }

  return normalizedUser;
};

const loadEligibleCategoryTokens = async (voucher) => {
  const rawCategories = normalizeArray(voucher?.eligibleCategories);
  const tokens = new Set();

  rawCategories.forEach((item) => collectNormalizedTokens(item, tokens));

  const objectIds = rawCategories
    .map((item) => String(item || '').trim())
    .filter((item) => isObjectIdLike(item));

  if (objectIds.length > 0) {
    const categories = await Category.find({ _id: { $in: objectIds } }).lean();
    categories.forEach((category) => collectNormalizedTokens(category, tokens));
  }

  return tokens;
};

const hasEligibleCategory = async ({ voucher, products }) => {
  const eligibleCategories = normalizeArray(voucher?.eligibleCategories);
  if (eligibleCategories.length === 0) return true;
  if (!Array.isArray(products) || products.length === 0) return false;

  const eligibleTokens = await loadEligibleCategoryTokens(voucher);
  if (eligibleTokens.size === 0) return false;

  return products.some((product) => {
    const categoryTokens = getCategoryIdCandidates(product);
    return Array.from(categoryTokens).some((token) => eligibleTokens.has(token));
  });
};

const hasNonExcludedProducts = ({ voucher, products }) => {
  const excluded = new Set(
    normalizeArray(voucher?.excludedProducts)
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (excluded.size === 0) return true;
  if (!Array.isArray(products) || products.length === 0) return false;

  return products.some((product) => !excluded.has(String(product?._id || '').trim().toLowerCase()));
};

const calculateDiscountAmount = ({ voucher, subtotal }) => {
  const voucherType = getVoucherType(voucher);
  const voucherValue = getVoucherValue(voucher);
  let discountAmount = 0;

  if (voucherType === 'percent') {
    discountAmount = (subtotal * voucherValue) / 100;
    const maxDiscount = normalizeNullableNumber(voucher?.maxDiscount);
    if (Number.isFinite(maxDiscount) && maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscount);
    }
  } else if (voucherType === 'fixed') {
    discountAmount = voucherValue;
  }

  if (!Number.isFinite(discountAmount)) return 0;
  return Math.floor(Math.max(discountAmount, 0));
};

const isVoucherWithinActiveDateRange = (voucher, now = new Date()) => {
  const startDate = parseVoucherDate(voucher?.startDate);
  const endDate = parseVoucherDate(getVoucherEndDate(voucher));

  if (startDate && startDate > now) {
    return false;
  }

  if (endDate && endDate < now) {
    return false;
  }

  return true;
};

const parseDateOrNull = (value, fieldName) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `Truong ${fieldName} khong hop le.`, {
      field: fieldName,
      code: 'INVALID_DATE',
    });
  }
  return date;
};

const normalizeVoucherAdminInput = async (payload, { existingVoucherId = null } = {}) => {
  const code = normalizeVoucherCode(payload?.code);
  const name = String(payload?.name || '').trim();
  const description = String(payload?.description || '').trim();
  const voucherType = String(payload?.voucherType || '').trim().toLowerCase();
  const value = normalizeNullableNumber(payload?.value);
  const maxDiscount = normalizeNullableNumber(payload?.maxDiscount);
  const appliesTo = String(payload?.appliesTo || 'both').trim().toLowerCase();
  const appliesOn = String(payload?.appliesOn || 'subtotal').trim().toLowerCase();
  const minOrderValue = normalizeNullableNumber(payload?.minOrderValue);
  const usageLimitTotal = normalizeNullableNumber(payload?.usageLimitTotal);
  const usageLimitPerUser = normalizeNullableNumber(payload?.usageLimitPerUser);
  const startDate = parseDateOrNull(payload?.startDate, 'startDate');
  const endDate = parseDateOrNull(payload?.endDate, 'endDate');
  const isActive = payload?.isActive === undefined ? true : normalizeBoolean(payload?.isActive, true);
  const firstOrderOnly = normalizeBoolean(payload?.firstOrderOnly, false);
  const eligibleCategories = normalizeArray(payload?.eligibleCategories);
  const excludedProducts = normalizeArray(payload?.excludedProducts);
  const userSegments = normalizeArray(payload?.userSegments).map((item) => String(item || '').trim()).filter(Boolean);

  const errors = [];

  if (!code) errors.push({ field: 'code', message: 'Ma voucher la bat buoc.' });
  if (!name) errors.push({ field: 'name', message: 'Ten voucher la bat buoc.' });
  if (!ALLOWED_VOUCHER_TYPES.includes(voucherType)) {
    errors.push({ field: 'voucherType', message: 'voucherType phai la "percent" hoac "fixed".' });
  }
  if (!Number.isFinite(value) || value <= 0) {
    errors.push({ field: 'value', message: 'Gia tri voucher phai lon hon 0.' });
  }
  if (voucherType === 'percent' && Number.isFinite(value) && value > 100) {
    errors.push({ field: 'value', message: 'Voucher giam theo phan tram khong duoc vuot qua 100.' });
  }
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) {
    errors.push({ field: 'maxDiscount', message: 'maxDiscount phai lon hon 0 neu duoc cung cap.' });
  }
  if (!ALLOWED_APPLIES_TO.includes(appliesTo)) {
    errors.push({ field: 'appliesTo', message: 'appliesTo phai la both, sale hoac rental.' });
  }
  if (!ALLOWED_APPLIES_ON.includes(appliesOn)) {
    errors.push({ field: 'appliesOn', message: 'He thong hien chi ho tro voucher tren subtotal.' });
  }
  if (startDate && endDate && endDate < startDate) {
    errors.push({ field: 'endDate', message: 'endDate phai lon hon hoac bang startDate.' });
  }
  if (minOrderValue !== null && (!Number.isFinite(minOrderValue) || minOrderValue < 0)) {
    errors.push({ field: 'minOrderValue', message: 'minOrderValue phai lon hon hoac bang 0.' });
  }
  if (usageLimitTotal !== null && (!Number.isFinite(usageLimitTotal) || usageLimitTotal < 0)) {
    errors.push({ field: 'usageLimitTotal', message: 'usageLimitTotal phai lon hon hoac bang 0.' });
  }
  if (usageLimitPerUser !== null && (!Number.isFinite(usageLimitPerUser) || usageLimitPerUser < 0)) {
    errors.push({ field: 'usageLimitPerUser', message: 'usageLimitPerUser phai lon hon hoac bang 0.' });
  }

  if (errors.length > 0) {
    throw createHttpError(400, 'Du lieu voucher khong hop le.', errors);
  }

  const codeQuery = { code };
  if (existingVoucherId) {
    codeQuery._id = { $ne: existingVoucherId };
  }
  const duplicatedVoucher = await Voucher.findOne(codeQuery).lean();
  if (duplicatedVoucher) {
    throw createHttpError(409, 'Ma voucher da ton tai.', [{ field: 'code', message: 'Ma voucher da ton tai.' }]);
  }

  return {
    code,
    name,
    description,
    isActive,
    startDate,
    endDate,
    voucherType,
    value,
    maxDiscount,
    appliesTo,
    appliesOn,
    minOrderValue: Number.isFinite(minOrderValue) ? minOrderValue : 0,
    usageLimitTotal,
    usedCount: Math.max(toFiniteNumber(payload?.usedCount, 0), 0),
    usageLimitPerUser,
    firstOrderOnly,
    eligibleCategories,
    excludedProducts,
    userSegments,
    discountType: voucherType === 'percent' ? 'Percentage' : 'Fixed',
    discountValue: value,
    expiryDate: endDate,
    usageLimit: usageLimitTotal,
  };
};

const createVoucher = async (payload) => {
  const normalizedData = await normalizeVoucherAdminInput(payload);
  const voucher = await Voucher.create(normalizedData);
  return serializeVoucher(voucher.toObject());
};

const updateVoucher = async (id, payload) => {
  if (!isObjectIdLike(id)) {
    throw createHttpError(400, 'Id voucher khong hop le.');
  }

  const existingVoucher = await Voucher.findById(id);
  if (!existingVoucher) {
    throw createHttpError(404, 'Khong tim thay voucher.');
  }

  const mergedPayload = {
    ...existingVoucher.toObject(),
    ...payload,
  };

  const normalizedData = await normalizeVoucherAdminInput(mergedPayload, {
    existingVoucherId: existingVoucher._id,
  });

  Object.assign(existingVoucher, normalizedData, {
    usedCount: Math.max(toFiniteNumber(existingVoucher.usedCount, 0), normalizedData.usedCount),
  });

  await existingVoucher.save();

  const repaired = await repairVoucherUsageCounterIfNeeded({
    voucherId: existingVoucher._id,
    voucherCode: existingVoucher.code,
  });

  return serializeVoucher(repaired?.voucher || existingVoucher.toObject(), {
    effectiveUsageCount: repaired?.effectiveUsageCount,
  });
};

const getStatusFilterQuery = (statusFilter) => {
  const now = new Date();
  const normalized = String(statusFilter || '').trim().toLowerCase();

  if (normalized === 'upcoming') {
    return { startDate: { $gt: now } };
  }

  if (normalized === 'expired') {
    return {
      $or: [
        { endDate: { $lt: now } },
        { endDate: null, expiryDate: { $lt: now } },
      ],
    };
  }

  if (normalized === 'active') {
    return {
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: null, expiryDate: null },
            { endDate: { $gte: now } },
            { endDate: null, expiryDate: { $gte: now } },
          ],
        },
      ],
    };
  }

  return null;
};

const listVouchers = async (query = {}) => {
  const page = Math.max(toFiniteNumber(query.page, 1), 1);
  const limit = Math.min(Math.max(toFiniteNumber(query.limit, 20), 1), 100);
  const search = String(query.search || '').trim();
  const voucherType = String(query.voucherType || '').trim().toLowerCase();
  const appliesTo = String(query.appliesTo || '').trim().toLowerCase();
  const sortBy = ['createdAt', 'updatedAt', 'code', 'name', 'usedCount', 'startDate', 'endDate']
    .includes(String(query.sortBy || '').trim())
    ? String(query.sortBy).trim()
    : 'createdAt';
  const sortOrder = String(query.sortOrder || '').trim().toLowerCase() === 'asc' ? 1 : -1;

  const mongoQuery = {};
  if (query.isActive !== undefined && query.isActive !== '') {
    mongoQuery.isActive = normalizeBoolean(query.isActive, true);
  }
  if (ALLOWED_VOUCHER_TYPES.includes(voucherType)) {
    mongoQuery.$or = [{ voucherType }, { discountType: voucherType === 'percent' ? 'Percentage' : 'Fixed' }];
  }
  if (ALLOWED_APPLIES_TO.includes(appliesTo)) {
    mongoQuery.appliesTo = appliesTo;
  }
  if (search) {
    mongoQuery.$and = mongoQuery.$and || [];
    mongoQuery.$and.push({
      $or: [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ],
    });
  }

  const statusQuery = getStatusFilterQuery(query.statusFilter);
  if (statusQuery) {
    mongoQuery.$and = mongoQuery.$and || [];
    mongoQuery.$and.push(statusQuery);
  }

  const skip = (page - 1) * limit;

  const [vouchers, total] = await Promise.all([
    Voucher.find(mongoQuery).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Voucher.countDocuments(mongoQuery),
  ]);

  return {
    data: vouchers.map((voucher) => serializeVoucher(voucher, { effectiveUsageCount: voucher.usedCount })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const listMyVouchers = async ({ user, query = {} }) => {
  const normalizedUser = await enrichUserWithDefaultSegmentIfEligible(await normalizeUserDocument(user));
  if (!normalizedUser?._id) {
    throw createHttpError(401, 'Unauthorized');
  }

  const page = Math.max(toFiniteNumber(query.page, 1), 1);
  const limit = Math.min(Math.max(toFiniteNumber(query.limit, 20), 1), 100);
  const sortBy = ['createdAt', 'updatedAt', 'code', 'name', 'usedCount', 'startDate', 'endDate']
    .includes(String(query.sortBy || '').trim())
    ? String(query.sortBy).trim()
    : 'createdAt';
  const sortOrder = String(query.sortOrder || '').trim().toLowerCase() === 'asc' ? 1 : -1;
  const search = String(query.search || '').trim();
  const now = new Date();

  const mongoQuery = { isActive: true };

  if (search) {
    mongoQuery.$and = mongoQuery.$and || [];
    mongoQuery.$and.push({
      $or: [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ],
    });
  }

  const vouchers = await Voucher.find(mongoQuery).sort({ [sortBy]: sortOrder }).lean();
  const eligibleVouchers = [];

  for (const voucher of vouchers) {
    if (!isVoucherWithinActiveDateRange(voucher, now)) {
      continue;
    }

    const repairedUsage = await repairVoucherUsageCounterIfNeeded({
      voucherId: voucher._id,
      voucherCode: voucher.code,
    });

    const usageLimitTotal = getVoucherUsageLimitTotal(voucher);
    const effectiveUsageCount = Math.max(
      Math.max(toFiniteNumber(voucher?.usedCount, 0), 0),
      toFiniteNumber(repairedUsage?.effectiveUsageCount, 0)
    );

    if (usageLimitTotal !== null && usageLimitTotal !== undefined && effectiveUsageCount >= Number(usageLimitTotal)) {
      continue;
    }

    if (!checkUserSegmentEligibility(voucher, normalizedUser)) {
      continue;
    }

    if (voucher?.usageLimitPerUser !== null && voucher?.usageLimitPerUser !== undefined) {
      const userUsageCount = await countVoucherUsage({ voucher, userId: normalizedUser._id });
      if (userUsageCount >= Number(voucher.usageLimitPerUser)) {
        continue;
      }
    }

    eligibleVouchers.push(serializeVoucher(voucher, { effectiveUsageCount }));
  }

  const total = eligibleVouchers.length;
  const skip = (page - 1) * limit;

  return {
    data: eligibleVouchers.slice(skip, skip + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const getVoucherDetail = async (id) => {
  if (!isObjectIdLike(id)) {
    throw createHttpError(400, 'Id voucher khong hop le.');
  }

  const repaired = await repairVoucherUsageCounterIfNeeded({ voucherId: id });
  if (!repaired?.voucher) {
    throw createHttpError(404, 'Khong tim thay voucher.');
  }

  return serializeVoucher(repaired.voucher, {
    effectiveUsageCount: repaired.effectiveUsageCount,
  });
};

const toggleVoucherStatus = async (id) => {
  if (!isObjectIdLike(id)) {
    throw createHttpError(400, 'Id voucher khong hop le.');
  }

  const voucher = await Voucher.findById(id);
  if (!voucher) {
    throw createHttpError(404, 'Khong tim thay voucher.');
  }

  voucher.isActive = !voucher.isActive;
  await voucher.save();

  return serializeVoucher(voucher.toObject());
};

const validateVoucher = async ({
  code,
  user,
  cartItems = [],
  subtotal,
  orderType,
}) => {
  const normalizedCode = normalizeVoucherCode(code);
  const normalizedSubtotal = Math.max(toFiniteNumber(subtotal, 0), 0);
  const normalizedOrderType = normalizeOrderType(orderType);

  if (!normalizedCode) {
    return buildInvalidResponse('VOUCHER_NOT_FOUND', { code: normalizedCode, subtotal: normalizedSubtotal });
  }

  const voucher = await Voucher.findOne({ code: normalizedCode }).lean();
  if (!voucher) {
    return buildInvalidResponse('VOUCHER_NOT_FOUND', { code: normalizedCode, subtotal: normalizedSubtotal });
  }

  if (!voucher.isActive) {
    return buildInvalidResponse('VOUCHER_INACTIVE', { voucher, subtotal: normalizedSubtotal });
  }

  const now = new Date();
  if (voucher?.startDate && new Date(voucher.startDate) > now) {
    return buildInvalidResponse('VOUCHER_NOT_STARTED', { voucher, subtotal: normalizedSubtotal });
  }

  const endDate = getVoucherEndDate(voucher);
  if (endDate && new Date(endDate) < now) {
    return buildInvalidResponse('VOUCHER_EXPIRED', { voucher, subtotal: normalizedSubtotal });
  }

  const appliesTo = String(voucher?.appliesTo || 'both').trim().toLowerCase();
  if (!['sale', 'rental'].includes(normalizedOrderType)) {
    return buildInvalidResponse('INVALID_ORDER_TYPE', { voucher, subtotal: normalizedSubtotal });
  }
  if (appliesTo !== 'both' && appliesTo !== normalizedOrderType) {
    return buildInvalidResponse('VOUCHER_NOT_APPLICABLE', { voucher, subtotal: normalizedSubtotal });
  }

  if (normalizedSubtotal < Math.max(toFiniteNumber(voucher?.minOrderValue, 0), 0)) {
    return buildInvalidResponse('MIN_ORDER_NOT_MET', { voucher, subtotal: normalizedSubtotal });
  }

  const repairedUsage = await repairVoucherUsageCounterIfNeeded({
    voucherId: voucher._id,
    voucherCode: voucher.code,
  });
  const effectiveTotalUsage = Math.max(
    Math.max(toFiniteNumber(voucher?.usedCount, 0), 0),
    toFiniteNumber(repairedUsage?.effectiveUsageCount, 0)
  );
  const usageLimitTotal = getVoucherUsageLimitTotal(voucher);

  if (usageLimitTotal !== null && usageLimitTotal !== undefined && effectiveTotalUsage >= Number(usageLimitTotal)) {
    return buildInvalidResponse('USAGE_LIMIT_TOTAL_EXCEEDED', { voucher, subtotal: normalizedSubtotal });
  }

  const normalizedUser = await enrichUserWithDefaultSegmentIfEligible(await normalizeUserDocument(user));
  const userId = normalizedUser?._id || normalizedUser?.id || null;

  if (voucher?.usageLimitPerUser !== null && voucher?.usageLimitPerUser !== undefined) {
    if (!userId) {
      return buildInvalidResponse('USER_REQUIRED', { voucher, subtotal: normalizedSubtotal });
    }

    const userUsageCount = await countVoucherUsage({ voucher, userId });
    if (userUsageCount >= Number(voucher.usageLimitPerUser)) {
      return buildInvalidResponse('USAGE_LIMIT_PER_USER_EXCEEDED', { voucher, subtotal: normalizedSubtotal });
    }
  }

  // Business rule update:
  // vouchers remain usable once per account even after the customer has previous orders.
  // Per-user usage is controlled by usageLimitPerUser instead of firstOrderOnly.

  if (!checkUserSegmentEligibility(voucher, normalizedUser)) {
    return buildInvalidResponse('USER_SEGMENT_NOT_ELIGIBLE', { voucher, subtotal: normalizedSubtotal });
  }

  const products = await resolveCartProducts(cartItems);

  const eligibleCategoryMatched = await hasEligibleCategory({ voucher, products });
  if (!eligibleCategoryMatched) {
    return buildInvalidResponse('CATEGORY_NOT_ELIGIBLE', { voucher, subtotal: normalizedSubtotal });
  }

  if (!hasNonExcludedProducts({ voucher, products })) {
    return buildInvalidResponse('ALL_PRODUCTS_EXCLUDED', { voucher, subtotal: normalizedSubtotal });
  }

  let discountAmount = calculateDiscountAmount({
    voucher,
    subtotal: normalizedSubtotal,
  });

  if (discountAmount <= 0) {
    return buildInvalidResponse('INVALID_DISCOUNT', { voucher, subtotal: normalizedSubtotal });
  }

  if (discountAmount > normalizedSubtotal) {
    discountAmount = normalizedSubtotal;
  }

  const finalTotal = Math.max(normalizedSubtotal - discountAmount, 0);

  return buildValidResponse({
    voucher,
    discountAmount,
    finalTotal,
  });
};

module.exports = {
  normalizeVoucherCode,
  buildInvalidResponse,
  buildValidResponse,
  serializeVoucher,
  buildVoucherSnapshot,
  getVoucherByCode,
  getVoucherById,
  getProductIdFromCartItem,
  getCategoryIdCandidates,
  checkUserSegmentEligibility,
  countVoucherUsage,
  countTotalVoucherUsageFromOrders,
  repairVoucherUsageCounterIfNeeded,
  hasEligibleHistoricalOrders,
  enrichUserWithDefaultSegmentIfEligible,
  isVoucherWithinActiveDateRange,
  createVoucher,
  updateVoucher,
  listVouchers,
  listMyVouchers,
  getVoucherDetail,
  toggleVoucherStatus,
  validateVoucher,
};
