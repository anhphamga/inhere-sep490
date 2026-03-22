const express = require('express');
const voucherController = require('../controllers/voucher.controller');
const User = require('../model/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { extractBearerToken, verifyAccessToken } = require('../utils/jwt');

const router = express.Router();

const attachOptionalUser = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('_id role email status').lean();

    if (user && user.status !== 'locked') {
      req.user = {
        id: String(user._id),
        role: user.role,
        email: user.email,
      };
    }
  } catch (error) {
    console.warn('Optional voucher auth skipped:', error.message);
  }

  return next();
};

router.post('/validate', attachOptionalUser, voucherController.validateVoucher);

router.post('/', authenticate, authorize('Owner'), voucherController.createVoucher);
router.get('/my', authenticate, voucherController.listMyVouchers);
router.get('/', authenticate, authorize('Owner'), voucherController.listVouchers);
router.get('/:id', authenticate, authorize('Owner'), voucherController.getVoucherDetail);
router.put('/:id', authenticate, authorize('Owner'), voucherController.updateVoucher);
router.patch('/:id/toggle-status', authenticate, authorize('Owner'), voucherController.toggleVoucherStatus);

module.exports = router;
