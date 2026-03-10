const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
const Collateral = require('../model/Collateral.model');
const ReturnRecord = require('../model/ReturnRecord.model');
const Alert = require('../model/Alert.model');

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

exports.createRentOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { rentStartDate, rentEndDate, items = [] } = req.body;

        if (!rentStartDate || !rentEndDate || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui long cung cap day du thong tin thue'
            });
        }

        const resolvedItems = [];
        for (const item of items) {
            let instance = null;
            if (item.productInstanceId) {
                instance = await ProductInstance.findById(item.productInstanceId);
            } else if (item.productId) {
                instance = await ProductInstance.findOne({
                    productId: item.productId,
                    lifecycleStatus: 'Available'
                }).sort({ conditionScore: -1 });
            }

            if (!instance || instance.lifecycleStatus !== 'Available') {
                return res.status(400).json({
                    success: false,
                    message: 'Co san pham khong kha dung de thue'
                });
            }

            resolvedItems.push({ source: item, instance });
        }

        const computedTotalAmount = resolvedItems.reduce(
            (sum, item) => sum + Number(item.source.finalPrice || item.source.baseRentPrice || item.instance.currentRentPrice || 0),
            0
        );

        const requestedDeposit = Number(req.body.depositAmount);
        const depositAmount = Number.isFinite(requestedDeposit)
            ? Math.max(requestedDeposit, 0)
            : Math.round(computedTotalAmount * 0.5);
        const requestedRemaining = Number(req.body.remainingAmount);
        const remainingAmount = Number.isFinite(requestedRemaining)
            ? Math.max(requestedRemaining, 0)
            : Math.max(computedTotalAmount - depositAmount, 0);

        const rentOrder = await RentOrder.create({
            customerId: userId || req.body.customerId,
            staffId: null,
            status: 'PendingDeposit',
            rentStartDate,
            rentEndDate,
            depositAmount,
            remainingAmount,
            washingFee: 0,
            damageFee: 0,
            lateDays: 0,
            lateFee: 0,
            compensationFee: 0,
            totalAmount: Number(req.body.totalAmount) > 0 ? Number(req.body.totalAmount) : computedTotalAmount
        });

        await RentOrderItem.insertMany(
            resolvedItems.map((item) => ({
                orderId: rentOrder._id,
                productInstanceId: item.instance._id,
                baseRentPrice: item.source.baseRentPrice || item.instance.currentRentPrice,
                finalPrice: item.source.finalPrice || item.instance.currentRentPrice,
                rentStartDate: item.source.rentStartDate,
                rentEndDate: item.source.rentEndDate,
                condition: item.instance.conditionLevel,
                appliedRuleIds: item.source.appliedRuleIds || [],
                selectLevel: item.source.selectLevel || '',
                size: item.source.size,
                color: item.source.color,
                note: item.source.note || ''
            }))
        );

        const detail = await fetchOrderDetail(rentOrder._id);

        return res.status(201).json({
            success: true,
            data: detail
        });
    } catch (error) {
        console.error('Create rent order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server khi tao don thue',
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

        const order = await RentOrder.findById(id);
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

        order.status = 'Deposited';
        await order.save();

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            await ProductInstance.updateMany(
                { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
                { lifecycleStatus: 'Reserved' }
            );
        }

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

        const order = await RentOrder.findById(id);
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

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (order.status !== 'Deposited') {
            return res.status(400).json({
                success: false,
                message: `Chi co the xac nhan don da dat coc. Trang thai hien tai: \"${order.status}\"`
            });
        }

        order.staffId = staffId;
        order.status = 'Confirmed';
        order.confirmedAt = new Date();
        await order.save();

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

exports.confirmPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            markWaitingOnly = false,
            method = 'Cash',
            collateral,
            collectRemaining = true
        } = req.body;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!['Confirmed', 'WaitingPickup'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Khong the xac nhan lay do voi trang thai \"${order.status}\"`
            });
        }

        if (markWaitingOnly && order.status === 'Confirmed') {
            order.status = 'WaitingPickup';
            await order.save();
            return res.json({
                success: true,
                message: 'Don da chuyen sang trang thai cho lay do',
                data: await fetchOrderDetail(id)
            });
        }

        if (collectRemaining && Number(order.remainingAmount || 0) > 0) {
            await Payment.create({
                orderType: 'Rent',
                orderId: id,
                amount: order.remainingAmount,
                method,
                status: 'Paid',
                purpose: 'Remaining',
                transactionCode: `REM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                paidAt: new Date()
            });
        }

        if (collateral && collateral.type) {
            await Collateral.create({
                orderId: id,
                type: String(collateral.type).toUpperCase(),
                documentNumber: collateral.documentNumber || '',
                documentImageUrl: collateral.documentImageUrl || '',
                cashAmount: Number(collateral.cashAmount || 0),
                status: 'Held',
                receiveAt: new Date()
            });
        }

        order.status = 'Renting';
        order.pickupAt = new Date();
        await order.save();

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
        if (instanceIds.length > 0) {
            await ProductInstance.updateMany(
                { _id: { $in: instanceIds }, lifecycleStatus: { $in: ['Reserved', 'Available'] } },
                { lifecycleStatus: 'Rented' }
            );
        }

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
        const order = await RentOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (order.status !== 'Renting') {
            return res.status(400).json({ success: false, message: 'Don phai o trang thai dang thue' });
        }

        order.status = 'WaitingReturn';
        await order.save();

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
    try {
        const { id } = req.params;
        const {
            condition = 'Normal',
            washingFee = 0,
            damageFee = 0,
            compensationFee = 0,
            note = '',
            returnDate = new Date(),
            finalize = false
        } = req.body;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!['Renting', 'WaitingReturn', 'Late'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chi co the tra do khi don dang thue/cho tra. Trang thai: \"${order.status}\"`
            });
        }

        const numericWashingFee = Math.max(Number(washingFee || 0), 0);
        const numericDamageFee = Math.max(Number(damageFee || 0), 0);
        const numericCompensationFee = Math.max(Number(compensationFee || 0), 0);
        const lateDays = computeLateDays(order.rentEndDate, returnDate);
        const lateFee = lateDays >= 3 ? Math.max(Number(order.totalAmount || 0) * LATE_FEE_MULTIPLIER, 0) : 0;

        const totalDeduction = numericWashingFee + numericDamageFee + numericCompensationFee + lateFee;
        let resolution = 'DepositDeducted';
        if (totalDeduction <= 0) resolution = 'DepositRefunded';
        if (totalDeduction > Number(order.depositAmount || 0)) resolution = 'AdditionalCharge';

        const returnRecord = await ReturnRecord.findOneAndUpdate(
            { orderId: id },
            {
                orderId: id,
                returnDate,
                condition,
                washingFee: numericWashingFee,
                damageFee: numericDamageFee,
                lateDays,
                lateFee,
                compensationFee: numericCompensationFee,
                resolution,
                resolvedAt: new Date(),
                note,
                staffId: req.user?.id
            },
            { upsert: true, new: true, runValidators: true }
        );

        order.washingFee = numericWashingFee;
        order.damageFee = numericDamageFee;
        order.lateDays = lateDays;
        order.lateFee = lateFee;
        order.compensationFee = numericCompensationFee;
        order.returnedAt = new Date(returnDate);

        if (numericCompensationFee > 0 || condition === 'Lost') {
            order.status = 'Compensation';
        } else if (lateFee > 0) {
            order.status = 'Late';
        } else {
            order.status = 'Returned';
        }

        if (finalize) {
            order.status = 'Completed';
            order.completedAt = new Date();
        }

        await order.save();

        const items = await RentOrderItem.find({ orderId: id }).lean();
        const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

        let targetLifecycle = 'Available';
        if (condition === 'Dirty') targetLifecycle = 'Washing';
        if (condition === 'Damaged') targetLifecycle = 'Repair';
        if (condition === 'Lost') targetLifecycle = 'Lost';

        if (instanceIds.length > 0) {
            await ProductInstance.updateMany({ _id: { $in: instanceIds } }, { lifecycleStatus: targetLifecycle });
        }

        const depositStatus = resolution === 'DepositRefunded' ? 'Refunded' : 'Forfeited';
        await Deposit.updateMany({ orderId: id, status: 'Held' }, { status: depositStatus });

        await Collateral.updateMany(
            { orderId: id, status: 'Held' },
            {
                status: resolution === 'DepositRefunded' ? 'Returned' : 'Deducted',
                returnedAt: new Date()
            }
        );

        if (lateFee > 0) {
            await Alert.create({
                type: 'Late',
                targetType: 'RentOrder',
                targetId: order._id,
                status: 'New',
                message: `Don ${order._id} tre han ${lateDays} ngay`,
                actionRequired: true
            });
        }

        if (numericCompensationFee > 0 || condition === 'Lost') {
            await Alert.create({
                type: 'Compensation',
                targetType: 'RentOrder',
                targetId: order._id,
                status: 'New',
                message: `Don ${order._id} phat sinh boi thuong`,
                actionRequired: true
            });
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
        console.error('Confirm return error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};

exports.finalizeRentOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { method = 'Cash', collectFees = true } = req.body;

        const order = await RentOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (order.status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Don da hoan tat' });
        }

        if (!['Returned', 'Late', 'Compensation', 'NoShow'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Khong the chot don o trang thai \"${order.status}\"`
            });
        }

        if (collectFees) {
            if (Number(order.lateFee || 0) > 0) {
                await Payment.create({
                    orderType: 'Rent',
                    orderId: id,
                    amount: order.lateFee,
                    method,
                    status: 'Paid',
                    purpose: 'LateFee',
                    transactionCode: `LATE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    paidAt: new Date()
                });
            }

            if (Number(order.compensationFee || 0) > 0) {
                await Payment.create({
                    orderType: 'Rent',
                    orderId: id,
                    amount: order.compensationFee,
                    method,
                    status: 'Paid',
                    purpose: 'Compensation',
                    transactionCode: `COMP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    paidAt: new Date()
                });
            }
        }

        order.status = 'Completed';
        order.completedAt = new Date();
        await order.save();

        return res.json({
            success: true,
            message: 'Chot don thanh cong',
            data: await fetchOrderDetail(id)
        });
    } catch (error) {
        console.error('Finalize rent order error:', error);
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

        order.status = 'NoShow';
        order.noShowAt = new Date();
        order.depositForfeited = true;
        await order.save();

        await Deposit.updateMany({ orderId: id, status: 'Held' }, { status: 'Forfeited' });

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

        return res.json({
            success: true,
            message: 'Hoan tat giat. San pham da co san'
        });
    } catch (error) {
        console.error('Complete washing error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};
