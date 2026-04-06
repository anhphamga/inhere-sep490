const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../model/User.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { addRefreshToken, hasRefreshToken, removeRefreshToken } = require('../utils/refreshTokenStore');
const { hasGoogleClientId, verifyGoogleIdToken } = require('../utils/googleAuth');
const { hasSmtpConfig, sendResetPasswordEmail } = require('../utils/mailer');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const { resolveUserAccess } = require('../services/accessControl.service');
const { frontendUrl } = require('../config/app.config');

const getPrimaryAdminEmail = () => String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
const isPrimaryAdminUser = (user) => {
  const primaryAdminEmail = getPrimaryAdminEmail();
  if (!primaryAdminEmail) {
    return false;
  }

  return String(user?.role || '').trim().toLowerCase() === 'owner'
    && String(user?.email || '').trim().toLowerCase() === primaryAdminEmail;
};

const sanitizeUser = (user, access = null) => ({
  id: user._id,
  role: user.role,
  roleLevel: Number(user.roleLevel || access?.roleLevel || 0),
  name: user.name,
  phone: user.phone,
  email: user.email,
  authProvider: user.authProvider,
  status: user.status,
  avatarUrl: user.avatarUrl,
  address: user.address,
  segment: user.segment,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  isPrimaryAdmin: isPrimaryAdminUser(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  permissions: access?.permissions || [],
  access: access || {
    role: user.role,
    roleLevel: Number(user.roleLevel || 0),
    permissions: [],
  }
});

const createAuthTokens = (user) => {
  const tokenPayload = {
    userId: user._id.toString(),
    role: user.role
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  addRefreshToken(refreshToken);

  return {
    accessToken,
    refreshToken
  };
};

const handleDuplicateKeyError = (error, res) => {
  if (error?.code !== 11000) {
    return false;
  }

  const duplicateField = Object.keys(error?.keyPattern || {})[0];
  const messageByField = {
    email: 'Email đã được sử dụng',
    phone: 'Số điện thoại đã được sử dụng'
  };

  return res.status(409).json({
    success: false,
    message: messageByField[duplicateField] || 'Duplicate data'
  });
};

const buildSanitizedUser = async (user) => sanitizeUser(user, await resolveUserAccess(user));

const LOGIN_PORTAL = Object.freeze({
  CUSTOMER: 'customer',
  STAFF: 'staff'
});

const normalizeLoginPortal = (portal) => {
  if (typeof portal !== 'string') {
    return LOGIN_PORTAL.CUSTOMER;
  }

  const normalized = portal.trim().toLowerCase();
  return normalized === LOGIN_PORTAL.STAFF ? LOGIN_PORTAL.STAFF : LOGIN_PORTAL.CUSTOMER;
};

const isPortalAllowedForRole = (portal, role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (portal === LOGIN_PORTAL.STAFF) {
    return normalizedRole === 'owner' || normalizedRole === 'staff';
  }

  return normalizedRole === 'customer';
};

const getPortalDeniedMessage = (portal) => {
  if (portal === LOGIN_PORTAL.STAFF) {
    return 'Tài khoản khách hàng vui lòng đăng nhập tại cổng khách hàng.';
  }

  return 'Tài khoản staff/owner vui lòng đăng nhập tại cổng nhân sự.';
};

const ensurePortalRoleAccess = (portal, user, res) => {
  if (isPortalAllowedForRole(portal, user?.role)) {
    return true;
  }

  res.status(403).json({
    success: false,
    message: getPortalDeniedMessage(portal)
  });
  return false;
};

const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, phone, email, password are required'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ'
      });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ'
      });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ phone: normalizedPhone })
    ]);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại đã được sử dụng'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: 'customer',
      name,
      phone: normalizedPhone,
      email: normalizedEmail,
      passwordHash,
      authProvider: 'local',
      status: 'active',
      segment: 'new_user'
    });

    const { accessToken, refreshToken } = createAuthTokens(user);

    return res.status(201).json({
      success: true,
      message: 'Signup successful',
      data: {
        accessToken,
        refreshToken,
        user: await buildSanitizedUser(user)
      }
    });
  } catch (error) {
    if (handleDuplicateKeyError(error, res)) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Error during signup',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, phone, password, portal } = req.body;
    const loginPortal = normalizeLoginPortal(portal);

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'email/phone and password are required'
      });
    }

    const hasEmail = typeof email === 'string' && email.trim();
    const normalizedEmail = hasEmail ? normalizeEmail(email) : null;
    const normalizedPhone = typeof phone === 'string' ? normalizePhone(phone) : null;

    const loginQuery = {
      authProvider: 'local'
    };

    if (normalizedEmail) {
      loginQuery.email = normalizedEmail;
    } else {
      loginQuery.phone = normalizedPhone;
    }

    const user = await User.findOne(loginQuery).select('+passwordHash');

    if (!user) {
      if (normalizedEmail) {
        const googleUserExists = await User.exists({
          email: normalizedEmail,
          authProvider: 'google'
        });

        return res.status(401).json({
          success: false,
          message: googleUserExists ? 'Email này đăng ký bằng Google. Vui lòng đăng nhập Google.' : 'Invalid email or password'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang chờ owner duyệt'
      });
    }

    if (user.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: 'Account is locked'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!ensurePortalRoleAccess(loginPortal, user, res)) {
      return;
    }

    const { accessToken, refreshToken } = createAuthTokens(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: await buildSanitizedUser(user)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};
const googleLogin = async (req, res) => {
  try {
    const { idToken, portal } = req.body;
    const loginPortal = normalizeLoginPortal(portal);

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'idToken is required'
      });
    }

    if (!hasGoogleClientId()) {
      return res.status(500).json({
        success: false,
        message: 'Google login is not configured'
      });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const email = payload?.email?.toLowerCase()?.trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account email is missing'
      });
    }

    if (payload.email_verified === false) {
      return res.status(400).json({
        success: false,
        message: 'Google email is not verified'
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        role: 'customer',
        name: payload.name || email.split('@')[0],
        phone: null,
        email,
        passwordHash,
        authProvider: 'google',
        status: 'active',
        avatarUrl: payload.picture || null,
        segment: 'new_user'
      });
    } else {
      if (user.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đang chờ owner duyệt'
        });
      }

      if (user.status === 'locked') {
        return res.status(403).json({
          success: false,
          message: 'Account is locked'
        });
      }

      const updates = {};
      if (typeof user.phone === 'string' && user.phone.startsWith('google_')) {
        updates.phone = null;
      }
      if (!user.name && payload.name) {
        updates.name = payload.name;
      }
      if (!user.avatarUrl && payload.picture) {
        updates.avatarUrl = payload.picture;
      }

      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    }

    if (!ensurePortalRoleAccess(loginPortal, user, res)) {
      return;
    }

    const { accessToken, refreshToken } = createAuthTokens(user);

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        accessToken,
        refreshToken,
        user: await buildSanitizedUser(user)
      }
    });
  } catch (error) {
    if (handleDuplicateKeyError(error, res)) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Google login failed',
      error: error.message
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'email is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: normalizedEmail,
      authProvider: 'local'
    }).select('+passwordResetToken +passwordResetExpires');

    const genericResponse = {
      success: true,
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.'
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${frontendUrl}/forgot-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;

    if (hasSmtpConfig()) {
      await sendResetPasswordEmail({
        to: normalizedEmail,
        name: user.name,
        resetLink,
        expiresInMinutes: 15
      });
      return res.status(200).json(genericResponse);
    }

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: 'SMTP chưa cấu hình. Trả token/link để test ở môi trường dev.',
        token: rawToken,
        resetLink
      });
    }

    return res.status(500).json({
      success: false,
      message: 'SMTP chưa được cấu hình trên server'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể xử lý yêu cầu quên mật khẩu',
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'token and newPassword are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      authProvider: 'local',
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordHash +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể đặt lại mật khẩu',
      error: error.message
    });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken is required'
      });
    }

    if (!hasRefreshToken(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || user.status === 'locked') {
      removeRefreshToken(refreshToken);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Refresh successful',
      data: {
        accessToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (refreshToken) {
    removeRefreshToken(refreshToken);
  }

  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Get profile successful',
      data: await buildSanitizedUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting profile',
      error: error.message
    });
  }
};

module.exports = {
  signup,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getCurrentUser
};

