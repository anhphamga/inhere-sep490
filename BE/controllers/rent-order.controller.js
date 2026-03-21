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
const { writeAuditLog } = require('../services/auditLog.service');
const {
    applyLatePenalty,
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LATE_FEE_MULTIPLIER = Number(process.env.LATE_FEE_MULTIPLIER || 1);

const safeObjectId = (value) => {
    try {
        return value?.toString();
    } catch {
        return null;
    }
};

const computeLateDays = (rentEndDate, returnDate = new Date()) => {
    const end = new Date(rentEndDate);
    const actual = new Date(returnDate);
    if (Number.isNaN(end.getTime()) || Number.isNaN(actual.getTime())) return 0;
    const diff = actual.setHours(0, 0, 0, 0) - end.setHours(0, 0, 0, 0);
    if (diff <= 0) return 0;
    return Math.ceil(diff / DAY_IN_MS);
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
 * The availability is determined by checking for overlapping RentOrderItem records
 * (excluding cancelled orders). This avoids relying on lifecycleStatus for future
 * bookings.
 */
const isInstanceAvailableForPeriod = async (instanceId, rentStartDate, rentEndDate, session) => {
    const query = RentOrderItem.find({
        productInstanceId: instanceId,
        rentStartDate: { $lte: rentEndDate },
        rentEndDate: { $gte: rentStartDate }
    }).populate({ path: 'orderId', select: 'status' });

    if (session) query.session(session);

    const overlaps = await query.lean();

    if (!overlaps || overlaps.length === 0) return true;
    return overlaps.every((item) => String(item.orderId?.status || '').toLowerCase() === 'cancelled');
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
        Payment.find({ orderId, orderType: 'Rent' }).lean(),
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

const findRentOrderByIdempotencyKey = async (idempotencyKey) => {
    if (!idempotencyKey) return null;
    return RentOrder.findOne({ idempotencyKey }).sort({ createdAt: -1 });
};

exports.createRentOrder = async (req, res) => {
    // 1. Khởi tạo Transaction (nếu MongoDB hỗ trợ replica set)
    let session = null;
    let useTransaction = false;
    let idempotencyKey = null;

    try {
        const isMaster = await mongoose.connection.db.admin().command({ ismaster: 1 });
        if (isMaster && isMaster.setName) {
            session = await mongoose.startSession();
            try {
                session.startTransaction();
                useTransaction = true;
            } catch (err) {
                console.warn('MongoDB transaction not supported in current deployment; proceeding without transaction.', err.message);
            }
        }
    } catch (err) {
        console.warn('Unable to check MongoDB replica set status; proceeding without transaction.', err.message);
    }

    const txOptions = useTransaction ? { session } : {};

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

        const resolvedItems = [];
        // Dùng Set để lưu tạm các ID đồ đã được chọn trong CÙNG 1 đơn này (chống trùng)
        const lockedInstanceIds = new Set(); 

        // 2. Kiểm tra và Khóa đồ (dựa trên khoảng thời gian thuê, không dựa vào lifecycleStatus cho booking tương lai)
        for (const item of items) {
            let instance = null;
            const itemRentStart = new Date(item.rentStartDate || rentStartDate);
            const itemRentEnd = new Date(item.rentEndDate || rentEndDate);

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
                    throw new Error(`Có sản phẩm không khả dụng hoặc đã hết hàng để thuê.`);
                }
                instance = inst;
            } else if (item.productId) {
                const candidatesQuery = ProductInstance.find({
                    productId: item.productId,
                    _id: { $nin: Array.from(lockedInstanceIds) },
                    lifecycleStatus: { $nin: ['Washing', 'Repair', 'Lost'] }
                }).sort({ conditionScore: -1 });

                const candidates = useTransaction
                    ? await candidatesQuery.session(session)
                    : await candidatesQuery;

                for (const cand of candidates) {
                    if (await isInstanceRentable(cand)) {
                        instance = cand;
                        break;
                    }
                }
            }

            if (!instance) {
                // Nếu lỗi, throw error để rớt xuống catch và Rollback toàn bộ
                throw new Error(`Có sản phẩm không khả dụng hoặc đã hết hàng để thuê.`);
            }

            // Ghi nhận là đồ này đã bị pick
            lockedInstanceIds.add(instance._id.toString());
            resolvedItems.push({
                source: item,
                instance,
                rentStartDate: itemRentStart,
                rentEndDate: itemRentEnd
            });

            // Chỉ set trạng thái Reserved nếu đơn thuê đang diễn ra (hoặc đã bắt đầu)
            const now = new Date();
            if (itemRentStart <= now && now <= itemRentEnd) {
                await ProductInstance.findByIdAndUpdate(
                    instance._id,
                    { lifecycleStatus: 'Reserved' },
                    { ...txOptions, new: true }
                );
            }
        }

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
            washingFee: 0,
            damageFee: 0,
            lateDays: 0,
            lateFee: 0,
            compensationFee: 0,
            totalAmount: orderTotalAmount
        }], { session });

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
        
        console.error('Create rent order error:', error);
        
        // Trả mã 400 nếu là lỗi logic (hết đồ), 500 nếu lỗi DB
        const isClientError = error.message.includes('khả dụng');
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

        const deposit = await Deposit.create({
            orderId: id,
            amount: order.depositAmount,
            method,
            status: 'Held',
            paidAt: new Date()
        });

        const payment = await Payment.create({
            orderType: 'Rent',
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

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            const now = new Date();
            const orderStart = new Date(order.rentStartDate);

            // Only mark instances as Reserved once the rental period has begun (or is today).
            // Future bookings should not block availability for earlier rental windows.
            if (!Number.isNaN(orderStart.getTime()) && now >= orderStart) {
                await ProductInstance.updateMany(
                    { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
                    { lifecycleStatus: 'Reserved' }
                );
            }
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

        if (safeObjectId(order.customerId) !== userId) {
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

        if (previousStatus === 'Deposited') {
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

        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            RentOrder.find(query)
                .populate('customerId', 'name phone email')
                .populate('staffId', 'name phone')
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
        console.error('Get all rent orders error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
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
    if (['owner', 'manager', 'staff'].includes(role)) return true;
    if (!order) return false;
    return String(order.customerId) === String(req.user?.id);
};

exports.confirmPickup = async (req, res) => {
    // Không dùng transaction (vì DB có thể chạy standalone)
    const txOptions = {};

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

        // 2) Tạo payment (nếu cần thu tiền còn lại ngay)
        if (collectRemaining && Number(order.remainingAmount || 0) > 0) {
            await Payment.create([
                {
                    orderType: 'Rent',
                    orderId: id,
                    amount: order.remainingAmount,
                    method: 'Cash',
                    status: 'Paid',
                    purpose: 'Remaining',
                    transactionCode: `REM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    paidAt: new Date()
                }
            ], txOptions);
        }

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

        return res.json({
            success: true,
            message: 'Xac nhan khach da nhan do thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Confirm pickup error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
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
    // Không dùng transaction (do có thể chạy standalone MongoDB)
    const txOptions = {};

    try {
        const { id } = req.params;
        const { returnedItems = [], note = '' } = req.body;

        if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui long cung cap danh sach san pham tra' });
        }

        const order = req.order || await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        if (!['Renting', 'WaitingReturn'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chi co the tra do khi don dang thue/cho tra. Trang thai: \"${order.status}\"`
            });
        }

        try {
            await validateReturn(order, new Date());
        } catch (guardError) {
            return res.status(guardError.statusCode || 400).json({
                success: false,
                message: guardError.message,
                details: guardError.details,
            });
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
                    returnDate: new Date(),
                    condition: returnCondition,
                    washingFee: 0,
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
            {}
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

        const orderItems = await RentOrderItem.find({ orderId: id }).lean();
        const allInstanceIds = orderItems.map((item) => item.productInstanceId).filter(Boolean);
        const totalItems = allInstanceIds.length;

        const returnedCount = await InventoryHistory.countDocuments({
            productInstanceId: { $in: allInstanceIds },
            status: 'Rented',
            endDate: { $ne: null }
        });

        order.lateDays = lateDays;
        order.lateFee = lateFee;
        order.damageFee = totalDamageFee;
        order.returnedAt = new Date();
        order.status = returnedCount >= totalItems ? 'Returned' : 'WaitingReturn';

        const latePenalty = applyLatePenalty(order, lateDays);
        if (!latePenalty.applied && order.status === 'Late') {
            order.status = returnedCount >= totalItems ? 'Returned' : 'WaitingReturn';
        }

        await order.save();

        await writeAuditLog({
            req,
            user: req.user,
            action: lateDays >= 3 ? 'orders_rent.penalty.apply' : 'orders_rent.return.process',
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
        await auditOrderChange(
            req,
            lateDays >= 3 ? 'orders_rent.penalty.apply' : 'orders_rent.return.process',
            order._id,
            before,
            snapshotOrderForAudit(order)
        );

        return res.json({
            success: true,
            message: 'Xac nhan tra do thanh cong',
            data: {
                order: await fetchOrderDetail(id),
                returnRecord
            }
        });
    } catch (error) {
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

        if (order.status === 'Completed' || order.status === 'Returned') {
            return res.status(400).json({ success: false, message: 'Don da duoc chot hoac hoan tat' });
        }

        if (!['WaitingReturn', 'Late', 'Compensation', 'NoShow'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Khong the chot don o trang thai \"${order.status}\"`
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

        // 1) Tính toán tình trạng tiền (cấn trừ cọc)
        const heldDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
        const depositAmount = Number(heldDeposit?.amount || 0);
        const remainingAmount = Number(order.remainingAmount || 0);
        const lateFee = Number(order.lateFee || 0);
        const compensationFee = Number(order.compensationFee || 0);
        const damageFee = Number(order.damageFee || 0);

        const totalDue = remainingAmount + lateFee + compensationFee + damageFee;
        const depositBalance = depositAmount - totalDue;

        // 2) Tạo các giao dịch nếu cần
        if (depositBalance > 0) {
            await Payment.create({
                orderType: 'Rent',
                orderId: id,
                amount: depositBalance,
                method,
                status: 'Paid',
                purpose: 'Refund',
                transactionCode: `REF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                paidAt: new Date()
            });
            if (heldDeposit) await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Refunded' });
        } else if (depositBalance < 0) {
            const extra = Math.abs(depositBalance);
            const purpose = lateFee > 0 ? 'LateFee' : compensationFee > 0 ? 'Compensation' : 'Remaining';
            await Payment.create({
                orderType: 'Rent',
                orderId: id,
                amount: extra,
                method,
                status: 'Paid',
                purpose,
                transactionCode: `EXTRA_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                paidAt: new Date()
            });
            if (heldDeposit) await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Forfeited' });
        } else if (heldDeposit) {
            await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Forfeited' });
        }

        // 3) Trả lại thế chấp (CCCD/Tiền)
        await Collateral.updateMany(
            { orderId: id, status: 'Held' },
            { status: 'Returned', returnedAt: new Date() }
        );

        // Chỉ chuyển sang Returned để khách xem số tiền còn lại và thanh toán
        // Sẽ chuyển sang Completed khi hoàn tất giặt (completeWashing)
        order.status = 'Returned';
        await order.save();

        return res.json({
            success: true,
            message: 'Hoan tat don thanh cong',
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
            message: `Don ${order._id} da coc nhung khong den nhan do`,
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
        const { instanceIds, method = 'Cash' } = req.body;

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

        // Nếu đơn đang ở trạng thái Returned, xử lý thanh toán và chuyển sang Completed
        const before = snapshotOrderForAudit(order);
        if (order.status === 'Returned') {
            // 1) Tính toán tình trạng tiền (cấn trừ cọc)
            const heldDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
            const depositAmount = Number(heldDeposit?.amount || 0);
            const remainingAmount = Number(order.remainingAmount || 0);
            const lateFee = Number(order.lateFee || 0);
            const compensationFee = Number(order.compensationFee || 0);
            const damageFee = Number(order.damageFee || 0);

            const totalDue = remainingAmount + lateFee + compensationFee + damageFee;
            const depositBalance = depositAmount - totalDue;

            // 2) Tạo các giao dịch thanh toán
            if (depositBalance > 0) {
                // Hoàn tiền thừa cho khách
                await Payment.create({
                    orderType: 'Rent',
                    orderId: id,
                    amount: depositBalance,
                    method,
                    status: 'Paid',
                    purpose: 'Refund',
                    transactionCode: `REF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    paidAt: new Date()
                });
                if (heldDeposit) await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Refunded' });
            } else if (depositBalance < 0) {
                // Khách cần trả thêm tiền
                const extra = Math.abs(depositBalance);
                const purpose = lateFee > 0 ? 'LateFee' : compensationFee > 0 ? 'Compensation' : damageFee > 0 ? 'DamageFee' : 'Remaining';
                await Payment.create({
                    orderType: 'Rent',
                    orderId: id,
                    amount: extra,
                    method,
                    status: 'Paid',
                    purpose,
                    transactionCode: `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    paidAt: new Date()
                });
                if (heldDeposit) await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Forfeited' });
            } else if (heldDeposit) {
                // Đúng bằng nhau: xem như cọc đã được trừ hết
                await Deposit.updateOne({ _id: heldDeposit._id }, { status: 'Forfeited' });
            }

            // 3) Trả lại thế chấp (CCCD/Tiền)
            await Collateral.updateMany(
                { orderId: id, status: 'Held' },
                { status: 'Returned', returnedAt: new Date() }
            );

            // 4) Chuyển sang Completed
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
