const payos = require('../services/payosService');
const PayOSTransaction = require('../model/PayOSTransaction.model');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const SaleOrder = require('../model/SaleOrder.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
// Dùng lazy require để tránh circular dependency
const getRentOrderController = () => require('./rent-order.controller');
const { frontendUrl, payosWebBaseUrl } = require('../config/app.config');
const { ORDER_TYPE } = require('../constants/order.constants');
const { resolveSaleOrderUserStatus } = require('../utils/saleOrderStatus');
const { signGuestOrderViewToken } = require('../utils/jwt');

const FRONTEND_URL = frontendUrl;
const PAYOS_WEB_BASE_URL = String(payosWebBaseUrl || '').replace(/\/+$/, '');

/**
 * Tạo mã PayOS duy nhất (số nguyên 9 chữ số)
 */
const generateUniquePayosCode = async () => {
    for (let i = 0; i < 10; i++) {
        const code = Math.floor(100000000 + Math.random() * 900000000);
        const exists = await PayOSTransaction.findOne({ payosOrderCode: code });
        if (!exists) return code;
    }
    throw new Error('Không thể tạo mã PayOS duy nhất');
};

/**
 * Chuẩn hóa description cho PayOS: tối đa 25 ký tự, chỉ ASCII
 */
const sanitizeDescription = (text = '') =>
    text
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 \-_]/g, '')
        .substring(0, 25)
        .trim();

/**
 * Nội bộ: build/refresh PayOS deposit link cho 1 RentOrder đã được validate quyền.
 * Tái dùng cho cả flow member (authenticated) lẫn guest (xác thực qua email).
 */
const buildDepositPaymentLinkForOrder = async (order) => {
    const orderId = String(order._id);
    const isWalkIn = Boolean(order.staffId);
    const isGuest = !isWalkIn && Boolean(order.guestVerificationId || order.guestContact?.email);
    // Ưu tiên redirect staff cho walk-in; guest/member cùng trang payment-result
    const sourceSuffix = isWalkIn ? '&source=staff' : (isGuest ? '&source=guest' : '');

    // Với guest: sinh token magic-link để cancelUrl đưa khách về trang chi tiết
    // đơn thuê (trạng thái Chờ đặt cọc) với nút "Thanh toán lại" và "Hủy đơn".
    let guestViewToken = '';
    if (isGuest) {
        guestViewToken = signGuestOrderViewToken({
            orderId,
            guestVerificationId: order.guestVerificationId ? String(order.guestVerificationId) : '',
            guestEmail: String(order.guestContact?.email || '').trim().toLowerCase(),
            orderType: ORDER_TYPE.RENT,
        });
    }

    const cancelUrl = isWalkIn
        ? `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}&source=staff`
        : (isGuest
            ? `${FRONTEND_URL}/rental/guest/${orderId}?token=${encodeURIComponent(guestViewToken)}&payment=cancelled`
            : `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}`);

    // Trả link cũ nếu còn pending để tránh spam PayOS
    const existing = await PayOSTransaction.findOne({ orderId, purpose: 'Deposit', status: 'PENDING' });
    if (existing) {
        try {
            const info = await payos.paymentRequests.get(existing.payosOrderCode);
            if (info.status === 'PENDING') {
                const link = await payos.paymentRequests.create({
                    orderCode: existing.payosOrderCode,
                    amount: Math.round(order.depositAmount),
                    description: sanitizeDescription(`COC ${order.orderCode || orderId}`),
                    cancelUrl,
                    returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${existing.payosOrderCode}&purpose=deposit${sourceSuffix}`,
                });
                return { paymentUrl: link.checkoutUrl, orderCode: existing.payosOrderCode };
            }
        } catch (_) { /* link expired → tạo mới bên dưới */ }
        await PayOSTransaction.deleteOne({ _id: existing._id });
    }

    const payosOrderCode = await generateUniquePayosCode();
    const description = sanitizeDescription(`COC ${order.orderCode || orderId}`);
    const paymentLink = await payos.paymentRequests.create({
        orderCode: payosOrderCode,
        amount: Math.round(order.depositAmount),
        description,
        items: [{ name: 'Dat coc thue do', quantity: 1, price: Math.round(order.depositAmount) }],
        cancelUrl,
        returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${payosOrderCode}&purpose=deposit${sourceSuffix}`,
    });
    await PayOSTransaction.create({
        orderId,
        orderType: ORDER_TYPE.RENT,
        purpose: 'Deposit',
        payosOrderCode,
        payosPaymentLinkId: paymentLink.paymentLinkId,
        amount: order.depositAmount,
        status: 'PENDING',
    });
    return { paymentUrl: paymentLink.checkoutUrl, orderCode: payosOrderCode };
};

/**
 * POST /api/payments/rent-deposit/:orderId
 * Tạo PayOS payment link cho bước đặt cọc (PendingDeposit → Deposited) - member + staff
 */
exports.createDepositPaymentLink = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán cọc` });
        }
        const data = await buildDepositPaymentLinkForOrder(order);
        return res.json({ success: true, data });
    } catch (err) {
        console.error('createDepositPaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán PayOS', detail: err.message });
    }
};

/**
 * POST /api/payments/rent-deposit/guest/:orderId
 * Tạo PayOS payment link cho đơn guest. Xác thực bằng email snapshot trên đơn
 * (body.email hoặc query.email). Chỉ hoạt động với đơn được tạo qua flow guest.
 */
exports.createGuestDepositPaymentLink = async (req, res) => {
    try {
        const { orderId } = req.params;
        const rawEmail = (req.body?.email || req.query?.email || '').toString().trim().toLowerCase();
        if (!rawEmail) {
            return res.status(400).json({ success: false, message: 'Thiếu email guest.' });
        }
        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        const contactEmail = String(order.guestContact?.email || '').trim().toLowerCase();
        if (!contactEmail || contactEmail !== rawEmail) {
            return res.status(403).json({ success: false, message: 'Email không khớp với đơn thuê guest.' });
        }
        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán cọc` });
        }
        const data = await buildDepositPaymentLinkForOrder(order);
        return res.json({ success: true, data });
    } catch (err) {
        console.error('createGuestDepositPaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán PayOS', detail: err.message });
    }
};

