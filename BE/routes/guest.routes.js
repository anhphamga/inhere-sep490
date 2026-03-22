const express = require('express');
const guestController = require('../controllers/guest.controller');

const router = express.Router();

router.post('/send-phone-otp', guestController.sendPhoneOtp);
router.post('/verify-phone-otp', guestController.verifyPhoneOtp);
router.post('/send-email-code', guestController.sendEmailCode);
router.post('/verify-email-code', guestController.verifyEmailCode);

module.exports = router;
