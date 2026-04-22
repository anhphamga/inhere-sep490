const nodemailer = require('nodemailer');

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

const createTransporter = () => nodemailer.createTransport(getSmtpConfig());

const sendResetPasswordEmail = async ({ to, name, resetLink, expiresInMinutes }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `INHERE <${process.env.SMTP_USER}>`;
  const displayName = name || 'bạn';

  const subject = 'Đặt lại mật khẩu tài khoản INHERE';
  const text = [
    `Xin chào ${displayName},`,
    '',
    'Bạn vừa yêu cầu đặt lại mật khẩu.',
    `Mở link sau để đặt lại mật khẩu (hết hạn sau ${expiresInMinutes} phút):`,
    resetLink,
    '',
    'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Đặt lại mật khẩu tài khoản INHERE</h2>
      <p>Xin chào ${displayName},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p>
        Nhấn vào link bên dưới để đặt lại mật khẩu
        <strong>(hết hạn sau ${expiresInMinutes} phút)</strong>:
      </p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const sendGuestVerificationEmail = async ({ to, code, expiresInMinutes }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `INHERE <${process.env.SMTP_USER}>`;
  const subject = 'Mã xác minh thanh toán INHERE';
  const text = [
    'Xin chào,',
    '',
    `Mã xác minh của bạn là: ${code}`,
    `Mã sẽ hết hạn sau ${expiresInMinutes} phút.`,
    '',
    'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Xác minh thông tin trước khi thanh toán</h2>
      <p>Mã xác minh của bạn:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
      <p>Mã sẽ hết hạn sau <strong>${expiresInMinutes} phút</strong>.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const sendStaffInvitationEmail = async ({ to, name, inviterName, acceptLink, expiresInHours }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `INHERE <${process.env.SMTP_USER}>`;
  const displayName = name || 'ban';
  const displayInviterName = inviterName || 'chu shop';

  const subject = 'Thu moi tham gia tai khoan nhan su INHERE';
  const text = [
    `Xin chao ${displayName},`,
    '',
    `${displayInviterName} vua moi ban tham gia he thong nhan su INHERE.`,
    `Bam link sau de chap nhan loi moi (het han sau ${expiresInHours} gio):`,
    acceptLink,
    '',
    'Neu ban khong cho rang day la loi moi hop le, vui long bo qua email nay.'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Thu moi tham gia nhan su INHERE</h2>
      <p>Xin chao ${displayName},</p>
      <p>${displayInviterName} vua moi ban tham gia he thong nhan su INHERE.</p>
      <p>Vui long bam nut duoi day de chap nhan loi moi <strong>(het han sau ${expiresInHours} gio)</strong>.</p>
      <p>
        <a href="${acceptLink}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1975d2;color:#ffffff;text-decoration:none;font-weight:700;">
          Accept Invitation
        </a>
      </p>
      <p>Hoac mo lien ket sau:</p>
      <p><a href="${acceptLink}">${acceptLink}</a></p>
      <p>Neu ban khong cho rang day la loi moi hop le, vui long bo qua email nay.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const sendInvoiceEmail = async ({ to, buyerName, orderCode, totalAmount, invoiceNo, invoiceDate, pdfBuffer, pdfFilename }) => {
  if (!to) {
    console.warn('[Mailer] sendInvoiceEmail: no recipient email, skipping.');
    return;
  }
  if (!hasSmtpConfig()) {
    console.warn('[Mailer] sendInvoiceEmail: SMTP not configured, skipping email.');
    return;
  }

  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `INHERE <${process.env.SMTP_USER}>`;
  const displayName = buyerName || 'Quý khách';
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(totalAmount || 0));
  const formattedDate = new Date(invoiceDate || Date.now()).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const subject = `✅ Xác nhận đơn hàng ${orderCode} – INHERE`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fbff;padding:0;border-radius:16px;overflow:hidden">
      <div style="background:#1975d2;padding:32px 40px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">INHERE</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px">Thời trang cho thuê &amp; mua sắm</p>
      </div>

      <div style="background:#ffffff;padding:32px 40px">
        <h2 style="color:#111827;font-size:20px;margin:0 0 8px">🎉 Đặt hàng thành công!</h2>
        <p style="color:#6b7280;margin:0 0 24px;font-size:14px;line-height:1.6">
          Xin chào <strong>${displayName}</strong>,<br>
          Cảm ơn bạn đã đặt hàng tại INHERE. Đơn hàng của bạn đã được ghi nhận và đang được xử lý.
        </p>

        <div style="background:#f0f7ff;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="color:#6b7280;padding:6px 0">Mã đơn hàng</td>
              <td style="color:#111827;font-weight:700;text-align:right">${orderCode}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:6px 0">Số hóa đơn</td>
              <td style="color:#111827;font-weight:600;text-align:right">${invoiceNo}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:6px 0">Ngày đặt hàng</td>
              <td style="color:#111827;text-align:right">${formattedDate}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb">Tổng thanh toán</td>
              <td style="color:#1975d2;font-weight:700;font-size:16px;text-align:right;border-top:1px solid #e5e7eb">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px">
          📎 Hóa đơn điện tử (<strong>${pdfFilename || 'invoice.pdf'}</strong>) đã được đính kèm trong email này.
          Bạn có thể lưu lại để đối chiếu khi cần.
        </p>

        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0">
          Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua email hoặc hotline của cửa hàng.
        </p>
      </div>

      <div style="background:#f0f7ff;padding:20px 40px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">
          Email này được gửi tự động bởi hệ thống INHERE. Vui lòng không trả lời email này.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text: `Xác nhận đơn ${orderCode} – Tổng: ${formattedAmount}. Hóa đơn số: ${invoiceNo}.`,
  };

  // Đính kèm PDF nếu có buffer
  if (pdfBuffer && pdfFilename) {
    mailOptions.attachments = [{
      filename: pdfFilename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  }

  await transporter.sendMail(mailOptions);
  console.info(`[Mailer] Invoice email sent to ${to} for order ${orderCode}`);
};

module.exports = {
  hasSmtpConfig,
  sendGuestVerificationEmail,
  sendResetPasswordEmail,
  sendStaffInvitationEmail,
  sendInvoiceEmail,
};
