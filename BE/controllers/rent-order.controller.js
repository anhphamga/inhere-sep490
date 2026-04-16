const mongoose = require('mongoose');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
const Collateral = require('../model/Collateral.model');
const ReturnRecord = require('../model/ReturnRecord.model');
const Alert = require('../model/Alert.model');
const InventoryHistory = require('../model/InventoryHistory.model');
const Voucher = require('../model/Voucher.model');
const User = require('../model/User.model');
const bcrypt = require('bcryptjs');
const { writeAuditLog } = require('../services/auditLog.service');
const {
    computeExpectedDeposit,
    handleNoShow,
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
    [RENT_ORDER_STATUS.DRAFT]: 'Nháp',
    [RENT_ORDER_STATUS.PENDING_DEPOSIT]: 'Chờ đặt cọc',
    [RENT_ORDER_STATUS.DEPOSITED]: 'Đã đặt cọc',
    [RENT_ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
    [RENT_ORDER_STATUS.WAITING_PICKUP]: 'Chờ lấy đồ',
    [RENT_ORDER_STATUS.RENTING]: 'Đang thuê',
    [RENT_ORDER_STATUS.WAITING_RETURN]: 'Chờ trả đồ',
    [RENT_ORDER_STATUS.LATE]: 'Trễ hạn',
    [RENT_ORDER_STATUS.RETURNED]: 'Đã trả đồ',
    [RENT_ORDER_STATUS.CANCELLED]: 'Đã hủy',
    [RENT_ORDER_STATUS.NO_SHOW]: 'Khách không đến',
    [RENT_ORDER_STATUS.COMPENSATION]: 'Bồi thường',
    [RENT_ORDER_STATUS.COMPLETED]: 'Hoàn tất',
};

/**
 * Sinh mã đơn thuê dạng TH-YYMMDD-XXXX
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
 * Blocks instances in non-rentable lifecycle states, then checks overlapping
 * RentOrderItem records (chỉ bỏ qua đơn terminal). PendingDeposit vẫn chặn chồng lấp
 * cho đến khi đơn bị hủy (user / auto-cancel) — tránh lỗ hổng giữa hết “soft hold” và cron hủy.
 */
// Các trạng thái đã kết thúc vòng đời — đồ đã trả hoặc huỷ
const TERMINAL_ORDER_STATUSES = ['cancelled', 'completed', 'noshow'];

// Số ngày thuê tối đa cho 1 đơn
const MAX_RENTAL_DAYS = parseInt(process.env.MAX_RENTAL_DAYS || '30', 10);

/** Trạng thái instance không được cho thuê (kể cả khi không có overlap trong DB). */
const INSTANCE_STATUSES_BLOCKING_RENT = ['Washing', 'Repair', 'Lost', 'Sold'];

/**
 * @param {*} instanceId
 * @param {*} rentStartDate
 * @param {*} rentEndDate
 * @param {*} session
 * @param {string|null} excludeOrderId - bỏ qua đơn này khi check (dùng trong payDeposit để không tự block chính mình)
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

    // Kiểm tra 1: chồng lấp ngày hợp đồng với đơn chưa kết thúc
    // Lưu ý timezone/ranh giới ngày:
    // - frontend/backend có thể parse date theo UTC khác UTC+7
    // - end date trong nghiệp vụ thường mang nghĩa "đến hết ngày"
    // => quy đổi sang "ngày lịch Việt Nam" để quyết định overlap cho đúng (cho phép thuê liên tiếp).
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
    const toVnCalendarDay = (d) => Math.floor((new Date(d).getTime() + VN_TZ_OFFSET_MS) / DAY_IN_MS);

    const requestedStartDay = toVnCalendarDay(rentStartDate);
    const requestedEndDay = toVnCalendarDay(rentEndDate);

    // Candidate window theo timestamp (để giảm số lượng record),
    // rồi vẫn lọc lại overlap theo ngày VN (để chống sai lệch timezone/biên).
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

        // Overlap theo ngày lịch VN (end là inclusive theo nghiệp vụ).
        return itemStartDay <= requestedEndDay && itemEndDay >= requestedStartDay;
    });
    if (conflictingOverlaps.length > 0) {
        return false;
    }

    // Kiểm tra 2: đơn trễ hạn vẫn còn active
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

    return orders.map((order) => ({
        ...order.toObject(),
        items: byOrder[safeObjectId(order._id)] || []
    }));
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

    return {
        ...order.toObject(),
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
 * Kiểm tra xem MongoDB có hỗ trợ replica set không.
 * Nếu có, khởi tạo session + transaction.
 */
const startTransactionIfAvailable = async () => {
    let session = null;
    let useTransaction = false;
    try {
        const isMaster = await mongoose.connection.db.admin().command({ ismaster: 1 });
        if (isMaster?.setName) {
            session = await mongoose.startSession();
            try {
                session.startTransaction();
                useTransaction = true;
            } catch (err) {
                console.warn('Transaction not supported in current deployment:', err.message);
            }
        }
    } catch (err) {
        console.warn('Cannot check replica set status; proceeding without transaction:', err.message);
    }
    return { session, useTransaction };
};

/**
 * Quyết toán tài chính sau khi đơn hoàn tất.
 *
 * Nguyên tắc:
 *  - Tiền cọc online (deposit) = khoản thanh toán đầu (50% tiền thuê) → tiêu thụ, KHÔNG hoàn lại.
 *  - Thế chấp tiền mặt phủ khoản còn lại (remaining chưa thu + các phí), hoàn phần thừa.
 *  - Nếu thế chấp không đủ hoặc không có → thu thêm từ khách.
 *
 * Ví dụ: tiền thuê 400k, cọc online 200k, thế chấp 500k, remaining 200k, không phí:
 *   netCashRefund = 500 - 200 - 0 = 300k  (hoàn lại cho khách)
 *   extraDue      = 0
 */
const settleDepositAndCollateral = async (orderId, order, method = 'Cash') => {
    const heldDeposit = await Deposit.findOne({ orderId, status: 'Held' });

    // Kiểm tra remaining đã được thu chưa (có thể đã thu tại bước confirmPickup hoặc qua QR ExtraDue)
    const paidRemainingPayments = await Payment.find({
        orderId,
        orderType: ORDER_TYPE.RENT,
        purpose: 'Remaining',
        status: 'Paid',
    }).lean();
    const paidRemainingTotal = paidRemainingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstandingRemaining = Math.max(0, Number(order.remainingAmount || 0) - paidRemainingTotal);

    const lateFee       = Number(order.lateFee       || 0);
    const damageFee     = Number(order.damageFee     || 0);
    const compensationFee = Number(order.compensationFee || 0);
    const totalFees     = lateFee + damageFee + compensationFee;

    // Khi khách thanh toán QR ExtraDue, toàn bộ khoản (remaining + fees) được ghi là purpose='Remaining'.
    // Phần dư vượt quá remainingAmount đã thực sự phủ phí → tránh thu/tạo bản ghi trùng.
    const feesCoveredByRemaining = Math.max(0, paidRemainingTotal - Number(order.remainingAmount || 0));
    const unpaidFees = Math.max(0, totalFees - feesCoveredByRemaining);

    const totalOutstanding = outstandingRemaining + unpaidFees;

    // Thế chấp tiền mặt
    const heldCashCollaterals = await Collateral.find({ orderId, type: 'CASH', status: 'Held' });
    const cashCollateralTotal = heldCashCollaterals.reduce((s, c) => s + Number(c.cashAmount || 0), 0);

    // Phần thế chấp phủ khoản nợ, phần thừa hoàn lại
    const netCashRefund = Math.max(0, cashCollateralTotal - totalOutstanding);
    // Khoản còn thiếu sau khi dùng hết thế chấp
    const extraDue = Math.max(0, totalOutstanding - cashCollateralTotal);

    // Ghi nhận thanh toán remaining từ thế chấp (nếu chưa thu riêng)
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

    // Hoàn lại phần thừa của thế chấp tiền mặt
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

    // Đánh dấu cọc online đã tiêu thụ (không hoàn)
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

// Export helper để payment.controller dùng kiểm tra double-booking (tránh circular dep)
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
 * Resolve product instances cho danh sách items trong đơn thuê.
 * Tìm instance khả dụng theo productInstanceId hoặc productId, check availability theo khoảng ngày.
 * Dùng chung cho createRentOrder và createWalkInOrder.
 */
const resolveRentInstances = async (items, defaultStart, defaultEnd, session, useTransaction) => {
    const resolvedItems = [];
    const lockedInstanceIds = new Set();

    for (const item of items) {
        let instance = null;
        const itemRentStart = new Date(item.rentStartDate || defaultStart);
        const itemRentEnd = new Date(item.rentEndDate || defaultEnd);

        if (Number.isNaN(itemRentStart.getTime()) || Number.isNaN(itemRentEnd.getTime()) || itemRentStart > itemRentEnd) {
            throw new Error('Ngày thuê không hợp lệ');
        }

        const isInstanceRentable = async (inst) => {
            if (!inst) return false;
            if (['Washing', 'Repair', 'Lost'].includes(inst.lifecycleStatus)) return false;
            return isInstanceAvailableForPeriod(inst._id, itemRentStart, itemRentEnd, useTransaction ? session : null);
        };

        if (item.productInstanceId) {
            const inst = useTransaction
                ? await ProductInstance.findById(item.productInstanceId).session(session)
                : await ProductInstance.findById(item.productInstanceId);
            if (!(await isInstanceRentable(inst))) {
                throw new Error('Có sản phẩm không khả dụng hoặc đã hết hàng để thuê.');
            }
            instance = inst;
        } else if (item.productId) {
            // Ưu tiên Used (conditionScore thấp) trước, nếu không đủ mới lấy New
        const candidatesQuery = ProductInstance.find({
                productId: item.productId,
                _id: { $nin: Array.from(lockedInstanceIds) },
                lifecycleStatus: { $nin: ['Washing', 'Repair', 'Lost', 'Sold'] }
            }).sort({ conditionScore: 1 });
            const candidates = useTransaction ? await candidatesQuery.session(session) : await candidatesQuery;
            for (const cand of candidates) {
                if (await isInstanceRentable(cand)) {
                    instance = cand;
                    break;
                }
            }
        }

        if (!instance) throw new Error('Có sản phẩm không khả dụng hoặc đã hết hàng để thuê.');
        lockedInstanceIds.add(instance._id.toString());
        resolvedItems.push({ source: item, instance, rentStartDate: itemRentStart, rentEndDate: itemRentEnd });
    }

    return resolvedItems;
};

/**
 * Đánh dấu Reserved cho các instance thuộc đơn nếu ngày thuê nằm trong ngưỡng HOURS_BEFORE_RESERVED.
 * Dùng chung cho payDeposit, staffCollectDeposit, confirmRentOrder.
 */
const reserveInstancesIfDueSoon = async (orderId, rentStartDate, txOptions = {}) => {
    const items = await RentOrderItem.find({ orderId }).lean();
    const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
    if (instanceIds.length === 0) return;

    const now = new Date();
    const orderStart = new Date(rentStartDate);
    const hoursBeforeReserved = Number(process.env.HOURS_BEFORE_RESERVED || 24);
    const threshold = new Date(now.getTime() + hoursBeforeReserved * 60 * 60 * 1000);

    if (!Number.isNaN(orderStart.getTime()) && orderStart <= threshold) {
        await ProductInstance.updateMany(
            { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
            { lifecycleStatus: 'Reserved' },
            txOptions
        );
    }
};

const findRentOrderByIdempotencyKey = async (idempotencyKey) => {
    if (!idempotencyKey) return null;
    return RentOrder.findOne({ idempotencyKey }).sort({ createdAt: -1 });
};

exports.createRentOrder = async (req, res) => {
    const { session, useTransaction } = await startTransactionIfAvailable();
    const txOptions = useTransaction ? { session } : {};
    let idempotencyKey = null;

    try {
        const userId = req.user?.id;
        const { rentStartDate, rentEndDate, items = [], voucherCode = '' } = req.body;
        idempotencyKey = normalizeIdempotencyKey(req);

        if (!rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin thuê'
            });
        }

        const parsedStart = new Date(rentStartDate);
        const parsedEnd = new Date(rentEndDate);
        if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'Ngày thuê không hợp lệ' });
        }
        if (parsedEnd < parsedStart) {
            return res.status(400).json({ success: false, message: 'Ngày kết thúc không thể trước ngày bắt đầu' });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const startDay = new Date(parsedStart);
        startDay.setHours(0, 0, 0, 0);
        if (startDay < todayStart) {
            return res.status(400).json({ success: false, message: 'Ngày bắt đầu thuê không thể là ngày trong quá khứ' });
        }
        const rentalDays = Math.ceil((parsedEnd - parsedStart) / (24 * 60 * 60 * 1000));
        if (rentalDays > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Thời gian thuê tối đa là ${MAX_RENTAL_DAYS} ngày` });
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

        const invalidPriceItem = items.find((item) => Number(item.baseRentPrice || 0) <= 0);
        if (invalidPriceItem) {
            return res.status(400).json({ success: false, message: 'Giá thuê không hợp lệ, vui lòng thử lại.' });
        }

        const resolvedItems = await resolveRentInstances(items, rentStartDate, rentEndDate, session, useTransaction);

        // Không set Reserved khi PendingDeposit (chưa cọc): giữ chỗ qua RentOrderItem + availability.
        // Reserved chỉ sau khi cọc (payDeposit / PayOS / reserveInstancesIfDueSoon).

        // 3. Tính toán tiền nong (Giữ nguyên logic cực tốt của bạn)
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
            return res.status(400).json(voucherApplication.error);
        }

        const orderTotalAmount = Number(voucherApplication.finalSubtotal || 0);
        const depositAmount = computeExpectedDeposit({ totalAmount: orderTotalAmount });
        const remainingAmount = Math.max(orderTotalAmount - depositAmount, 0);

        // 4. Tạo Order (Lưu ý mảng [] khi dùng create với session)
        const [rentOrder] = await RentOrder.create([{
            customerId: userId || req.body.customerId,
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
        }], { session });

        // Gán mã đơn sau khi có _id
        rentOrder.orderCode = generateOrderCode(rentOrder._id);
        await rentOrder.save(useTransaction ? { session } : {});

        // 5. Tạo Order Items
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

        // 6. Hoàn tất thành công (Commit)
        if (session) {
            if (useTransaction) {
                await session.commitTransaction();
            }
            await session.endSession();
        }

        // Đoạn này lấy detail ngoài session vì data đã được commit
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
        // CÓ LỖI XẢY RA -> ROLLBACK TRẢ LẠI ĐỒ VỀ TRẠNG THÁI CŨ
        if (session) {
            if (useTransaction) {
                await session.abortTransaction();
            }
            await session.endSession();
        }
        
        // Trả mã 400 nếu là lỗi logic (khách hàng), 500 nếu lỗi DB
        const CLIENT_ERROR_KEYWORDS = ['khả dụng', 'hết hàng', 'Ngày thuê', 'quá khứ', 'không hợp lệ'];
        const isClientError = error.isClientError === true
            || CLIENT_ERROR_KEYWORDS.some((kw) => error.message.includes(kw));
        if (!isClientError) {
            console.error('Create rent order error:', error);
        }
        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: isClientError ? error.message : 'Lỗi server khi tạo đơn thuê',
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
            message: 'Loi server khi lay danh sach don thue',
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
                message: 'Khong tim thay don thue'
            });
        }

        if (safeObjectId(detail.customerId?._id || detail.customerId) !== userId && !['owner', 'staff'].includes(String(userRole || '').toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Ban khong co quyen xem don thue nay'
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
            message: 'Loi server khi lay chi tiet don thue',
            error: error.message
        });
    }
};

exports.payDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;
        const userId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (safeObjectId(order.customerId) !== userId) {
            return res.status(403).json({ success: false, message: 'Ban khong co quyen thanh toan don nay' });
        }

        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({
                success: false,
                message: `Khong the dat coc voi trang thai \"${order.status}\"`
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
            return res.status(400).json({ success: false, message: 'Don thue nay da co dat coc' });
        }

        // Re-check availability để chống double-booking (2 user đặt cùng lúc)
        // excludeOrderId = id → bỏ qua chính đơn này khi check tránh tự block
        const orderItems = await RentOrderItem.find({ orderId: id }).lean();
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
                        description: 'Đơn bị hủy tự động do sản phẩm đã được thuê bởi khách khác.',
                        updatedAt: new Date(),
                    },
                ];
                await order.save();
                const conflictInstanceIds = orderItems.map((i) => i.productInstanceId).filter(Boolean);
                if (conflictInstanceIds.length > 0) {
                    await ProductInstance.updateMany(
                        { _id: { $in: conflictInstanceIds }, lifecycleStatus: 'Reserved' },
                        { lifecycleStatus: 'Available' }
                    );
                }
                return res.status(409).json({
                    success: false,
                    message: 'Sản phẩm này vừa được thuê bởi khách hàng khác. Đơn thuê của bạn đã bị hủy tự động.',
                });
            }
        }

        const deposit = await Deposit.create({
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Held',
            paidAt: new Date()
        });

        const payment = await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Paid',
            purpose: 'Deposit',
            transactionCode: `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date()
        });

        const before = snapshotOrderForAudit(order);
        order.status = 'Deposited';
        await order.save();

        await reserveInstancesIfDueSoon(id, order.rentStartDate);

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
            message: 'Thanh toan dat coc thanh cong',
            data: {
                order: await fetchOrderDetail(id),
                deposit,
                payment
            }
        });
    } catch (error) {
        console.error('Pay deposit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server khi thanh toan dat coc',
            error: error.message
        });
    }
};

exports.cancelRentOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        const userRole = String(req.user?.role || '').toLowerCase();
        const isStaff = ['owner', 'staff'].includes(userRole);
        if (!isStaff && safeObjectId(order.customerId) !== userId) {
            return res.status(403).json({ success: false, message: 'Ban khong co quyen huy don nay' });
        }

        const previousStatus = order.status;
        if (!['Draft', 'PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup'].includes(previousStatus)) {
            return res.status(400).json({
                success: false,
                message: `Khong the huy don voi trang thai \"${previousStatus}\"`
            });
        }

        const before = snapshotOrderForAudit(order);
        order.status = 'Cancelled';
        await order.save();

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            await ProductInstance.updateMany({ _id: { $in: instanceIds } }, { lifecycleStatus: 'Available' });
        }

        // Hoàn cọc khi hủy ở bất kỳ trạng thái nào đã đặt cọc
        if (['Deposited', 'Confirmed', 'WaitingPickup'].includes(previousStatus)) {
            await Deposit.updateMany({ orderId: id, status: 'Held' }, { status: 'Refunded' });
        }

        await auditOrderChange(req, 'orders_rent.order.cancel', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Huy don thue thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Cancel rent order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server khi huy don thue',
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
            message: 'Loi server',
            error: error.message
        });
    }
};

