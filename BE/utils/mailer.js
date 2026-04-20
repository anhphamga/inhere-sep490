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

module.exports = {
  hasSmtpConfig,
  sendGuestVerificationEmail,
  sendResetPasswordEmail,
  sendStaffInvitationEmail,
};
