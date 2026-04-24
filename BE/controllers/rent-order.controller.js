const mongoose = require('mongoose');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const { getInstanceBaseValue } = require('../model/ProductInstance.model');
const Product = require('../model/Product.model');
const DamagePolicy = require('../model/DamagePolicy.model');
const { resolvePolicyForProduct } = require('./damage-policy.controller');
const ItemSwapHistory = require('../model/ItemSwapHistory.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
const Collateral = require('../model/Collateral.model');
const ReturnRecord = require('../model/ReturnRecord.model');
const Invoice = require('../model/Invoice.model');
const Alert = require('../model/Alert.model');
const InventoryHistory = require('../model/InventoryHistory.model');
const Voucher = require('../model/Voucher.model');
const User = require('../model/User.model');
const GuestVerification = require('../model/GuestVerification.model');
const bcrypt = require('bcryptjs');
const { getActiveShiftForStaff } = require('../services/shift.service');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const attachShiftContextForStaff = (req, order) => {
    if (!order) return;
    const role = normalizeRole(req.user?.role);
    if (role !== 'staff') return;

    const activeShiftId = req.activeShift?.shift?._id || null;
    if (req.user?.id) {
        order.staffId = req.user.id;
    }
    if (!order.shiftId && activeShiftId) {
        order.shiftId = activeShiftId;
    }
};
const {
    verifyGuestVerificationToken,
    signGuestOrderViewToken,
    verifyGuestOrderViewToken,
    extractBearerToken,
} = require('../utils/jwt');
const { frontendUrl } = require('../config/app.config');
const { sendRentOrderConfirmationEmail } = require('../services/mailService');
const {
    isValidEmail,
    isValidPhone,
    normalizeEmail,
    normalizePhone,
} = require('../utils/guestVerification');
const { writeAuditLog } = require('../services/auditLog.service');
const {
    computeExpectedDeposit,
    validateDeposit,
    validatePickup,
    validateReturn,
} = require('../services/rentOrderGuardService');
const { normalizeIdempotencyKey, isDuplicateIdempotencyError } = require('../utils/idempotency');
const {
    validateVoucher,
    getVoucherByCode,
    normalizeVoucherCode,
    buildVoucherSnapshot,
    repairVoucherUsageCounterIfNeeded,
} = require('../services/voucher.service');
const { ORDER_TYPE } = require('../constants/order.constants');
const { RENT_ORDER_STATUS } = require('../constants/status.constants');

const RENT_STATUS_META = {
    [RENT_ORDER_STATUS.DRAFT]: 'NhÃ¡p',
    [RENT_ORDER_STATUS.PENDING_DEPOSIT]: 'Chá» Ä‘áº·t cá»c',
    [RENT_ORDER_STATUS.DEPOSITED]: 'ÄÃ£ Ä‘áº·t cá»c',
    [RENT_ORDER_STATUS.CONFIRMED]: 'ÄÃ£ xÃ¡c nháº­n',
    [RENT_ORDER_STATUS.WAITING_PICKUP]: 'Chá» láº¥y Ä‘á»“',
    [RENT_ORDER_STATUS.RENTING]: 'Äang thuÃª',
    [RENT_ORDER_STATUS.WAITING_RETURN]: 'Chá» tráº£ Ä‘á»“',
    [RENT_ORDER_STATUS.LATE]: 'Trá»… háº¡n',
    [RENT_ORDER_STATUS.RETURNED]: 'ÄÃ£ tráº£ Ä‘á»“',
    [RENT_ORDER_STATUS.CANCELLED]: 'ÄÃ£ há»§y',
    [RENT_ORDER_STATUS.NO_SHOW]: 'KhÃ¡ch khÃ´ng Ä‘áº¿n',
    [RENT_ORDER_STATUS.COMPENSATION]: 'Bá»“i thÆ°á»ng',
    [RENT_ORDER_STATUS.COMPLETED]: 'HoÃ n táº¥t',
};

/**
 * Sinh mÃ£ Ä‘Æ¡n thuÃª dáº¡ng TH-YYMMDD-XXXX
 * VD: TH-260323-6ADE
 */
const generateOrderCode = (objectId) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const suffix = String(objectId).slice(-4).toUpperCase();
    return `TH-${yy}${mm}${dd}-${suffix}`;
};

const safeObjectId = (value) => {
    try {
        return value?.toString();
    } catch {
        return null;
    }
};


const applyVoucherForRentOrder = async ({
    voucherCode,
    user,
    items,
    subtotal
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
        orderType: 'rental'
    });

    if (!voucherResult.valid) {
        return { error: voucherResult };
    }

    const voucher = await getVoucherByCode(normalizedVoucherCode);
    if (!voucher) {
        return { error: { valid: false, reason: 'VOUCHER_NOT_FOUND' } };
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
        })
    };
};

/**
 * Checks whether a specific product instance is free for a given rental window.
 *
 * Cháº·n tuyá»‡t Ä‘á»‘i instance Lost/Sold; cÃ¡c tráº¡ng thÃ¡i khÃ¡c (Rented, Washing, Repair, Reservedâ€¦)
 * dá»±a vÃ o chá»“ng láº¥p RentOrderItem (chá»‰ bá» qua Ä‘Æ¡n terminal). PendingDeposit váº«n cháº·n chá»“ng láº¥p
 * cho Ä‘áº¿n khi Ä‘Æ¡n bá»‹ há»§y (user / auto-cancel) â€” trÃ¡nh lá»— há»•ng giá»¯a háº¿t â€œsoft holdâ€ vÃ  cron há»§y.
 */
// CÃ¡c tráº¡ng thÃ¡i Ä‘Ã£ káº¿t thÃºc vÃ²ng Ä‘á»i â€” Ä‘á»“ Ä‘Ã£ tráº£ hoáº·c huá»·
const TERMINAL_ORDER_STATUSES = ['cancelled', 'completed', 'noshow', 'returned'];

// Sá»‘ ngÃ y thuÃª tá»‘i Ä‘a cho 1 Ä‘Æ¡n
const MAX_RENTAL_DAYS = parseInt(process.env.MAX_RENTAL_DAYS || '30', 10);

/** Chá»‰ cháº·n tuyá»‡t Ä‘á»‘i: máº¥t / Ä‘Ã£ bÃ¡n. CÃ¡c tráº¡ng thÃ¡i Rented, Washing, Repairâ€¦ váº«n cÃ³ thá»ƒ Ä‘áº·t thuÃª tÆ°Æ¡ng lai náº¿u khÃ´ng overlap RentOrderItem. */
const INSTANCE_STATUSES_BLOCKING_RENT = ['Lost', 'Sold'];

const uniqueInstanceIds = (ids = []) => (
    Array.from(new Set(ids.filter(Boolean).map((id) => id.toString())))
);

const transitionProductInstances = async ({
    instanceIds = [],
    from,
    to,
    txOptions = {},
    conflictMessage = 'Sáº£n pháº©m khÃ´ng cÃ²n kháº£ dá»¥ng.',
    allowAlreadyTo = false,
}) => {
    const ids = uniqueInstanceIds(instanceIds);
    if (ids.length === 0) return { matched: 0, modified: 0 };

    const result = await ProductInstance.updateMany(
        {
            _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
            lifecycleStatus: from,
        },
        { lifecycleStatus: to },
        txOptions
    );

    const modified = Number(result.modifiedCount ?? result.nModified ?? 0);
    if (modified === ids.length) return { matched: Number(result.matchedCount ?? result.n ?? modified), modified };

    if (allowAlreadyTo) {
        const desiredCount = await ProductInstance.countDocuments({
            _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
            lifecycleStatus: to,
        }).session(txOptions.session || null);
        if (desiredCount === ids.length) {
            return { matched: ids.length, modified };
        }
    }

    // Thu tháº­p chi tiáº¿t instance bá»‹ cháº·n Ä‘á»ƒ log + tráº£ cho FE
    const currentDocs = await ProductInstance.find({
        _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    })
        .select('_id code lifecycleStatus productId size')
        .populate('productId', 'name')
        .session(txOptions.session || null)
        .lean();
    const allowedStates = Array.isArray(from?.$in) ? from.$in : (allowAlreadyTo ? [from, to] : [from]);
    const blocking = currentDocs.filter((d) => !allowedStates.includes(d.lifecycleStatus));
    const details = blocking.map((d) => {
        const productName = d?.productId?.name?.vi || d?.productId?.name?.en || d?.productId?.name || 'Sáº£n pháº©m';
        const code = d?.code ? ` [${d.code}]` : '';
        const size = d?.size ? ` size ${d.size}` : '';
        return `${productName}${size}${code}: ${d.lifecycleStatus}`;
    });

    const err = new Error(
        details.length > 0
            ? `${conflictMessage} Chi tiáº¿t: ${details.join('; ')}`
            : conflictMessage
    );
    err.blockingInstances = blocking.map((d) => ({
        id: String(d._id),
        code: d.code,
        size: d.size,
        lifecycleStatus: d.lifecycleStatus,
    }));
    throw err;
};

const reserveAvailableInstances = (instanceIds, txOptions = {}) => transitionProductInstances({
    instanceIds,
    from: 'Available',
    to: 'Reserved',
    txOptions,
    conflictMessage: 'CÃ³ sáº£n pháº©m khÃ´ng cÃ²n Available Ä‘á»ƒ giá»¯ chá»—.',
});

// Cho phÃ©p cáº£ Available (chÆ°a qua cron giá»¯ chá»—) láº«n Reserved â†’ Rented táº¡i bÆ°á»›c confirmPickup.
// allowAlreadyTo=true Ä‘á»ƒ idempotent náº¿u pickup Ä‘Æ°á»£c gá»i láº·p láº¡i.
const markReservedInstancesRented = (instanceIds, txOptions = {}) => transitionProductInstances({
    instanceIds,
    from: { $in: ['Available', 'Reserved'] },
    to: 'Rented',
    txOptions,
    conflictMessage: 'CÃ³ sáº£n pháº©m khÃ´ng thá»ƒ chuyá»ƒn sang tráº¡ng thÃ¡i Äang thuÃª.',
    allowAlreadyTo: true,
});

const releaseReservedOrRentedInstances = async (instanceIds, txOptions = {}) => {
    const ids = uniqueInstanceIds(instanceIds);
    if (ids.length === 0) return;
    await ProductInstance.updateMany(
        {
            _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
            lifecycleStatus: { $in: ['Reserved', 'Rented'] },
        },
        { lifecycleStatus: 'Available' },
        txOptions
    );
};

/**
 * Release instance vá» Available CHá»ˆ khi khÃ´ng cÃ²n Ä‘Æ¡n thuÃª active nÃ o khÃ¡c dÃ¹ng instance Ä‘Ã³.
 *
 * DÃ¹ng khi cancel/no-show má»™t Ä‘Æ¡n, vÃ¬ má»™t instance cÃ³ thá»ƒ phá»¥c vá»¥ nhiá»u Ä‘Æ¡n (khoáº£ng ngÃ y
 * khÃ¡c nhau). Náº¿u instance Ä‘ang Ä‘Æ°á»£c Ä‘Æ¡n khÃ¡c active sá»­ dá»¥ng (Ä‘áº·c biá»‡t Ä‘ang Rented), khÃ´ng
 * Ä‘Æ°á»£c chuyá»ƒn vá» Available â€” cron autoReserveInstances hoáº·c pickup/return sáº½ tá»± xá»­ lÃ½.
 */
const safeReleaseInstancesAfterOrderExit = async (instanceIds, excludeOrderId, txOptions = {}) => {
    const ids = uniqueInstanceIds(instanceIds);
    if (ids.length === 0) return;

    const releasableIds = [];
    for (const instanceId of ids) {
        const otherItems = await RentOrderItem.find({
            productInstanceId: instanceId,
            ...(excludeOrderId ? { orderId: { $ne: excludeOrderId } } : {}),
        }).populate({ path: 'orderId', select: 'status' }).lean();

        const hasOtherActive = otherItems.some((item) => {
            if (!item.orderId) return false;
            const status = String(item.orderId.status || '').toLowerCase();
            return !TERMINAL_ORDER_STATUSES.includes(status);
        });

        if (!hasOtherActive) {
            releasableIds.push(instanceId);
        }
    }

    if (releasableIds.length > 0) {
        await ProductInstance.updateMany(
            {
                _id: { $in: releasableIds.map((id) => new mongoose.Types.ObjectId(id)) },
                lifecycleStatus: { $in: ['Reserved', 'Rented'] },
            },
            { lifecycleStatus: 'Available' },
            txOptions
        );
    }
};

/**
 * @param {*} instanceId
 * @param {*} rentStartDate
 * @param {*} rentEndDate
 * @param {*} session
 * @param {string|null} excludeOrderId - bá» qua Ä‘Æ¡n nÃ y khi check (dÃ¹ng trong payDeposit Ä‘á»ƒ khÃ´ng tá»± block chÃ­nh mÃ¬nh)
 */
const isInstanceAvailableForPeriod = async (instanceId, rentStartDate, rentEndDate, session, excludeOrderId = null) => {
    if (!instanceId) return false;

    const instQuery = ProductInstance.findById(instanceId).select('lifecycleStatus');
    if (session) instQuery.session(session);
    const inst = await instQuery.lean();
    if (!inst) return false;
    if (INSTANCE_STATUSES_BLOCKING_RENT.includes(inst.lifecycleStatus)) {
        return false;
    }

    const buildItemFilter = (extra = {}) => ({
        productInstanceId: instanceId,
        ...(excludeOrderId ? { orderId: { $ne: excludeOrderId } } : {}),
        ...extra,
    });

    // Kiá»ƒm tra 1: chá»“ng láº¥p ngÃ y há»£p Ä‘á»“ng vá»›i Ä‘Æ¡n chÆ°a káº¿t thÃºc
    // LÆ°u Ã½ timezone/ranh giá»›i ngÃ y:
    // - frontend/backend cÃ³ thá»ƒ parse date theo UTC khÃ¡c UTC+7
    // - end date trong nghiá»‡p vá»¥ thÆ°á»ng mang nghÄ©a "Ä‘áº¿n háº¿t ngÃ y"
    // => quy Ä‘á»•i sang "ngÃ y lá»‹ch Viá»‡t Nam" Ä‘á»ƒ quyáº¿t Ä‘á»‹nh overlap cho Ä‘Ãºng (cho phÃ©p thuÃª liÃªn tiáº¿p).
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
    const toVnCalendarDay = (d) => Math.floor((new Date(d).getTime() + VN_TZ_OFFSET_MS) / DAY_IN_MS);

    const requestedStartDay = toVnCalendarDay(rentStartDate);
    const requestedEndDay = toVnCalendarDay(rentEndDate);

    // Candidate window theo timestamp (Ä‘á»ƒ giáº£m sá»‘ lÆ°á»£ng record),
    // rá»“i váº«n lá»c láº¡i overlap theo ngÃ y VN (Ä‘á»ƒ chá»‘ng sai lá»‡ch timezone/biÃªn).
    const requestedStartUtcMidnight = new Date(requestedStartDay * DAY_IN_MS - VN_TZ_OFFSET_MS);
    const requestedEndUtcMidnightExclusive = new Date((requestedEndDay + 1) * DAY_IN_MS - VN_TZ_OFFSET_MS);

    const overlapQuery = RentOrderItem.find(buildItemFilter({
        rentStartDate: { $lt: requestedEndUtcMidnightExclusive },
        rentEndDate: { $gte: requestedStartUtcMidnight },
    })).populate({ path: 'orderId', select: 'status' });

    if (session) overlapQuery.session(session);
    const overlaps = await overlapQuery.lean();

    const conflictingOverlaps = overlaps.filter((item) => {
        if (!item.orderId) return false;
        const status = String(item.orderId.status || '').toLowerCase();
        if (TERMINAL_ORDER_STATUSES.includes(status)) return false;

        if (!item.rentStartDate || !item.rentEndDate) return false;

        const itemStartDay = toVnCalendarDay(item.rentStartDate);
        const itemEndDay = toVnCalendarDay(item.rentEndDate);

        // Overlap theo ngÃ y lá»‹ch VN (end lÃ  inclusive theo nghiá»‡p vá»¥).
        return itemStartDay <= requestedEndDay && itemEndDay >= requestedStartDay;
    });
    if (conflictingOverlaps.length > 0) {
        return false;
    }

    // Kiá»ƒm tra 2: Ä‘Æ¡n trá»… háº¡n váº«n cÃ²n active
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const lateQuery = RentOrderItem.find(buildItemFilter({
        rentEndDate: { $lt: today },
    })).populate({ path: 'orderId', select: 'status' });

    if (session) lateQuery.session(session);
    const pastDueItems = await lateQuery.lean();

    const activeLateOrders = pastDueItems.filter((item) => {
        if (!item.orderId) return false;
        const status = String(item.orderId.status || '').toLowerCase();
        if (TERMINAL_ORDER_STATUSES.includes(status)) return false;
        return true;
    });
    if (activeLateOrders.length > 0) {
        return false;
    }

    return true;
};

