const payos = require('../services/payosService');
const paypal = require('../services/paypal.service');
const PayOSTransaction = require('../model/PayOSTransaction.model');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const GuestVerification = require('../model/GuestVerification.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
// Dùng lazy require để tránh circular dependency
const getRentOrderController = () => require('./rent-order.controller');
const { frontendUrl, payosWebBaseUrl } = require('../config/app.config');
const { ORDER_TYPE } = require('../constants/order.constants');
const { resolveSaleOrderUserStatus } = require('../utils/saleOrderStatus');
const { signGuestOrderViewToken } = require('../utils/jwt');
const { runPostPaymentInvoiceFlow } = require('../services/postPaymentInvoice.service');

const FRONTEND_URL = frontendUrl;
const PAYOS_WEB_BASE_URL = String(payosWebBaseUrl || '').replace(/\/+$/, '');
const PAYPAL_SUCCESS = 'success';
const PAYPAL_CANCELLED = 'cancelled';
const PAYMENT_PROVIDER = {
    PAYOS: 'PAYOS',
    PAYPAL: 'PAYPAL',
};

const parseOrderFromCustomId = (value = '') => {
    const parts = String(value || '').split('|');
    if (parts.length < 5 || parts[0] !== 'INHERE') return null;
    const amountVnd = Number(parts[4]);
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) return null;
    return {
        purpose: parts[1],
        orderId: parts[2],
        orderType: parts[3],
        amountVnd,
    };
};

const buildPaypalCustomId = ({ purpose, orderId, orderType, amountVnd }) =>
    `INHERE|${purpose}|${orderId}|${orderType}|${Math.round(Number(amountVnd || 0))}`;

const buildPaypalReturnUrl = ({ orderId, purpose, orderType, source }) => {
    const query = new URLSearchParams({
        provider: 'paypal',
        status: PAYPAL_SUCCESS,
        purpose,
        orderType,
    });
    if (purpose === 'sale') query.set('saleOrderId', String(orderId));
    else query.set('orderId', String(orderId));
    if (source) query.set('source', source);
    return `${FRONTEND_URL}/payment-result?${query.toString()}`;
};

const buildPaypalCancelUrl = ({ orderId, purpose, orderType, source }) => {
    const query = new URLSearchParams({
        provider: 'paypal',
        status: PAYPAL_CANCELLED,
        purpose,
        orderType,
    });
    if (purpose === 'sale') query.set('saleOrderId', String(orderId));
    else query.set('orderId', String(orderId));
    if (source) query.set('source', source);
    return `${FRONTEND_URL}/payment-result?${query.toString()}`;
};

const normalizePaymentProvider = (value = '') => {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === PAYMENT_PROVIDER.PAYPAL ? PAYMENT_PROVIDER.PAYPAL : PAYMENT_PROVIDER.PAYOS;
};

const resolveRequestedProvider = (req) =>
    normalizePaymentProvider(req?.body?.provider || req?.query?.provider);

const getProviderStatusLabel = (provider) =>
    provider === PAYMENT_PROVIDER.PAYPAL ? 'PayPal' : 'PayOS';

const getPayPalOrderCode = (req = {}) => {
    const direct = String(req.params?.paypalOrderId || '').trim();
    if (direct) return direct;
    const token = String(req.query?.token || '').trim();
    if (token) return token;
    return String(req.query?.orderCode || '').trim();
};

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

const getPayPalApproveUrl = (orderPayload) => {
    const approveUrl = paypal.extractApproveUrl(orderPayload);
    if (!approveUrl) {
        throw new Error('Không lấy được link thanh toán PayPal.');
    }
    return approveUrl;
};

const verifyPaypalPaidAmount = (txn, paypalPayload) => {
    const paidAmount = paypal.extractPayPalPaidAmount(paypalPayload);
    if (!paidAmount) {
        throw new Error('Không đọc được số tiền thanh toán từ PayPal.');
    }

    const paidAmountVnd = paypal.convertPayPalAmountToVnd(paidAmount);
    const expectedAmountVnd = Math.round(Number(txn.amount || 0));
    if (!paypal.isEquivalentVndAmount(expectedAmountVnd, paidAmountVnd)) {
        throw new Error(`Số tiền PayPal không khớp sau quy đổi. expectedVnd=${expectedAmountVnd}, paidVnd=${paidAmountVnd}`);
    }
};

