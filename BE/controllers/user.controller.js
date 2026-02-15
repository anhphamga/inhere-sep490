/**
 * USER CONTROLLER - Xử lý logic nghiệp vụ cho User
 * 
 * Controller chứa LOGIC, routes chỉ ĐỊNH TUYẾN
 * Template này dùng để copy cho các model khác
 */

const bcrypt = require('bcryptjs');
const User = require('../model/User.model');
const { hasCloudinaryConfig, uploadImageBuffer } = require('../utils/cloudinary');

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

const getMyProfile = async (req, res) => {
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
      message: 'Get profile successfully',
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

const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'email', 'avatarUrl', 'address', 'gender', 'dateOfBirth'];
    const payload = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields to update'
      });
    }

    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (payload.email) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      payload.email = normalizedEmail;

      const emailConflict = await User.findOne({
        _id: { $ne: req.user.id },
        email: normalizedEmail,
        authProvider: currentUser.authProvider
      });

      if (emailConflict) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, payload, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: 'Update profile successfully',
      data: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

const deleteMyProfile = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Delete profile successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting profile',
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'newPassword must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Change password successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

const uploadMyAvatar = async (req, res) => {
  try {
    if (!hasCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Avatar file is required'
      });
    }

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: 'inhere/avatars',
      public_id: `user_${req.user.id}_${Date.now()}`,
      resource_type: 'image'
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl: result.secure_url },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Upload avatar successfully',
      data: sanitizeUser(updatedUser)
    });
  } catch (error) {
    const uploadErrorMessage = error?.error?.message || error?.message || 'Upload failed';

    return res.status(500).json({
      success: false,
      message: uploadErrorMessage,
      error: uploadErrorMessage
    });
  }
};

// Export function
module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  changePassword,
  uploadMyAvatar
};