const fetchOrderItems = async (orderId) => {
    return RentOrderItem.find({ orderId })
        .populate({
            path: 'productInstanceId',
            populate: { path: 'productId' }
        })
        .lean();
};

const mapLegacyInvoicePayload = (snapshot = {}, invoiceDoc = null) => {
    const doc = invoiceDoc || {};
    const issuedAt = doc.issuedAt || snapshot.issuedAt || null;
    return {
        invoiceRecordId: snapshot.invoiceRecordId || (doc._id ? String(doc._id) : ''),
        invoiceId: doc.invoiceId || snapshot.invoiceId || '',
        invoiceNo: doc.invoiceNo || snapshot.invoiceNo || '',
        invoiceDate: issuedAt,
        pdfUrl: doc.pdfUrl || '',
        xmlUrl: doc.xmlUrl || '',
        provider: doc.provider || '',
        documentTitle: doc.documentTitle || '',
        documentTypeLabel: doc.documentTypeLabel || '',
        purpose: doc.purpose || 'General',
        status: doc.status || snapshot.status || 'pending',
        issuedAt,
        cancelledAt: doc.cancelledAt || snapshot.cancelledAt || null,
        errorMessage: doc.errorMessage || snapshot.errorMessage || '',
        emailTo: doc.emailTo || '',
        emailStatus: doc.emailStatus || snapshot.emailStatus || 'pending',
        emailSentAt: doc.emailSentAt || null,
        emailError: doc.emailError || '',
        updatedAt: snapshot.updatedAt || doc.updatedAt || null,
    };
};

const attachRentInvoiceCompat = async (orders = []) => {
    if (!Array.isArray(orders) || orders.length === 0) return orders;

    const orderIds = orders.map((order) => order?._id).filter(Boolean);
    const invoiceRecordIds = orders
        .map((order) => order?.invoice?.invoiceRecordId)
        .filter(Boolean);

    if (orderIds.length === 0) return orders;

    const invoices = await Invoice.find({
        orderRefModel: 'RentOrder',
        orderRefId: { $in: orderIds },
        status: { $in: ['issued', 'pending', 'failed'] },
    })
        .sort({ issuedAt: -1, createdAt: -1 })
        .lean();

    const invoiceByOrderId = new Map();
    for (const invoice of invoices) {
        const key = String(invoice.orderRefId || '');
        if (!invoiceByOrderId.has(key)) {
            invoiceByOrderId.set(key, invoice);
        }
    }

    const invoiceByRecordId = new Map(
        invoices
            .filter((invoice) => invoiceRecordIds.includes(String(invoice._id)))
            .map((invoice) => [String(invoice._id), invoice])
    );

    return orders.map((order) => {
        const snapshot = order?.invoice || {};
        const invoiceDoc = invoiceByRecordId.get(String(snapshot.invoiceRecordId || ''))
            || invoiceByOrderId.get(String(order?._id || ''))
            || null;

        return {
            ...order,
            invoice: mapLegacyInvoicePayload(snapshot, invoiceDoc),
        };
    });
};