const createPayPalPaymentLink = async ({ orderId, orderType, purpose, amount, description, cancelUrl, returnUrl, customId = '' }) => {
    const quote = paypal.convertVndToPayPalAmount(amount);
    const paypalOrder = await paypal.createOrder({
        amountVnd: amount,
        description,
        cancelUrl,
        returnUrl,
        referenceId: `${purpose}-${orderId}`,
        customId,
    });
    const paypalOrderId = String(paypalOrder?.id || '').trim();
    if (!paypalOrderId) {
        throw new Error('PayPal không trả về mã giao dịch hợp lệ.');
    }

    const checkoutUrl = getPayPalApproveUrl(paypalOrder);
    await PayOSTransaction.create({
        provider: PAYMENT_PROVIDER.PAYPAL,
        orderId,
        orderType,
        purpose,
        paypalOrderId,
        paypalCheckoutUrl: checkoutUrl,
        amount,
        status: 'PENDING',
    });

    return {
        paymentUrl: checkoutUrl,
        orderCode: paypalOrderId,
        provider: 'paypal',
        amountVnd: Math.round(Number(amount || 0)),
        paypalAmount: quote.value,
        paypalCurrency: quote.currencyCode,
        exchangeRate: quote.rate,
    };
};

/**
 * Nội bộ: build/refresh PayOS deposit link cho 1 RentOrder đã được validate quyền.
 * Tái dùng cho cả flow member (authenticated) lẫn guest (xác thực qua email).
 */