/**
 * POST /api/payments/rent-extra-due/:orderId
 * Tạo PayOS payment link để thu khoản còn nợ khi kết thúc đơn
 * Body: { amount: Number }
 */
exports.createExtraDuePaymentLink = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
        }

        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (order.status !== 'Returned') {
            return res.status(400).json({ success: false, message: 'Đơn chưa ở trạng thái "Đã trả"' });
        }

        const existing = await PayOSTransaction.findOne({ orderId, purpose: 'ExtraDue', status: 'PENDING' });
        if (existing) {
            try {
                const info = await payos.paymentRequests.get(existing.payosOrderCode);
                if (info.status === 'PENDING') {
                    return res.json({ success: true, data: { paymentUrl: `${PAYOS_WEB_BASE_URL}/${existing.payosPaymentLinkId}`, orderCode: existing.payosOrderCode } });
                }
            } catch (_) { /* expired */ }
            await PayOSTransaction.deleteOne({ _id: existing._id });
        }

        const payosOrderCode = await generateUniquePayosCode();
        const description = sanitizeDescription(`THANH TOAN ${order.orderCode || orderId}`);

        // ExtraDue luôn do staff tạo → redirect về trang staff
        const paymentLink = await payos.paymentRequests.create({
            orderCode: payosOrderCode,
            amount: Math.round(amount),
            description,
            items: [{ name: 'Thanh toan don thue', quantity: 1, price: Math.round(amount) }],
            cancelUrl: `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}&source=staff`,
            returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${payosOrderCode}&purpose=extra-due&source=staff`,
        });

        await PayOSTransaction.create({
            orderId,
            orderType: ORDER_TYPE.RENT,
            purpose: 'ExtraDue',
            payosOrderCode,
            payosPaymentLinkId: paymentLink.paymentLinkId,
            amount,
            status: 'PENDING',
        });

        return res.json({ success: true, data: { paymentUrl: paymentLink.checkoutUrl, orderCode: payosOrderCode } });
    } catch (err) {
        console.error('createExtraDuePaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán PayOS', detail: err.message });
    }
};

/**
 * POST /api/payments/sale-order/:orderId
 * Tạo PayOS payment link cho đơn mua (SalePayment)
 */
exports.createSalePaymentLink = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await SaleOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (!['PendingPayment', 'PendingConfirmation', 'Failed'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán` });
        }

        if (order.status === 'Failed') {
            order.status = 'PendingPayment';
            order.userStatus = resolveSaleOrderUserStatus('PendingPayment', order.userStatus);
            order.history = Array.isArray(order.history) ? order.history : [];
            order.history.push({
                status: 'PendingPayment',
                action: 'retry_payment',
                description: 'Tạo lại link thanh toán sau khi giao dịch thất bại',
                updatedBy: req.user?.id || null,
                updatedAt: new Date(),
            });
            await order.save();
        }

        const existing = await PayOSTransaction.findOne({ orderId, purpose: 'SalePayment', status: 'PENDING' });
        if (existing) {
            try {
                const info = await payos.paymentRequests.get(existing.payosOrderCode);
                if (info.status === 'PENDING') {
                    return res.json({ success: true, data: { paymentUrl: `${PAYOS_WEB_BASE_URL}/${existing.payosPaymentLinkId}`, orderCode: existing.payosOrderCode } });
                }
            } catch (_) { /* expired */ }
            await PayOSTransaction.deleteOne({ _id: existing._id });
        }

        const payosOrderCode = await generateUniquePayosCode();
        const description = sanitizeDescription(`MINHANG ${orderId.toString().slice(-8)}`);

        const paymentLink = await payos.paymentRequests.create({
            orderCode: payosOrderCode,
            amount: Math.round(order.totalAmount),
            description,
            items: [{ name: 'Thanh toan don mua', quantity: 1, price: Math.round(order.totalAmount) }],
            cancelUrl: `${FRONTEND_URL}/payment-result?status=cancelled&saleOrderId=${orderId}`,
            returnUrl: `${FRONTEND_URL}/payment-result?saleOrderId=${orderId}&orderCode=${payosOrderCode}&purpose=sale`,
        });

        await PayOSTransaction.create({
            orderId,
            orderType: ORDER_TYPE.SALE,
            purpose: 'SalePayment',
            payosOrderCode,
            payosPaymentLinkId: paymentLink.paymentLinkId,
            amount: order.totalAmount,
            status: 'PENDING',
        });

        return res.json({ success: true, data: { paymentUrl: paymentLink.checkoutUrl, orderCode: payosOrderCode } });
    } catch (err) {
        console.error('createSalePaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán PayOS', detail: err.message });
    }
};