/**
 * PUT /:id/collect-deposit
 * Staff xác nhận đã thu tiền cọc trực tiếp (Cash) cho đơn đang ở PendingDeposit.
 * Dùng khi: walk-in PayOS bị hủy, staff chuyển sang thu tiền mặt thay thế.
 */
exports.staffCollectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });

        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn không ở trạng thái chờ đặt cọc. Trạng thái hiện tại: "${order.status}"` });
        }

        const existingDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        if (existingDeposit) {
            return res.status(400).json({ success: false, message: 'Đơn này đã có đặt cọc' });
        }

        await Deposit.create({
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Held',
            paidAt: new Date()
        });

        await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Paid',
            purpose: 'Deposit',
            transactionCode: `DEP_STAFF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date()
        });

        const before = snapshotOrderForAudit(order);
        order.status = 'Deposited';
        await order.save();

        await reserveInstancesIfDueSoon(id, order.rentStartDate);

        await auditOrderChange(req, 'orders_rent.deposit.staff_collect', order._id, before, snapshotOrderForAudit(order));

        const detail = await fetchOrderDetail(id);
        return res.json({
            success: true,
            message: `Đã ghi nhận thu cọc ${order.depositAmount.toLocaleString('vi-VN')}đ (${method === 'Cash' ? 'Tiền mặt' : method})`,
            data: detail
        });
    } catch (error) {
        console.error('Staff collect deposit error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.confirmRentOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user?.id;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (order.status !== 'Deposited') {
            return res.status(400).json({
                success: false,
                message: `Chi co the xac nhan don da dat coc. Trang thai hien tai: \"${order.status}\"`
            });
        }

        const before = snapshotOrderForAudit(order);
        order.staffId = staffId;
        order.status = 'Confirmed';
        order.confirmedAt = new Date();
        await order.save();

        await reserveInstancesIfDueSoon(id, order.rentStartDate);

        await auditOrderChange(req, 'orders_rent.order.confirm', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Xac nhan don thue thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Confirm rent order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server khi xac nhan don thue',
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
    const { session, useTransaction } = await startTransactionIfAvailable();
    const txOptions = useTransaction ? { session } : {};

    try {
        const { id } = req.params;
        const { collateral, collectRemaining = true } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        // Cho phép xác nhận lấy đồ khi đã xác nhận đơn (Confirmed) hoặc đang chờ lấy (WaitingPickup) / đã đặt cọc (Deposited)
        if (!['Deposited', 'Confirmed', 'WaitingPickup'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Khong the xac nhan lay do voi trang thai "${order.status}"`
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
                message: 'Vui long cung cap thong tin the chap (CCCD hoac tien mat).'
            });
        }

        const collateralType = String(collateral.type).toUpperCase();
        if (!['CCCD', 'GPLX', 'CAVET', 'CASH'].includes(collateralType)) {
            return res.status(400).json({
                success: false,
                message: 'Loai the chap khong hop le.'
            });
        }

        if (collateralType !== 'CASH' && !String(collateral.documentNumber || '').trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui long nhap so CCCD/GPLX/CAVET de the chap.'
            });
        }

        if (collateralType === 'CASH' && Number(collateral.cashAmount || 0) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui long nhap so tien the chap hop le.'
            });
        }

        // 1) Lưu thế chấp
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

        // 2) Không thu remaining tại đây.
        // - Thế chấp tiền mặt (CASH): bao gồm cả phần remaining, quyết toán cuối trừ và hoàn phần thừa.
        // - Thế chấp giấy tờ (CCCD/GPLX/CAVET): khách chưa trả remaining, quyết toán cuối thu thêm từ khách.
        // Trong cả hai trường hợp, Payment(Remaining) được tạo tại bước completeWashing.

        // 3) Update trạng thái đơn và món đồ
        const before = snapshotOrderForAudit(order);
        order.status = 'Renting';
        order.pickupAt = new Date();
        await order.save(txOptions);

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

        if (instanceIds.length > 0) {
            await ProductInstance.updateMany(
                { _id: { $in: instanceIds } },
                { lifecycleStatus: 'Rented' },
                txOptions
            );

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
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.markWaitingPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const order = req.order || await RentOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        }

        if (!['Deposited', 'Confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chỉ có thể chuyển sang chờ lấy đồ khi đơn ở trạng thái Deposited hoặc Confirmed. Trạng thái hiện tại: "${order.status}"`
            });
        }

        const heldDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        if (!heldDeposit) {
            return res.status(400).json({ success: false, message: 'Đơn chưa được đặt cọc' });
        }

        const before = snapshotOrderForAudit(order);
        order.staffId = order.staffId || req.user?.id;
        order.status = 'WaitingPickup';
        await order.save();

        await auditOrderChange(req, 'orders_rent.order.confirm', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Đơn đã chuyển sang trạng thái chờ khách lấy đồ',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Mark waiting pickup error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.markWaitingReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const order = req.order || await RentOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (order.status !== 'Renting') {
            return res.status(400).json({ success: false, message: 'Don phai o trang thai dang thue' });
        }

        const before = snapshotOrderForAudit(order);
        order.status = 'WaitingReturn';
        await order.save();

        await auditOrderChange(req, 'orders_rent.return.process', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Don da chuyen sang cho tra do',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Mark waiting return error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.confirmReturn = async (req, res) => {
    const { session, useTransaction } = await startTransactionIfAvailable();
    const txOptions = useTransaction ? { session } : {};

    try {
        const { id } = req.params;
        const { returnedItems = [], note = '', returnDate: returnDateRaw } = req.body;

        // Ngày thực tế trả — staff có thể chỉ định; mặc định là hôm nay
        const actualReturnDate = returnDateRaw ? new Date(returnDateRaw) : new Date();
        if (Number.isNaN(actualReturnDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Ngày trả thực tế không hợp lệ' });
        }

        if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp danh sách sản phẩm trả' });
        }

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        if (!['Renting', 'WaitingReturn', 'Late'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chỉ có thể xử lý trả đồ khi đơn đang ở trạng thái Renting, WaitingReturn hoặc Late. Trạng thái hiện tại: "${order.status}"`
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

        // Validate returnedItems có thuộc đơn này không (bảo mật: tránh staff cập nhật instance của đơn khác)
        const orderItems = await RentOrderItem.find({ orderId: id }).lean();
        const allInstanceIds = orderItems.map((item) => item.productInstanceId).filter(Boolean);
        const totalItems = allInstanceIds.length;
        const validInstanceIdSet = new Set(allInstanceIds.map(String));

        for (const item of returnedItems) {
            if (item.productInstanceId && !validInstanceIdSet.has(String(item.productInstanceId))) {
                if (session) {
                    if (useTransaction) await session.abortTransaction();
                    await session.endSession();
                }
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${item.productInstanceId} không thuộc đơn thuê này`
                });
            }
            if (item.damageFee !== undefined && Number(item.damageFee) < 0) {
                if (session) {
                    if (useTransaction) await session.abortTransaction();
                    await session.endSession();
                }
                return res.status(400).json({ success: false, message: 'Phí hỏng hóc không được âm' });
            }
            const validConditions = ['Normal', 'Dirty', 'Damaged'];
            if (item.condition && !validConditions.includes(item.condition)) {
                if (session) {
                    if (useTransaction) await session.abortTransaction();
                    await session.endSession();
                }
                return res.status(400).json({ success: false, message: `Tình trạng "${item.condition}" không hợp lệ` });
            }
        }

        const lateDays = Number(order.lateDays || 0);
        const lateFee = Number(order.lateFee || 0);
        const totalDamageFee = returnedItems.reduce((sum, item) => sum + Number(item.damageFee || 0), 0);
        const conditions = new Set(returnedItems.map((item) => item.condition));
        const returnCondition = conditions.has('Damaged')
            ? 'Damaged'
            : conditions.has('Dirty')
                ? 'Dirty'
                : 'Normal';

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
                    staffId: req.user?.id
                }
            ],
            txOptions
        ))[0];

        const instanceIds = returnedItems.map((item) => item.productInstanceId).filter(Boolean);
        const before = snapshotOrderForAudit(order);

        for (const item of returnedItems) {
            const instanceId = item.productInstanceId;
            if (!instanceId) continue;

            const targetLifecycle = item.condition === 'Damaged' ? 'Repair' : 'Washing';
            const beforeInstance = await ProductInstance.findById(instanceId).lean();
            await ProductInstance.updateOne(
                { _id: instanceId },
                { lifecycleStatus: targetLifecycle }
            );
            const afterInstance = await ProductInstance.findById(instanceId).lean();

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
                {}
            );
        }

        // Đếm số món đã rời trạng thái 'Rented' (đang đi giặt/sửa/có sẵn)
        // Dùng lifecycleStatus thay vì InventoryHistory để tránh đếm nhầm lịch sử cũ
        const stillRentingCount = await ProductInstance.countDocuments({
            _id: { $in: allInstanceIds },
            lifecycleStatus: 'Rented'
        });
        const returnedCount = totalItems - stillRentingCount;

        order.lateDays = lateDays;
        order.lateFee = lateFee;
        order.damageFee = totalDamageFee;
        order.actualReturnDate = actualReturnDate;
        order.returnedAt = new Date();
        // Status chỉ phụ thuộc vào số lượng đồ đã trả — không để Late override sau khi đồ đã về
        // validateReturn đã tính lateFee/lateDays rồi; không gọi applyLatePenalty lần 2
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
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.finalizeRentOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        if (['Completed', 'Returned'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Đơn đã được chốt hoặc hoàn tất' });
        }

        // NoShow: cọc đã bị tịch thu, không có gì để chốt
        if (!['WaitingReturn', 'Late', 'Compensation'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể chốt đơn ở trạng thái "${order.status}"`
            });
        }

        // Chỉ chuyển sang Returned để khách thanh toán số tiền còn lại
        // Không tạo payment hay xử lý tiền ở bước này
        const before = snapshotOrderForAudit(order);
        order.status = 'Returned';
        await order.save();

        await auditOrderChange(req, 'orders_rent.order.finalize', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Chốt đơn thành công! Vui lòng thanh toán số tiền còn lại.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Finalize rent order error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.completeRentOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { method = 'Cash' } = req.body;

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        if (order.status !== 'Returned') {
            return res.status(400).json({ 
                success: false, 
                message: `Khong the hoan tat don o trang thai "${order.status}"` 
            });
        }

        // Chỉ xác nhận thanh toán còn lại đã được nhận.
        // Việc quyết toán cọc + trả thế chấp + chuyển sang Completed
        // được thực hiện duy nhất tại completeWashing để tránh double-settle.
        const before = snapshotOrderForAudit(order);
        await auditOrderChange(req, 'orders_rent.return.finalize', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Đã xác nhận thanh toán. Vui lòng hoàn tất giặt để kết thúc đơn.',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Complete rent order error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.markNoShow = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!['Deposited', 'Confirmed', 'WaitingPickup'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Khong the danh dau no-show voi trang thai \"${order.status}\"`
            });
        }

        const before = snapshotOrderForAudit(order);
        await handleNoShow(order);

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            await ProductInstance.updateMany(
                { _id: { $in: instanceIds }, lifecycleStatus: { $in: ['Reserved', 'Available'] } },
                { lifecycleStatus: 'Available' }
            );
        }

        await Alert.create({
            type: 'NoShow',
            targetType: 'RentOrder',
            targetId: order._id,
            status: 'New',
            message: `Đơn ${order._id} đã đặt cọc nhưng khách không đến nhận đồ`,
            actionRequired: true
        });

        await auditOrderChange(req, 'orders_rent.no_show.mark', order._id, before, snapshotOrderForAudit(order));

        return res.json({
            success: true,
            message: 'Da danh dau khach no-show',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Mark no-show error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.completeWashing = async (req, res) => {
    try {
        const { id } = req.params;
        const { instanceIds } = req.body;
        // Normalize method: 'PayOS' → 'Online' (Payment model không có enum 'PayOS')
        const rawMethod = req.body.method || 'Cash';
        const method = rawMethod === 'PayOS' ? 'Online' : rawMethod;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

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

        // Nếu đơn đang ở trạng thái Returned, quyết toán và chuyển sang Completed
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
            message: order.status === 'Completed' ? 'Hoan tat giat. Don hoan tat' : 'Hoan tat giat. San pham da co san',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Complete washing error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

/**
 * Tìm kiếm khách hàng theo số điện thoại / tên / email — dành cho staff tạo đơn tại chỗ.
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
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

/**
 * Tạo đơn thuê tại chỗ — staff tạo thay cho khách đến trực tiếp.
 * Đơn được tạo ở trạng thái Deposited ngay (cọc thu trực tiếp bằng tiền mặt).
 */
exports.createWalkInOrder = async (req, res) => {
    const { session, useTransaction } = await startTransactionIfAvailable();
    const txOptions = useTransaction ? { session } : {};

    try {
        const staffId = req.user?.id;
        const { customerId, rentStartDate, rentEndDate, items = [], depositMethod = 'Cash' } = req.body;

        if (!customerId || !rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đơn thuê' });
        }

        const customer = await User.findById(customerId).lean();
        if (!customer || customer.role !== 'customer') {
            return res.status(400).json({ success: false, message: 'Khách hàng không tồn tại hoặc không hợp lệ' });
        }

        const parsedStart = new Date(rentStartDate);
        const parsedEnd = new Date(rentEndDate);
        if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'Ngày thuê không hợp lệ' });
        }
        if (parsedEnd < parsedStart) {
            return res.status(400).json({ success: false, message: 'Ngày kết thúc không thể trước ngày bắt đầu' });
        }
        const walkInRentalDays = Math.ceil((parsedEnd - parsedStart) / (24 * 60 * 60 * 1000));
        if (walkInRentalDays > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Thời gian thuê tối đa là ${MAX_RENTAL_DAYS} ngày` });
        }

        const resolvedItems = await resolveRentInstances(items, rentStartDate, rentEndDate, session, useTransaction);

        // Tính tiền
        const computedTotalAmount = resolvedItems.reduce(
            (sum, item) => sum + Number(item.source.finalPrice || item.instance.currentRentPrice || 0),
            0
        );
        const depositAmount = computeExpectedDeposit({ totalAmount: computedTotalAmount });
        const remainingAmount = Math.max(computedTotalAmount - depositAmount, 0);

        // PayOS walk-in: tạo đơn ở PendingDeposit, chờ khách quét QR
        // Cash walk-in: tạo đơn Deposited ngay, ghi nhận đã thu tiền mặt
        const isPayOS = depositMethod === 'Online';

        const [rentOrder] = await RentOrder.create([{
            customerId,
            staffId,
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

        // Tạo order items
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

        // Với Cash: ghi nhận thu cọc ngay
        // Với PayOS: không tạo bản ghi thanh toán — sẽ do webhook PayOS tạo sau khi khách thanh toán
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

        // Chỉ reserve sau khi đã thu cọc (Cash → Deposited). PayOS PendingDeposit: chờ thanh toán, không Reserved.
        if (!isPayOS) {
            await reserveInstancesIfDueSoon(rentOrder._id, rentStartDate, txOptions);
        }

        if (session) {
            if (useTransaction) await session.commitTransaction();
            await session.endSession();
        }

        const detail = await fetchOrderDetail(rentOrder._id);
        await auditOrderChange(req, 'orders_rent.walk_in.create', rentOrder._id, null, snapshotOrderForAudit(rentOrder));

        const successMsg = isPayOS
            ? `Tạo đơn tại chỗ thành công. Vui lòng tạo link PayOS để thu cọc ${depositAmount.toLocaleString('vi-VN')}đ`
            : `Tạo đơn tại chỗ thành công. Đã thu cọc ${depositAmount.toLocaleString('vi-VN')}đ`;

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
        const CLIENT_ERROR_KEYWORDS = ['khả dụng', 'hết hàng', 'Khách hàng', 'không hợp lệ'];
        const isClientError = CLIENT_ERROR_KEYWORDS.some((kw) => error.message.includes(kw));
        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: isClientError ? error.message : 'Lỗi server khi tạo đơn tại chỗ',
            error: error.message
        });
    }
};

/**
 * Tạo tài khoản khách nhanh cho khách walk-in không có tài khoản.
 * Email được auto-generate dạng guest_<timestamp>@inhere.guest.
 * Khách có thể đăng ký lại với SĐT để claim tài khoản đầy đủ sau.
 */
exports.createGuestCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!String(name || '').trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khách hàng' });
        }

        const normalizedPhone = String(phone || '').replace(/\s+/g, '').trim() || null;

        if (normalizedPhone) {
            const phoneRegex = /^(0[3-9]\d{8}|84[3-9]\d{8})$/;
            if (!phoneRegex.test(normalizedPhone)) {
                return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (VD: 0912345678)' });
            }
            const existingByPhone = await User.findOne({ phone: normalizedPhone }).lean();
            if (existingByPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Số điện thoại này đã có tài khoản. Hãy tìm kiếm khách hàng thay vì tạo mới.',
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
            message: 'Tạo hồ sơ khách thành công',
            data: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
            }
        });
    } catch (error) {
        console.error('Create guest customer error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi tạo hồ sơ khách', error: error.message });
    }
};
