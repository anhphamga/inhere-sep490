const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
    createDepositPaymentLink,
    createGuestDepositPaymentLink,
    createExtraDuePaymentLink,
    createSalePaymentLink,
    createPaypalDepositOrder,
    capturePaypalDepositOrder,
    createPaypalSaleOrder,
    capturePaypalSaleOrder,
    handlePaypalCancel,
    checkPayosStatus,
    checkPaypalStatus,
    handleWebhook,
} = require('../controllers/payment.controller');

// Webhook PayOS — không cần auth (PayOS tự gọi)
router.post('/payos-webhook', handleWebhook);

// Kiểm tra trạng thái giao dịch sau khi redirect về (customer + staff dùng)
router.get('/payos-status/:orderCode', checkPayosStatus);
router.get('/paypal-status/:paypalOrderId', checkPaypalStatus);

// Tạo link thanh toán cọc (customer tự đặt)
router.post('/rent-deposit/:orderId', authenticate, createDepositPaymentLink);

// Tạo link thanh toán cọc cho guest (không auth; xác thực bằng orderCode + email guest)
router.post('/rent-deposit/guest/:orderId', createGuestDepositPaymentLink);

// PayPal sandbox: tạo/capture đơn cọc thuê
router.post('/paypal/rent-deposit/:orderId/create-order', createPaypalDepositOrder);
router.post('/paypal/rent-deposit/:orderId/capture', capturePaypalDepositOrder);

// Tạo link thu khoản nợ (staff dùng khi quyết toán)
router.post('/rent-extra-due/:orderId', authenticate, createExtraDuePaymentLink);

// Tạo link thanh toán đơn mua (customer hoặc guest, không cần auth)
router.post('/sale-order/:orderId', createSalePaymentLink);

// PayPal sandbox: tạo/capture đơn mua (guest + member)
router.post('/paypal/sale-order/:orderId/create-order', createPaypalSaleOrder);
router.post('/paypal/sale-order/:orderId/capture', capturePaypalSaleOrder);
router.post('/paypal/cancel', handlePaypalCancel);

module.exports = router;