/**
 * PayOS hủy/hết hạn nhưng đơn vẫn PendingDeposit → trả instance đang Reserved về Available (sửa dữ liệu cũ / edge case).
 */
const releaseReservedInstancesForPendingDepositOrder = async (orderId) => {
    const order = await RentOrder.findById(orderId).lean();
    if (!order || order.status !== 'PendingDeposit') return;
    const items = await RentOrderItem.find({ orderId }).lean();
    const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
    if (instanceIds.length === 0) return;
    await ProductInstance.updateMany(
        { _id: { $in: instanceIds }, lifecycleStatus: 'Reserved' },
        { lifecycleStatus: 'Available' }
    );
};

const markSaleOrderAsFailed = async (orderId, reason = '') => {
    const saleOrder = await SaleOrder.findById(orderId);
    if (!saleOrder) return;
    if (!['PendingPayment', 'PendingConfirmation'].includes(String(saleOrder.status || ''))) return;

    saleOrder.status = 'Failed';
    saleOrder.userStatus = resolveSaleOrderUserStatus('Failed', saleOrder.userStatus);
    saleOrder.history = Array.isArray(saleOrder.history) ? saleOrder.history : [];
    saleOrder.history.push({
        status: 'Failed',
        action: 'payment_failed',
        description: reason
            ? `Thanh toán thất bại (${reason})`
            : 'Thanh toán thất bại',
        updatedBy: null,
        updatedAt: new Date(),
    });
    await saleOrder.save();
};

/**
 * Xử lý nội bộ khi phát hiện thanh toán đã thành công (dùng chung cho webhook và polling)
 */
