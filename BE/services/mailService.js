const nodemailer = require('nodemailer');
const { frontendUrl, orderMailImagePlaceholder } = require('../config/app.config');

const normalizeText = (value = '') => String(value || '').trim();

const formatCurrency = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const escapeHtml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const hasSmtpConfig = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const getOrderCode = (order = {}) => {
  if (normalizeText(order.orderCode)) return normalizeText(order.orderCode);

  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const datePart = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}`;
  const suffix = String(order._id || '').slice(-6).toUpperCase() || '000001';
  return `SO-${datePart}-${suffix}`;
};

const getPaymentLabel = (paymentMethod = '') => {
  if (paymentMethod === 'BankTransfer') return 'Chuyển khoản';
  if (paymentMethod === 'Online') return 'Thanh toán online';
  return 'Thanh toán khi nhận hàng';
};

const getStatusLabel = (status = '') => {
  const labels = {
    Draft: 'Nháp',
    PendingPayment: 'Chờ thanh toán',
    PendingConfirmation: 'Chờ xác nhận',
    Paid: 'Đã thanh toán',
    Confirmed: 'Đã xác nhận',
    Shipping: 'Đang giao',
    Completed: 'Hoàn tất',
    Cancelled: 'Đã hủy',
    Returned: 'Đã trả hàng',
    Unpaid: 'Chưa thanh toán',
    Failed: 'Thất bại',
    Refunded: 'Đã hoàn tiền',
  };

  return labels[status] || normalizeText(status) || 'Đang xử lý';
};

const buildOrderConfirmationEmail = (order = {}) => {
  const orderCode = getOrderCode(order);
  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const orderUrl = normalizeText(order.orderUrl) || frontendUrl;

  const itemRows = items
    .map((item) => {
      const image = escapeHtml(item.image || orderMailImagePlaceholder);
      const productName = escapeHtml(item.productName || 'Sản phẩm');
      const variantText = escapeHtml(item.size || item.variant || 'Mặc định');
      const quantity = escapeHtml(item.quantity || 1);
      const price = escapeHtml(formatCurrency(item.price || 0));

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="84" valign="top" style="padding-right:14px;">
                  <img src="${image}" width="70" height="70" alt="${productName}" style="display:block;border-radius:14px;object-fit:cover;border:1px solid #e5e7eb;" />
                </td>
                <td valign="top" style="font-family:Arial,sans-serif;color:#0f172a;">
                  <div style="font-size:15px;font-weight:700;line-height:1.5;">${productName}</div>
                  <div style="margin-top:4px;font-size:13px;color:#64748b;">Size / Biến thể: ${variantText}</div>
                  <div style="margin-top:4px;font-size:13px;color:#64748b;">Số lượng: ${quantity}</div>
                  <div style="margin-top:6px;font-size:14px;font-weight:700;color:#111827;">${price}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;box-shadow:0 12px 40px rgba(15,23,42,0.08);overflow:hidden;">
        <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#eff6ff,#ffffff);border-bottom:1px solid #e5e7eb;">
          <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6366f1;">INHERE</div>
          <h1 style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:28px;line-height:1.2;color:#0f172a;">Đặt hàng thành công</h1>
          <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#475569;">
            Cảm ơn bạn đã đặt hàng tại INHERE. Đơn hàng của bạn đã được ghi nhận thành công và đang chờ xử lý.
          </p>
        </div>

        <div style="padding:24px 28px 28px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
              <tr>
                <td style="padding:0 0 10px;color:#64748b;font-size:13px;">Mã đơn hàng</td>
                <td align="right" style="padding:0 0 10px;color:#0f172a;font-size:14px;font-weight:700;">${escapeHtml(orderCode)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">Trạng thái đơn hàng</td>
                <td align="right" style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;">${escapeHtml(getStatusLabel(order.status))}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">Phương thức thanh toán</td>
                <td align="right" style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;">${escapeHtml(getPaymentLabel(order.paymentMethod))}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">Tổng tiền</td>
                <td align="right" style="padding:10px 0 0;color:#0f172a;font-size:18px;font-weight:800;border-top:1px solid #e2e8f0;">${escapeHtml(formatCurrency(order.totalAmount || 0))}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top:20px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:20px;">
            <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#0f172a;">Thông tin khách hàng</div>
            <div style="margin-top:12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#475569;">
              <div><strong>Họ tên:</strong> ${escapeHtml(customer.name || '')}</div>
              <div><strong>Email:</strong> ${escapeHtml(customer.email || '')}</div>
              <div><strong>Số điện thoại:</strong> ${escapeHtml(customer.phone || '')}</div>
              <div><strong>Địa chỉ:</strong> ${escapeHtml(customer.address || '')}</div>
            </div>
          </div>

          <div style="margin-top:20px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:20px;">
            <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#0f172a;">Danh sách sản phẩm</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              ${itemRows}
            </table>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#4f46e5;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;">
              Xem đơn hàng
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    'Dat hang thanh cong',
    `Ma don hang: ${orderCode}`,
    `Trang thai: ${getStatusLabel(order.status)}`,
    `Khach hang: ${customer.name || ''}`,
    `Email: ${customer.email || ''}`,
    `So dien thoai: ${customer.phone || ''}`,
    `Dia chi: ${customer.address || ''}`,
    '',
    'San pham:',
    ...items.map((item) => `- ${item.productName || 'San pham'} | ${item.size || 'Mac dinh'} | x${item.quantity || 1} | ${formatCurrency(item.price || 0)}`),
    '',
    `Tong tien: ${formatCurrency(order.totalAmount || 0)}`,
    `Phuong thuc thanh toan: ${getPaymentLabel(order.paymentMethod)}`,
    `Xem don hang: ${orderUrl}`,
  ].join('\n');

  return {
    subject: `Đặt hàng thành công - ${orderCode}`,
    html,
    text,
  };
};

const sendOrderConfirmationEmail = async (order = {}) => {
  if (!hasSmtpConfig()) return false;
  if (!normalizeText(order?.customer?.email)) return false;

  const transporter = nodemailer.createTransport(getSmtpConfig());
  const from = process.env.SMTP_FROM || `INHERE <${process.env.SMTP_USER}>`;
  const { subject, html, text } = buildOrderConfirmationEmail(order);

  await transporter.sendMail({
    from,
    to: order.customer.email,
    subject,
    html,
    text,
  });

  return true;
};

module.exports = {
  buildOrderConfirmationEmail,
  sendOrderConfirmationEmail,
};
