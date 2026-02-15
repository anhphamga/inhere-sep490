const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../model/User.model');
const { signAccessToken } = require('../utils/jwt');
const { hasGoogleClientId, verifyGoogleIdToken } = require('../utils/googleAuth');

const sanitizeUser = (user) => ({
  id: user._id,
  role: user.role,
  name: user.name,
  phone: user.phone,
  email: user.email,
  authProvider: user.authProvider,
  status: user.status,
  avatarUrl: user.avatarUrl,
  address: user.address,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const handleDuplicateKeyError = (error, res) => {
  if (error?.code !== 11000) {
    return false;
  }

  const duplicateField = Object.keys(error?.keyPattern || {})[0];
  const messageByField = {
    email: 'Email already exists'
  };

  return res.status(409).json({
    success: false,
    message: messageByField[duplicateField] || 'Duplicate data'
  });
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

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
      authProvider: 'local'
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
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
      status: 'active'
    });

    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role
    });

    return res.status(201).json({
      success: true,
      message: 'Signup successful',
      data: {
        token,
        user: sanitizeUser(user)
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: normalizedEmail,
      authProvider: 'local'
    }).select('+passwordHash');

    if (!user) {
      const googleUserExists = await User.exists({
        email: normalizedEmail,
        authProvider: 'google'
      });

      return res.status(401).json({
        success: false,
        message: googleUserExists ? 'Email này đăng ký bằng Google. Vui lòng đăng nhập Google.' : 'Invalid email or password'
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

    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: sanitizeUser(user)
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
    const { idToken } = req.body;

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

    let user = await User.findOne({
      email,
      authProvider: 'google'
    });

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
        avatarUrl: payload.picture || null
      });
    } else {
      if (user.status === 'locked') {
        return res.status(403).json({
          success: false,
          message: 'Account is locked'
        });
      }

      const updates = {};
      if (user.authProvider !== 'google') {
        updates.authProvider = 'google';
      }
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

    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        token,
        user: sanitizeUser(user)
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

const logout = async (req, res) => {
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
      data: sanitizeUser(user)
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
  logout,
  getCurrentUser
};