const buildDepositPaymentLinkForOrder = async (order, provider = PAYMENT_PROVIDER.PAYOS) => {
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

    if (provider === PAYMENT_PROVIDER.PAYPAL) {
        const existingPayPal = await PayOSTransaction.findOne({
            provider: PAYMENT_PROVIDER.PAYPAL,
            orderId,
            purpose: 'Deposit',
            status: 'PENDING',
        });
        if (existingPayPal?.paypalCheckoutUrl) {
            return { paymentUrl: existingPayPal.paypalCheckoutUrl, orderCode: existingPayPal.paypalOrderId, provider: 'paypal' };
        }

        return createPayPalPaymentLink({
            orderId,
            orderType: ORDER_TYPE.RENT,
            purpose: 'Deposit',
            amount: Math.round(order.depositAmount),
            description: `Dat coc thue don ${order.orderCode || orderId}`,
            customId: buildPaypalCustomId({
                purpose: 'deposit',
                orderId,
                orderType: ORDER_TYPE.RENT,
                amountVnd: order.depositAmount,
            }),
            cancelUrl: buildPaypalCancelUrl({
                orderId,
                purpose: 'deposit',
                orderType: ORDER_TYPE.RENT,
                source: isWalkIn ? 'staff' : (isGuest ? 'guest' : null),
            }),
            returnUrl: buildPaypalReturnUrl({
                orderId,
                purpose: 'deposit',
                orderType: ORDER_TYPE.RENT,
                source: isWalkIn ? 'staff' : (isGuest ? 'guest' : null),
            }),
        });
    }

    // Trả link cũ nếu còn pending để tránh spam PayOS
    const existing = await PayOSTransaction.findOne({ provider: PAYMENT_PROVIDER.PAYOS, orderId, purpose: 'Deposit', status: 'PENDING' });
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
        provider: PAYMENT_PROVIDER.PAYOS,
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
        const provider = resolveRequestedProvider(req);
        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán cọc` });
        }
        const data = await buildDepositPaymentLinkForOrder(order, provider);
        return res.json({ success: true, data });
    } catch (err) {
        console.error('createDepositPaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán', detail: err.message });
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
        const provider = resolveRequestedProvider(req);
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
        const data = await buildDepositPaymentLinkForOrder(order, provider);
        return res.json({ success: true, data });
    } catch (err) {
        console.error('createGuestDepositPaymentLink error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo link thanh toán', detail: err.message });
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

        const existing = await PayOSTransaction.findOne({ provider: PAYMENT_PROVIDER.PAYOS, orderId, purpose: 'ExtraDue', status: 'PENDING' });
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
            provider: PAYMENT_PROVIDER.PAYOS,
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
        const provider = resolveRequestedProvider(req);

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

        const existing = await PayOSTransaction.findOne({
            provider,
            orderId,
            purpose: 'SalePayment',
            status: 'PENDING',
        });
        if (existing) {
            if (provider === PAYMENT_PROVIDER.PAYPAL && existing?.paypalCheckoutUrl) {
                return res.json({ success: true, data: { paymentUrl: existing.paypalCheckoutUrl, orderCode: existing.paypalOrderId, provider: 'paypal' } });
            }

            if (provider === PAYMENT_PROVIDER.PAYOS) {
                try {
                    const info = await payos.paymentRequests.get(existing.payosOrderCode);
                    if (info.status === 'PENDING') {
                        return res.json({ success: true, data: { paymentUrl: `${PAYOS_WEB_BASE_URL}/${existing.payosPaymentLinkId}`, orderCode: existing.payosOrderCode } });
                    }
                } catch (_) { /* expired */ }
                await PayOSTransaction.deleteOne({ _id: existing._id });
            } else {
                await PayOSTransaction.deleteOne({ _id: existing._id });
            }
        }

        if (provider === PAYMENT_PROVIDER.PAYPAL) {
            const data = await createPayPalPaymentLink({
                orderId,
                orderType: ORDER_TYPE.SALE,
                purpose: 'SalePayment',
                amount: Math.round(order.totalAmount),
                description: `Thanh toan don mua ${order.orderCode || orderId}`,
                customId: buildPaypalCustomId({
                    purpose: 'sale',
                    orderId,
                    orderType: ORDER_TYPE.SALE,
                    amountVnd: order.totalAmount,
                }),
                cancelUrl: buildPaypalCancelUrl({
                    orderId,
                    purpose: 'sale',
                    orderType: ORDER_TYPE.SALE,
                }),
                returnUrl: buildPaypalReturnUrl({
                    orderId,
                    purpose: 'sale',
                    orderType: ORDER_TYPE.SALE,
                }),
            });
            return res.json({ success: true, data });
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
            provider: PAYMENT_PROVIDER.PAYOS,
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
        return res.status(500).json({ success: false, message: `Lỗi tạo link thanh toán ${getProviderStatusLabel(resolveRequestedProvider(req))}`, detail: err.message });
    }
};

/**
 * Xử lý nội bộ khi phát hiện thanh toán đã thành công (dùng chung cho webhook và polling)
 */
const processConfirmedPayment = async (txn, options = {}) => {
    const transactionCode = String(
        options.transactionCode
        || (txn.provider === PAYMENT_PROVIDER.PAYPAL
            ? `PAYPAL_${txn.paypalOrderId}`
            : `PAYOS_${txn.payosOrderCode}`)
    );

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
                await Payment.create({ orderType: ORDER_TYPE.RENT, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Deposit', transactionCode, paidAt: new Date() });
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
                await Payment.create({ orderType: ORDER_TYPE.SALE, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'SalePayment', transactionCode, paidAt: new Date() });
            }
            saleOrder.status = 'PendingConfirmation';
            saleOrder.userStatus = resolveSaleOrderUserStatus('PendingConfirmation', saleOrder.userStatus);

            // Ghi history "Đã thanh toán"
            saleOrder.history = Array.isArray(saleOrder.history) ? saleOrder.history : [];
            saleOrder.history.push({
                status: 'PendingConfirmation',
                statusLabel: 'Đã thanh toán',
                action: 'payment_confirmed',
                description: `Thanh toán online thành công - Mã GD: ${transactionCode}. Đơn hàng đang chờ xác nhận từ cửa hàng.`,
                updatedAt: new Date(),
            });
            await saleOrder.save();

            // Consume guest verification token sau khi payment xác nhận thành công
            if (saleOrder.guestVerificationId) {
                try {
                    await GuestVerification.findByIdAndUpdate(
                        saleOrder.guestVerificationId,
                        { consumedAt: new Date() },
                        { new: false }
                    );
                } catch (tokenErr) {
                    console.warn('[PayOS] Could not consume guest token for order', txn.orderId, tokenErr.message);
                }
            }

            // Trigger tạo hóa đơn + gửi email tự động (non-blocking)
            // Dùng cho cả PayOS và PayPal thông qua hàm chung này
            setImmediate(() => runPostPaymentInvoiceFlow(String(txn.orderId)).catch(() => {}));

            console.log(`[Payment] Sale payment confirmed for order ${txn.orderId} via ${txn.provider || 'unknown'}`);
        }
    }

    if (txn.purpose === 'ExtraDue') {
        const rentOrder = await RentOrder.findById(txn.orderId);
        if (rentOrder && rentOrder.status === 'Returned') {
            // Ghi nhận payment nếu chưa có
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'Remaining', transactionCode });
            if (!existingPayment) {
                await Payment.create({ orderType: ORDER_TYPE.RENT, orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Remaining', transactionCode, paidAt: new Date() });
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

const releaseSaleOrderInstancesForFailedPayment = async (orderId) => {
    if (!orderId) return;

    const items = await SaleOrderItem.find({ orderId }).select('productId quantity conditionLevel').lean();
    if (!items.length) return;

    const grouped = new Map();
    for (const item of items) {
        const productId = String(item?.productId || '').trim();
        if (!productId) continue;
        const conditionLevel = item?.conditionLevel === 'Used' ? 'Used' : item?.conditionLevel === 'New' ? 'New' : null;
        const qty = Math.max(Number(item?.quantity || 1), 1);
        const key = `${productId}::${conditionLevel || 'ANY'}`;
        const current = grouped.get(key) || { productId, conditionLevel, quantity: 0 };
        current.quantity += qty;
        grouped.set(key, current);
    }

    for (const { productId, conditionLevel, quantity } of grouped.values()) {
        const linkedQuery = {
            productId,
            lifecycleStatus: 'Sold',
            soldOrderId: orderId,
            ...(conditionLevel ? { conditionLevel } : {}),
        };

        const linkedInstances = await ProductInstance.find(linkedQuery)
            .sort({ updatedAt: -1 })
            .limit(quantity)
            .select('_id')
            .lean();

        if (linkedInstances.length > 0) {
            const linkedIds = linkedInstances.map((item) => item._id);
            await ProductInstance.updateMany(
                { _id: { $in: linkedIds } },
                { lifecycleStatus: 'Available', soldOrderId: null }
            );
        }
    }
};

const markSaleOrderAsFailed = async (orderId, reason = '') => {
    const saleOrder = await SaleOrder.findById(orderId);
    if (!saleOrder) return;
    if (!['PendingPayment', 'PendingConfirmation'].includes(String(saleOrder.status || ''))) return;

    await releaseSaleOrderInstancesForFailedPayment(orderId);

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

const confirmRentDepositPayment = async ({ orderId, amount, transactionCode }) => {
    const order = await RentOrder.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn thuê');

    if (order.status !== 'PendingDeposit' && order.status !== 'Deposited') {
        throw new Error(`Đơn đang ở trạng thái "${order.status}", không thể xác nhận đặt cọc`);
    }

    if (order.status === 'Deposited') {
        return { order };
    }

    const { isInstanceAvailableForPeriodExcluding } = getRentOrderController();
    if (typeof isInstanceAvailableForPeriodExcluding === 'function') {
        const orderItems = await RentOrderItem.find({ orderId }).lean();
        for (const item of orderItems) {
            const available = await isInstanceAvailableForPeriodExcluding(
                item.productInstanceId,
                item.rentStartDate,
                item.rentEndDate,
                orderId
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
                throw new Error('Đơn bị hủy do sản phẩm đã được thuê bởi khách khác');
            }
        }
    }

    const existingDeposit = await Deposit.findOne({ orderId, status: 'Held' });
    if (!existingDeposit) {
        await Deposit.create({ orderId, amount, method: 'Online', status: 'Held', paidAt: new Date() });
    }

    const existingPayment = await Payment.findOne({ orderId, purpose: 'Deposit', status: 'Paid' });
    if (!existingPayment) {
        await Payment.create({
            orderType: ORDER_TYPE.RENT,
            orderId,
            amount,
            method: 'Online',
            status: 'Paid',
            purpose: 'Deposit',
            transactionCode,
            paidAt: new Date(),
        });
    }

    order.status = 'Deposited';
    await order.save();

    try {
        const items = await RentOrderItem.find({ orderId }).lean();
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
        console.error(`[PayPal] Reserve instances failed for order ${orderId}:`, reserveErr.message);
    }

    return { order };
};

const confirmSalePayment = async ({ orderId, amount, transactionCode }) => {
    const saleOrder = await SaleOrder.findById(orderId);
    if (!saleOrder) throw new Error('Không tìm thấy đơn hàng');

    if (!['PendingPayment', 'PendingConfirmation'].includes(String(saleOrder.status || ''))) {
        throw new Error(`Đơn đang ở trạng thái "${saleOrder.status}", không thể xác nhận thanh toán`);
    }

    const existingPayment = await Payment.findOne({ orderId, purpose: 'SalePayment', status: 'Paid' });
    if (!existingPayment) {
        await Payment.create({
            orderType: ORDER_TYPE.SALE,
            orderId,
            amount,
            method: 'Online',
            status: 'Paid',
            purpose: 'SalePayment',
            transactionCode,
            paidAt: new Date(),
        });
    }

    saleOrder.status = 'PendingConfirmation';
    saleOrder.userStatus = resolveSaleOrderUserStatus('PendingConfirmation', saleOrder.userStatus);
    saleOrder.history = Array.isArray(saleOrder.history) ? saleOrder.history : [];
    saleOrder.history.push({
        status: 'PendingConfirmation',
        statusLabel: 'Đã thanh toán',
        action: 'payment_confirmed',
        description: `Thanh toán online thành công${transactionCode ? ` - Mã GD: ${transactionCode}` : ''}. Đơn hàng đang chờ xác nhận từ cửa hàng.`,
        updatedAt: new Date(),
    });
    await saleOrder.save();

    // Trigger tạo hóa đơn + gửi email tự động (non-blocking)
    setImmediate(() => runPostPaymentInvoiceFlow(String(orderId)).catch(() => {}));

    return { order: saleOrder };
};

const getPaypalCaptureInfo = (captureResult) => {
    const purchaseUnit = captureResult?.purchase_units?.[0] || {};
    const captures = purchaseUnit?.payments?.captures;
    const capture = Array.isArray(captures) && captures.length > 0 ? captures[0] : null;
    const transactionId = capture?.id || captureResult?.id || '';
    return {
        customId: purchaseUnit?.custom_id || '',
        transactionId,
    };
};

const extractPaypalCustomIdFromOrder = (orderData) => {
    const purchaseUnit = orderData?.purchase_units?.[0] || {};
    return purchaseUnit?.custom_id || '';
};

const isAlreadyCapturedPaypalError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('order_already_captured') || message.includes('already captured');
};

const extractPaypalCaptureIdFromOrder = (orderData) => {
    const capture = orderData?.purchase_units?.[0]?.payments?.captures?.[0] || null;
    return capture?.id || orderData?.id || '';
};

exports.createPaypalDepositOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo thanh toán` });
        }

        const customId = buildPaypalCustomId({
            purpose: 'deposit',
            orderId: String(orderId),
            orderType: ORDER_TYPE.RENT,
            amountVnd: order.depositAmount,
        });

        const source = order.staffId ? 'staff' : (order.guestContact?.email ? 'guest' : null);
        const createResult = await paypal.createOrder({
            amountVnd: order.depositAmount,
            description: `Dat coc don thue ${order.orderCode || orderId}`,
            customId,
            returnUrl: buildPaypalReturnUrl({ orderId, purpose: 'deposit', orderType: ORDER_TYPE.RENT, source }),
            cancelUrl: buildPaypalCancelUrl({ orderId, purpose: 'deposit', orderType: ORDER_TYPE.RENT, source }),
        });

        const approveLink = Array.isArray(createResult?.links)
            ? createResult.links.find((link) => link.rel === 'approve')
            : null;

        if (!approveLink?.href) {
            return res.status(500).json({ success: false, message: 'Không lấy được link thanh toán PayPal' });
        }

        return res.json({
            success: true,
            data: {
                orderId: createResult.id,
                paymentUrl: approveLink.href,
                provider: 'paypal',
            },
        });
    } catch (err) {
        console.error('createPaypalDepositOrder error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo đơn PayPal', detail: err.message });
    }
};

