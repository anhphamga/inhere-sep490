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
const shiftController = require('../controllers/shift.controller');
const { requireAuth, authorize } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

// CRUD profile cá nhân
router.get('/me', requireAuth, userController.getMyProfile);
router.put('/me', requireAuth, userController.updateMyProfile);
router.delete('/me', requireAuth, userController.deleteMyProfile);

// Đổi mật khẩu
router.put('/me/change-password', requireAuth, userController.changePassword);

// Upload avatar
router.put('/me/avatar', requireAuth, uploadAvatar, userController.uploadMyAvatar);

// Staff register shifts
router.get('/me/shifts', requireAuth, authorize('staff'), shiftController.listStaffShiftOptions);
router.post('/me/shifts/:id/register', requireAuth, authorize('staff'), shiftController.registerMyShift);
router.delete('/me/shifts/:id/register', requireAuth, authorize('staff'), shiftController.unregisterMyShift);

module.exports = router;
