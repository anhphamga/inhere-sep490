/**
 * einvoice.service.js
 *
 * Tạo hóa đơn mock (PDF) + gửi email tự động sau khi thanh toán thành công.
 *
 * Để kết nối nhà cung cấp HĐĐT thực (VNPT/Viettel/MISA):
 * 1. Set env: EINVOICE_PROVIDER=vnpt
 * 2. Implement hàm issueInvoiceVnpt() theo spec API nhà cung cấp
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { hasSmtpConfig } = require('../utils/mailer');
const { sendInvoiceEmail } = require('../utils/mailer');

// Font TTF hỗ trợ tiếng Việt (bundle cùng project)
const FONTS_DIR = path.join(__dirname, '../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Arial-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Arial-Bold.ttf');

// Fallback về font hệ thống nếu file chưa có
const fontRegular = fs.existsSync(FONT_REGULAR) ? FONT_REGULAR : 'Helvetica';
const fontBold = fs.existsSync(FONT_BOLD) ? FONT_BOLD : 'Helvetica-Bold';

const PROVIDER = String(process.env.EINVOICE_PROVIDER || 'stub').toLowerCase();
const SELLER_NAME = process.env.EINVOICE_SELLER_NAME || 'INHERE – Cửa hàng thời trang Hội An';
const SELLER_TAX_CODE = process.env.EINVOICE_SELLER_TAX_CODE || '0000000000';
const SELLER_ADDRESS = process.env.EINVOICE_SELLER_ADDRESS || 'Hội An, Quảng Nam, Việt Nam';
const SELLER_PHONE = process.env.EINVOICE_SELLER_PHONE || '';
const SELLER_EMAIL = process.env.EINVOICE_SELLER_EMAIL || process.env.SMTP_USER || '';

// Thư mục lưu file PDF tạm
const INVOICE_DIR = path.join(__dirname, '../uploads/invoices');

const ensureInvoiceDir = () => {
    if (!fs.existsSync(INVOICE_DIR)) {
        fs.mkdirSync(INVOICE_DIR, { recursive: true });
    }
};

const currencyVnd = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));

/**
 * Tạo số hóa đơn theo format: YYYYMMDD-XXXXXX
 */
const generateInvoiceNo = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = String(Date.now()).slice(-6);
    return `${datePart}-${randomPart}`;
};

/**
 * Tạo file PDF hóa đơn và trả về Buffer
 */
