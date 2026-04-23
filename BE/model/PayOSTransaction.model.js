const mongoose = require('mongoose');

/**
 * Lưu trữ các giao dịch PayOS để liên kết webhook với đơn hàng.
 * payosOrderCode là số nguyên duy nhất, dùng để tra cứu khi webhook bắn về.
 */
const payOSTransactionSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['PAYOS', 'PAYPAL'],
        default: 'PAYOS',
    },
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
        default: null,
        unique: true,
        sparse: true,
    },
    payosPaymentLinkId: {
        type: String,
        default: '',
    },
    paypalOrderId: {
        type: String,
        default: undefined,
        unique: true,
        sparse: true,
    },
    paypalCheckoutUrl: {
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

payOSTransactionSchema.pre('validate', function normalizeProviderFields() {
    const provider = String(this.provider || 'PAYOS').toUpperCase();

    // Never keep empty string in unique paypalOrderId column
    if (typeof this.paypalOrderId === 'string' && !this.paypalOrderId.trim()) {
        this.paypalOrderId = undefined;
    }

    // For non-PayPal transactions, unset PayPal-specific unique key fields
    if (provider !== 'PAYPAL') {
        this.paypalOrderId = undefined;
        if (typeof this.paypalCheckoutUrl !== 'string') {
            this.paypalCheckoutUrl = '';
        }
    }

    // Normalize for PayPal transactions
    if (provider === 'PAYPAL' && typeof this.paypalOrderId === 'string') {
        this.paypalOrderId = this.paypalOrderId.trim();
    }

});

module.exports = mongoose.model('PayOSTransaction', payOSTransactionSchema);
