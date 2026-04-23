const mongoose = require('mongoose');
const { ORDER_TYPE } = require('../constants/order.constants');

const invoiceItemSchema = new mongoose.Schema({
    name: {
        type: String,
        default: ''
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    unitPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    lineTotal: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        required: true,
        index: true
    },
    invoiceNo: {
        type: String,
        required: true,
        index: true
    },
    orderType: {
        type: String,
        enum: [ORDER_TYPE.BUY, ORDER_TYPE.RENT],
        required: true,
        index: true
    },
    orderRefModel: {
        type: String,
        enum: ['SaleOrder', 'RentOrder'],
        required: true,
        index: true
    },
    orderRefId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'orderRefModel',
        index: true
    },
    purpose: {
        type: String,
        default: 'General',
        index: true
    },
    documentTitle: {
        type: String,
        default: 'PHIEU XAC NHAN GIAO DICH'
    },
    documentTypeLabel: {
        type: String,
        default: ''
    },
    buyer: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' }
    },
    paymentMethod: {
        type: String,
        default: ''
    },
    amounts: {
        subtotal: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        shippingFee: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 }
    },
    items: {
        type: [invoiceItemSchema],
        default: []
    },
    provider: {
        type: String,
        default: 'stub'
    },
    pdfUrl: {
        type: String,
        default: ''
    },
    xmlUrl: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'issued', 'cancelled', 'failed'],
        default: 'pending',
        index: true
    },
    issuedAt: {
        type: Date,
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    errorMessage: {
        type: String,
        default: ''
    },
    emailTo: {
        type: String,
        default: ''
    },
    emailStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending'
    },
    emailSentAt: {
        type: Date,
        default: null
    },
    emailError: {
        type: String,
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

invoiceSchema.index({ orderRefModel: 1, orderRefId: 1, purpose: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