const attachItems = async (orders = []) => {
    const orderIds = orders.map((order) => order._id);
    if (orderIds.length === 0) return orders;

    const items = await RentOrderItem.find({ orderId: { $in: orderIds } })
        .populate({
            path: 'productInstanceId',
            populate: { path: 'productId' }
        })
        .lean();

    const byOrder = items.reduce((acc, item) => {
        const key = safeObjectId(item.orderId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const mappedOrders = orders.map((order) => ({
        ...order.toObject(),
        items: byOrder[safeObjectId(order._id)] || []
    }));

    return attachRentInvoiceCompat(mappedOrders);
};

const fetchOrderDetail = async (orderId) => {
    const order = await RentOrder.findById(orderId)
        .populate('customerId', 'name phone email')
        .populate('staffId', 'name phone');

    if (!order) return null;

    const [items, deposits, payments, collaterals, returnRecord] = await Promise.all([
        fetchOrderItems(orderId),
        Deposit.find({ orderId }).lean(),
        Payment.find({ orderId, orderType: ORDER_TYPE.RENT }).lean(),
        Collateral.find({ orderId }).lean(),
        ReturnRecord.findOne({ orderId }).lean()
    ]);

    const orderObject = order.toObject();
    const [orderWithInvoice] = await attachRentInvoiceCompat([orderObject]);

    return {
        ...orderWithInvoice,
        items,
        deposits,
        payments,
        collaterals,
        returnRecord
    };
};

const buildRentOrderSuccessResponse = (detail) => ({
    success: true,
    totalPrice: detail.totalAmount,
    discountAmount: detail.discountAmount || 0,
    voucherCode: detail.voucherCode,
    data: detail
});

const snapshotOrderForAudit = (order) => ({
    status: order?.status,
    staffId: safeObjectId(order?.staffId),
    depositAmount: Number(order?.depositAmount || 0),
    remainingAmount: Number(order?.remainingAmount || 0),
    totalAmount: Number(order?.totalAmount || 0),
    lateDays: Number(order?.lateDays || 0),
    lateFee: Number(order?.lateFee || 0),
    damageFee: Number(order?.damageFee || 0),
    compensationFee: Number(order?.compensationFee || 0),
    depositForfeited: Boolean(order?.depositForfeited),
    pickupAt: order?.pickupAt || null,
    returnedAt: order?.returnedAt || null,
    noShowAt: order?.noShowAt || null,
});

/**
 * Kiá»ƒm tra xem MongoDB hiá»‡n táº¡i cÃ³ há»— trá»£ transaction (replica set hoáº·c mongos) khÃ´ng.
 * Káº¿t quáº£ Ä‘Æ°á»£c cache Ä‘á»ƒ trÃ¡nh gá»i hello command nhiá»u láº§n.
 *
 * - Replica set: `hello` tráº£ vá» `setName`.
 * - Sharded cluster (mongos): `hello` tráº£ vá» `msg === 'isdbgrid'`.
 * - Standalone: khÃ´ng cÃ³ cáº£ hai â†’ khÃ´ng thá»ƒ dÃ¹ng transaction.
 */
let cachedTransactionSupport = null;
const detectTransactionSupport = async () => {
    if (cachedTransactionSupport !== null) {
        return cachedTransactionSupport;
    }
    try {
        const admin = mongoose.connection.db?.admin?.();
        if (!admin) {
            cachedTransactionSupport = false;
            return cachedTransactionSupport;
        }
        const info = await admin.command({ hello: 1 });
        const isReplicaSet = Boolean(info?.setName);
        const isMongos = info?.msg === 'isdbgrid';
        cachedTransactionSupport = isReplicaSet || isMongos;
    } catch (err) {
        console.warn('Transaction support detection failed, fallback to non-transactional mode:', err?.message || err);
        cachedTransactionSupport = false;
    }
    return cachedTransactionSupport;
};

/**
 * Khá»Ÿi táº¡o session + transaction náº¿u server há»— trá»£, náº¿u khÃ´ng thÃ¬ cháº¡y cháº¿ Ä‘á»™ khÃ´ng transaction.
 */
const startTransactionIfAvailable = async () => {
    const supportsTransaction = await detectTransactionSupport();
    if (!supportsTransaction) {
        return { session: null, useTransaction: false };
    }

    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        return { session, useTransaction: true };
    } catch (err) {
        const message = String(err?.message || '');
        const isReplicaSetRequiredError =
            err?.code === 20
            || err?.codeName === 'IllegalOperation'
            || message.includes('Transaction numbers are only allowed on a replica set member or mongos');

        if (session) {
            await session.endSession();
        }

        if (isReplicaSetRequiredError) {
            cachedTransactionSupport = false;
            return { session: null, useTransaction: false };
        }

        throw err;
    }
};

/**
 * Quyáº¿t toÃ¡n tÃ i chÃ­nh sau khi Ä‘Æ¡n hoÃ n táº¥t.
 *
 * NguyÃªn táº¯c:
 *  - Tiá»n cá»c online (deposit) = khoáº£n thanh toÃ¡n Ä‘áº§u (50% tiá»n thuÃª) â†’ tiÃªu thá»¥, KHÃ”NG hoÃ n láº¡i.
 *  - Tháº¿ cháº¥p tiá»n máº·t phá»§ khoáº£n cÃ²n láº¡i (remaining chÆ°a thu + cÃ¡c phÃ­), hoÃ n pháº§n thá»«a.
 *  - Náº¿u tháº¿ cháº¥p khÃ´ng Ä‘á»§ hoáº·c khÃ´ng cÃ³ â†’ thu thÃªm tá»« khÃ¡ch.
 *
 * VÃ­ dá»¥: tiá»n thuÃª 400k, cá»c online 200k, tháº¿ cháº¥p 500k, remaining 200k, khÃ´ng phÃ­:
 *   netCashRefund = 500 - 200 - 0 = 300k  (hoÃ n láº¡i cho khÃ¡ch)
 *   extraDue      = 0
 */
const settleDepositAndCollateral = async (orderId, order, method = 'Cash') => {
    const heldDeposit = await Deposit.findOne({ orderId, status: 'Held' });

    // Kiá»ƒm tra remaining Ä‘Ã£ Ä‘Æ°á»£c thu chÆ°a (cÃ³ thá»ƒ Ä‘Ã£ thu táº¡i bÆ°á»›c confirmPickup hoáº·c qua QR ExtraDue)
    const paidRemainingPayments = await Payment.find({
        orderId,
        orderType: ORDER_TYPE.RENT,
        purpose: 'Remaining',
        status: 'Paid',
    }).lean();
    const paidRemainingTotal = paidRemainingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstandingRemaining = Math.max(0, Number(order.remainingAmount || 0) - paidRemainingTotal);

    const lateFee = Number(order.lateFee || 0);
    const damageFee = Number(order.damageFee || 0);
    const compensationFee = Number(order.compensationFee || 0);
    const totalFees = lateFee + damageFee + compensationFee;

    // Khi khÃ¡ch thanh toÃ¡n QR ExtraDue, toÃ n bá»™ khoáº£n (remaining + fees) Ä‘Æ°á»£c ghi lÃ  purpose='Remaining'.
    // Pháº§n dÆ° vÆ°á»£t quÃ¡ remainingAmount Ä‘Ã£ thá»±c sá»± phá»§ phÃ­ â†’ trÃ¡nh thu/táº¡o báº£n ghi trÃ¹ng.
    const feesCoveredByRemaining = Math.max(0, paidRemainingTotal - Number(order.remainingAmount || 0));
    const unpaidFees = Math.max(0, totalFees - feesCoveredByRemaining);

    const totalOutstanding = outstandingRemaining + unpaidFees;

    // Tháº¿ cháº¥p tiá»n máº·t
    const heldCashCollaterals = await Collateral.find({ orderId, type: 'CASH', status: 'Held' });
    const cashCollateralTotal = heldCashCollaterals.reduce((s, c) => s + Number(c.cashAmount || 0), 0);

    // Pháº§n tháº¿ cháº¥p phá»§ khoáº£n ná»£, pháº§n thá»«a hoÃ n láº¡i
    const netCashRefund = Math.max(0, cashCollateralTotal - totalOutstanding);
    // Khoáº£n cÃ²n thiáº¿u sau khi dÃ¹ng háº¿t tháº¿ cháº¥p
    const extraDue = Math.max(0, totalOutstanding - cashCollateralTotal);

    // Ghi nháº­n thanh toÃ¡n remaining tá»« tháº¿ cháº¥p (náº¿u chÆ°a thu riÃªng)
    if (outstandingRemaining > 0 && cashCollateralTotal > 0) {
        const coveredFromCash = Math.min(outstandingRemaining, cashCollateralTotal);
        await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId,
            amount: coveredFromCash,
            method: 'Cash',
            status: 'Paid',
            purpose: 'Remaining',
            transactionCode: `REM_CASH_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date(),
        });
    }

    // HoÃ n láº¡i pháº§n thá»«a cá»§a tháº¿ cháº¥p tiá»n máº·t
    if (netCashRefund > 0) {
        await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId,
            amount: netCashRefund,
            method: 'Cash',
            status: 'Paid',
            purpose: 'Refund',
            transactionCode: `COL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date(),
        });
    }

    if (extraDue > 0) {
        await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId,
            amount: extraDue,
            method,
            status: 'Paid',
            purpose: 'Remaining',
            transactionCode: `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date(),
        });
    }

    // ÄÃ¡nh dáº¥u cá»c online Ä‘Ã£ tiÃªu thá»¥ (khÃ´ng hoÃ n)
    if (heldDeposit) {
        await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Forfeited' });
    }

    await Collateral.updateMany(
        { orderId, status: 'Held' },
        { status: 'Returned', returnedAt: new Date() }
    );

    return { outstandingRemaining, cashCollateralTotal, netCashRefund, extraDue, totalFees };
};

exports.settleDepositAndCollateral = settleDepositAndCollateral;

// Export helper Ä‘á»ƒ payment.controller dÃ¹ng kiá»ƒm tra double-booking (trÃ¡nh circular dep)
exports.isInstanceAvailableForPeriodExcluding = (instanceId, rentStartDate, rentEndDate, excludeOrderId) =>
    isInstanceAvailableForPeriod(instanceId, rentStartDate, rentEndDate, null, excludeOrderId);

const auditOrderChange = async (req, action, orderId, before, after) => (
    writeAuditLog({
        req,
        user: req.user,
        action,
        resource: 'RentOrder',
        resourceId: orderId,
        before,
        after,
    })
);

/**
 * Resolve product instances cho danh sÃ¡ch items trong Ä‘Æ¡n thuÃª.
 * TÃ¬m instance kháº£ dá»¥ng theo productInstanceId hoáº·c productId, check availability theo khoáº£ng ngÃ y.
 * DÃ¹ng chung cho createRentOrder vÃ  createWalkInOrder.
 */
const resolveRentInstances = async (items, defaultStart, defaultEnd, session, useTransaction) => {
    const resolvedItems = [];
    const lockedInstanceIds = new Set();

    for (const item of items) {
        let instance = null;
        const itemRentStart = new Date(item.rentStartDate || defaultStart);
        const itemRentEnd = new Date(item.rentEndDate || defaultEnd);

        if (Number.isNaN(itemRentStart.getTime()) || Number.isNaN(itemRentEnd.getTime()) || itemRentStart > itemRentEnd) {
            throw new Error('NgÃ y thuÃª khÃ´ng há»£p lá»‡');
        }

        const isInstanceRentable = async (inst) => {
            if (!inst) return false;
            // Chá»‰ cháº·n tuyá»‡t Ä‘á»‘i Lost/Sold. CÃ¡c lifecycle khÃ¡c (Available/Reserved/Rented/Washing/Repair)
            // váº«n cÃ³ thá»ƒ Ä‘áº·t thuÃª cho khoáº£ng ngÃ y KHÃ”NG overlap â€” tÃ­nh kháº£ dá»¥ng do
            // isInstanceAvailableForPeriod quyáº¿t Ä‘á»‹nh dá»±a trÃªn RentOrderItem.
            if (INSTANCE_STATUSES_BLOCKING_RENT.includes(inst.lifecycleStatus)) return false;
            return isInstanceAvailableForPeriod(inst._id, itemRentStart, itemRentEnd, useTransaction ? session : null);
        };

        const requestedSize = String(item.size || '').trim();
        // "FREE SIZE" tá»« FE tÆ°Æ¡ng Ä‘Æ°Æ¡ng vá»›i khÃ´ng cÃ³ size cá»¥ thá»ƒ â€” ProductInstance cá»§a sáº£n pháº©m no-size cÃ³ size = ''.
        const hasExplicitSize = requestedSize && requestedSize.toUpperCase() !== 'FREE SIZE';
        const sizeLabel = hasExplicitSize ? requestedSize : '';
        const sizeMismatchMessage = sizeLabel
            ? `Sáº£n pháº©m size ${sizeLabel} khÃ´ng cÃ²n kháº£ dá»¥ng hoáº·c Ä‘Ã£ háº¿t hÃ ng Ä‘á»ƒ thuÃª.`
            : 'CÃ³ sáº£n pháº©m khÃ´ng kháº£ dá»¥ng hoáº·c Ä‘Ã£ háº¿t hÃ ng Ä‘á»ƒ thuÃª.';

        if (item.productInstanceId) {
            const inst = useTransaction
                ? await ProductInstance.findById(item.productInstanceId).session(session)
                : await ProductInstance.findById(item.productInstanceId);

            // Äáº£m báº£o instance khá»›p Ä‘Ãºng size khÃ¡ch chá»n, trÃ¡nh gÃ¡n nháº§m size khÃ¡c
            if (inst && hasExplicitSize && String(inst.size || '').trim() !== sizeLabel) {
                throw new Error(sizeMismatchMessage);
            }

            if (!(await isInstanceRentable(inst))) {
                throw new Error(sizeMismatchMessage);
            }
            instance = inst;
        } else if (item.productId) {
            // Æ¯u tiÃªn Used (conditionScore tháº¥p) trÆ°á»›c, náº¿u khÃ´ng Ä‘á»§ má»›i láº¥y New
            // KhÃ´ng filter cá»©ng theo 'Available' Ä‘á»ƒ 1 instance cÃ³ thá»ƒ phá»¥c vá»¥ nhiá»u khoáº£ng ngÃ y
            // khÃ¡c nhau; chá»‰ loáº¡i cÃ¡c lifecycle KHÃ”NG thá»ƒ cho thuÃª (Lost/Sold).
            const candidateFilter = {
                productId: item.productId,
                _id: { $nin: Array.from(lockedInstanceIds) },
                lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT },
            };
            if (hasExplicitSize) {
                candidateFilter.size = sizeLabel;
            }

            const candidatesQuery = ProductInstance.find(candidateFilter).sort({ conditionScore: 1 });
            const candidates = useTransaction ? await candidatesQuery.session(session) : await candidatesQuery;
            for (const cand of candidates) {
                if (await isInstanceRentable(cand)) {
                    instance = cand;
                    break;
                }
            }

            if (!instance && hasExplicitSize) {
                // KhÃ´ng cÃ³ instance size yÃªu cáº§u â€” bÃ¡o rÃµ thay vÃ¬ nuá»‘t lá»—i
                throw new Error(sizeMismatchMessage);
            }
        }

        if (!instance) throw new Error('CÃ³ sáº£n pháº©m khÃ´ng kháº£ dá»¥ng hoáº·c Ä‘Ã£ háº¿t hÃ ng Ä‘á»ƒ thuÃª.');
        lockedInstanceIds.add(instance._id.toString());
        resolvedItems.push({ source: item, instance, rentStartDate: itemRentStart, rentEndDate: itemRentEnd });
    }

    return resolvedItems;
};

/**
 * ÄÃ¡nh dáº¥u Reserved cho cÃ¡c instance thuá»™c Ä‘Æ¡n náº¿u ngÃ y thuÃª náº±m trong ngÆ°á»¡ng HOURS_BEFORE_RESERVED.
 * DÃ¹ng chung cho payDeposit, staffCollectDeposit, confirmRentOrder.
 */
const findRentOrderByIdempotencyKey = async (idempotencyKey) => {
    if (!idempotencyKey) return null;
    return RentOrder.findOne({ idempotencyKey }).sort({ createdAt: -1 });
};

exports.createRentOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    let idempotencyKey = null;

    try {
        const userId = req.user?.id;
        const role = String(req.user?.role || '').trim().toLowerCase();
        const { rentStartDate, rentEndDate, items = [], voucherCode = '' } = req.body;
        idempotencyKey = normalizeIdempotencyKey(req);

        if (!rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lÃ²ng cung cáº¥p Ä‘áº§y Ä‘á»§ thÃ´ng tin thuÃª'
            });
        }

        const parsedStart = new Date(rentStartDate);
        const parsedEnd = new Date(rentEndDate);
        if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'NgÃ y thuÃª khÃ´ng há»£p lá»‡' });
        }
        if (parsedEnd < parsedStart) {
            return res.status(400).json({ success: false, message: 'NgÃ y káº¿t thÃºc khÃ´ng thá»ƒ trÆ°á»›c ngÃ y báº¯t Ä‘áº§u' });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const startDay = new Date(parsedStart);
        startDay.setHours(0, 0, 0, 0);
        if (startDay < todayStart) {
            return res.status(400).json({ success: false, message: 'NgÃ y báº¯t Ä‘áº§u thuÃª khÃ´ng thá»ƒ lÃ  ngÃ y trong quÃ¡ khá»©' });
        }
        const rentalDays = Math.ceil((parsedEnd - parsedStart) / (24 * 60 * 60 * 1000));
        if (rentalDays > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Thá»i gian thuÃª tá»‘i Ä‘a lÃ  ${MAX_RENTAL_DAYS} ngÃ y` });
        }

        const existingOrder = await findRentOrderByIdempotencyKey(idempotencyKey);
        if (existingOrder) {
            if (existingOrder.voucherId || existingOrder.voucherCode) {
                await repairVoucherUsageCounterIfNeeded({
                    voucherId: existingOrder.voucherId,
                    voucherCode: existingOrder.voucherCode,
                });
            }
            const detail = await fetchOrderDetail(existingOrder._id);
            return res.status(200).json(buildRentOrderSuccessResponse(detail));
        }

        let activeShift = null;
        if (role === 'staff') {
            activeShift = await getActiveShiftForStaff(userId);
            if (!activeShift?.shift) {
                return res.status(403).json({
                    success: false,
                    message: 'Báº¡n pháº£i Ä‘ang trong ca lÃ m (Ä‘Ã£ check-in vÃ  chÆ°a check-out) Ä‘á»ƒ táº¡o Ä‘Æ¡n.',
                });
            }
        }

        const invalidPriceItem = items.find((item) => Number(item.baseRentPrice || 0) <= 0);
        if (invalidPriceItem) {
            return res.status(400).json({ success: false, message: 'GiÃ¡ thuÃª khÃ´ng há»£p lá»‡, vui lÃ²ng thá»­ láº¡i.' });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const resolvedItems = await resolveRentInstances(items, rentStartDate, rentEndDate, session, useTransaction);

        // Reserved immediately when the rent order is created.

        // 3. TÃ­nh toÃ¡n tiá»n nong (Giá»¯ nguyÃªn logic cá»±c tá»‘t cá»§a báº¡n)
        const computedTotalAmount = resolvedItems.reduce(
            (sum, item) => sum + Number(item.source.finalPrice || item.source.baseRentPrice || item.instance.currentRentPrice || 0),
            0
        );
        const voucherApplication = await applyVoucherForRentOrder({
            voucherCode,
            user: req.user,
            items,
            subtotal: computedTotalAmount
        });

        if (voucherApplication.error) {
            if (session) {
                if (useTransaction) await session.abortTransaction();
                await session.endSession();
                session = null;
            }
            return res.status(400).json(voucherApplication.error);
        }

        const orderTotalAmount = Number(voucherApplication.finalSubtotal || 0);
        const depositAmount = computeExpectedDeposit({ totalAmount: orderTotalAmount });
        const remainingAmount = Math.max(orderTotalAmount - depositAmount, 0);

        // 4. Táº¡o Order (LÆ°u Ã½ máº£ng [] khi dÃ¹ng create vá»›i session)
        const [rentOrder] = await RentOrder.create([{
            customerId: userId || req.body.customerId,
            staffId: role === 'staff' ? userId : null,
            shiftId: role === 'staff' ? activeShift.shift._id : null,
            status: 'PendingDeposit',
            rentStartDate,
            rentEndDate,
            idempotencyKey,
            voucherCode: voucherApplication.voucherCode,
            voucherId: voucherApplication.voucher?._id || null,
            voucherSnapshot: voucherApplication.voucherSnapshot,
            discountAmount: voucherApplication.discountAmount,
            depositAmount,
            remainingAmount,
            damageFee: 0,
            lateDays: 0,
            lateFee: 0,
            compensationFee: 0,
            totalAmount: orderTotalAmount,
        }], { session });

        // GÃ¡n mÃ£ Ä‘Æ¡n sau khi cÃ³ _id
        rentOrder.orderCode = generateOrderCode(rentOrder._id);
        await rentOrder.save(useTransaction ? { session } : {});

        // 5. Táº¡o Order Items
        await RentOrderItem.insertMany(
            resolvedItems.map((item) => ({
                orderId: rentOrder._id,
                productInstanceId: item.instance._id,
                baseRentPrice: item.source.baseRentPrice || item.instance.currentRentPrice,
                finalPrice: item.source.finalPrice || item.instance.currentRentPrice,
                rentStartDate: item.rentStartDate || item.source.rentStartDate || rentStartDate,
                rentEndDate: item.rentEndDate || item.source.rentEndDate || rentEndDate,
                condition: item.instance.conditionLevel,
                appliedRuleIds: item.source.appliedRuleIds || [],
                selectLevel: item.source.selectLevel || '',
                size: item.source.size,
                color: item.source.color,
                note: item.source.note || ''
            })),
            useTransaction ? { session } : {}
        );

        // KHÃ”NG Ä‘á»•i lifecycleStatus cá»§a instance khi táº¡o Ä‘Æ¡n.
        // Instance giá»¯ Available cho Ä‘áº¿n khi cron autoReserveInstances quÃ©t (HOURS_BEFORE_RESERVED
        // trÆ°á»›c ngÃ y thuÃª) hoáº·c staff confirmPickup â€” nhá» váº­y 1 instance cÃ³ thá»ƒ phá»¥c vá»¥ nhiá»u
        // Ä‘Æ¡n thuÃª cho cÃ¡c khoáº£ng ngÃ y khÃ¡c nhau.

        if (voucherApplication.voucher?._id) {
            if (useTransaction) {
                await Voucher.findByIdAndUpdate(
                    voucherApplication.voucher._id,
                    { $inc: { usedCount: 1 } },
                    { session }
                );
            } else {
                await Voucher.findByIdAndUpdate(voucherApplication.voucher._id, {
                    $inc: { usedCount: 1 }
                });
            }
        }

        // 6. HoÃ n táº¥t thÃ nh cÃ´ng (Commit)
        if (session) {
            if (useTransaction) {
                await session.commitTransaction();
            }
            await session.endSession();
            session = null;
        }

        // Äoáº¡n nÃ y láº¥y detail ngoÃ i session vÃ¬ data Ä‘Ã£ Ä‘Æ°á»£c commit
        const detail = await fetchOrderDetail(rentOrder._id);

        return res.status(201).json(buildRentOrderSuccessResponse(detail));

    } catch (error) {
        if (idempotencyKey && isDuplicateIdempotencyError(error)) {
            const existingOrder = await findRentOrderByIdempotencyKey(idempotencyKey);
            if (existingOrder) {
                if (existingOrder.voucherId || existingOrder.voucherCode) {
                    await repairVoucherUsageCounterIfNeeded({
                        voucherId: existingOrder.voucherId,
                        voucherCode: existingOrder.voucherCode,
                    });
                }
                const detail = await fetchOrderDetail(existingOrder._id);
                if (session) {
                    if (useTransaction) {
                        await session.abortTransaction();
                    }
                    await session.endSession();
                    session = null;
                }
                return res.status(200).json(buildRentOrderSuccessResponse(detail));
            }
        }
        // CÃ“ Lá»–I Xáº¢Y RA -> ROLLBACK TRáº¢ Láº I Äá»’ Vá»€ TRáº NG THÃI CÅ¨
        if (session) {
            if (useTransaction) {
                await session.abortTransaction();
            }
            await session.endSession();
        }

        // Tráº£ mÃ£ 400 náº¿u lÃ  lá»—i logic (khÃ¡ch hÃ ng), 500 náº¿u lá»—i DB
        const CLIENT_ERROR_KEYWORDS = ['kháº£ dá»¥ng', 'háº¿t hÃ ng', 'NgÃ y thuÃª', 'quÃ¡ khá»©', 'khÃ´ng há»£p lá»‡'];
        const isClientError = error.isClientError === true
            || CLIENT_ERROR_KEYWORDS.some((kw) => error.message.includes(kw));
        if (!isClientError) {
            console.error('Create rent order error:', error);
        }
        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: isClientError ? error.message : 'Lá»—i server khi táº¡o Ä‘Æ¡n thuÃª',
            error: error.message
        });
    }
};

exports.getMyRentOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { customerId: userId };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            RentOrder.find(query)
                .populate('customerId', 'name phone email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            RentOrder.countDocuments(query)
        ]);

        const data = await attachItems(orders);

        return res.json({
            success: true,
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get my rent orders error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server khi láº¥y danh sÃ¡ch Ä‘Æ¡n thuÃª',
            error: error.message
        });
    }
};

exports.getRentOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const detail = await fetchOrderDetail(id);
        if (!detail) {
            return res.status(404).json({
                success: false,
                message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª'
            });
        }

        if (safeObjectId(detail.customerId?._id || detail.customerId) !== userId && !['owner', 'staff'].includes(String(userRole || '').toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Báº¡n khÃ´ng cÃ³ quyá»n xem Ä‘Æ¡n thuÃª nÃ y'
            });
        }

        return res.json({
            success: true,
            data: detail
        });
    } catch (error) {
        console.error('Get rent order by id error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server khi láº¥y chi tiáº¿t Ä‘Æ¡n thuÃª',
            error: error.message
        });
    }
};

