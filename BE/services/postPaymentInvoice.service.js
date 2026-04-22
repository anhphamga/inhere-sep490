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
const { issueInvoice } = require('./einvoice.service');
const { sendInvoiceEmail } = require('../utils/mailer');

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

        // 3. Tạo Invoice (PDF)
        let invoiceResult;
        try {
            invoiceResult = await issueInvoice(order, items);
        } catch (invoiceErr) {
            console.error(`[PostPaymentInvoice] issueInvoice failed for order ${orderId}:`, invoiceErr.message);
            // Ghi trạng thái lỗi vào order để owner biết
            order.invoice = {
                ...((order.invoice?.toObject?.() || order.invoice) || {}),
                status: 'pending',
                errorMessage: invoiceErr.message,
            };
            await order.save().catch(() => {});
            return;
        }

        // 4. Lưu invoice vào order
        const orderCode = `#${String(order._id).slice(-8).toUpperCase()}`;
        order.invoice = {
            invoiceId:    invoiceResult.invoiceId,
            invoiceNo:    invoiceResult.invoiceNo,
            invoiceDate:  invoiceResult.invoiceDate,
            pdfUrl:       invoiceResult.pdfUrl,
            xmlUrl:       invoiceResult.xmlUrl || '',
            provider:     invoiceResult.provider,
            status:       'issued',
            issuedAt:     new Date(),
            cancelledAt:  null,
            errorMessage: '',
        };

        // 5. Ghi history
        order.history = Array.isArray(order.history) ? order.history : [];
        order.history.push({
            status:      order.status,
            statusLabel: 'Hóa đơn đã phát hành',
            action:      'invoice_auto_issued',
            description: `Hóa đơn ${invoiceResult.invoiceNo} được tạo tự động sau thanh toán thành công.`,
            updatedBy:   null,
            updatedAt:   new Date(),
        });

        await order.save();
        console.info(`[PostPaymentInvoice] Invoice ${invoiceResult.invoiceNo} saved for order ${orderId}`);

        // 6. Gửi email (non-blocking — không throw nếu lỗi gửi mail)
        const recipientEmail = order.guestEmail || order.customerId?.email || '';
        if (recipientEmail) {
            sendInvoiceEmail({
                to:          recipientEmail,
                buyerName:   invoiceResult.buyerName,
                orderCode,
                totalAmount: order.totalAmount,
                invoiceNo:   invoiceResult.invoiceNo,
                invoiceDate: invoiceResult.invoiceDate,
                pdfBuffer:   invoiceResult.pdfBuffer,
                pdfFilename: invoiceResult.pdfFilename,
            }).catch((mailErr) => {
                console.error(`[PostPaymentInvoice] Email send failed for order ${orderId}:`, mailErr.message);
            });
        } else {
            console.warn(`[PostPaymentInvoice] No email address for order ${orderId}, skipping email.`);
        }
    } catch (err) {
        // Toàn bộ flow lỗi → chỉ log, không ảnh hưởng flow thanh toán
        console.error(`[PostPaymentInvoice] Unexpected error for order ${orderId}:`, err.message);
    } finally {
        // Release lock dù success hay fail
        _invoiceInProgress.delete(String(orderId));
    }
};

module.exports = { runPostPaymentInvoiceFlow };
