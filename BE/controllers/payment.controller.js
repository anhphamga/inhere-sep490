const payos = require('../services/payosService');
const PayOSTransaction = require('../model/PayOSTransaction.model');
const RentOrder = require('../model/RentOrder.model');
const SaleOrder = require('../model/SaleOrder.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
 * POST /api/payments/rent-deposit/:orderId
 * Tạo PayOS payment link cho bước đặt cọc (PendingDeposit → Deposited)
 */
exports.createDepositPaymentLink = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await RentOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
        if (order.status !== 'PendingDeposit') {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán cọc` });
        }

        // Trả link cũ nếu còn pending
        const existing = await PayOSTransaction.findOne({ orderId, purpose: 'Deposit', status: 'PENDING' });
        if (existing) {
            try {
                const info = await payos.paymentRequests.get(existing.payosOrderCode);
                if (info.status === 'PENDING') {
                    const link = await payos.paymentRequests.create({
                        orderCode: existing.payosOrderCode,
                        amount: Math.round(order.depositAmount),
                        description: sanitizeDescription(`COC ${order.orderCode || orderId}`),
                        cancelUrl: `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}`,
                        returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${existing.payosOrderCode}&purpose=deposit`,
                    });
                    return res.json({ success: true, data: { paymentUrl: link.checkoutUrl, orderCode: existing.payosOrderCode } });
                }
            } catch (_) { /* link expired, tạo mới */ }
            await PayOSTransaction.deleteOne({ _id: existing._id });
        }

        const payosOrderCode = await generateUniquePayosCode();
        const description = sanitizeDescription(`COC ${order.orderCode || orderId}`);

        const paymentLink = await payos.paymentRequests.create({
            orderCode: payosOrderCode,
            amount: Math.round(order.depositAmount),
            description,
            items: [{ name: 'Dat coc thue do', quantity: 1, price: Math.round(order.depositAmount) }],
            cancelUrl: `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}`,
            returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${payosOrderCode}&purpose=deposit`,
        });

        await PayOSTransaction.create({
            orderId,
            orderType: 'Rent',
            purpose: 'Deposit',
            payosOrderCode,
            payosPaymentLinkId: paymentLink.paymentLinkId,
            amount: order.depositAmount,
            status: 'PENDING',
        });

        return res.json({ success: true, data: { paymentUrl: paymentLink.checkoutUrl, orderCode: payosOrderCode } });
    } catch (err) {
        console.error('createDepositPaymentLink error:', err);
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
                    return res.json({ success: true, data: { paymentUrl: `https://pay.payos.vn/web/${existing.payosPaymentLinkId}`, orderCode: existing.payosOrderCode } });
                }
            } catch (_) { /* expired */ }
            await PayOSTransaction.deleteOne({ _id: existing._id });
        }

        const payosOrderCode = await generateUniquePayosCode();
        const description = sanitizeDescription(`THANH TOAN ${order.orderCode || orderId}`);

        const paymentLink = await payos.paymentRequests.create({
            orderCode: payosOrderCode,
            amount: Math.round(amount),
            description,
            items: [{ name: 'Thanh toan don thue', quantity: 1, price: Math.round(amount) }],
            cancelUrl: `${FRONTEND_URL}/payment-result?status=cancelled&orderId=${orderId}`,
            returnUrl: `${FRONTEND_URL}/payment-result?orderId=${orderId}&orderCode=${payosOrderCode}&purpose=extra-due`,
        });

        await PayOSTransaction.create({
            orderId,
            orderType: 'Rent',
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
        if (!['PendingPayment', 'PendingConfirmation'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Đơn đang ở trạng thái "${order.status}", không thể tạo link thanh toán` });
        }

        const existing = await PayOSTransaction.findOne({ orderId, purpose: 'SalePayment', status: 'PENDING' });
        if (existing) {
            try {
                const info = await payos.paymentRequests.get(existing.payosOrderCode);
                if (info.status === 'PENDING') {
                    return res.json({ success: true, data: { paymentUrl: `https://pay.payos.vn/web/${existing.payosPaymentLinkId}`, orderCode: existing.payosOrderCode } });
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
            orderType: 'Sale',
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
 * Xử lý nội bộ khi phát hiện thanh toán đã thành công (dùng chung cho webhook và polling)
 */
const processConfirmedPayment = async (txn) => {
    await PayOSTransaction.updateOne({ _id: txn._id }, { status: 'PAID', paidAt: new Date() });

    if (txn.purpose === 'Deposit') {
        const order = await RentOrder.findById(txn.orderId);
        if (order && order.status === 'PendingDeposit') {
            const existingDeposit = await Deposit.findOne({ orderId: txn.orderId, status: 'Held' });
            if (!existingDeposit) {
                await Deposit.create({ orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Held', paidAt: new Date() });
            }
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'Deposit', status: 'Paid' });
            if (!existingPayment) {
                await Payment.create({ orderType: 'Rent', orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Deposit', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }
            order.status = 'Deposited';
            await order.save();
            console.log(`[PayOS Polling] Deposit confirmed for order ${order.orderCode || txn.orderId}`);
        }
    }

    if (txn.purpose === 'SalePayment') {
        const saleOrder = await SaleOrder.findById(txn.orderId);
        if (saleOrder && ['PendingPayment', 'PendingConfirmation'].includes(saleOrder.status)) {
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'SalePayment', status: 'Paid' });
            if (!existingPayment) {
                await Payment.create({ orderType: 'Sale', orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'SalePayment', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }
            saleOrder.status = 'PendingConfirmation';
            await saleOrder.save();
            console.log(`[PayOS Polling] Sale payment confirmed for order ${txn.orderId}`);
        }
    }

    if (txn.purpose === 'ExtraDue') {
        const rentOrder = await RentOrder.findById(txn.orderId);
        if (rentOrder && rentOrder.status === 'Returned') {
            const existingPayment = await Payment.findOne({ orderId: txn.orderId, purpose: 'Remaining', transactionCode: `PAYOS_${txn.payosOrderCode}` });
            if (!existingPayment) {
                await Payment.create({ orderType: 'Rent', orderId: txn.orderId, amount: txn.amount, method: 'Online', status: 'Paid', purpose: 'Remaining', transactionCode: `PAYOS_${txn.payosOrderCode}`, paidAt: new Date() });
            }
            console.log(`[PayOS Polling] ExtraDue confirmed for order ${txn.orderId}`);
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
                }
            } catch (payosErr) {
                console.warn(`[PayOS] Could not query payment status for ${orderCode}:`, payosErr.message);
            }
        }

        let order = null;
        if (txn.orderType === 'Sale') {
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
        const { orderCode, code } = webhookData;
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
            return res.json({ success: true });
        }

        await processConfirmedPayment(txn);

        return res.json({ success: true });
    } catch (err) {
        console.error('PayOS webhook error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