exports.payDeposit = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;
        const userId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (safeObjectId(order.customerId) !== userId) {
            return res.status(403).json({ success: false, message: 'Báº¡n khÃ´ng cÃ³ quyá»n thanh toÃ¡n Ä‘Æ¡n nÃ y' });
        }

        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ Ä‘áº·t cá»c vá»›i tráº¡ng thÃ¡i \"${order.status}\"`
            });
        }

        try {
            validateDeposit(order, order.depositAmount);
        } catch (guardError) {
            return res.status(guardError.statusCode || 400).json({
                success: false,
                message: guardError.message,
                details: guardError.details,
            });
        }

        const existingDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        if (existingDeposit) {
            return res.status(400).json({ success: false, message: 'ÄÆ¡n thuÃª nÃ y Ä‘Ã£ cÃ³ Ä‘áº·t cá»c' });
        }

        // Re-check availability Ä‘á»ƒ chá»‘ng double-booking (2 user Ä‘áº·t cÃ¹ng lÃºc)
        // excludeOrderId = id â†’ bá» qua chÃ­nh Ä‘Æ¡n nÃ y khi check trÃ¡nh tá»± block
        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const orderItemsQuery = RentOrderItem.find({ orderId: id }).lean();
        if (useTransaction) orderItemsQuery.session(session);
        const orderItems = await orderItemsQuery;
        for (const item of orderItems) {
            const available = await isInstanceAvailableForPeriod(
                item.productInstanceId,
                item.rentStartDate,
                item.rentEndDate,
                null,
                id
            );
            if (!available) {
                order.status = 'Cancelled';
                order.history = [
                    ...(order.history || []),
                    {
                        status: 'Cancelled',
                        action: 'double_booking_auto_cancel',
                        description: 'ÄÆ¡n bá»‹ há»§y tá»± Ä‘á»™ng do sáº£n pháº©m Ä‘Ã£ Ä‘Æ°á»£c thuÃª bá»Ÿi khÃ¡ch khÃ¡c.',
                        updatedAt: new Date(),
                    },
                ];
                await order.save(txOptions);
                const conflictInstanceIds = orderItems.map((i) => i.productInstanceId).filter(Boolean);
                if (conflictInstanceIds.length > 0) {
                    // Chá»‰ release náº¿u instance khÃ´ng cÃ²n phá»¥c vá»¥ Ä‘Æ¡n active khÃ¡c.
                    await safeReleaseInstancesAfterOrderExit(conflictInstanceIds, id, txOptions);
                }
                if (session) {
                    if (useTransaction) await session.commitTransaction();
                    await session.endSession();
                    session = null;
                }
                return res.status(409).json({
                    success: false,
                    message: 'Sáº£n pháº©m nÃ y vá»«a Ä‘Æ°á»£c thuÃª bá»Ÿi khÃ¡ch hÃ ng khÃ¡c. ÄÆ¡n thuÃª cá»§a báº¡n Ä‘Ã£ bá»‹ há»§y tá»± Ä‘á»™ng.',
                });
            }
        }

        const [deposit] = await Deposit.create([{
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Held',
            paidAt: new Date()
        }], txOptions);

        const [payment] = await Payment.create([{
            orderType: ORDER_TYPE.RENT,
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Paid',
            purpose: 'Deposit',
            transactionCode: `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date()
        }], txOptions);

        const before = snapshotOrderForAudit(order);
        order.status = 'Deposited';
        await order.save(txOptions);

        // KHÃ”NG Ä‘á»•i lifecycle instance khi nháº­n cá»c. Cron autoReserveInstances sáº½ tá»±
        // chuyá»ƒn Available â†’ Reserved khi cÃ²n HOURS_BEFORE_RESERVED giá» trÆ°á»›c ngÃ y thuÃª,
        // staff sáº½ Ä‘Æ°á»£c nháº¯c chuáº©n bá»‹ hÃ ng qua alert RENT_PICKUP_SOON.

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        await writeAuditLog({
            req,
            user: req.user,
            action: 'orders_rent.deposit.confirm',
            resource: 'Deposit',
            resourceId: deposit._id,
            before: null,
            after: {
                orderId: id,
                amount: Number(deposit.amount || 0),
                method: deposit.method,
                status: deposit.status,
            },
        });
        await auditOrderChange(req, 'orders_rent.deposit.confirm', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Thanh toÃ¡n Ä‘áº·t cá»c thÃ nh cÃ´ng',
            data: {
                order: await fetchOrderDetail(id),
                deposit,
                payment
            }
        });
    } catch (error) {
        if (session) {
            try {
                if (useTransaction) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        console.error('Pay deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server khi thanh toÃ¡n Ä‘áº·t cá»c',
            error: error.message
        });
    }
};

exports.cancelRentOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        const userRole = String(req.user?.role || '').toLowerCase();
        const isStaff = ['owner', 'staff'].includes(userRole);
        if (!isStaff && safeObjectId(order.customerId) !== userId) {
            return res.status(403).json({ success: false, message: 'Báº¡n khÃ´ng cÃ³ quyá»n há»§y Ä‘Æ¡n nÃ y' });
        }

        const previousStatus = order.status;
        if (!['Draft', 'PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup'].includes(previousStatus)) {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ há»§y Ä‘Æ¡n vá»›i tráº¡ng thÃ¡i \"${previousStatus}\"`
            });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const before = snapshotOrderForAudit(order);
        order.status = 'Cancelled';
        await order.save(txOptions);

        const itemsQuery = RentOrderItem.find({ orderId: id }).lean();
        if (useTransaction) itemsQuery.session(session);
        const items = await itemsQuery;
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            // Chá»‰ release náº¿u khÃ´ng cÃ²n Ä‘Æ¡n active khÃ¡c dÃ¹ng instance.
            await safeReleaseInstancesAfterOrderExit(instanceIds, id, txOptions);
        }

        // HoÃ n cá»c khi há»§y á»Ÿ báº¥t ká»³ tráº¡ng thÃ¡i nÃ o Ä‘Ã£ Ä‘áº·t cá»c
        if (['Deposited', 'Confirmed', 'WaitingPickup'].includes(previousStatus)) {
            await Deposit.updateMany({ orderId: id, status: 'Held' }, { status: 'Refunded' }, txOptions);
        }

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        await auditOrderChange(req, 'orders_rent.order.cancel', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Huy don thue thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        if (session) {
            try {
                if (useTransaction) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        console.error('Cancel rent order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server khi há»§y Ä‘Æ¡n thuÃª',
            error: error.message
        });
    }
};

exports.getAllRentOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status) query.status = status;

        const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const skip = (Number(page) - 1) * cappedLimit;
        const [orders, total, distinctStatuses] = await Promise.all([
            RentOrder.find(query)
                .populate('customerId', 'name phone email')
                .populate('staffId', 'name phone')
                .sort({ createdAt: 1, _id: 1 })
                .skip(skip)
                .limit(cappedLimit),
            RentOrder.countDocuments(query),
            RentOrder.distinct('status', {})
        ]);

        const data = await attachItems(orders);
        const statusSet = new Set(distinctStatuses.map((item) => String(item || '').trim()).filter(Boolean));
        const statusOrder = Object.values(RENT_ORDER_STATUS);
        const statusOptions = statusOrder
            .filter((statusKey) => statusSet.has(statusKey))
            .map((statusKey) => ({
                value: statusKey,
                label: RENT_STATUS_META[statusKey] || statusKey
            }));

        return res.json({
            success: true,
            data,
            pagination: {
                page: Number(page),
                limit: cappedLimit,
                total,
                pages: Math.ceil(total / cappedLimit)
            },
            meta: {
                statusOptions
            }
        });
    } catch (error) {
        console.error('Get all rent orders error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server',
            error: error.message
        });
    }
};

/**
 * PUT /:id/collect-deposit
 * Staff xÃ¡c nháº­n Ä‘Ã£ thu tiá»n cá»c trá»±c tiáº¿p (Cash) cho Ä‘Æ¡n Ä‘ang á»Ÿ PendingDeposit.
 * DÃ¹ng khi: walk-in PayOS bá»‹ há»§y, staff chuyá»ƒn sang thu tiá»n máº·t thay tháº¿.
 */
