const mongoose = require('mongoose');

/**
 * Lưu trữ các giao dịch PayOS để liên kết webhook với đơn hàng.
 * payosOrderCode là số nguyên duy nhất, dùng để tra cứu khi webhook bắn về.
 */
const payOSTransactionSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    orderType: {
        type: String,
        enum: ['Rent', 'Sale'],
        default: 'Rent',
    },
    purpose: {
        type: String,
        enum: ['Deposit', 'ExtraDue', 'SalePayment'],
        required: true,
    },
    payosOrderCode: {
        type: Number,
        required: true,
        unique: true,
    },
    payosPaymentLinkId: {
        type: String,
        default: '',
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
        default: 'PENDING',
    },
    paidAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('PayOSTransaction', payOSTransactionSchema);
