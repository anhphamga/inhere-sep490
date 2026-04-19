const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/checkout', authenticate, orderController.checkout);
router.post('/guest-checkout', orderController.guestCheckout);
router.get('/guest/:id', orderController.getGuestSaleOrderById);
router.get('/my', authenticate, orderController.getMySaleOrders);
router.get('/my/:id', authenticate, orderController.getMySaleOrderById);
router.put('/my/:id/cancel', authenticate, orderController.cancelMySaleOrder);

module.exports = router;
