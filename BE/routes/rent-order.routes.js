const express = require('express');
const router = express.Router();
const rentOrderController = require('../controllers/rent-order.controller');
const {
  authenticate,
  authorizePermission,
  authorizeRoleLevel,
  authorizeWithCondition,
} = require('../middleware/auth.middleware');
const { createFieldAccessMiddleware } = require('../middleware/fieldAccess.middleware');
const { loadRentOrderAccessContext } = require('../middleware/rentOrderAccess.middleware');

const orderFieldFilter = createFieldAccessMiddleware([
  {
    permission: 'customers.contact.read_full',
    path: 'data.customerId.phone',
    type: 'mask',
    mask: (value) => {
      const phone = String(value || '');
      if (phone.length <= 4) return phone;
      return `${phone.slice(0, 2)}***${phone.slice(-2)}`;
    },
  },
  {
    permission: 'analytics.revenue.read',
    path: 'data.totalRevenue',
  },
]);

const canOperateAssignedOrder = (req, user) => {
  const role = String(user?.role || '').toLowerCase();
  if (['owner', 'manager'].includes(role)) {
    return true;
  }

  if (!req.accessContext?.activeShift || !req.order) {
    return false;
  }

  return !req.order.staffId || String(req.order.staffId) === String(user.id);
};

router.get(
  '/all',
  authenticate,
  authorizePermission('orders_rent.order.list'),
  orderFieldFilter,
  rentOrderController.getAllRentOrders
);

router.post('/', authenticate, rentOrderController.createRentOrder);
router.get('/my', authenticate, rentOrderController.getMyRentOrders);

router.get('/:id', authenticate, orderFieldFilter, rentOrderController.getRentOrderById);
router.post('/:id/deposit', authenticate, rentOrderController.payDeposit);
router.put('/:id/cancel', authenticate, rentOrderController.cancelRentOrder);

router.put(
  '/:id/confirm',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.order.confirm', canOperateAssignedOrder),
  rentOrderController.confirmRentOrder
);

router.put(
  '/:id/pickup',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.pickup.complete', canOperateAssignedOrder),
  rentOrderController.confirmPickup
);

router.put(
  '/:id/waiting-return',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.return.process', canOperateAssignedOrder),
  rentOrderController.markWaitingReturn
);

router.put(
  '/:id/return',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition(
    'orders_rent.return.process',
    (req, user) => canOperateAssignedOrder(req, user) && req.order?.status === 'Renting'
  ),
  rentOrderController.confirmReturn
);

router.put(
  '/:id/no-show',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.no_show.mark', canOperateAssignedOrder),
  rentOrderController.markNoShow
);

router.put(
  '/:id/finalize',
  authenticate,
  loadRentOrderAccessContext,
  authorizeRoleLevel('manager'),
  authorizePermission('orders_rent.order.finalize'),
  rentOrderController.finalizeRentOrder
);

router.put(
  '/:id/complete',
  authenticate,
  loadRentOrderAccessContext,
  authorizePermission('orders_rent.return.finalize'),
  rentOrderController.completeRentOrder
);

router.put(
  '/:id/complete-washing',
  authenticate,
  loadRentOrderAccessContext,
  authorizePermission('orders_rent.washing.complete'),
  rentOrderController.completeWashing
);

module.exports = router;