exports.staffCollectDeposit = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });

        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `ÄÆ¡n khÃ´ng á»Ÿ tráº¡ng thÃ¡i chá» Ä‘áº·t cá»c. Tráº¡ng thÃ¡i hiá»‡n táº¡i: "${order.status}"` });
        }

        const existingDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        if (existingDeposit) {
            return res.status(400).json({ success: false, message: 'ÄÆ¡n nÃ y Ä‘Ã£ cÃ³ Ä‘áº·t cá»c' });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const orderItemsQuery = RentOrderItem.find({ orderId: id }).lean();
        if (useTransaction) orderItemsQuery.session(session);
        const orderItems = await orderItemsQuery;

        await Deposit.create([{
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Held',
            paidAt: new Date()
        }], txOptions);

        await Payment.create([{
            orderType: ORDER_TYPE.RENT,
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Paid',
            purpose: 'Deposit',
            transactionCode: `DEP_STAFF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date()
        }], txOptions);

        attachShiftContextForStaff(req, order);
        const before = snapshotOrderForAudit(order);
        order.status = 'Deposited';
        await order.save(txOptions);

        // TÆ°Æ¡ng tá»± payDeposit: giá»¯ lifecycle instance, Ä‘á»ƒ cron / confirmPickup xá»­ lÃ½.

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        await auditOrderChange(req, 'orders_rent.deposit.staff_collect', order._id, before, snapshotOrderForAudit(order));

        const detail = await fetchOrderDetail(id);
        return res.json({
            success: true,
            message: `ÄÃ£ ghi nháº­n thu cá»c ${order.depositAmount.toLocaleString('vi-VN')}Ä‘ (${method === 'Cash' ? 'Tiá»n máº·t' : method})`,
            data: detail
        });
    } catch (error) {
        if (session) {
            try {
                if (useTransaction) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        console.error('Staff collect deposit error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.confirmRentOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    try {
        const { id } = req.params;
        const staffId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (order.status !== 'Deposited') {
            return res.status(400).json({
                success: false,
                message: `Chi co the xac nhan don da dat coc. Trang thai hien tai: \"${order.status}\"`
            });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        order.staffId = staffId;
        attachShiftContextForStaff(req, order);
        const before = snapshotOrderForAudit(order);
        order.status = 'Confirmed';
        order.confirmedAt = new Date();
        await order.save(txOptions);

        // KhÃ´ng Ä‘á»•i lifecycle instance táº¡i bÆ°á»›c xÃ¡c nháº­n Ä‘Æ¡n â€” cron vÃ  confirmPickup sáº½ Ä‘áº£m nhiá»‡m.

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        await auditOrderChange(req, 'orders_rent.order.confirm', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Xac nhan don thue thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        if (session) {
            try {
                if (useTransaction) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        console.error('Confirm rent order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lá»—i server khi xÃ¡c nháº­n Ä‘Æ¡n thuÃª',
            error: error.message
        });
    }
};

const isOwnerOrStaff = (req, order) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (['owner', 'staff'].includes(role)) return true;
    if (!order) return false;
    return String(order.customerId) === String(req.user?.id);
};

exports.confirmPickup = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const { id } = req.params;
        const { collateral, collectRemaining = false } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y' });
        }

        attachShiftContextForStaff(req, order);

        // Cho phÃ©p xÃ¡c nháº­n láº¥y Ä‘á»“ khi Ä‘Ã£ xÃ¡c nháº­n Ä‘Æ¡n (Confirmed) hoáº·c Ä‘ang chá» láº¥y (WaitingPickup) / Ä‘Ã£ Ä‘áº·t cá»c (Deposited)
        if (!['Deposited', 'Confirmed', 'WaitingPickup'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ xÃ¡c nháº­n láº¥y Ä‘á»“ vá»›i tráº¡ng thÃ¡i "${order.status}"`
            });
        }

        try {
            await validatePickup(order, { collectRemaining });
        } catch (guardError) {
            return res.status(guardError.statusCode || 400).json({
                success: false,
                message: guardError.message,
                details: guardError.details,
            });
        }

        if (!collateral || !collateral.type) {
            return res.status(400).json({
                success: false,
                message: 'Vui lÃ²ng cung cáº¥p thÃ´ng tin tháº¿ cháº¥p (CCCD hoáº·c tiá»n máº·t).'
            });
        }

        const collateralType = String(collateral.type).toUpperCase();
        if (!['CCCD', 'GPLX', 'CAVET', 'CASH'].includes(collateralType)) {
            return res.status(400).json({
                success: false,
                message: 'Loáº¡i tháº¿ cháº¥p khÃ´ng há»£p lá»‡.'
            });
        }

        if (collateralType !== 'CASH' && !String(collateral.documentNumber || '').trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lÃ²ng nháº­p sá»‘ CCCD/GPLX/CAVET Ä‘á»ƒ tháº¿ cháº¥p.'
            });
        }

        if (collateralType === 'CASH' && Number(collateral.cashAmount || 0) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lÃ²ng nháº­p sá»‘ tiá»n tháº¿ cháº¥p há»£p lá»‡.'
            });
        }

        // 1) LÆ°u tháº¿ cháº¥p
        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        await Collateral.create([
            {
                orderId: id,
                type: collateralType,
                documentNumber: collateralType === 'CASH' ? '' : String(collateral.documentNumber || '').trim(),
                documentImageUrl: collateral.documentImageUrl || '',
                cashAmount: collateralType === 'CASH' ? Number(collateral.cashAmount || 0) : 0,
                status: 'Held',
                receiveAt: new Date()
            }
        ], txOptions);

        // 2) KhÃ´ng thu remaining táº¡i Ä‘Ã¢y.
        // - Tháº¿ cháº¥p tiá»n máº·t (CASH): bao gá»“m cáº£ pháº§n remaining, quyáº¿t toÃ¡n cuá»‘i trá»« vÃ  hoÃ n pháº§n thá»«a.
        // - Tháº¿ cháº¥p giáº¥y tá» (CCCD/GPLX/CAVET): khÃ¡ch chÆ°a tráº£ remaining, quyáº¿t toÃ¡n cuá»‘i thu thÃªm tá»« khÃ¡ch.
        // Trong cáº£ hai trÆ°á»ng há»£p, Payment(Remaining) Ä‘Æ°á»£c táº¡o táº¡i bÆ°á»›c completeWashing.

        // 3) Update tráº¡ng thÃ¡i Ä‘Æ¡n vÃ  mÃ³n Ä‘á»“
        const before = snapshotOrderForAudit(order);
        order.status = 'Renting';
        order.pickupAt = new Date();
        await order.save(txOptions);

        const items = await RentOrderItem.find({ orderId: id }).session(session).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

        if (instanceIds.length > 0) {
            await markReservedInstancesRented(instanceIds, txOptions);

            const historyDocs = instanceIds.map((instanceId) => ({
                productInstanceId: instanceId,
                status: 'Rented',
                startDate: new Date(),
                note: `Order ${id}`
            }));

            await InventoryHistory.insertMany(historyDocs, txOptions);
        }

        await auditOrderChange(req, 'orders_rent.pickup.complete', order._id, before, snapshotOrderForAudit(order));

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        return res.json({
            success: true,
            message: 'Xac nhan khach da nhan do thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        console.error('Confirm pickup error:', error);
        if (Array.isArray(error?.blockingInstances) && error.blockingInstances.length > 0) {
            return res.status(409).json({
                success: false,
                message: error.message,
                blockingInstances: error.blockingInstances,
            });
        }
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.markWaitingPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const order = req.order || await RentOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (!['Deposited', 'Confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chá»‰ cÃ³ thá»ƒ chuyá»ƒn sang chá» láº¥y Ä‘á»“ khi Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i Deposited hoáº·c Confirmed. Tráº¡ng thÃ¡i hiá»‡n táº¡i: "${order.status}"`
            });
        }

        const heldDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        if (!heldDeposit) {
            return res.status(400).json({ success: false, message: 'ÄÆ¡n chÆ°a Ä‘Æ°á»£c Ä‘áº·t cá»c' });
        }

        attachShiftContextForStaff(req, order);
        const before = snapshotOrderForAudit(order);
        order.staffId = order.staffId || req.user?.id;
        order.status = 'WaitingPickup';
        await order.save();

        await auditOrderChange(req, 'orders_rent.order.confirm', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'ÄÆ¡n Ä‘Ã£ chuyá»ƒn sang tráº¡ng thÃ¡i chá» khÃ¡ch láº¥y Ä‘á»“',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Mark waiting pickup error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.markWaitingReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const order = req.order || await RentOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (order.status !== 'Renting') {
            return res.status(400).json({ success: false, message: 'ÄÆ¡n pháº£i á»Ÿ tráº¡ng thÃ¡i Ä‘ang thuÃª.' });
        }

        attachShiftContextForStaff(req, order);
        const before = snapshotOrderForAudit(order);
        order.status = 'WaitingReturn';
        await order.save();

        await auditOrderChange(req, 'orders_rent.return.process', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'ÄÆ¡n Ä‘Ã£ chuyá»ƒn sang chá» tráº£ Ä‘á»“.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Mark waiting return error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.confirmReturn = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const { id } = req.params;
        const { returnedItems = [], note = '', returnDate: returnDateRaw } = req.body;

        // NgÃ y thá»±c táº¿ tráº£ â€” staff cÃ³ thá»ƒ chá»‰ Ä‘á»‹nh; máº·c Ä‘á»‹nh lÃ  hÃ´m nay
        const actualReturnDate = returnDateRaw ? new Date(returnDateRaw) : new Date();
        if (Number.isNaN(actualReturnDate.getTime())) {
            return res.status(400).json({ success: false, message: 'NgÃ y tráº£ thá»±c táº¿ khÃ´ng há»£p lá»‡' });
        }

        if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lÃ²ng cung cáº¥p danh sÃ¡ch sáº£n pháº©m tráº£' });
        }

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y' });
        }

        attachShiftContextForStaff(req, order);

        attachShiftContextForStaff(req, order);

        if (!['Renting', 'WaitingReturn', 'Late'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chá»‰ cÃ³ thá»ƒ xá»­ lÃ½ tráº£ Ä‘á»“ khi Ä‘Æ¡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i Renting, WaitingReturn hoáº·c Late. Tráº¡ng thÃ¡i hiá»‡n táº¡i: "${order.status}"`
            });
        }

        try {
            await validateReturn(order, actualReturnDate);
        } catch (guardError) {
            return res.status(guardError.statusCode || 400).json({
                success: false,
                message: guardError.message,
                details: guardError.details,
            });
        }

        // Validate returnedItems cÃ³ thuá»™c Ä‘Æ¡n nÃ y khÃ´ng (báº£o máº­t: trÃ¡nh staff cáº­p nháº­t instance cá»§a Ä‘Æ¡n khÃ¡c)
        const orderItems = await RentOrderItem.find({ orderId: id }).lean();
        const allInstanceIds = orderItems.map((item) => item.productInstanceId).filter(Boolean);
        const totalItems = allInstanceIds.length;
        const validInstanceIdSet = new Set(allInstanceIds.map(String));

        // Táº£i thÃ´ng tin instance + product Ä‘á»ƒ resolve Damage Policy vÃ  base value
        const instanceDocs = await ProductInstance.find({
            _id: { $in: allInstanceIds },
        }).lean();
        const instanceById = new Map(instanceDocs.map((d) => [String(d._id), d]));

        const productIds = Array.from(new Set(instanceDocs.map((d) => String(d.productId)).filter(Boolean)));
        const productDocs = await Product.find({ _id: { $in: productIds } }).lean();
        const productById = new Map(productDocs.map((p) => [String(p._id), p]));

        // Cache policy theo productId Ä‘á»ƒ trÃ¡nh resolve láº¡i nhiá»u láº§n
        const policyCache = new Map();
        const getPolicyForProduct = async (product) => {
            if (!product) return null;
            const key = String(product._id);
            if (policyCache.has(key)) return policyCache.get(key);
            const policy = await resolvePolicyForProduct(product);
            policyCache.set(key, policy);
            return policy;
        };

        const enrichedItems = [];

        for (const item of returnedItems) {
            if (item.productInstanceId && !validInstanceIdSet.has(String(item.productInstanceId))) {
                if (session) {
                    if (useTransaction) await session.abortTransaction();
                    await session.endSession();
                }
                return res.status(400).json({
                    success: false,
                    message: `Sáº£n pháº©m ${item.productInstanceId} khÃ´ng thuá»™c Ä‘Æ¡n thuÃª nÃ y`
                });
            }

            const instance = instanceById.get(String(item.productInstanceId));
            const product = instance ? productById.get(String(instance.productId)) : null;
            const policy = await getPolicyForProduct(product);
            const baseValue = getInstanceBaseValue(instance, product);

            let damageLevel = null;
            let damageFee = 0;
            let condition = 'Normal';
            let triggerLifecycle = 'Washing';
            let penaltyPercent = 0;
            let damageLabel = '';
            let damageLevelKey = '';
            let policyId = null;

            // Æ¯u tiÃªn damageLevelKey tá»« policy (flow má»›i - auto calc)
            if (item.damageLevelKey && policy) {
                damageLevel = (policy.levels || []).find(
                    (lvl) => String(lvl.key).toLowerCase() === String(item.damageLevelKey).toLowerCase()
                );
                if (!damageLevel) {
                    if (session) {
                        if (useTransaction) await session.abortTransaction();
                        await session.endSession();
                    }
                    return res.status(400).json({
                        success: false,
                        message: `Má»©c hÆ° há»ng "${item.damageLevelKey}" khÃ´ng thuá»™c chÃ­nh sÃ¡ch Ä‘ang Ã¡p dá»¥ng`,
                    });
                }
                penaltyPercent = Number(damageLevel.penaltyPercent || 0);
                damageFee = Math.round((baseValue * penaltyPercent) / 100);
                condition = damageLevel.condition || 'Damaged';
                triggerLifecycle = damageLevel.triggerLifecycle || 'Repair';
                damageLabel = damageLevel.label || '';
                damageLevelKey = damageLevel.key;
                policyId = policy._id;
            } else {
                // Flow cÅ© (backward compat): nháº­n condition + damageFee trá»±c tiáº¿p
                if (item.damageFee !== undefined && Number(item.damageFee) < 0) {
                    if (session) {
                        if (useTransaction) await session.abortTransaction();
                        await session.endSession();
                    }
                    return res.status(400).json({ success: false, message: 'PhÃ­ há»ng hÃ³c khÃ´ng Ä‘Æ°á»£c Ã¢m' });
                }
                const validConditions = ['Normal', 'Dirty', 'Damaged', 'Lost'];
                if (item.condition && !validConditions.includes(item.condition)) {
                    if (session) {
                        if (useTransaction) await session.abortTransaction();
                        await session.endSession();
                    }
                    return res.status(400).json({ success: false, message: `TÃ¬nh tráº¡ng "${item.condition}" khÃ´ng há»£p lá»‡` });
                }
                condition = item.condition || 'Normal';
                damageFee = Number(item.damageFee || 0);
                triggerLifecycle = condition === 'Damaged'
                    ? 'Repair'
                    : condition === 'Lost'
                        ? 'Lost'
                        : 'Washing';
            }

            enrichedItems.push({
                productInstanceId: item.productInstanceId,
                condition,
                damageFee,
                penaltyPercent,
                baseValue,
                damageLevelKey,
                damageLabel,
                triggerLifecycle,
                policyId,
                note: String(item.note || '').trim(),
            });
        }

        const lateDays = Number(order.lateDays || 0);
        const lateFee = Number(order.lateFee || 0);
        const totalDamageFee = enrichedItems.reduce((sum, it) => sum + Number(it.damageFee || 0), 0);
        const conditions = new Set(enrichedItems.map((it) => it.condition));
        const returnCondition = conditions.has('Lost')
            ? 'Lost'
            : conditions.has('Damaged')
                ? 'Damaged'
                : conditions.has('Dirty')
                    ? 'Dirty'
                    : 'Normal';

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const returnRecord = (await ReturnRecord.create(
            [
                {
                    orderId: id,
                    returnDate: actualReturnDate,
                    condition: returnCondition,
                    damageFee: totalDamageFee,
                    lateDays,
                    lateFee,
                    compensationFee: 0,
                    resolution: 'DepositDeducted',
                    resolvedAt: new Date(),
                    note: note || 'Return items processed',
                    staffId: req.user?.id,
                    items: enrichedItems.map((it) => ({
                        productInstanceId: it.productInstanceId,
                        condition: it.condition,
                        damageLevelKey: it.damageLevelKey,
                        damageLabel: it.damageLabel,
                        penaltyPercent: it.penaltyPercent,
                        baseValue: it.baseValue,
                        damageFee: it.damageFee,
                        triggerLifecycle: it.triggerLifecycle,
                        policyId: it.policyId,
                        note: it.note,
                    })),
                }
            ],
            txOptions
        ))[0];

        const instanceIds = enrichedItems.map((item) => item.productInstanceId).filter(Boolean);
        const before = snapshotOrderForAudit(order);

        for (const item of enrichedItems) {
            const instanceId = item.productInstanceId;
            if (!instanceId) continue;

            const targetLifecycle = item.triggerLifecycle || (item.condition === 'Damaged' ? 'Repair' : 'Washing');
            const beforeInstance = await ProductInstance.findById(instanceId).session(session).lean();
            await ProductInstance.updateOne(
                { _id: instanceId },
                { lifecycleStatus: targetLifecycle },
                txOptions
            );
            const afterInstance = await ProductInstance.findById(instanceId).session(session).lean();

            await writeAuditLog({
                req,
                user: req.user,
                action: 'inventory.item.update_condition',
                resource: 'ProductInstance',
                resourceId: instanceId,
                before: beforeInstance ? {
                    conditionLevel: beforeInstance.conditionLevel,
                    conditionScore: beforeInstance.conditionScore,
                    lifecycleStatus: beforeInstance.lifecycleStatus,
                } : null,
                after: afterInstance ? {
                    conditionLevel: afterInstance.conditionLevel,
                    conditionScore: afterInstance.conditionScore,
                    lifecycleStatus: afterInstance.lifecycleStatus,
                } : null,
            });

            await InventoryHistory.findOneAndUpdate(
                { productInstanceId: instanceId, status: 'Rented', endDate: null },
                { endDate: new Date() },
                txOptions
            );
        }

        // Äáº¿m sá»‘ mÃ³n Ä‘Ã£ rá»i tráº¡ng thÃ¡i 'Rented' (Ä‘ang Ä‘i giáº·t/sá»­a/cÃ³ sáºµn)
        // DÃ¹ng lifecycleStatus thay vÃ¬ InventoryHistory Ä‘á»ƒ trÃ¡nh Ä‘áº¿m nháº§m lá»‹ch sá»­ cÅ©
        const stillRentingCount = await ProductInstance.countDocuments({
            _id: { $in: allInstanceIds },
            lifecycleStatus: 'Rented'
        }).session(session);
        const returnedCount = totalItems - stillRentingCount;

        order.lateDays = lateDays;
        order.lateFee = lateFee;
        order.damageFee = totalDamageFee;
        order.actualReturnDate = actualReturnDate;
        order.returnedAt = new Date();
        // Status chá»‰ phá»¥ thuá»™c vÃ o sá»‘ lÆ°á»£ng Ä‘á»“ Ä‘Ã£ tráº£ â€” khÃ´ng Ä‘á»ƒ Late override sau khi Ä‘á»“ Ä‘Ã£ vá»
        // validateReturn Ä‘Ã£ tÃ­nh lateFee/lateDays rá»“i; khÃ´ng gá»i applyLatePenalty láº§n 2
        order.status = returnedCount >= totalItems ? 'Returned' : 'WaitingReturn';

        await order.save(txOptions);

        const auditAction = lateDays >= 3 ? 'orders_rent.penalty.apply' : 'orders_rent.return.process';
        await writeAuditLog({
            req,
            user: req.user,
            action: auditAction,
            resource: 'ReturnRecord',
            resourceId: returnRecord._id,
            before: null,
            after: {
                condition: returnRecord.condition,
                lateDays: returnRecord.lateDays,
                lateFee: returnRecord.lateFee,
                damageFee: returnRecord.damageFee,
            },
        });
        await auditOrderChange(req, auditAction, order._id, before, snapshotOrderForAudit(order));

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        return res.json({
            success: true,
            message: 'Xac nhan tra do thanh cong',
            data: {
                order: await fetchOrderDetail(id),
                returnRecord
            }
        });
    } catch (error) {
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        console.error('Confirm return error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.finalizeRentOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y' });
        }

        attachShiftContextForStaff(req, order);

        if (['Completed', 'Returned'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'ÄÆ¡n Ä‘Ã£ Ä‘Æ°á»£c chá»‘t hoáº·c hoÃ n táº¥t' });
        }

        // NoShow: cá»c Ä‘Ã£ bá»‹ tá»‹ch thu, khÃ´ng cÃ³ gÃ¬ Ä‘á»ƒ chá»‘t
        if (!['WaitingReturn', 'Late', 'Compensation'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ chá»‘t Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i "${order.status}"`
            });
        }

        // Chá»‰ chuyá»ƒn sang Returned Ä‘á»ƒ khÃ¡ch thanh toÃ¡n sá»‘ tiá»n cÃ²n láº¡i
        // KhÃ´ng táº¡o payment hay xá»­ lÃ½ tiá»n á»Ÿ bÆ°á»›c nÃ y
        const before = snapshotOrderForAudit(order);
        order.status = 'Returned';
        await order.save();

        await auditOrderChange(req, 'orders_rent.order.finalize', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Chá»‘t Ä‘Æ¡n thÃ nh cÃ´ng! Vui lÃ²ng thanh toÃ¡n sá»‘ tiá»n cÃ²n láº¡i.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Finalize rent order error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.completeRentOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y' });
        }

        if (order.status !== 'Returned') {
            return res.status(400).json({
                success: false,
                message: `Khong the hoan tat don o trang thai "${order.status}"`,
            });
        }

        // Chá»‰ xÃ¡c nháº­n thanh toÃ¡n cÃ²n láº¡i Ä‘Ã£ Ä‘Æ°á»£c nháº­n.
        // Viá»‡c quyáº¿t toÃ¡n cá»c + tráº£ tháº¿ cháº¥p + chuyá»ƒn sang Completed
        // Ä‘Æ°á»£c thá»±c hiá»‡n duy nháº¥t táº¡i completeWashing Ä‘á»ƒ trÃ¡nh double-settle.
        const before = snapshotOrderForAudit(order);
        await auditOrderChange(req, 'orders_rent.return.finalize', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'ÄÃ£ xÃ¡c nháº­n thanh toÃ¡n. Vui lÃ²ng hoÃ n táº¥t giáº·t Ä‘á»ƒ káº¿t thÃºc Ä‘Æ¡n.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Complete rent order error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.markNoShow = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const { id } = req.params;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        attachShiftContextForStaff(req, order);
        if (!['Deposited', 'Confirmed', 'WaitingPickup'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ Ä‘Ã¡nh dáº¥u no-show vá»›i tráº¡ng thÃ¡i \"${order.status}\"`
            });
        }

        const before = snapshotOrderForAudit(order);
        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const heldDeposits = await Deposit.find({ orderId: order._id, status: 'Held' }).session(session);
        order.status = 'NoShow';
        order.noShowAt = new Date();
        order.depositForfeited = true;
        await order.save(txOptions);

        await Promise.all(heldDeposits.map((deposit) => {
            deposit.status = 'Forfeited';
            return deposit.save(txOptions);
        }));

        const items = await RentOrderItem.find({ orderId: id }).session(session).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            // Chá»‰ release náº¿u khÃ´ng cÃ²n Ä‘Æ¡n active khÃ¡c dÃ¹ng instance.
            await safeReleaseInstancesAfterOrderExit(instanceIds, id, txOptions);
        }

        await Alert.create([{
            type: 'NoShow',
            targetType: 'RentOrder',
            targetId: order._id,
            status: 'New',
            message: `ÄÆ¡n ${order._id} Ä‘Ã£ Ä‘áº·t cá»c nhÆ°ng khÃ¡ch khÃ´ng Ä‘áº¿n nháº­n Ä‘á»“`,
            actionRequired: true
        }], txOptions);

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        await auditOrderChange(req, 'orders_rent.no_show.mark', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Da danh dau khach no-show',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        console.error('Mark no-show error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

exports.completeWashing = async (req, res) => {
    try {
        const { id } = req.params;
        const { instanceIds } = req.body;
        // Normalize method: 'PayOS' â†’ 'Online' (Payment model khÃ´ng cÃ³ enum 'PayOS')
        const rawMethod = req.body.method || 'Cash';
        const method = rawMethod === 'PayOS' ? 'Online' : rawMethod;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });
        }

        attachShiftContextForStaff(req, order);
        let targetIds = instanceIds;
        if (!Array.isArray(targetIds) || targetIds.length === 0) {
            const items = await RentOrderItem.find({ orderId: id }).lean();
            targetIds = items.map((item) => item.productInstanceId).filter(Boolean);
        }

        if (targetIds.length > 0) {
            await ProductInstance.updateMany(
                { _id: { $in: targetIds }, lifecycleStatus: 'Washing' },
                { lifecycleStatus: 'Available' }
            );
        }

        // Náº¿u Ä‘Æ¡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i Returned, quyáº¿t toÃ¡n vÃ  chuyá»ƒn sang Completed
        const before = snapshotOrderForAudit(order);
        if (order.status === 'Returned') {
            await settleDepositAndCollateral(id, order, method);
            order.status = 'Completed';
            order.completedAt = new Date();
            await order.save();
        }

        await auditOrderChange(req, 'orders_rent.washing.complete', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: order.status === 'Completed'
                ? 'HoÃ n táº¥t giáº·t. ÄÆ¡n Ä‘Ã£ hoÃ n táº¥t.'
                : 'HoÃ n táº¥t giáº·t. Sáº£n pháº©m Ä‘Ã£ sáºµn sÃ ng.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Complete washing error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

/**
 * TÃ¬m kiáº¿m khÃ¡ch hÃ ng theo sá»‘ Ä‘iá»‡n thoáº¡i / tÃªn / email â€” dÃ nh cho staff táº¡o Ä‘Æ¡n táº¡i chá»—.
 */
exports.searchCustomers = async (req, res) => {
    try {
        const { q = '' } = req.query;
        const trimmed = String(q).trim();
        if (!trimmed) return res.json({ success: true, data: [] });

        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const customers = await User.find({
            role: 'customer',
            $or: [
                { phone: { $regex: regex } },
                { name: { $regex: regex } },
                { email: { $regex: regex } }
            ]
        })
            .select('_id name phone email avatar')
            .limit(10)
            .lean();

        return res.json({ success: true, data: customers });
    } catch (error) {
        console.error('Search customers error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

/**
 * Táº¡o Ä‘Æ¡n thuÃª táº¡i chá»— â€” staff táº¡o thay cho khÃ¡ch Ä‘áº¿n trá»±c tiáº¿p.
 * ÄÆ¡n Ä‘Æ°á»£c táº¡o á»Ÿ tráº¡ng thÃ¡i Deposited ngay (cá»c thu trá»±c tiáº¿p báº±ng tiá»n máº·t).
 */
exports.createWalkInOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const staffId = req.user?.id;
        const role = String(req.user?.role || '').trim().toLowerCase();

        let activeShift = null;
        if (role === 'staff') {
            activeShift = await getActiveShiftForStaff(staffId);
            if (!activeShift?.shift) {
                return res.status(403).json({
                    success: false,
                    message: 'Báº¡n pháº£i Ä‘ang trong ca lÃ m (Ä‘Ã£ check-in vÃ  chÆ°a check-out) Ä‘á»ƒ táº¡o Ä‘Æ¡n.',
                });
            }
        }
        const { customerId, rentStartDate, rentEndDate, items = [], depositMethod = 'Cash' } = req.body;

        if (!customerId || !rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lÃ²ng cung cáº¥p Ä‘áº§y Ä‘á»§ thÃ´ng tin Ä‘Æ¡n thuÃª' });
        }

        const customer = await User.findById(customerId).lean();
        if (!customer || customer.role !== 'customer') {
            return res.status(400).json({ success: false, message: 'KhÃ¡ch hÃ ng khÃ´ng tá»“n táº¡i hoáº·c khÃ´ng há»£p lá»‡' });
        }

        const parsedStart = new Date(rentStartDate);
        const parsedEnd = new Date(rentEndDate);
        if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'NgÃ y thuÃª khÃ´ng há»£p lá»‡' });
        }
        if (parsedEnd < parsedStart) {
            return res.status(400).json({ success: false, message: 'NgÃ y káº¿t thÃºc khÃ´ng thá»ƒ trÆ°á»›c ngÃ y báº¯t Ä‘áº§u' });
        }
        const walkInRentalDays = Math.ceil((parsedEnd - parsedStart) / (24 * 60 * 60 * 1000));
        if (walkInRentalDays > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Thá»i gian thuÃª tá»‘i Ä‘a lÃ  ${MAX_RENTAL_DAYS} ngÃ y` });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const resolvedItems = await resolveRentInstances(items, rentStartDate, rentEndDate, session, useTransaction);

        // TÃ­nh tiá»n
        const computedTotalAmount = resolvedItems.reduce(
            (sum, item) => sum + Number(item.source.finalPrice || item.instance.currentRentPrice || 0),
            0
        );
        const depositAmount = computeExpectedDeposit({ totalAmount: computedTotalAmount });
        const remainingAmount = Math.max(computedTotalAmount - depositAmount, 0);

        // PayOS walk-in: táº¡o Ä‘Æ¡n á»Ÿ PendingDeposit, chá» khÃ¡ch quÃ©t QR
        // Cash walk-in: táº¡o Ä‘Æ¡n Deposited ngay, ghi nháº­n Ä‘Ã£ thu tiá»n máº·t
        const isPayOS = depositMethod === 'Online';

        const [rentOrder] = await RentOrder.create([{
            customerId,
            staffId,
            shiftId: role === 'staff' ? activeShift.shift._id : null,
            status: isPayOS ? 'PendingDeposit' : 'Deposited',
            rentStartDate,
            rentEndDate,
            depositAmount,
            remainingAmount,
            totalAmount: computedTotalAmount,
            damageFee: 0,
            lateDays: 0,
            lateFee: 0,
            compensationFee: 0,
        }], txOptions);

        rentOrder.orderCode = generateOrderCode(rentOrder._id);
        await rentOrder.save(useTransaction ? { session } : {});

        // Táº¡o order items
        await RentOrderItem.insertMany(
            resolvedItems.map((item) => ({
                orderId: rentOrder._id,
                productInstanceId: item.instance._id,
                baseRentPrice: item.source.baseRentPrice || item.instance.currentRentPrice,
                finalPrice: item.source.finalPrice || item.instance.currentRentPrice,
                rentStartDate: item.rentStartDate,
                rentEndDate: item.rentEndDate,
                condition: item.instance.conditionLevel,
                appliedRuleIds: item.source.appliedRuleIds || [],
                selectLevel: item.source.selectLevel || '',
                size: item.source.size || '',
                color: item.source.color || '',
                note: item.source.note || ''
            })),
            txOptions
        );

        // Vá»›i Cash: ghi nháº­n thu cá»c ngay
        // Vá»›i PayOS: khÃ´ng táº¡o báº£n ghi thanh toÃ¡n â€” sáº½ do webhook PayOS táº¡o sau khi khÃ¡ch thanh toÃ¡n
        if (!isPayOS) {
            await Deposit.create([{
                orderId: rentOrder._id,
                amount: depositAmount,
                method: depositMethod,
                status: 'Held',
                paidAt: new Date()
            }], txOptions);

            await Payment.create([{
                orderType: ORDER_TYPE.RENT,
                orderId: rentOrder._id,
                amount: depositAmount,
                method: depositMethod,
                status: 'Paid',
                purpose: 'Deposit',
                transactionCode: `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                paidAt: new Date()
            }], txOptions);
        }

        // KhÃ´ng Ä‘á»•i lifecycle instance táº¡i Ä‘Ã¢y. Walk-in chuáº©n sáº½ tiáº¿p tá»¥c qua bÆ°á»›c confirmPickup
        // Ä‘á»ƒ Ä‘Ã¡nh dáº¥u Rented khi khÃ¡ch thá»±c sá»± nháº­n Ä‘á»“.

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        const detail = await fetchOrderDetail(rentOrder._id);
        await auditOrderChange(req, 'orders_rent.walk_in.create', rentOrder._id, null, snapshotOrderForAudit(rentOrder));

        const successMsg = isPayOS
            ? `Táº¡o Ä‘Æ¡n táº¡i chá»— thÃ nh cÃ´ng. Vui lÃ²ng táº¡o link PayOS Ä‘á»ƒ thu cá»c ${depositAmount.toLocaleString('vi-VN')}Ä‘`
            : `Táº¡o Ä‘Æ¡n táº¡i chá»— thÃ nh cÃ´ng. ÄÃ£ thu cá»c ${depositAmount.toLocaleString('vi-VN')}Ä‘`;

        return res.status(201).json({
            success: true,
            message: successMsg,
            data: detail
        });
    } catch (error) {
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        console.error('Create walk-in order error:', error);
        const CLIENT_ERROR_KEYWORDS = ['kháº£ dá»¥ng', 'háº¿t hÃ ng', 'KhÃ¡ch hÃ ng', 'khÃ´ng há»£p lá»‡'];
        const isClientError = CLIENT_ERROR_KEYWORDS.some((kw) => error.message.includes(kw));
        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: isClientError ? error.message : 'Lá»—i server khi táº¡o Ä‘Æ¡n táº¡i chá»—',
            error: error.message
        });
    }
};