exports.capturePaypalDepositOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paypalOrderId } = req.body || {};

        if (!paypalOrderId) {
            return res.status(400).json({ success: false, message: 'Thiếu paypalOrderId' });
        }

        let orderSnapshot = null;
        try {
            orderSnapshot = await paypal.getOrder(paypalOrderId);
        } catch (_) {
            // fallback
        }

        let captureResult;
        try {
            captureResult = await paypal.captureOrder(paypalOrderId);
        } catch (captureErr) {
            if (isAlreadyCapturedPaypalError(captureErr)) {
                captureResult = orderSnapshot || await paypal.getOrder(paypalOrderId);
            } else {
                throw captureErr;
            }
        }

        const { customId, transactionId } = getPaypalCaptureInfo(captureResult);
        const fallbackCustomId = extractPaypalCustomIdFromOrder(orderSnapshot);
        const parsed = parseOrderFromCustomId(customId || fallbackCustomId);

        if (parsed && (parsed.purpose !== 'deposit' || String(parsed.orderId) !== String(orderId) || parsed.orderType !== ORDER_TYPE.RENT)) {
            return res.status(400).json({ success: false, message: 'Thông tin giao dịch PayPal không hợp lệ' });
        }

        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (parsed && Math.round(Number(parsed.amountVnd || 0)) !== Math.round(Number(order.depositAmount || 0))) {
            return res.status(400).json({ success: false, message: 'Số tiền giao dịch PayPal không khớp' });
        }

        const finalTransactionId = transactionId || extractPaypalCaptureIdFromOrder(captureResult) || extractPaypalCaptureIdFromOrder(orderSnapshot);
        const result = await confirmRentDepositPayment({
            orderId,
            amount: order.depositAmount,
            transactionCode: `PAYPAL_${finalTransactionId || paypalOrderId}`,
        });

        return res.json({ success: true, data: { status: 'PAID', order: result.order, provider: 'paypal' } });
    } catch (err) {
        console.error('capturePaypalDepositOrder error:', err);
        return res.status(500).json({ success: false, message: 'Không thể xác nhận thanh toán PayPal', detail: err.message });
    }
};

