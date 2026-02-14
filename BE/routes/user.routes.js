/**
 * USER ROUTES - Định nghĩa các endpoints cho User
 * 
 * Routes CHỈ định tuyến, KHÔNG chứa logic
 * Logic xử lý nằm trong controller
 */

const express = require('express');
const router = express.Router();

// Import controller
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

// CRUD profile cá nhân
router.get('/me', requireAuth, userController.getMyProfile);
router.put('/me', requireAuth, userController.updateMyProfile);
router.delete('/me', requireAuth, userController.deleteMyProfile);

// Đổi mật khẩu
router.put('/me/change-password', requireAuth, userController.changePassword);

// Upload avatar
router.put('/me/avatar', requireAuth, uploadAvatar, userController.uploadMyAvatar);

module.exports = router;
