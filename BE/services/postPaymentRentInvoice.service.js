/**
 * postPaymentRentInvoice.service.js
 *
 * Orchestrate luong chung tu sau khi dat coc don thue thanh cong:
 * 1. Lay rent order + items
 * 2. Tao invoice PDF (mock)
 * 3. Luu metadata invoice vao order.invoice
 * 4. Gui email dinh kem PDF (non-blocking)
 */

const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const { ORDER_TYPE } = require('../constants/order.constants');
const { issueAndPersistInvoice } = require('./invoiceIssuance.service');

const formatDateVi = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const _rentInvoiceInProgress = new Set();

const runPostPaymentRentInvoiceFlow = async (orderId) => {
    if (_rentInvoiceInProgress.has(String(orderId))) {
        console.info(`[PostPaymentRentInvoice] Order ${orderId} is already being processed, skipping duplicate.`);
        return;
    }
    _rentInvoiceInProgress.add(String(orderId));

    try {
        const order = await RentOrder.findById(orderId)
            .populate('customerId', 'name email phone');

        if (!order) {
            console.warn(`[PostPaymentRentInvoice] Order ${orderId} not found, skipping.`);
            return;
        }

        if (order.invoice?.status === 'issued') {
            console.info(`[PostPaymentRentInvoice] Order ${orderId} already has invoice, skipping.`);
            return;
        }

        const items = await RentOrderItem.find({ orderId })
            .populate({ path: 'productInstanceId', populate: { path: 'productId', select: 'name' } });

        const normalizedItems = items.map((item) => ({
            name: item.productInstanceId?.productId?.name || 'Dịch vụ thuê',
            quantity: 1,
            unitPrice: Number(item.finalPrice || item.baseRentPrice || 0),
        }));

        const recipientEmail = String(order.guestContact?.email || order.customerId?.email || '').trim();
        const buyerName = String(order.guestContact?.name || order.customerId?.name || 'Khach hang').trim();
        const buyerPhone = String(order.guestContact?.phone || order.customerId?.phone || '').trim();
        const orderCode = order.orderCode || `TH-${String(order._id).slice(-8).toUpperCase()}`;
        const rentSubtotal = Number(order.totalAmount || 0);
        const depositAmount = Number(order.depositAmount || 0);
        const remainingAmount = Math.max(Number(order.remainingAmount || 0), 0);
        const rentalPeriodLabel = [formatDateVi(order.rentStartDate), formatDateVi(order.rentEndDate)]
            .filter(Boolean)
            .join(' - ');

        let invoiceResult;
        try {
            const issued = await issueAndPersistInvoice({
                orderModel: RentOrder,
                orderId: order._id,
                orderCode,
                orderType: ORDER_TYPE.RENT,
                purpose: 'RentDeposit',
                paymentMethod: 'Online',
                buyer: {
                    name: buyerName,
                    email: recipientEmail,
                    phone: buyerPhone,
                    address: 'Đơn thuê - không áp dụng địa chỉ giao hàng',
                },
                amounts: {
                    subtotal: rentSubtotal,
                    totalAmount: depositAmount,
                    discountAmount: 0,
                    shippingFee: 0,
                },
                items: normalizedItems,
                presentation: {
                    documentTitle: 'PHIẾU XÁC NHẬN ĐẶT CỌC THUÊ',
                    documentTypeLabel: 'Đơn thuê',
                    purposeLabel: 'Đặt cọc thuê',
                    orderDisplayCode: orderCode,
                    rentalPeriodLabel,
                    customSummaryRows: [
                        { label: 'Tiền thuê:', value: rentSubtotal },
                        { label: 'Đặt cọc (50%):', value: depositAmount },
                        { label: 'Còn lại:', value: remainingAmount },
                    ],
                    grandTotalLabel: 'CÒN CẦN THANH TOÁN:',
                },
                metadata: {
                    orderCode: order.orderCode || '',
                    source: 'postPaymentRentInvoice.service',
                    rentStartDate: order.rentStartDate,
                    rentEndDate: order.rentEndDate,
                    rentSubtotal,
                    depositAmount,
                    remainingAmount,
                },
            });
            invoiceResult = issued.invoiceResult;
        } catch (invoiceErr) {
            console.error(`[PostPaymentRentInvoice] issueAndPersistInvoice failed for order ${orderId}:`, invoiceErr.message);
            return;
        }
        console.info(`[PostPaymentRentInvoice] Invoice ${invoiceResult.invoiceNo} saved for rent order ${orderId}`);
    } catch (err) {
        console.error(`[PostPaymentRentInvoice] Unexpected error for order ${orderId}:`, err.message);
    } finally {
        _rentInvoiceInProgress.delete(String(orderId));
    }
};

module.exports = { runPostPaymentRentInvoiceFlow };
