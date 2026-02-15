const nodemailer = require('nodemailer');

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const hasSmtpConfig = () => Boolean(
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

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
    'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.'
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
    html
  });
};

module.exports = {
  hasSmtpConfig,
  sendResetPasswordEmail
};
