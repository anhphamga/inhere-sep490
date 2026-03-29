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
  if (['owner', 'staff'].includes(role)) {
    return true;
  }

  return false;
};

router.get(
  '/all',
  authenticate,
  authorizePermission('orders_rent.order.list'),
  orderFieldFilter,
  rentOrderController.getAllRentOrders
);

// Tìm khách hàng theo SĐT / tên / email (dành cho staff tạo đơn tại chỗ)
router.get(
  '/customers/search',
  authenticate,
  authorizeWithCondition('orders_rent.order.list', canOperateAssignedOrder),
  rentOrderController.searchCustomers
);

// Tạo hồ sơ khách nhanh cho khách walk-in chưa có tài khoản
router.post(
  '/customers/guest',
  authenticate,
  authorizeWithCondition('orders_rent.order.confirm', canOperateAssignedOrder),
  rentOrderController.createGuestCustomer
);

// Tạo đơn thuê tại chỗ (staff tạo thay cho khách walk-in, thu cọc trực tiếp)
router.post(
  '/walk-in',
  authenticate,
  authorizeWithCondition('orders_rent.order.confirm', canOperateAssignedOrder),
  rentOrderController.createWalkInOrder
);

router.post('/', authenticate, rentOrderController.createRentOrder);
router.get('/my', authenticate, rentOrderController.getMyRentOrders);

router.get('/:id', authenticate, orderFieldFilter, rentOrderController.getRentOrderById);
router.post('/:id/deposit', authenticate, rentOrderController.payDeposit);
router.put('/:id/cancel', authenticate, rentOrderController.cancelRentOrder);

router.put(
  '/:id/collect-deposit',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.order.confirm', canOperateAssignedOrder),
  rentOrderController.staffCollectDeposit
);

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
  '/:id/waiting-pickup',
  authenticate,
  loadRentOrderAccessContext,
  authorizeWithCondition('orders_rent.order.confirm', canOperateAssignedOrder),
  rentOrderController.markWaitingPickup
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
    (req, user) => {
      if (!canOperateAssignedOrder(req, user)) return false;
      if (!['Renting', 'WaitingReturn', 'Late'].includes(req.order?.status)) {
        throw new Error(`Không thể xử lý trả đồ khi đơn ở trạng thái "${req.order?.status}"`);
      }
      return true;
    }
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
  authorizeWithCondition('orders_rent.order.finalize', canOperateAssignedOrder),
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