/**
 * Táº¡o tÃ i khoáº£n khÃ¡ch nhanh cho khÃ¡ch walk-in khÃ´ng cÃ³ tÃ i khoáº£n.
 * Email Ä‘Æ°á»£c auto-generate dáº¡ng guest_<timestamp>@inhere.guest.
 * KhÃ¡ch cÃ³ thá»ƒ Ä‘Äƒng kÃ½ láº¡i vá»›i SÄT Ä‘á»ƒ claim tÃ i khoáº£n Ä‘áº§y Ä‘á»§ sau.
 */
/**
 * TÃ¬m hoáº·c táº¡o tÃ i khoáº£n User dáº¡ng walk_in theo email Ä‘Ã£ verify.
 * DÃ¹ng chung cho flow guest tá»± thuÃª online (giá»¯ schema customerId required).
 */
const findOrCreateGuestCustomer = async ({ email, name, phone }) => {
    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
        // Cáº­p nháº­t snapshot tÃªn/SÄT náº¿u khÃ¡ch Ä‘á»•i giá»¯a cÃ¡c láº§n Ä‘áº·t â€” khÃ´ng Ä‘á»¥ng password/role
        const updates = {};
        if (name && String(existing.name || '').trim() !== String(name).trim()) {
            updates.name = String(name).trim();
        }
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone && existing.phone !== normalizedPhone) {
            updates.phone = normalizedPhone;
        }
        if (Object.keys(updates).length > 0) {
            await User.updateOne({ _id: existing._id }, { $set: updates });
        }
        return existing;
    }

    const randomPassword = Math.random().toString(36).slice(2, 12);
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const created = await User.create({
        name: String(name || '').trim() || 'KhÃ¡ch vÃ£ng lai',
        phone: normalizePhone(phone) || null,
        email: normalizedEmail,
        passwordHash,
        role: 'customer',
        segment: 'walk_in',
        status: 'active',
    });
    return created;
};

/**
 * POST /api/rent-orders/guest
 * Táº¡o Ä‘Æ¡n thuÃª cho guest chÆ°a Ä‘Äƒng nháº­p. YÃªu cáº§u verificationToken (email OTP).
 * BE tá»± gáº¯n Ä‘Æ¡n vÃ o User walk_in á»©ng vá»›i email Ä‘Ã£ verify.
 */
