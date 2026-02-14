const bcrypt = require('bcryptjs');
const User = require('../model/User.model');
const { signAccessToken } = require('../utils/jwt');

const sanitizeUser = (user) => ({
  id: user._id,
  role: user.role,
  name: user.name,
  phone: user.phone,
  email: user.email,
  status: user.status,
  avatarUrl: user.avatarUrl,
  address: user.address,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, phone, email, password are required'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'Phone already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: 'customer',
      name,
      phone,
      email,
      passwordHash,
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

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
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
  logout,
  getCurrentUser
};
