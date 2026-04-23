const Invoice = require('../model/Invoice.model');
const { issueInvoice } = require('./einvoice.service');
const { sendInvoiceEmail } = require('../utils/mailer');

const normalizeItems = (items = []) => {
    return (Array.isArray(items) ? items : []).map((item) => {
        const quantity = Math.max(Number(item?.quantity || 1), 1);
        const unitPrice = Math.max(Number(item?.unitPrice || 0), 0);
        return {
            name: String(item?.name || 'San pham / Dich vu').trim() || 'San pham / Dich vu',
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
        };
    });
};

const buildOrderInvoiceSnapshot = ({
    invoiceDoc,
    recipientEmail,
}) => {
    return {
        invoiceRecordId: String(invoiceDoc?._id || ''),
        invoiceId: invoiceDoc?.invoiceId || '',
        invoiceNo: invoiceDoc?.invoiceNo || '',
        status: invoiceDoc?.status || 'issued',
        issuedAt: invoiceDoc?.issuedAt || new Date(),
        cancelledAt: invoiceDoc?.cancelledAt || null,
        errorMessage: invoiceDoc?.errorMessage || '',
        emailStatus: recipientEmail ? 'pending' : 'skipped',
        updatedAt: new Date(),
    };
};

const issueAndPersistInvoice = async ({
    orderModel,
    orderId,
    orderCode,
    orderType,
    purpose,
    paymentMethod,
    buyer,
    amounts,
    items,
    presentation,
    metadata,
}) => {
    const orderRefId = orderId;
    const orderRefModel = orderModel?.modelName;

    if (!orderRefModel || !orderRefId) {
        throw new Error('Invalid order reference for invoice issuance');
    }

    const buyerName = String(buyer?.name || 'Khach hang').trim();
    const recipientEmail = String(buyer?.email || '').trim();
    const buyerPhone = String(buyer?.phone || '').trim();
    const buyerAddress = String(buyer?.address || '').trim();

    const totalAmount = Math.max(Number(amounts?.totalAmount || 0), 0);
    const discountAmount = Math.max(Number(amounts?.discountAmount || 0), 0);
    const shippingFee = Math.max(Number(amounts?.shippingFee || 0), 0);
    const subtotalOverride = Number(amounts?.subtotal);
    const subtotal = Number.isFinite(subtotalOverride)
        ? Math.max(subtotalOverride, totalAmount)
        : Math.max(totalAmount + discountAmount - shippingFee, totalAmount);
    const normalizedItems = normalizeItems(items);

    const invoiceOrderLike = {
        _id: orderRefId,
        paymentMethod: paymentMethod || 'Online',
        totalAmount,
        discountAmount,
        shippingFee,
        guestName: buyerName,
        guestEmail: recipientEmail,
        shippingPhone: buyerPhone,
        shippingAddress: buyerAddress || 'Khong ap dung dia chi giao hang',
        customerId: {
            name: buyerName,
            email: recipientEmail,
            phone: buyerPhone,
        },
        documentTitle: presentation?.documentTitle || 'PHIEU XAC NHAN GIAO DICH',
        documentTypeLabel: presentation?.documentTypeLabel || '',
        purposeLabel: presentation?.purposeLabel || '',
        orderDisplayCode: presentation?.orderDisplayCode || '',
        rentalPeriodLabel: presentation?.rentalPeriodLabel || '',
        customSummaryRows: Array.isArray(presentation?.customSummaryRows) ? presentation.customSummaryRows : [],
        grandTotalLabel: presentation?.grandTotalLabel || 'TỔNG TIỀN:',
    };

    let invoiceResult;
    try {
        invoiceResult = await issueInvoice(invoiceOrderLike, normalizedItems);
    } catch (invoiceErr) {
        await orderModel.updateOne(
            { _id: orderRefId },
            {
                $set: {
                    'invoice.status': 'pending',
                    'invoice.errorMessage': String(invoiceErr.message || 'Issue invoice failed'),
                },
            }
        ).catch(() => { });
        throw invoiceErr;
    }

    const invoiceDoc = await Invoice.findOneAndUpdate(
        { orderRefModel, orderRefId, purpose: purpose || 'General', status: { $in: ['pending', 'issued', 'failed'] } },
        {
            $set: {
                invoiceId: invoiceResult.invoiceId,
                invoiceNo: invoiceResult.invoiceNo,
                orderType,
                orderRefModel,
                orderRefId,
                purpose: purpose || 'General',
                documentTitle: presentation?.documentTitle || 'PHIEU XAC NHAN GIAO DICH',
                documentTypeLabel: presentation?.documentTypeLabel || '',
                buyer: {
                    name: buyerName,
                    email: recipientEmail,
                    phone: buyerPhone,
                    address: buyerAddress,
                },
                paymentMethod: paymentMethod || 'Online',
                amounts: {
                    subtotal,
                    discountAmount,
                    shippingFee,
                    totalAmount,
                },
                items: normalizedItems,
                provider: invoiceResult.provider,
                pdfUrl: invoiceResult.pdfUrl || '',
                xmlUrl: invoiceResult.xmlUrl || '',
                status: 'issued',
                issuedAt: new Date(),
                cancelledAt: null,
                errorMessage: '',
                emailTo: recipientEmail,
                emailStatus: recipientEmail ? 'pending' : 'skipped',
                emailSentAt: null,
                emailError: recipientEmail ? '' : 'No recipient email',
                metadata: metadata || null,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const snapshot = buildOrderInvoiceSnapshot({
        invoiceDoc,
        recipientEmail,
    });

    await orderModel.updateOne(
        { _id: orderRefId },
        {
            $set: {
                invoice: snapshot,
            },
        }
    );

    if (recipientEmail) {
        sendInvoiceEmail({
            to: recipientEmail,
            buyerName,
            orderCode,
            totalAmount,
            invoiceNo: invoiceResult.invoiceNo,
            invoiceDate: invoiceResult.invoiceDate,
            pdfBuffer: invoiceResult.pdfBuffer,
            pdfFilename: invoiceResult.pdfFilename,
        })
            .then(async () => {
                await Promise.all([
                    Invoice.updateOne(
                        { _id: invoiceDoc._id },
                        {
                            $set: {
                                emailStatus: 'sent',
                                emailSentAt: new Date(),
                                emailError: '',
                            },
                        }
                    ).catch(() => { }),
                    orderModel.updateOne(
                        { _id: orderRefId },
                        {
                            $set: {
                                'invoice.emailStatus': 'sent',
                                'invoice.updatedAt': new Date(),
                            },
                        }
                    ).catch(() => { }),
                ]);
            })
            .catch(async (mailErr) => {
                const errorMessage = String(mailErr?.message || 'Email send failed');
                await Promise.all([
                    Invoice.updateOne(
                        { _id: invoiceDoc._id },
                        {
                            $set: {
                                emailStatus: 'failed',
                                emailError: errorMessage,
                            },
                        }
                    ).catch(() => { }),
                    orderModel.updateOne(
                        { _id: orderRefId },
                        {
                            $set: {
                                'invoice.emailStatus': 'failed',
                                'invoice.errorMessage': errorMessage,
                                'invoice.updatedAt': new Date(),
                            },
                        }
                    ).catch(() => { }),
                ]);
            });
    }

    return {
        invoiceDoc,
        invoiceResult,
        snapshot,
    };
};

module.exports = {
    issueAndPersistInvoice,
};