exports.createGuestRentOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};
    let idempotencyKey = null;

    try {
        const {
            verificationToken,
            name = '',
            phone = '',
            email = '',
            rentStartDate,
            rentEndDate,
            items = [],
            voucherCode = '',
        } = req.body || {};

        if (!verificationToken) {
            return res.status(400).json({ success: false, message: 'Thiáº¿u token xÃ¡c minh guest.' });
        }
        if (!rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lÃ²ng cung cáº¥p Ä‘áº§y Ä‘á»§ thÃ´ng tin thuÃª.' });
        }

        const normalizedName = String(name || '').trim();
        const normalizedPhone = normalizePhone(phone);
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedName) {
            return res.status(400).json({ success: false, message: 'Vui lÃ²ng nháº­p há» tÃªn.' });
        }
        if (!isValidPhone(normalizedPhone)) {
            return res.status(400).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡.' });
        }
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Email khÃ´ng há»£p lá»‡.' });
        }

        // 1) XÃ¡c minh token + GuestVerification record
        let tokenPayload;
        try {
            tokenPayload = verifyGuestVerificationToken(verificationToken);
        } catch {
            return res.status(401).json({ success: false, message: 'Token xÃ¡c minh guest khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.' });
        }
        const verification = await GuestVerification.findById(tokenPayload.verificationId);
        if (
            !verification ||
            !verification.verified ||
            verification.consumedAt ||
            verification.method !== tokenPayload.method
        ) {
            return res.status(401).json({ success: false, message: 'PhiÃªn xÃ¡c minh guest khÃ´ng há»£p lá»‡.' });
        }
        if (!verification.expiresAt || new Date(verification.expiresAt) <= new Date()) {
            return res.status(401).json({ success: false, message: 'PhiÃªn xÃ¡c minh guest Ä‘Ã£ háº¿t háº¡n.' });
        }
        if (verification.method !== 'email') {
            return res.status(400).json({
                success: false,
                message: 'ÄÆ¡n thuÃª chÆ°a Ä‘Äƒng nháº­p chá»‰ há»— trá»£ xÃ¡c minh báº±ng email.',
            });
        }
        const verifiedEmail = normalizeEmail(verification.email || normalizedEmail);
        if (verifiedEmail !== normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email Ä‘áº·t Ä‘Æ¡n pháº£i trÃ¹ng vá»›i email Ä‘Ã£ xÃ¡c minh.',
            });
        }

        // 2) Validate ngÃ y thuÃª (copy tá»« createRentOrder Ä‘á»ƒ giá»¯ nguyÃªn nghiá»‡p vá»¥)
        const parsedStart = new Date(rentStartDate);
        const parsedEnd = new Date(rentEndDate);
        if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'NgÃ y thuÃª khÃ´ng há»£p lá»‡.' });
        }
        if (parsedEnd < parsedStart) {
            return res.status(400).json({ success: false, message: 'NgÃ y káº¿t thÃºc khÃ´ng thá»ƒ trÆ°á»›c ngÃ y báº¯t Ä‘áº§u.' });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const startDay = new Date(parsedStart);
        startDay.setHours(0, 0, 0, 0);
        if (startDay < todayStart) {
            return res.status(400).json({ success: false, message: 'NgÃ y báº¯t Ä‘áº§u thuÃª khÃ´ng thá»ƒ lÃ  ngÃ y trong quÃ¡ khá»©.' });
        }
        const rentalDays = Math.ceil((parsedEnd - parsedStart) / (24 * 60 * 60 * 1000));
        if (rentalDays > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Thá»i gian thuÃª tá»‘i Ä‘a lÃ  ${MAX_RENTAL_DAYS} ngÃ y.` });
        }

        idempotencyKey = normalizeIdempotencyKey(req);
        const existingOrder = await findRentOrderByIdempotencyKey(idempotencyKey);
        if (existingOrder) {
            if (existingOrder.voucherId || existingOrder.voucherCode) {
                await repairVoucherUsageCounterIfNeeded({
                    voucherId: existingOrder.voucherId,
                    voucherCode: existingOrder.voucherCode,
                });
            }
            const detail = await fetchOrderDetail(existingOrder._id);
            return res.status(200).json(buildRentOrderSuccessResponse(detail));
        }

        const invalidPriceItem = items.find((item) => Number(item.baseRentPrice || 0) <= 0);
        if (invalidPriceItem) {
            return res.status(400).json({ success: false, message: 'GiÃ¡ thuÃª khÃ´ng há»£p lá»‡, vui lÃ²ng thá»­ láº¡i.' });
        }

        // 3) TÃ¬m/táº¡o User walk_in gáº¯n vá»›i email Ä‘Ã£ verify
        const guestUser = await findOrCreateGuestCustomer({
            email: verifiedEmail,
            name: normalizedName,
            phone: normalizedPhone,
        });

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const resolvedItems = await resolveRentInstances(items, rentStartDate, rentEndDate, session, useTransaction);

        const computedTotalAmount = resolvedItems.reduce(
            (sum, item) => sum + Number(item.source.finalPrice || item.source.baseRentPrice || item.instance.currentRentPrice || 0),
            0
        );
        const voucherApplication = await applyVoucherForRentOrder({
            voucherCode,
            user: { id: guestUser._id, role: 'customer' },
            items,
            subtotal: computedTotalAmount,
        });
        if (voucherApplication.error) {
            if (session) {
                if (useTransaction) await session.abortTransaction();
                await session.endSession();
                session = null;
            }
            return res.status(400).json(voucherApplication.error);
        }

        const orderTotalAmount = Number(voucherApplication.finalSubtotal || 0);
        const depositAmount = computeExpectedDeposit({ totalAmount: orderTotalAmount });
        const remainingAmount = Math.max(orderTotalAmount - depositAmount, 0);

        const [rentOrder] = await RentOrder.create([{
            customerId: guestUser._id,
            staffId: null,
            status: 'PendingDeposit',
            rentStartDate,
            rentEndDate,
            idempotencyKey,
            voucherCode: voucherApplication.voucherCode,
            voucherId: voucherApplication.voucher?._id || null,
            voucherSnapshot: voucherApplication.voucherSnapshot,
            discountAmount: voucherApplication.discountAmount,
            depositAmount,
            remainingAmount,
            damageFee: 0,
            lateDays: 0,
            lateFee: 0,
            compensationFee: 0,
            totalAmount: orderTotalAmount,
            guestVerificationMethod: verification.method,
            guestVerificationId: verification._id,
            guestContact: {
                name: normalizedName,
                phone: normalizedPhone,
                email: verifiedEmail,
            },
        }], { session });

        rentOrder.orderCode = generateOrderCode(rentOrder._id);
        await rentOrder.save(useTransaction ? { session } : {});

        await RentOrderItem.insertMany(
            resolvedItems.map((item) => ({
                orderId: rentOrder._id,
                productInstanceId: item.instance._id,
                baseRentPrice: item.source.baseRentPrice || item.instance.currentRentPrice,
                finalPrice: item.source.finalPrice || item.instance.currentRentPrice,
                rentStartDate: item.rentStartDate || item.source.rentStartDate || rentStartDate,
                rentEndDate: item.rentEndDate || item.source.rentEndDate || rentEndDate,
                condition: item.instance.conditionLevel,
                appliedRuleIds: item.source.appliedRuleIds || [],
                selectLevel: item.source.selectLevel || '',
                size: item.source.size,
                color: item.source.color,
                note: item.source.note || '',
            })),
            useTransaction ? { session } : {}
        );

        if (voucherApplication.voucher?._id) {
            if (useTransaction) {
                await Voucher.findByIdAndUpdate(
                    voucherApplication.voucher._id,
                    { $inc: { usedCount: 1 } },
                    { session }
                );
            } else {
                await Voucher.findByIdAndUpdate(voucherApplication.voucher._id, {
                    $inc: { usedCount: 1 },
                });
            }
        }

        // ÄÃ¡nh dáº¥u verification Ä‘Ã£ dÃ¹ng Ä‘á»ƒ trÃ¡nh reuse
        verification.consumedAt = new Date();
        await verification.save();

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        const detail = await fetchOrderDetail(rentOrder._id);

        // Gá»­i email xÃ¡c nháº­n Ä‘Æ¡n thuÃª guest (khÃ´ng block, khÃ´ng throw)
        sendGuestRentOrderConfirmationEmailSafely({ rentOrder, detail });

        return res.status(201).json(buildRentOrderSuccessResponse(detail));
    } catch (error) {
        if (idempotencyKey && isDuplicateIdempotencyError(error)) {
            const existingOrder = await findRentOrderByIdempotencyKey(idempotencyKey);
            if (existingOrder) {
                if (existingOrder.voucherId || existingOrder.voucherCode) {
                    await repairVoucherUsageCounterIfNeeded({
                        voucherId: existingOrder.voucherId,
                        voucherCode: existingOrder.voucherCode,
                    });
                }
                const detail = await fetchOrderDetail(existingOrder._id);
                if (session) {
                    if (useTransaction) await session.abortTransaction();
                    await session.endSession();
                }
                return res.status(200).json(buildRentOrderSuccessResponse(detail));
            }
        }
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        const CLIENT_ERROR_KEYWORDS = ['kháº£ dá»¥ng', 'háº¿t hÃ ng', 'NgÃ y thuÃª', 'quÃ¡ khá»©', 'khÃ´ng há»£p lá»‡', 'xÃ¡c minh', 'Email'];
        const isClientError = error.isClientError === true
            || CLIENT_ERROR_KEYWORDS.some((kw) => String(error.message || '').includes(kw));
        if (!isClientError) console.error('Create guest rent order error:', error);
        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: isClientError ? error.message : 'Lá»—i server khi táº¡o Ä‘Æ¡n thuÃª guest.',
            error: error.message,
        });
    }
};

/**
 * GET /api/rent-orders/guest/lookup?orderCode=...&email=...
 * Cho phÃ©p guest tra cá»©u Ä‘Æ¡n qua mÃ£ Ä‘Æ¡n + email Ä‘Ã£ verify.
 * Chá»‰ tráº£ vá» Ä‘Æ¡n cÃ³ guestContact.email khá»›p.
 */
exports.getGuestRentOrder = async (req, res) => {
    try {
        const orderCode = String(req.query.orderCode || '').trim();
        const email = normalizeEmail(req.query.email || '');
        if (!orderCode) {
            return res.status(400).json({ success: false, message: 'Thiáº¿u mÃ£ Ä‘Æ¡n thuÃª.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Email khÃ´ng há»£p lá»‡.' });
        }

        const order = await RentOrder.findOne({ orderCode }).lean();
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª.' });
        }

        const contactEmail = normalizeEmail(order.guestContact?.email || '');
        // Fallback: náº¿u Ä‘Æ¡n khÃ´ng cÃ³ guestContact (Ä‘Æ¡n member), tá»« chá»‘i lookup guest
        if (!contactEmail || contactEmail !== email) {
            return res.status(403).json({ success: false, message: 'Email khÃ´ng khá»›p vá»›i Ä‘Æ¡n thuÃª.' });
        }

        const detail = await fetchOrderDetail(order._id);
        return res.json({ success: true, data: detail });
    } catch (error) {
        console.error('Get guest rent order error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server khi tra cá»©u Ä‘Æ¡n thuÃª.', error: error.message });
    }
};

/**
 * Sinh URL xem Ä‘Æ¡n thuÃª guest (magic link, JWT 7 ngÃ y)
 */
const buildGuestRentOrderViewUrl = (rentOrder = {}) => {
    const orderId = String(rentOrder?._id || '').trim();
    if (!orderId) return `${frontendUrl}/track-order`;

    const token = signGuestOrderViewToken({
        orderId,
        guestVerificationId: rentOrder?.guestVerificationId ? String(rentOrder.guestVerificationId) : '',
        guestEmail: normalizeEmail(rentOrder?.guestContact?.email || ''),
        orderType: ORDER_TYPE.RENT,
    });

    return `${frontendUrl}/rental/guest/${orderId}?token=${encodeURIComponent(token)}`;
};

const getGuestRentOrderViewTokenFromRequest = (req) => {
    const queryToken = String(req?.query?.token || '').trim();
    if (queryToken) return queryToken;
    return extractBearerToken(req?.headers?.authorization);
};

/**
 * Gá»­i email xÃ¡c nháº­n Ä‘Æ¡n thuÃª guest (khÃ´ng throw â€” chá»‰ log)
 */
const sendGuestRentOrderConfirmationEmailSafely = async ({ rentOrder, detail }) => {
    try {
        if (!rentOrder?.guestContact?.email) return;

        const items = (detail?.items || []).map((item) => {
            const product = item?.productInstanceId?.productId || {};
            const rawName = typeof product?.name === 'string'
                ? product.name
                : (product?.name?.vi || product?.name?.en || '');
            return {
                productName: String(rawName || '').trim() || 'Sáº£n pháº©m',
                size: item?.size || item?.productInstanceId?.size || '',
                quantity: 1,
                price: Number(item?.finalPrice || item?.baseRentPrice || 0),
                image: Array.isArray(product?.images) ? product.images[0] : '',
            };
        });

        const orderUrl = buildGuestRentOrderViewUrl(rentOrder);
        const trackUrl = `${frontendUrl}/track-order?orderCode=${encodeURIComponent(rentOrder.orderCode || '')}`;

        await sendRentOrderConfirmationEmail({
            _id: rentOrder._id,
            orderCode: rentOrder.orderCode,
            status: rentOrder.status,
            createdAt: rentOrder.createdAt,
            rentStartDate: rentOrder.rentStartDate,
            rentEndDate: rentOrder.rentEndDate,
            depositAmount: rentOrder.depositAmount,
            totalAmount: rentOrder.totalAmount,
            customer: {
                name: rentOrder.guestContact?.name || '',
                email: rentOrder.guestContact?.email || '',
                phone: rentOrder.guestContact?.phone || '',
            },
            items,
            orderUrl,
            trackUrl,
        });
    } catch (mailError) {
        console.error('Send guest rent order email error:', mailError);
    }
};

/**
 * GET /api/rent-orders/guest/:id?token=...
 * Xem chi tiáº¿t Ä‘Æ¡n thuÃª guest qua magic link (JWT).
 */
exports.getGuestRentOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const token = getGuestRentOrderViewTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({ success: false, message: 'Thiáº¿u token xem Ä‘Æ¡n thuÃª guest.' });
        }

        let payload;
        try {
            payload = verifyGuestOrderViewToken(token);
        } catch {
            return res.status(401).json({ success: false, message: 'LiÃªn káº¿t xem Ä‘Æ¡n Ä‘Ã£ háº¿t háº¡n hoáº·c khÃ´ng há»£p lá»‡.' });
        }

        if (String(payload?.orderId || '') !== String(id || '')) {
            return res.status(403).json({ success: false, message: 'Token khÃ´ng khá»›p vá»›i Ä‘Æ¡n thuÃª.' });
        }

        const order = await RentOrder.findById(id).lean();
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª.' });
        }

        if (!order.guestContact?.email) {
            return res.status(403).json({ success: false, message: 'ÄÆ¡n nÃ y khÃ´ng pháº£i Ä‘Æ¡n thuÃª guest.' });
        }

        if (payload?.guestVerificationId && String(order.guestVerificationId || '') !== String(payload.guestVerificationId)) {
            return res.status(403).json({ success: false, message: 'Token khÃ´ng há»£p lá»‡ cho Ä‘Æ¡n thuÃª nÃ y.' });
        }

        const payloadEmail = normalizeEmail(payload?.guestEmail || '');
        const orderEmail = normalizeEmail(order.guestContact?.email || '');
        if (payloadEmail && orderEmail && payloadEmail !== orderEmail) {
            return res.status(403).json({ success: false, message: 'Token khÃ´ng há»£p lá»‡ cho Ä‘Æ¡n thuÃª nÃ y.' });
        }

        const detail = await fetchOrderDetail(order._id);
        return res.json({ success: true, data: detail });
    } catch (error) {
        console.error('Get guest rent order by id error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server khi láº¥y chi tiáº¿t Ä‘Æ¡n thuÃª guest.', error: error.message });
    }
};

/**
 * PUT /api/rent-orders/guest/:id/cancel
 * Body: { email }
 * Hoáº·c header Authorization / query token (magic link).
 * Cho phÃ©p khÃ¡ch guest tá»± há»§y Ä‘Æ¡n khi cÃ²n á»Ÿ tráº¡ng thÃ¡i PendingDeposit.
 */
exports.cancelGuestRentOrder = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const { id } = req.params;
        const rawEmail = normalizeEmail(req.body?.email || req.query?.email || '');

        // Æ¯u tiÃªn xÃ¡c thá»±c báº±ng token magic-link náº¿u cÃ³; fallback vá» email
        const token = getGuestRentOrderViewTokenFromRequest(req);
        let tokenEmail = '';
        let tokenOrderId = '';
        if (token) {
            try {
                const payload = verifyGuestOrderViewToken(token);
                tokenOrderId = String(payload?.orderId || '');
                tokenEmail = normalizeEmail(payload?.guestEmail || '');
            } catch {
                // token lá»—i/háº¿t háº¡n â†’ bá» qua, fallback email
            }
        }

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª.' });
        }

        const contactEmail = normalizeEmail(order.guestContact?.email || '');
        if (!contactEmail) {
            return res.status(403).json({ success: false, message: 'ÄÆ¡n nÃ y khÃ´ng pháº£i Ä‘Æ¡n thuÃª guest.' });
        }

        // XÃ¡c thá»±c: token khá»›p orderId + email, HOáº¶C email body khá»›p
        const authedByToken = token && tokenOrderId === String(id) && tokenEmail && tokenEmail === contactEmail;
        const authedByEmail = rawEmail && rawEmail === contactEmail;
        if (!authedByToken && !authedByEmail) {
            return res.status(403).json({ success: false, message: 'KhÃ´ng cÃ³ quyá»n há»§y Ä‘Æ¡n thuÃª nÃ y.' });
        }

        const previousStatus = order.status;
        if (!['Draft', 'PendingDeposit'].includes(previousStatus)) {
            return res.status(400).json({
                success: false,
                message: `KhÃ´ng thá»ƒ tá»± há»§y Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i "${previousStatus}". Vui lÃ²ng liÃªn há»‡ cá»­a hÃ ng.`,
            });
        }

        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        order.status = 'Cancelled';
        await order.save(txOptions);

        const itemsQuery = RentOrderItem.find({ orderId: id }).lean();
        if (useTransaction) itemsQuery.session(session);
        const items = await itemsQuery;
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            await safeReleaseInstancesAfterOrderExit(instanceIds, id, txOptions);
        }

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        return res.json({
            success: true,
            message: 'Há»§y Ä‘Æ¡n thuÃª thÃ nh cÃ´ng.',
            data: await fetchOrderDetail(id),
        });
    } catch (error) {
        if (session) {
            try {
                if (useTransaction) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        console.error('Cancel guest rent order error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server khi há»§y Ä‘Æ¡n thuÃª guest.', error: error.message });
    }
};

exports.createGuestCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!String(name || '').trim()) {
            return res.status(400).json({ success: false, message: 'Vui lÃ²ng nháº­p tÃªn khÃ¡ch hÃ ng' });
        }

        const normalizedPhone = String(phone || '').replace(/\s+/g, '').trim() || null;

        if (normalizedPhone) {
            const phoneRegex = /^(0[3-9]\d{8}|84[3-9]\d{8})$/;
            if (!phoneRegex.test(normalizedPhone)) {
                return res.status(400).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡ (VD: 0912345678)' });
            }
            const existingByPhone = await User.findOne({ phone: normalizedPhone }).lean();
            if (existingByPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Sá»‘ Ä‘iá»‡n thoáº¡i nÃ y Ä‘Ã£ cÃ³ tÃ i khoáº£n. HÃ£y tÃ¬m kiáº¿m khÃ¡ch hÃ ng thay vÃ¬ táº¡o má»›i.',
                    existingCustomer: {
                        _id: existingByPhone._id,
                        name: existingByPhone.name,
                        phone: existingByPhone.phone,
                        email: existingByPhone.email,
                    }
                });
            }
        }

        const placeholderEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@inhere.guest`;
        const tempPassword = Math.random().toString(36).slice(2, 12);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const customer = await User.create({
            name: String(name).trim(),
            phone: normalizedPhone,
            email: placeholderEmail,
            passwordHash,
            role: 'customer',
            segment: 'walk_in',
            status: 'active',
        });

        return res.status(201).json({
            success: true,
            message: 'Táº¡o há»“ sÆ¡ khÃ¡ch thÃ nh cÃ´ng',
            data: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
            }
        });
    } catch (error) {
        console.error('Create guest customer error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server khi táº¡o há»“ sÆ¡ khÃ¡ch', error: error.message });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SWAP ITEM â€“ Ä‘á»•i sáº£n pháº©m trong Ä‘Æ¡n thuÃª táº¡i thá»i Ä‘iá»ƒm bÃ n giao
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SWAPPABLE_ORDER_STATUSES = ['Deposited', 'Confirmed', 'WaitingPickup'];

/**
 * TÃ¡ch category text tá»« Product Ä‘á»ƒ so sÃ¡nh "cÃ¹ng loáº¡i".
 * Há»— trá»£ cáº£ string láº«n i18n object.
 */
const extractCategoryKey = (product) => {
    if (!product) return '';
    const cat = product.category;
    if (!cat) return '';
    if (typeof cat === 'string') return cat.trim().toLowerCase();
    const text = cat?.vi || cat?.en || Object.values(cat)[0] || '';
    return String(text).trim().toLowerCase();
};

/**
 * GET /:id/items/:itemId/swap-candidates
 * Tráº£ vá» 3 nhÃ³m á»©ng viÃªn: size_swap, model_swap, upgrade.
 * Thá»© tá»± Æ°u tiÃªn: size_swap â†’ model_swap â†’ upgrade.
 */
