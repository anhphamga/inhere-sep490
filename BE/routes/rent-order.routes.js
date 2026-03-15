const express = require('express');
const router = express.Router();
const rentOrderController = require('../controllers/rent-order.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Staff/Owner routes - PHẢI ĐỂ TRƯỚC /:id
router.get('/all', authenticate, authorize('Staff', 'Owner'), rentOrderController.getAllRentOrders);

// Customer routes - cần đăng nhập
router.post('/', authenticate, rentOrderController.createRentOrder);
router.get('/my', authenticate, rentOrderController.getMyRentOrders);

// Các route có :id phải để SAU /all
router.get('/:id', authenticate, rentOrderController.getRentOrderById);
router.post('/:id/deposit', authenticate, rentOrderController.payDeposit);
router.put('/:id/cancel', authenticate, rentOrderController.cancelRentOrder);
router.put('/:id/confirm', authenticate, authorize('Staff', 'Owner'), rentOrderController.confirmRentOrder);
router.put('/:id/pickup', authenticate, authorize('Staff', 'Owner'), rentOrderController.confirmPickup);
router.put('/:id/waiting-return', authenticate, authorize('Staff', 'Owner'), rentOrderController.markWaitingReturn);
router.put('/:id/return', authenticate, authorize('Staff', 'Owner'), rentOrderController.confirmReturn);
router.put('/:id/no-show', authenticate, authorize('Staff', 'Owner'), rentOrderController.markNoShow);
router.put('/:id/finalize', authenticate, rentOrderController.finalizeRentOrder);
router.put('/:id/complete', authenticate, authorize('Staff', 'Owner'), rentOrderController.completeRentOrder);
router.put('/:id/complete-washing', authenticate, authorize('Staff', 'Owner'), rentOrderController.completeWashing);

module.exports = router;
