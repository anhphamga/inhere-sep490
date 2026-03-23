const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
    createDepositPaymentLink,
    createExtraDuePaymentLink,
    createSalePaymentLink,
    checkPayosStatus,
    handleWebhook,
} = require('../controllers/payment.controller');

// Webhook PayOS — không cần auth (PayOS tự gọi)
router.post('/payos-webhook', handleWebhook);

// Kiểm tra trạng thái giao dịch sau khi redirect về (customer + staff dùng)
router.get('/payos-status/:orderCode', checkPayosStatus);

// Tạo link thanh toán cọc (customer tự đặt)
router.post('/rent-deposit/:orderId', authenticate, createDepositPaymentLink);

// Tạo link thu khoản nợ (staff dùng khi quyết toán)
router.post('/rent-extra-due/:orderId', authenticate, createExtraDuePaymentLink);

// Tạo link thanh toán đơn mua (customer hoặc guest, không cần auth)
router.post('/sale-order/:orderId', createSalePaymentLink);

module.exports = router;