const processConfirmedPayment = async (txn) => {
    await PayOSTransaction.updateOne({ _id: txn._id }, { status: 'PAID', paidAt: new Date() });

    if (txn.purpose === 'Deposit') {
        const order = await RentOrder.findById(txn.orderId);
        if (order && order.status === 'PendingDeposit') {
            // Re-check availability để chống double-booking qua PayOS
            const { isInstanceAvailableForPeriodExcluding } = getRentOrderController();
            if (typeof isInstanceAvailableForPeriodExcluding === 'function') {
                const orderItems = await RentOrderItem.find({ orderId: txn.orderId }).lean();
                for (const item of orderItems) {
                    const available = await isInstanceAvailableForPeriodExcluding(
                        item.productInstanceId, item.rentStartDate, item.rentEndDate, txn.orderId
                    );
                    if (!available) {
                        order.status = 'Cancelled';
                        order.history = [...(order.history || []), {
                            status: 'Cancelled',
                            action: 'double_booking_auto_cancel',
                            description: 'Đơn bị hủy tự động do sản phẩm đã được thuê bởi khách khác.',
                            updatedAt: new Date(),
                        }];
                        await order.save();
                        const releaseIds = orderItems.map((i) => i.productInstanceId).filter(Boolean);
                        if (releaseIds.length > 0) {
                            await ProductInstance.updateMany(
                                { _id: { $in: releaseIds }, lifecycleStatus: 'Reserved' },
                                { lifecycleStatus: 'Available' }
                            );
                        }
                        console.warn(`[PayOS] Double-booking detected, order ${order.orderCode || txn.orderId} auto-cancelled.`);
                        return;
                    }
                }
            }

            const existingDeposit = await Deposit.findOne({ orderId: txn.orderId, status: 'Held' });
            if (!existingDeposit) {
                await Deposit.create({ orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Held', paidAt: new Date() });
            }
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'Deposit', status: 'Paid' });
            if (!existingPayment) {
                await Payment.create({ orderType: ORDER_TYPE.RENT, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Deposit', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }
            order.status = 'Deposited';
            await order.save();

            // Reserve instances nếu ngày thuê trong vòng HOURS_BEFORE_RESERVED giờ tới
            try {
                const items = await RentOrderItem.find({ orderId: txn.orderId }).lean();
                const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
                if (instanceIds.length > 0) {
                    const now = new Date();
                    const orderStart = new Date(order.rentStartDate);
                    const hoursBeforeReserved = Number(process.env.HOURS_BEFORE_RESERVED || 24);
                    const threshold = new Date(now.getTime() + hoursBeforeReserved * 60 * 60 * 1000);
                    if (!Number.isNaN(orderStart.getTime()) && orderStart <= threshold) {
                        await ProductInstance.updateMany(
                            { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
                            { lifecycleStatus: 'Reserved' }
                        );
                    }
                }
            } catch (reserveErr) {
                console.error(`[PayOS] Reserve instances failed for order ${txn.orderId}:`, reserveErr.message);
            }

            console.log(`[PayOS] Deposit confirmed for order ${order.orderCode || txn.orderId}`);
        }
    }

    if (txn.purpose === 'SalePayment') {
        const saleOrder = await SaleOrder.findById(txn.orderId);
        if (saleOrder && ['PendingPayment', 'PendingConfirmation'].includes(saleOrder.status)) {
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'SalePayment', status: 'Paid' });
            if (!existingPayment) {
                await Payment.create({ orderType: ORDER_TYPE.SALE, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'SalePayment', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }
            saleOrder.status = 'PendingConfirmation';
            saleOrder.userStatus = resolveSaleOrderUserStatus('PendingConfirmation', saleOrder.userStatus);
            await saleOrder.save();
            console.log(`[PayOS Polling] Sale payment confirmed for order ${txn.orderId}`);
        }
    }

    if (txn.purpose === 'ExtraDue') {
        const rentOrder = await RentOrder.findById(txn.orderId);
        if (rentOrder && rentOrder.status === 'Returned') {
            // Ghi nhận payment nếu chưa có
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'Remaining', transactionCode: `PAYOS_${txn.payosOrderCode}` });
            if (!existingPayment) {
                await Payment.create({ orderType: ORDER_TYPE.RENT, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Remaining', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }

            // Tự động hoàn tất đơn: quyết toán cọc/thế chấp → Completed, trả instances về Available
            try {
                const { settleDepositAndCollateral } = getRentOrderController();
                await settleDepositAndCollateral(String(txn.orderId), rentOrder, 'Online');

                // Trả instances về Available (từ Washing hoặc Reserved)
                const items = await RentOrderItem.find({ orderId: txn.orderId }).lean();
                const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);
                if (instanceIds.length > 0) {
                    await ProductInstance.updateMany(
                        { _id: { $in: instanceIds }, lifecycleStatus: { $in: ['Washing', 'Reserved'] } },
                        { lifecycleStatus: 'Available' }
                    );
                }

                rentOrder.status = 'Completed';
                rentOrder.completedAt = new Date();
                await rentOrder.save();
                console.log(`[PayOS] ExtraDue confirmed → order ${rentOrder.orderCode || txn.orderId} auto-completed`);
            } catch (err) {
                console.error(`[PayOS] ExtraDue auto-complete failed for order ${txn.orderId}:`, err.message);
                // Không throw — payment đã ghi nhận thành công, chỉ auto-complete thất bại
            }
        }
    }
};

/**
 * GET /api/payments/payos-status/:orderCode
 * Kiểm tra trạng thái giao dịch (FE polling sau khi redirect về).
 * Nếu DB còn PENDING, chủ động hỏi PayOS API — bù khi webhook không đến.
 */
exports.checkPayosStatus = async (req, res) => {
    try {
        const orderCode = Number(req.params.orderCode);
        const txn = await PayOSTransaction.findOne({ payosOrderCode: orderCode });
        if (!txn) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });

        // Nếu DB còn PENDING → hỏi thẳng PayOS API để kiểm tra
        if (txn.status === 'PENDING') {
            try {
                const payosInfo = await payos.paymentRequests.get(txn.payosOrderCode);
                if (payosInfo.status === 'PAID') {
                    await processConfirmedPayment(txn);
                    // Reload txn sau khi xử lý
                    const updatedTxn = await PayOSTransaction.findById(txn._id);
                    txn.status = updatedTxn.status;
                } else if (payosInfo.status === 'CANCELLED' || payosInfo.status === 'EXPIRED') {
                    await PayOSTransaction.updateOne({ _id: txn._id }, { status: payosInfo.status });
                    txn.status = payosInfo.status;
                    if (txn.orderType === ORDER_TYPE.RENT && txn.purpose === 'Deposit') {
                        await releaseReservedInstancesForPendingDepositOrder(txn.orderId);
                    }
                    if (txn.orderType === ORDER_TYPE.SALE && txn.purpose === 'SalePayment') {
                        const reason = payosInfo.status === 'EXPIRED' ? 'quá hạn thanh toán' : 'khách hủy thanh toán';
                        await markSaleOrderAsFailed(txn.orderId, reason);
                    }
                }
            } catch (payosErr) {
                console.warn(`[PayOS] Could not query payment status for ${orderCode}:`, payosErr.message);
            }
        }

        let order = null;
        if (txn.orderType === ORDER_TYPE.SALE) {
            order = await SaleOrder.findById(txn.orderId).lean();
        } else {
            order = await RentOrder.findById(txn.orderId).lean();
        }

        return res.json({ success: true, data: { status: txn.status, orderId: txn.orderId, orderType: txn.orderType, purpose: txn.purpose, order } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/payments/payos-webhook
 * PayOS gọi endpoint này khi có sự kiện thanh toán
 */
exports.handleWebhook = async (req, res) => {
    try {
        // PayOS gửi test ping khi lưu webhook URL — data là null, trả 200 để xác nhận endpoint tồn tại
        if (!req.body?.data) {
            console.log('[PayOS] Test ping received — endpoint confirmed');
            return res.json({ success: true });
        }

        // Xác minh chữ ký HMAC
        let webhookData;
        try {
            webhookData = await payos.webhooks.verify(req.body);
        } catch (verifyErr) {
            console.error('PayOS webhook signature invalid:', verifyErr.message);
            return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }

        // webhookData là WebhookData: { orderCode, amount, code, desc, ... }
        const { orderCode, amount: webhookAmount, code } = webhookData;
        const isPaid = code === '00';

        const txn = await PayOSTransaction.findOne({ payosOrderCode: Number(orderCode) });
        if (!txn) {
            console.warn(`[PayOS] No transaction found for orderCode ${orderCode}`);
            return res.json({ success: true });
        }

        if (txn.status !== 'PENDING') {
            return res.json({ success: true }); // đã xử lý rồi
        }

        if (!isPaid) {
            await PayOSTransaction.updateOne({ _id: txn._id }, { status: 'CANCELLED' });
            if (txn.orderType === ORDER_TYPE.RENT && txn.purpose === 'Deposit') {
                await releaseReservedInstancesForPendingDepositOrder(txn.orderId);
            }
            if (txn.orderType === ORDER_TYPE.SALE && txn.purpose === 'SalePayment') {
                await markSaleOrderAsFailed(txn.orderId, 'giao dịch không thành công');
            }
            return res.json({ success: true });
        }

        // Kiểm tra số tiền trong webhook phải khớp với số tiền đã tạo link
        if (Math.round(webhookAmount) !== Math.round(txn.amount)) {
            console.error(`[PayOS] Amount mismatch for orderCode ${orderCode}: expected ${txn.amount}, received ${webhookAmount}`);
            return res.status(400).json({ success: false, message: 'Số tiền thanh toán không khớp' });
        }

        await processConfirmedPayment(txn);

        return res.json({ success: true });
    } catch (err) {
        console.error('PayOS webhook error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
