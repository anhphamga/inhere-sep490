/**
 * postPaymentInvoice.service.js
 *
 * Orchestrate luồng sau khi thanh toán thành công:
 * 1. Lấy order + items
 * 2. Tạo Invoice (mock PDF)
 * 3. Lưu invoice vào order.invoice + history
 * 4. Gửi email xác nhận + đính kèm PDF
 *
 * Hỗ trợ: COD, PayOS, PayPal
 * Non-blocking: lỗi ở đây không ảnh hưởng kết quả thanh toán
 */

const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const { ORDER_TYPE } = require('../constants/order.constants');
const { issueAndPersistInvoice } = require('./invoiceIssuance.service');

// In-memory lock để tránh race condition gửi invoice 2 lần cùng 1 orderId
const _invoiceInProgress = new Set();

/**
 * Chạy toàn bộ flow invoice sau thanh toán cho đơn mua.
 * @param {string} orderId - MongoDB ObjectId
 */
const runPostPaymentInvoiceFlow = async (orderId) => {
    // Guard 1: in-memory lock (ngăn parallel calls cùng orderId)
    if (_invoiceInProgress.has(String(orderId))) {
        console.info(`[PostPaymentInvoice] Order ${orderId} is already being processed, skipping duplicate.`);
        return;
    }
    _invoiceInProgress.add(String(orderId));

    try {
        // 1. Lấy order và populate
        const order = await SaleOrder.findById(orderId)
            .populate('customerId', 'name email phone');

        if (!order) {
            console.warn(`[PostPaymentInvoice] Order ${orderId} not found, skipping.`);
            return;
        }

        // Guard 2: DB-level check (ngăn re-run sau khi server restart)
        if (order.invoice?.status === 'issued') {
            console.info(`[PostPaymentInvoice] Order ${orderId} already has invoice, skipping.`);
            return;
        }

        // 2. Lấy items
        const items = await SaleOrderItem.find({ orderId })
            .populate('productId', 'name images');

        const recipientEmail = String(order.guestEmail || order.customerId?.email || '').trim();
        const normalizedItems = items.map((item) => ({
            name: item.productId?.name || item.name || 'Sản phẩm',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
        }));

        // 3. Tạo Invoice + lưu vào collection Invoice + snapshot vào order
        const orderCode = `#${String(order._id).slice(-8).toUpperCase()}`;
        let invoiceResult;
        try {
            const issued = await issueAndPersistInvoice({
                orderModel: SaleOrder,
                orderId: order._id,
                orderCode,
                orderType: ORDER_TYPE.BUY,
                purpose: 'SalePayment',
                paymentMethod: order.paymentMethod || 'Online',
                buyer: {
                    name: String(order.guestName || order.customerId?.name || 'Khách hàng').trim(),
                    email: recipientEmail,
                    phone: String(order.shippingPhone || order.customerId?.phone || '').trim(),
                    address: String(order.shippingAddress || '').trim(),
                },
                amounts: {
                    totalAmount: Number(order.totalAmount || 0),
                    discountAmount: Number(order.discountAmount || 0),
                    shippingFee: Number(order.shippingFee || 0),
                },
                items: normalizedItems,
                presentation: {
                    documentTitle: 'PHIẾU XÁC NHẬN ĐƠN MUA',
                    documentTypeLabel: 'Đơn mua',
                    purposeLabel: 'Thanh toán đơn hàng',
                },
                metadata: {
                    orderCode,
                    source: 'postPaymentInvoice.service',
                },
            });
            invoiceResult = issued.invoiceResult;
        } catch (invoiceErr) {
            console.error(`[PostPaymentInvoice] issueAndPersistInvoice failed for order ${orderId}:`, invoiceErr.message);
            return;
        }

        // 4. Ghi history
        await SaleOrder.updateOne(
            { _id: orderId },
            {
                $push: {
                    history: {
                        status: order.status,
                        statusLabel: 'Hóa đơn đã phát hành',
                        action: 'invoice_auto_issued',
                        description: `Hóa đơn ${invoiceResult.invoiceNo} được tạo tự động sau thanh toán thành công.`,
                        updatedBy: null,
                        updatedAt: new Date(),
                    },
                },
            }
        );

        console.info(`[PostPaymentInvoice] Invoice ${invoiceResult.invoiceNo} saved for order ${orderId}`);
    } catch (err) {
        // Toàn bộ flow lỗi → chỉ log, không ảnh hưởng flow thanh toán
        console.error(`[PostPaymentInvoice] Unexpected error for order ${orderId}:`, err.message);
    } finally {
        // Release lock dù success hay fail
        _invoiceInProgress.delete(String(orderId));
    }
};

module.exports = { runPostPaymentInvoiceFlow };
