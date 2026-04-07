const GuestVerification = require('../model/GuestVerification.model');
const {
  CODE_TTL_MINUTES,
  MAX_RESEND_COUNT,
  MAX_VERIFY_ATTEMPTS,
  generateVerificationCode,
  getExpiresAt,
  hashVerificationCode,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} = require('../utils/guestVerification');
const { hasSmtpConfig, sendGuestVerificationEmail } = require('../utils/mailer');
const { signGuestVerificationToken } = require('../utils/jwt');

const buildVerificationState = (record, overrides = {}) => {
  const method = overrides.method || record?.method || null;
  const phone = overrides.phone ?? record?.phone ?? '';
  const email = overrides.email ?? record?.email ?? '';
  const phoneVerified = Boolean(overrides.phoneVerified ?? (method === 'phone' && record?.verified));
  const emailVerified = Boolean(overrides.emailVerified ?? (method === 'email' && record?.verified));

  return {
    method,
    phone,
    email,
    phoneVerified,
    emailVerified,
    isVerified: phoneVerified || emailVerified,
  };
};

const prepareVerificationRecord = async ({ method, target, phone = '', email = '' }) => {
  const now = new Date();
  let record = await GuestVerification.findOne({ method, target }).select('+codeHash');

  if (!record) {
    record = new GuestVerification({
      method,
      target,
      phone,
      email,
      codeHash: hashVerificationCode('000000'),
      expiresAt: now,
      resendCount: 0,
      attempts: 0,
      verified: false,
    });
  }

  const expired = !record.expiresAt || new Date(record.expiresAt) <= now;
  if (expired || record.verified) {
    record.resendCount = 0;
    record.attempts = 0;
    record.verified = false;
    record.verifiedAt = null;
    record.consumedAt = null;
  }

  if (record.resendCount >= MAX_RESEND_COUNT) {
    return {
      error: {
        status: 429,
        message: 'Ban da gui ma toi da 3 lan. Hay doi ma cu het han hoac doi thong tin khac.',
      },
    };
  }

  return { record };
};

exports.sendPhoneOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'So dien thoai khong hop le.',
      });
    }

    const { record, error } = await prepareVerificationRecord({
      method: 'phone',
      target: phone,
      phone,
    });

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const code = generateVerificationCode();
    record.phone = phone;
    record.email = '';
    record.codeHash = hashVerificationCode(code);
    record.expiresAt = getExpiresAt();
    record.resendCount += 1;
    record.lastSentAt = new Date();
    await record.save();

    console.info(`[guest-phone-otp] ${phone}: ${code}`);

    return res.json({
      success: true,
      message: 'Da gui OTP den so dien thoai.',
      data: {
        expiresAt: record.expiresAt,
        resendCount: record.resendCount,
        maxResends: MAX_RESEND_COUNT,
        guestVerification: buildVerificationState(record),
      },
    });
  } catch (error) {
    console.error('Send phone OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the gui OTP luc nay.',
    });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || req.body?.code || '').trim();

    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'So dien thoai khong hop le.' });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Vui long nhap OTP.' });
    }

    const record = await GuestVerification.findOne({ method: 'phone', target: phone }).select('+codeHash');
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP khong hop le hoac chua duoc gui.' });
    }

    if (new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'OTP da het han. Vui long gui lai ma moi.' });
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'OTP da vuot qua so lan thu toi da. Vui long gui ma moi.' });
    }

    if (record.codeHash !== hashVerificationCode(otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: 'OTP khong chinh xac.' });
    }

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    const verificationToken = signGuestVerificationToken({
      verificationId: record._id.toString(),
      method: 'phone',
    });

    return res.json({
      success: true,
      message: 'Xac minh so dien thoai thanh cong.',
      data: {
        verificationToken,
        guestVerification: buildVerificationState(record, {
          phoneVerified: true,
        }),
      },
    });
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong the xac minh OTP luc nay.',
    });
  }
};

exports.sendEmailCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ.',
      });
    }

    const { record, error } = await prepareVerificationRecord({
      method: 'email',
      target: email,
      email,
    });

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const code = generateVerificationCode();
    const previousState = {
      phone: record.phone,
      email: record.email,
      codeHash: record.codeHash,
      expiresAt: record.expiresAt,
      resendCount: record.resendCount,
      verified: record.verified,
      verifiedAt: record.verifiedAt,
      lastSentAt: record.lastSentAt,
    };
    record.phone = '';
    record.email = email;
    record.codeHash = hashVerificationCode(code);
    record.expiresAt = getExpiresAt();
    record.resendCount += 1;
    record.lastSentAt = new Date();
    await record.save();

    if (hasSmtpConfig()) {
      try {
        await sendGuestVerificationEmail({
          to: email,
          code,
          expiresInMinutes: CODE_TTL_MINUTES,
        });
      } catch (mailError) {
        Object.assign(record, previousState);
        await record.save();
        console.error('Guest email delivery error:', mailError);
        return res.status(500).json({
          success: false,
          message: 'Không thể gửi mã xác minh đến email lúc này. Vui lòng thử lại sau.',
        });
      }
    } else {
      console.info(`[guest-email-code] ${email}: ${code}`);
    }

    return res.json({
      success: true,
      message: 'Đã gửi mã xác minh đến email.',
      data: {
        expiresAt: record.expiresAt,
        resendCount: record.resendCount,
        maxResends: MAX_RESEND_COUNT,
        guestVerification: buildVerificationState(record),
      },
    });
  } catch (error) {
    console.error('Send email code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi mã xác minh email lúc này.',
    });
  }
};

exports.verifyEmailCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã xác minh.' });
    }

    const record = await GuestVerification.findOne({ method: 'email', target: email }).select('+codeHash');
    if (!record) {
      return res.status(400).json({ success: false, message: 'Mã xác minh không hợp lệ hoặc chưa được gửi.' });
    }

    if (new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Mã xác minh đã hết hạn. Vui lòng gửi lại mã mới.' });
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Mã xác minh đã vượt quá số lần thử tối đa. Vui lòng gửi mã mới.' });
    }

    if (record.codeHash !== hashVerificationCode(code)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: 'Mã xác minh không chính xác.' });
    }

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    const verificationToken = signGuestVerificationToken({
      verificationId: record._id.toString(),
      method: 'email',
    });

    return res.json({
      success: true,
      message: 'Xác minh email thành công.',
      data: {
        verificationToken,
        guestVerification: buildVerificationState(record, {
          emailVerified: true,
        }),
      },
    });
  } catch (error) {
    console.error('Verify email code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xác minh email lúc này.',
    });
  }
};