exports.createPaypalSaleOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await SaleOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (!['PendingPayment', 'PendingConfirmation', 'Failed'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo thanh toán` });
        }

        if (order.status === 'Failed') {
            order.status = 'PendingPayment';
            order.userStatus = resolveSaleOrderUserStatus('PendingPayment', order.userStatus);
            order.history = Array.isArray(order.history) ? order.history : [];
            order.history.push({
                status: 'PendingPayment',
                action: 'retry_payment',
                description: 'Tạo lại link thanh toán PayPal sau khi giao dịch thất bại',
                updatedBy: req.user?.id || null,
                updatedAt: new Date(),
            });
            await order.save();
        }

        const customId = buildPaypalCustomId({
            purpose: 'sale',
            orderId: String(orderId),
            orderType: ORDER_TYPE.SALE,
            amountVnd: order.totalAmount,
        });

        const createResult = await paypal.createOrder({
            amountVnd: order.totalAmount,
            description: `Thanh toan don mua ${String(orderId).slice(-8)}`,
            customId,
            returnUrl: buildPaypalReturnUrl({ orderId, purpose: 'sale', orderType: ORDER_TYPE.SALE }),
            cancelUrl: buildPaypalCancelUrl({ orderId, purpose: 'sale', orderType: ORDER_TYPE.SALE }),
        });

        const approveLink = Array.isArray(createResult?.links)
            ? createResult.links.find((link) => link.rel === 'approve')
            : null;

        if (!approveLink?.href) {
            return res.status(500).json({ success: false, message: 'Không lấy được link thanh toán PayPal' });
        }

        return res.json({
            success: true,
            data: {
                orderId: createResult.id,
                paymentUrl: approveLink.href,
                provider: 'paypal',
            },
        });
    } catch (err) {
        console.error('createPaypalSaleOrder error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo đơn PayPal', detail: err.message });
    }
};

exports.capturePaypalSaleOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paypalOrderId } = req.body || {};

        if (!paypalOrderId) {
            return res.status(400).json({ success: false, message: 'Thiếu paypalOrderId' });
        }

        let orderSnapshot = null;
        try {
            orderSnapshot = await paypal.getOrder(paypalOrderId);
        } catch (_) {
            // fallback
        }

        let captureResult;
        try {
            captureResult = await paypal.captureOrder(paypalOrderId);
        } catch (captureErr) {
            if (isAlreadyCapturedPaypalError(captureErr)) {
                captureResult = orderSnapshot || await paypal.getOrder(paypalOrderId);
            } else {
                throw captureErr;
            }
        }

        const { customId, transactionId } = getPaypalCaptureInfo(captureResult);
        const fallbackCustomId = extractPaypalCustomIdFromOrder(orderSnapshot);
        const parsed = parseOrderFromCustomId(customId || fallbackCustomId);

        if (parsed && (parsed.purpose !== 'sale' || String(parsed.orderId) !== String(orderId) || parsed.orderType !== ORDER_TYPE.SALE)) {
            return res.status(400).json({ success: false, message: 'Thông tin giao dịch PayPal không hợp lệ' });
        }

        const order = await SaleOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (parsed && Math.round(Number(parsed.amountVnd || 0)) !== Math.round(Number(order.totalAmount || 0))) {
            return res.status(400).json({ success: false, message: 'Số tiền giao dịch PayPal không khớp' });
        }

        const finalTransactionId = transactionId || extractPaypalCaptureIdFromOrder(captureResult) || extractPaypalCaptureIdFromOrder(orderSnapshot);
        const result = await confirmSalePayment({
            orderId,
            amount: order.totalAmount,
            transactionCode: `PAYPAL_${finalTransactionId || paypalOrderId}`,
        });

        // Consume guest verification token sau khi payment xác nhận thành công
        if (order.guestVerificationId) {
            try {
                await GuestVerification.findByIdAndUpdate(
                    order.guestVerificationId,
                    { consumedAt: new Date() },
                    { new: false }
                );
            } catch (tokenErr) {
                console.warn('[PayPal] Could not consume guest token for order', orderId, tokenErr.message);
            }
        }

        return res.json({ success: true, data: { status: 'PAID', order: result.order, provider: 'paypal' } });
    } catch (err) {
        console.error('capturePaypalSaleOrder error:', err);
        return res.status(500).json({ success: false, message: 'Không thể xác nhận thanh toán PayPal', detail: err.message });
    }
};

/**
 * Xử lý nội bộ khi phát hiện thanh toán đã thành công (dùng chung cho webhook và polling)
 */
/**
 * GET /api/payments/payos-status/:orderCode
 * Kiểm tra trạng thái giao dịch (FE polling sau khi redirect về).
 * Nếu DB còn PENDING, chủ động hỏi PayOS API — bù khi webhook không đến.
 */
exports.checkPayosStatus = async (req, res) => {
    try {
        const orderCode = Number(req.params.orderCode);
        const txn = await PayOSTransaction.findOne({ provider: PAYMENT_PROVIDER.PAYOS, payosOrderCode: orderCode });
        if (!txn) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });

        // Nếu DB còn PENDING → hỏi thẳng PayOS API để kiểm tra
        if (txn.status === 'PENDING') {
            try {
                const payosInfo = await payos.paymentRequests.get(txn.payosOrderCode);
                if (payosInfo.status === 'PAID') {
                    await processConfirmedPayment(txn, { transactionCode: `PAYOS_${txn.payosOrderCode}` });
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
 * GET /api/payments/paypal-status/:paypalOrderId
 * Kiểm tra trạng thái giao dịch PayPal, capture nếu giao dịch đã được approve.
 */
exports.checkPaypalStatus = async (req, res) => {
    try {
        const paypalOrderId = getPayPalOrderCode(req);
        if (!paypalOrderId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã giao dịch PayPal.' });
        }

        const txn = await PayOSTransaction.findOne({ provider: PAYMENT_PROVIDER.PAYPAL, paypalOrderId });
        if (!txn) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch PayPal.' });
        }

        if (txn.status === 'PENDING') {
            try {
                const paypalOrder = await paypal.getOrder(paypalOrderId);
                const paypalStatus = String(paypalOrder?.status || '').toUpperCase();

                if (paypalStatus === 'COMPLETED') {
                    verifyPaypalPaidAmount(txn, paypalOrder);
                    await processConfirmedPayment(txn, { transactionCode: `PAYPAL_${paypalOrderId}` });
                } else if (paypalStatus === 'APPROVED') {
                    const capture = await paypal.captureOrder(paypalOrderId);
                    const captureStatus = String(capture?.status || '').toUpperCase();
                    if (captureStatus === 'COMPLETED') {
                        verifyPaypalPaidAmount(txn, capture);
                        await processConfirmedPayment(txn, { transactionCode: `PAYPAL_${paypalOrderId}` });
                    }
                } else if (['VOIDED', 'CANCELLED', 'EXPIRED'].includes(paypalStatus)) {
                    await PayOSTransaction.updateOne({ _id: txn._id }, { status: 'CANCELLED' });
                    txn.status = 'CANCELLED';
                    if (txn.orderType === ORDER_TYPE.RENT && txn.purpose === 'Deposit') {
                        await releaseReservedInstancesForPendingDepositOrder(txn.orderId);
                    }
                    if (txn.orderType === ORDER_TYPE.SALE && txn.purpose === 'SalePayment') {
                        await markSaleOrderAsFailed(txn.orderId, 'khách hủy thanh toán PayPal');
                    }
                }
            } catch (paypalErr) {
                console.warn(`[PayPal] Could not query/capture payment status for ${paypalOrderId}:`, paypalErr.message);
            }
        }

        const latestTxn = await PayOSTransaction.findById(txn._id).lean();
        let order = null;
        if (latestTxn.orderType === ORDER_TYPE.SALE) {
            order = await SaleOrder.findById(latestTxn.orderId).lean();
        } else {
            order = await RentOrder.findById(latestTxn.orderId).lean();
        }

        return res.json({
            success: true,
            data: {
                status: latestTxn.status,
                orderId: latestTxn.orderId,
                orderType: latestTxn.orderType,
                purpose: latestTxn.purpose,
                order,
                provider: 'paypal',
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/payments/paypal/cancel
 * FE gọi khi PayPal redirect về với status=cancelled để rollback dữ liệu kịp thời.
 */
exports.handlePaypalCancel = async (req, res) => {
    try {
        const purpose = String(req.body?.purpose || '').trim().toLowerCase();
        const saleOrderId = String(req.body?.saleOrderId || '').trim();
        const orderId = String(req.body?.orderId || '').trim();

        if (purpose === 'sale' && saleOrderId) {
            await markSaleOrderAsFailed(saleOrderId, 'khách hủy thanh toán PayPal');
            await PayOSTransaction.updateMany(
                { provider: PAYMENT_PROVIDER.PAYPAL, orderId: saleOrderId, purpose: 'SalePayment', status: 'PENDING' },
                { status: 'CANCELLED' }
            );
            return res.json({ success: true, data: { status: 'CANCELLED', purpose: 'sale' } });
        }

        if (purpose === 'deposit' && orderId) {
            await releaseReservedInstancesForPendingDepositOrder(orderId);
            await PayOSTransaction.updateMany(
                { provider: PAYMENT_PROVIDER.PAYPAL, orderId, purpose: 'Deposit', status: 'PENDING' },
                { status: 'CANCELLED' }
            );
            return res.json({ success: true, data: { status: 'CANCELLED', purpose: 'deposit' } });
        }

        return res.status(400).json({ success: false, message: 'Thiếu thông tin hủy giao dịch PayPal.' });
    } catch (err) {
        console.error('handlePaypalCancel error:', err);
        return res.status(500).json({ success: false, message: 'Không thể xử lý hủy PayPal', detail: err.message });
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

        const txn = await PayOSTransaction.findOne({ provider: PAYMENT_PROVIDER.PAYOS, payosOrderCode: Number(orderCode) });
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

        await processConfirmedPayment(txn, { transactionCode: `PAYOS_${txn.payosOrderCode}` });

        return res.json({ success: true });
    } catch (err) {
        console.error('PayOS webhook error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