exports.getSwapCandidates = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        const order = await RentOrder.findById(id).lean();
        if (!order) return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });

        if (!SWAPPABLE_ORDER_STATUSES.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chá»‰ cÃ³ thá»ƒ Ä‘á»•i sáº£n pháº©m khi Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i ${SWAPPABLE_ORDER_STATUSES.join('/')}`,
            });
        }

        const currentItem = await RentOrderItem.findById(itemId)
            .populate({ path: 'productInstanceId', populate: { path: 'productId' } })
            .lean();
        if (!currentItem || String(currentItem.orderId) !== String(id)) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m trong Ä‘Æ¡n' });
        }

        const currentInstance = currentItem.productInstanceId;
        const currentProduct = currentInstance?.productId || {};
        const currentProductId = String(currentProduct._id || currentInstance?.productId || '');
        const currentCategoryKey = extractCategoryKey(currentProduct);
        const itemSize = String(currentItem.size || currentInstance?.size || '').trim();
        const hasExplicitSize = itemSize && itemSize.toUpperCase() !== 'FREE SIZE';

        const rentStart = currentItem.rentStartDate || order.rentStartDate;
        const rentEnd = currentItem.rentEndDate || order.rentEndDate;

        // Láº¥y táº¥t cáº£ instance Ä‘ang dÃ¹ng trong Ä‘Æ¡n Ä‘á»ƒ loáº¡i trá»«
        const allOrderItems = await RentOrderItem.find({ orderId: id }).lean();
        const excludedIds = new Set(allOrderItems.map((i) => String(i.productInstanceId)));

        const checkAvail = (instanceId) =>
            isInstanceAvailableForPeriod(instanceId, rentStart, rentEnd, null, String(id));

        // â”€â”€ NHÃ“M 1: Äá»•i size â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // CÃ¹ng productId, khÃ¡c size, khÃ´ng bá»‹ cháº·n
        const sizeCandidateFilter = {
            productId: new mongoose.Types.ObjectId(currentProductId),
            _id: { $nin: Array.from(excludedIds).map((eid) => new mongoose.Types.ObjectId(eid)) },
            lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT },
            ...(hasExplicitSize ? { size: { $ne: itemSize } } : {}),
        };
        const sizeRaw = await ProductInstance.find(sizeCandidateFilter)
            .populate('productId', 'name images baseRentPrice')
            .sort({ conditionScore: 1, createdAt: 1 })
            .lean();
        const sizeSwap = [];
        for (const cand of sizeRaw) {
            if (await checkAvail(cand._id)) sizeSwap.push(cand);
        }

        // â”€â”€ NHÃ“M 2: Äá»•i máº«u â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // CÃ¹ng category, khÃ¡c productId, cÃ¹ng size (náº¿u cÃ³), khÃ´ng bá»‹ cháº·n
        const sameCatProducts = await Product.find({
            _id: { $ne: new mongoose.Types.ObjectId(currentProductId) },
            isDraft: false,
        }).lean();
        const sameCatProductIds = sameCatProducts
            .filter((p) => extractCategoryKey(p) === currentCategoryKey)
            .map((p) => p._id);

        let modelCandFilter = {
            productId: { $in: sameCatProductIds },
            _id: { $nin: Array.from(excludedIds).map((eid) => new mongoose.Types.ObjectId(eid)) },
            lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT },
        };
        if (hasExplicitSize) modelCandFilter.size = itemSize;

        const modelRaw = await ProductInstance.find(modelCandFilter)
            .populate('productId', 'name images baseRentPrice')
            .sort({ conditionScore: 1, createdAt: 1 })
            .lean();
        const modelSwap = [];
        for (const cand of modelRaw) {
            if (await checkAvail(cand._id)) modelSwap.push(cand);
        }

        // â”€â”€ NHÃ“M 3: Upgrade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Æ¯u tiÃªn 1: CÃ¹ng máº«u (cÃ¹ng productId), cÃ¹ng size, conditionScore CAO HÆ N hiá»‡n táº¡i
        // Æ¯u tiÃªn 2: KhÃ¡c máº«u nhÆ°ng cÃ¹ng category, cÃ¹ng size, conditionScore hoáº·c giÃ¡ cao hÆ¡n
        const currentConditionScore = Number(currentInstance?.conditionScore ?? 100);
        const currentDailyPrice = Number(currentItem.baseRentPrice || currentInstance?.currentRentPrice || 0);
        const excludedArr = Array.from(excludedIds).map((eid) => new mongoose.Types.ObjectId(eid));

        // Æ¯u tiÃªn 1: cÃ¹ng productId, cÃ¹ng size, tÃ¬nh tráº¡ng tá»‘t hÆ¡n
        const upgradeFilterSameModel = {
            productId: new mongoose.Types.ObjectId(currentProductId),
            _id: { $nin: excludedArr },
            lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT },
            conditionScore: { $gt: currentConditionScore },
        };
        if (hasExplicitSize) upgradeFilterSameModel.size = itemSize;

        const upgradeRawSameModel = await ProductInstance.find(upgradeFilterSameModel)
            .populate('productId', 'name images baseRentPrice')
            .sort({ conditionScore: -1, createdAt: 1 })
            .lean();

        // Æ¯u tiÃªn 2: khÃ¡c productId, cÃ¹ng category, cÃ¹ng size, tÃ¬nh tráº¡ng hoáº·c giÃ¡ tá»‘t hÆ¡n
        const upgradeFilterOtherModel = {
            productId: { $in: sameCatProductIds },
            _id: { $nin: excludedArr },
            lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT },
            $or: [
                { conditionScore: { $gt: currentConditionScore } },
                { currentRentPrice: { $gt: currentDailyPrice } },
            ],
        };
        if (hasExplicitSize) upgradeFilterOtherModel.size = itemSize;

        const upgradeRawOtherModel = await ProductInstance.find(upgradeFilterOtherModel)
            .populate('productId', 'name images baseRentPrice')
            .sort({ conditionScore: -1, currentRentPrice: -1, createdAt: 1 })
            .lean();

        // Gá»™p: cÃ¹ng máº«u lÃªn Ä‘áº§u, rá»“i má»›i Ä‘áº¿n máº«u khÃ¡c
        const upgradeRaw = [...upgradeRawSameModel, ...upgradeRawOtherModel];
        const upgradeSwap = [];
        const seenUpgrade = new Set();
        for (const cand of upgradeRaw) {
            const candId = String(cand._id);
            if (seenUpgrade.has(candId)) continue;
            if (await checkAvail(cand._id)) {
                seenUpgrade.add(candId);
                upgradeSwap.push(cand);
            }
        }

        return res.json({
            success: true,
            data: {
                currentItem,
                rentStart,
                rentEnd,
                size_swap: sizeSwap,
                model_swap: modelSwap,
                upgrade: upgradeSwap,
            },
        });
    } catch (error) {
        console.error('getSwapCandidates error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};

/**
 * PUT /:id/swap-item
 * Body: { itemId, newInstanceId, swapType, reason }
 * swapType: 'size_swap' | 'model_swap' | 'upgrade'
 */
exports.swapOrderItem = async (req, res) => {
    let session = null;
    let useTransaction = false;
    let txOptions = {};

    try {
        const { id } = req.params;
        const { itemId, newInstanceId, swapType, reason = '' } = req.body || {};

        if (!itemId || !newInstanceId) {
            return res.status(400).json({ success: false, message: 'Thiáº¿u itemId hoáº·c newInstanceId' });
        }
        if (!['size_swap', 'model_swap', 'upgrade'].includes(swapType)) {
            return res.status(400).json({ success: false, message: 'swapType pháº£i lÃ  size_swap / model_swap / upgrade' });
        }
        if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(newInstanceId)) {
            return res.status(400).json({ success: false, message: 'ID khÃ´ng há»£p lá»‡' });
        }

        const order = await RentOrder.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n thuÃª' });

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - KhÃ´ng cÃ³ quyá»n thá»±c hiá»‡n' });
        }

        if (!SWAPPABLE_ORDER_STATUSES.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chá»‰ cÃ³ thá»ƒ Ä‘á»•i sáº£n pháº©m khi Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i ${SWAPPABLE_ORDER_STATUSES.join('/')}`,
            });
        }

        const currentItem = await RentOrderItem.findById(itemId);
        if (!currentItem || String(currentItem.orderId) !== String(id)) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m trong Ä‘Æ¡n' });
        }
        if (String(currentItem.productInstanceId) === String(newInstanceId)) {
            return res.status(400).json({ success: false, message: 'Sáº£n pháº©m má»›i trÃ¹ng vá»›i sáº£n pháº©m hiá»‡n táº¡i' });
        }

        const oldInstanceId = currentItem.productInstanceId;
        const oldInstance = await ProductInstance.findById(oldInstanceId)
            .populate('productId', 'name images baseRentPrice category categoryPath')
            .lean();
        const newInstance = await ProductInstance.findById(newInstanceId)
            .populate('productId', 'name images baseRentPrice category categoryPath')
            .lean();

        if (!newInstance) {
            return res.status(404).json({ success: false, message: 'KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m má»›i' });
        }
        if (INSTANCE_STATUSES_BLOCKING_RENT.includes(newInstance.lifecycleStatus)) {
            return res.status(409).json({ success: false, message: 'Sáº£n pháº©m má»›i Ä‘Ã£ bá»‹ máº¥t hoáº·c Ä‘Ã£ bÃ¡n' });
        }

        // Validate theo swapType
        const oldProductId = String(oldInstance?.productId?._id || oldInstance?.productId || '');
        const newProductId = String(newInstance?.productId?._id || newInstance?.productId || '');
        const itemSize = String(currentItem.size || oldInstance?.size || '').trim();
        const hasExplicitSize = itemSize && itemSize.toUpperCase() !== 'FREE SIZE';

        if (swapType === 'size_swap') {
            if (oldProductId !== newProductId) {
                return res.status(400).json({ success: false, message: 'Äá»•i size pháº£i cÃ¹ng máº«u sáº£n pháº©m' });
            }
        } else if (swapType === 'upgrade') {
            // Upgrade cho phÃ©p:
            // 1. CÃ¹ng máº«u (cÃ¹ng productId), tÃ¬nh tráº¡ng tá»‘t hÆ¡n â€” khÃ´ng cáº§n kiá»ƒm tra category
            // 2. KhÃ¡c máº«u, cÃ¹ng category â€” cáº§n kiá»ƒm tra category
            if (oldProductId !== newProductId) {
                const oldCat = extractCategoryKey(oldInstance?.productId);
                const newCat = extractCategoryKey(newInstance?.productId);
                if (oldCat && newCat && oldCat !== newCat) {
                    return res.status(400).json({
                        success: false,
                        message: 'Upgrade sang máº«u khÃ¡c pháº£i cÃ¹ng loáº¡i sáº£n pháº©m (category)',
                    });
                }
            }
        } else {
            // model_swap: khÃ¡c productId, cÃ¹ng category
            const oldCat = extractCategoryKey(oldInstance?.productId);
            const newCat = extractCategoryKey(newInstance?.productId);
            if (oldCat && newCat && oldCat !== newCat) {
                return res.status(400).json({
                    success: false,
                    message: 'Äá»•i máº«u pháº£i cÃ¹ng loáº¡i sáº£n pháº©m (category)',
                });
            }
            if (hasExplicitSize) {
                const newSize = String(newInstance.size || '').trim();
                if (newSize && newSize !== itemSize) {
                    return res.status(400).json({
                        success: false,
                        message: `Äá»•i máº«u pháº£i cÃ¹ng size ${itemSize}. Náº¿u háº¿t size hÃ£y dÃ¹ng "Äá»•i máº«u (size khÃ¡c)".`,
                    });
                }
            }
        }

        const rentStart = currentItem.rentStartDate || order.rentStartDate;
        const rentEnd = currentItem.rentEndDate || order.rentEndDate;
        const isAvail = await isInstanceAvailableForPeriod(newInstanceId, rentStart, rentEnd, null, String(id));
        if (!isAvail) {
            return res.status(409).json({ success: false, message: 'Sáº£n pháº©m má»›i khÃ´ng cÃ²n kháº£ dá»¥ng cho khoáº£ng ngÃ y nÃ y' });
        }

        // â”€â”€â”€ Transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        ({ session, useTransaction } = await startTransactionIfAvailable());
        txOptions = useTransaction ? { session } : {};

        const before = snapshotOrderForAudit(order);
        const oldFinalPrice = Number(currentItem.finalPrice || currentItem.baseRentPrice || 0);
        const newDailyRate = Number(newInstance.currentRentPrice || 0);
        const itemRentStart = new Date(rentStart);
        const itemRentEnd = new Date(rentEnd);
        const rentDays = Math.max(
            1,
            Math.ceil((itemRentEnd.getTime() - itemRentStart.getTime()) / (24 * 60 * 60 * 1000))
        );
        const newFinalPrice = newDailyRate > 0 ? newDailyRate * rentDays : oldFinalPrice;

        // 1. Cáº­p nháº­t RentOrderItem
        await RentOrderItem.updateOne(
            { _id: itemId },
            {
                productInstanceId: newInstanceId,
                baseRentPrice: newDailyRate,
                finalPrice: newFinalPrice,
                size: String(newInstance.size || '').trim() || itemSize,
                color: String(newInstance.color || currentItem.color || '').trim(),
            },
            txOptions
        );

        // 2. Giáº£i phÃ³ng instance cÅ© â†’ Available náº¿u khÃ´ng Ä‘Æ¡n nÃ o khÃ¡c dÃ¹ng
        const otherActiveItems = await RentOrderItem.find({
            productInstanceId: oldInstanceId,
            orderId: { $ne: id },
        }).populate({ path: 'orderId', select: 'status' }).lean();
        const hasOtherActive = otherActiveItems.some(
            (it) => !TERMINAL_ORDER_STATUSES.includes(String(it.orderId?.status || '').toLowerCase())
        );
        if (!hasOtherActive && oldInstance) {
            await ProductInstance.updateOne(
                { _id: oldInstanceId, lifecycleStatus: { $nin: INSTANCE_STATUSES_BLOCKING_RENT } },
                { lifecycleStatus: 'Available' },
                txOptions
            );
        }

        // 3. Mark instance má»›i â†’ Reserved
        await ProductInstance.updateOne(
            { _id: newInstanceId },
            { lifecycleStatus: 'Reserved' },
            txOptions
        );

        // 4. InventoryHistory
        await InventoryHistory.findOneAndUpdate(
            { productInstanceId: oldInstanceId, status: 'Reserved', endDate: null },
            { endDate: new Date() },
            txOptions
        );
        await InventoryHistory.create(
            [{
                productInstanceId: newInstanceId,
                status: 'Reserved',
                startDate: new Date(),
                note: `[${swapType}] ÄÆ¡n ${order.orderCode || id}`,
            }],
            txOptions
        );

        // 5. Cáº­p nháº­t tá»•ng tiá»n Ä‘Æ¡n náº¿u giÃ¡ thay Ä‘á»•i
        const oldOrderTotal = Number(order.totalAmount || 0);
        let newOrderTotal = oldOrderTotal;
        if (newFinalPrice !== oldFinalPrice) {
            const allItems = await RentOrderItem.find({ orderId: id }, null, txOptions).lean();
            const rawTotal = allItems.reduce((sum, it) => {
                const price = String(it._id) === String(itemId) ? newFinalPrice : Number(it.finalPrice || 0);
                return sum + price;
            }, 0);
            newOrderTotal = Math.max(0, rawTotal - Number(order.discountAmount || 0));
            order.totalAmount = newOrderTotal;
            order.remainingAmount = Math.max(0, newOrderTotal - Number(order.depositAmount || 0));
            await order.save(txOptions);
        }

        // 6. LÆ°u ItemSwapHistory
        await ItemSwapHistory.create(
            [{
                orderId: id,
                orderItemId: itemId,
                swapType,
                oldInstanceId,
                oldProductId: oldInstance?.productId?._id || oldInstance?.productId || null,
                oldSize: String(oldInstance?.size || '').trim(),
                oldColor: String(oldInstance?.color || '').trim(),
                oldDailyPrice: Number(currentItem.baseRentPrice || 0),
                newInstanceId,
                newProductId: newInstance?.productId?._id || newInstance?.productId || null,
                newSize: String(newInstance.size || '').trim(),
                newColor: String(newInstance.color || '').trim(),
                newDailyPrice: newDailyRate,
                oldOrderTotal,
                newOrderTotal,
                reason: String(reason || '').trim(),
                staffId: req.user?.id || req.user?._id || null,
            }],
            txOptions
        );

        // 7. Audit log
        await writeAuditLog({
            req,
            user: req.user,
            action: `orders_rent.item.${swapType}`,
            resource: 'RentOrderItem',
            resourceId: itemId,
            before: { productInstanceId: String(oldInstanceId), finalPrice: oldFinalPrice },
            after: { productInstanceId: String(newInstanceId), finalPrice: newFinalPrice },
        });
        await auditOrderChange(req, 'orders_rent.item.swap', order._id, before, snapshotOrderForAudit(order));

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
            session = null;
        }

        const swapTypeLabel = { size_swap: 'Äá»•i size', model_swap: 'Äá»•i máº«u', upgrade: 'Upgrade' };

        return res.json({
            success: true,
            message: `${swapTypeLabel[swapType] || 'Äá»•i sáº£n pháº©m'} thÃ nh cÃ´ng`,
            priceChanged: newFinalPrice !== oldFinalPrice,
            oldFinalPrice,
            newFinalPrice,
            oldOrderTotal,
            newOrderTotal,
            data: await fetchOrderDetail(id),
        });
    } catch (error) {
        if (session) {
            if (useTransaction) await session.abortTransaction();
            await session.endSession();
        }
        console.error('swapOrderItem error:', error);
        return res.status(500).json({ success: false, message: 'Lá»—i server', error: error.message });
    }
};