const generateInvoicePdf = (invoiceData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Hóa đơn ${invoiceData.invoiceNo}`,
                    Author: SELLER_NAME,
                },
            });

            // Đăng ký font hỗ trợ tiếng Việt
            doc.registerFont('Regular', fontRegular);
            doc.registerFont('Bold', fontBold);

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const W = doc.page.width - 100; // usable width
            const primaryColor = '#1975d2';
            const grayColor = '#6b7280';

            // ───── HEADER ─────
            doc.rect(0, 0, doc.page.width, 110).fill(primaryColor);

            doc.fill('#ffffff')
                .fontSize(22)
                .font('Bold')
                .text(SELLER_NAME, 50, 28, { width: W });

            doc.fontSize(10).font('Regular')
                .text(`MST: ${SELLER_TAX_CODE}  |  ${SELLER_ADDRESS}`, 50, 58, { width: W });

            if (SELLER_PHONE || SELLER_EMAIL) {
                const contactLine = [SELLER_PHONE, SELLER_EMAIL].filter(Boolean).join('  |  ');
                doc.text(contactLine, 50, 74, { width: W });
            }

            doc.fill('#ffffff').fontSize(14).font('Bold')
                .text('HÓA ĐƠN BÁN HÀNG', { align: 'right' });

            // ───── INVOICE META ─────
            doc.fill('#111827').moveDown(2);
            const metaY = 130;

            doc.fontSize(10).font('Bold').fill(primaryColor)
                .text('THÔNG TIN HÓA ĐƠN', 50, metaY);
            doc.moveTo(50, metaY + 14).lineTo(W + 50, metaY + 14).strokeColor(primaryColor).stroke();

            const meta = [
                ['Số hóa đơn:', invoiceData.invoiceNo],
                ['Ngày phát hành:', new Date(invoiceData.invoiceDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                ['Mã đơn hàng:', `#${String(invoiceData.orderId || '').slice(-8).toUpperCase()}`],
                ['Phương thức TT:', invoiceData.paymentMethod === 'Online' ? 'Thanh toán online' : invoiceData.paymentMethod === 'COD' ? 'Tiền mặt khi nhận hàng' : invoiceData.paymentMethod || 'N/A'],
            ];

            let y = metaY + 22;
            meta.forEach(([label, value]) => {
                doc.fill(grayColor).font('Regular').fontSize(9).text(label, 50, y);
                doc.fill('#111827').font('Bold').fontSize(9).text(value, 200, y);
                y += 18;
            });

            // ───── BUYER INFO ─────
            const buyerY = y + 12;
            doc.fontSize(10).font('Bold').fill(primaryColor).text('THÔNG TIN NGƯỜI MUA', 50, buyerY);
            doc.moveTo(50, buyerY + 14).lineTo(W + 50, buyerY + 14).strokeColor(primaryColor).stroke();

            const buyer = [
                ['Họ tên:', invoiceData.buyerName || 'Khách lẻ'],
                ['Email:', invoiceData.buyerEmail || 'N/A'],
                ['Điện thoại:', invoiceData.buyerPhone || 'N/A'],
                ['Địa chỉ:', invoiceData.buyerAddress || 'N/A'],
            ];

            y = buyerY + 22;
            buyer.forEach(([label, value]) => {
                doc.fill(grayColor).font('Regular').fontSize(9).text(label, 50, y);
                doc.fill('#111827').font('Bold').fontSize(9).text(String(value), 200, y, { width: W - 155 });
                y += 18;
            });

            // ───── ITEMS TABLE ─────
            const tableY = y + 16;
            doc.fontSize(10).font('Bold').fill(primaryColor).text('CHI TIẾT SẢN PHẨM / DỊCH VỤ', 50, tableY);
            doc.moveTo(50, tableY + 14).lineTo(W + 50, tableY + 14).strokeColor(primaryColor).stroke();

            // Table header
            const colX = { no: 50, name: 75, qty: 310, price: 365, total: 450 };
            const headerY = tableY + 22;
            doc.rect(50, headerY - 4, W, 20).fill('#f0f7ff');
            doc.fill(primaryColor).font('Bold').fontSize(9);
            doc.text('STT', colX.no, headerY, { width: 20 });
            doc.text('Sản phẩm / Dịch vụ', colX.name, headerY, { width: 230 });
            doc.text('SL', colX.qty, headerY, { width: 50, align: 'center' });
            doc.text('Đơn giá', colX.price, headerY, { width: 80, align: 'right' });
            doc.text('Thành tiền', colX.total, headerY, { width: 95, align: 'right' });

            y = headerY + 20;
            const items = invoiceData.items || [];
            items.forEach((item, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fbff';
                doc.rect(50, y - 2, W, 18).fill(rowBg);
                doc.fill('#111827').font('Regular').fontSize(9);
                doc.text(String(idx + 1), colX.no, y, { width: 20 });
                doc.text(String(item.name || 'Sản phẩm'), colX.name, y, { width: 230 });
                doc.text(String(item.quantity || 1), colX.qty, y, { width: 50, align: 'center' });
                doc.text(currencyVnd(item.unitPrice), colX.price, y, { width: 80, align: 'right' });
                doc.text(currencyVnd((item.unitPrice || 0) * (item.quantity || 1)), colX.total, y, { width: 95, align: 'right' });
                y += 18;
            });

            // Divider
            doc.moveTo(50, y + 4).lineTo(W + 50, y + 4).strokeColor('#e5e7eb').stroke();
            y += 14;

            // ───── TOTALS ─────
            const totals = [
                ['Tạm tính:', currencyVnd(invoiceData.subtotal)],
                ...(invoiceData.discountAmount > 0 ? [['Giảm giá:', `- ${currencyVnd(invoiceData.discountAmount)}`]] : []),
                ...(invoiceData.shippingFee > 0 ? [['Phí vận chuyển:', currencyVnd(invoiceData.shippingFee)]] : []),
            ];

            totals.forEach(([label, value]) => {
                doc.fill(grayColor).font('Regular').fontSize(9).text(label, 350, y, { width: 100 });
                doc.fill('#111827').font('Regular').fontSize(9).text(value, 460, y, { width: 85, align: 'right' });
                y += 16;
            });

            // Grand total
            y += 4;
            doc.rect(340, y - 4, W - 290, 26).fill(primaryColor);
            doc.fill('#ffffff').font('Bold').fontSize(11)
                .text('TỔNG TIỀN:', 350, y + 2, { width: 100 })
                .text(currencyVnd(invoiceData.totalAmount), 420, y + 2, { width: 125, align: 'right' });

            y += 40;

            // ───── FOOTER ─────
            doc.fill(grayColor).font('Regular').fontSize(8)
                .text('Đây là hóa đơn điện tử được tạo tự động bởi hệ thống INHERE.', 50, y, { align: 'center', width: W })
                .text('Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!', { align: 'center', width: W });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Phát hành hóa đơn mock: generate PDF, lưu disk, trả về thông tin
 */
