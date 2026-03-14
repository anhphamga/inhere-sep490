const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/checkout', authenticate, orderController.checkout);
router.post('/guest-checkout', orderController.guestCheckout);

module.exports = router;
