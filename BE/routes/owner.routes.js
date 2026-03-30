const express = require('express');

const userController = require('../controllers/user.controller');
const productController = require('../controllers/product.controller');
const categoryController = require('../controllers/category.controller');
const staffController = require('../controllers/staff.controller');
const shiftController = require('../controllers/shift.controller');
const analyticsController = require('../controllers/analytics.controller');
const orderController = require('../controllers/order.controller');
const { requireAuth, requireOwner, authorize } = require('../middleware/auth.middleware');
const { uploadExcel, uploadProductImages } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/customers', requireAuth, requireOwner, userController.listCustomers);
router.get('/customers/:id', requireAuth, requireOwner, userController.getCustomerDetail);
router.patch('/customers/:id/status', requireAuth, requireOwner, userController.updateCustomerStatus);

router.get('/categories', requireAuth, requireOwner, categoryController.listOwnerCategories);
router.post('/categories', requireAuth, requireOwner, categoryController.createCategory);
router.put('/categories/:id', requireAuth, requireOwner, categoryController.updateCategory);
router.delete('/categories/:id', requireAuth, requireOwner, categoryController.deleteCategory);

router.get('/products', requireAuth, requireOwner, productController.listOwnerProducts);
router.get('/products/export', requireAuth, requireOwner, productController.exportOwnerProducts);
router.get('/products/:id', requireAuth, requireOwner, productController.getOwnerProductDetail);
router.post('/products', requireAuth, requireOwner, uploadProductImages, productController.createOwnerProduct);
router.post('/products/import', requireAuth, requireOwner, uploadExcel, productController.importOwnerProducts);
router.put('/products/:id', requireAuth, requireOwner, uploadProductImages, productController.updateOwnerProduct);
router.patch('/products/:id/collateral', requireAuth, requireOwner, productController.updateOwnerProductCollateral);
router.delete('/products/:id', requireAuth, requireOwner, productController.deleteOwnerProduct);

router.get('/staff', requireAuth, requireOwner, staffController.listStaff);
router.get('/staff/:id', requireAuth, requireOwner, staffController.getStaffDetail);
router.post('/staff', requireAuth, requireOwner, staffController.createStaff);
router.patch('/staff/:id/status', requireAuth, requireOwner, staffController.updateStaffStatus);

router.get('/shifts', requireAuth, requireOwner, shiftController.listShifts);
router.post('/shifts', requireAuth, requireOwner, shiftController.createShift);
router.put('/shifts/:id', requireAuth, requireOwner, shiftController.updateShift);
router.delete('/shifts/:id', requireAuth, requireOwner, shiftController.deleteShift);

router.get('/orders', requireAuth, authorize('owner', 'staff'), orderController.getOwnerSaleOrders);
router.patch('/orders/:id/status', requireAuth, authorize('staff'), orderController.updateOwnerSaleOrderStatus);

router.get('/analytics/revenue', requireAuth, requireOwner, analyticsController.getRevenueAnalytics);
router.get('/analytics/rentals', requireAuth, requireOwner, analyticsController.getRentalStats);
router.get('/analytics/inventory', requireAuth, requireOwner, analyticsController.getInventoryStats);
router.get('/analytics/customers', requireAuth, requireOwner, analyticsController.getCustomerStats);
router.get('/analytics/top-products', requireAuth, requireOwner, analyticsController.getTopProducts);
router.get('/analytics/summary', requireAuth, requireOwner, analyticsController.getDashboardSummary);

module.exports = router;