const issueInvoiceStub = async (order, items = []) => {
    ensureInvoiceDir();

    const now = new Date();
    const invoiceNo = generateInvoiceNo();
    const invoiceId = `MOCK-${String(order._id).slice(-8).toUpperCase()}-${Date.now()}`;

    const orderCode = `#${String(order._id).slice(-8).toUpperCase()}`;
    const buyerName = order.guestName || order.customerId?.name || 'Khách lẻ';
    const buyerEmail = order.guestEmail || order.customerId?.email || '';
    const buyerPhone = order.shippingPhone || order.customerId?.phone || '';
    const buyerAddress = order.shippingAddress || '';
    const subtotal = (order.totalAmount || 0) + (order.discountAmount || 0) - (order.shippingFee || 0);

    const invoiceData = {
        invoiceNo,
        invoiceId,
        invoiceDate: now,
        orderId: String(order._id),
        paymentMethod: order.paymentMethod || 'N/A',
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        items: items.map((item) => ({
            name: item.productId?.name || item.name || 'Sản phẩm',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
        })),
        subtotal: Math.max(subtotal, order.totalAmount || 0),
        discountAmount: order.discountAmount || 0,
        shippingFee: order.shippingFee || 0,
        totalAmount: order.totalAmount || 0,
    };

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePdf(invoiceData);

    // Lưu PDF vào disk
    const filename = `invoice-${invoiceId}.pdf`;
    const filePath = path.join(INVOICE_DIR, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9000}`;
    const pdfUrl = `${baseUrl}/uploads/invoices/${filename}`;

    return {
        invoiceId,
        invoiceNo,
        invoiceDate: now,
        pdfUrl,
        pdfBuffer,    // trả về buffer để gửi email đính kèm
        pdfFilename: filename,
        buyerEmail,
        buyerName,
        orderCode,
        provider: 'stub',
        status: 'issued',
    };
};

/**
 * Entry point: phát hành hóa đơn (router theo PROVIDER env)
 */
const issueInvoice = async (order, items = []) => {
    console.info(`[EInvoice] Issuing invoice for order ${order._id} via provider: ${PROVIDER}`);

    switch (PROVIDER) {
        case 'vnpt': throw new Error('VNPT provider chưa được cấu hình. Liên hệ admin.');
        case 'viettel': throw new Error('Viettel provider chưa được cấu hình. Liên hệ admin.');
        case 'misa': throw new Error('MISA provider chưa được cấu hình. Liên hệ admin.');
        case 'stub':
        default:
            return issueInvoiceStub(order, items);
    }
};

/**
 * Hủy hóa đơn
 */
const cancelInvoice = async (invoiceId, reason = '') => {
    console.info(`[EInvoice] Cancelling invoice ${invoiceId}, reason: ${reason}`);
    // Provider thực: gọi API hủy hóa đơn
    return { success: true, cancelledAt: new Date() };
};

module.exports = {
    issueInvoice,
    cancelInvoice,
};
