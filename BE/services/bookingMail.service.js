const nodemailer = require('nodemailer');

const normalize = (value = '') => String(value || '').trim();

const hasSmtpConfig = () =>
  Boolean(
    normalize(process.env.SMTP_USER)
    && normalize(process.env.SMTP_PASS)
    && normalize(process.env.SMTP_FROM || process.env.SMTP_USER)
  );

const getTransportConfig = () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const buildConfirmedTemplate = (booking) => ({
  subject: 'Xác nhận lịch thử đồ - INHERE',
  text: [
    `Xin chào ${booking.name},`,
    '',
    'Lịch thử đồ của bạn đã được xác nhận:',
    booking.productName ? `- Trang phục: ${booking.productName}` : null,
    `- Ngày: ${formatDate(booking.date)}`,
    `- Giờ: ${booking.time}`,
    '',
    'Ghi chú:',
    booking.staffNote || '(Không có)',
    '',
    'Hẹn gặp bạn tại INHERE ❤️',
  ]
    .filter(Boolean)
    .join('\n'),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
      <p>Xin chào <strong>${booking.name}</strong>,</p>
      <p>Lịch thử đồ của bạn đã được xác nhận:</p>
      <p>
        ${booking.productName ? `👗 Trang phục: <strong>${booking.productName}</strong><br/>` : ''}
        📅 Ngày: <strong>${formatDate(booking.date)}</strong><br/>
        ⏰ Giờ: <strong>${booking.time}</strong>
      </p>
      <p>Ghi chú:<br/>${booking.staffNote || '(Không có)'}</p>
      <p>Hẹn gặp bạn tại INHERE ❤️</p>
    </div>
  `,
});

const buildRejectedTemplate = (booking) => ({
  subject: 'Lịch thử đồ chưa thể xác nhận',
  text: [
    `Xin chào ${booking.name},`,
    '',
    'Rất tiếc lịch thử đồ của bạn hiện chưa thể xác nhận.',
    booking.productName ? `Trang phục đã chọn: ${booking.productName}` : null,
    '',
    'Ghi chú từ cửa hàng:',
    booking.staffNote || '(Không có)',
    '',
    'Vui lòng đặt lại khung giờ khác hoặc liên hệ INHERE để được hỗ trợ.',
  ]
    .filter(Boolean)
    .join('\n'),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
      <p>Xin chào <strong>${booking.name}</strong>,</p>
      <p>Rất tiếc lịch thử đồ của bạn hiện chưa thể xác nhận.</p>
      ${booking.productName ? `<p>👗 Trang phục đã chọn: <strong>${booking.productName}</strong></p>` : ''}
      <p>Ghi chú từ cửa hàng:<br/>${booking.staffNote || '(Không có)'}</p>
      <p>Vui lòng đặt lại khung giờ khác hoặc liên hệ INHERE để được hỗ trợ.</p>
    </div>
  `,
});

const sendBookingEmail = async (booking) => {
  const to = normalize(booking?.email);
  if (!to || !hasSmtpConfig()) return false;

  const status = normalize(booking?.status).toLowerCase();
  const template = status === 'confirmed' ? buildConfirmedTemplate(booking) : buildRejectedTemplate(booking);

  const transporter = nodemailer.createTransport(getTransportConfig());
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
  return true;
};

module.exports = {
  sendBookingEmail,
  hasSmtpConfig,
};
