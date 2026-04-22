const express = require('express');

const userController = require('../controllers/user.controller');
const productController = require('../controllers/product.controller');
const categoryController = require('../controllers/category.controller');
const staffController = require('../controllers/staff.controller');
const analyticsController = require('../controllers/analytics.controller');
const orderController = require('../controllers/order.controller');
const sizeGuideController = require('../controllers/sizeGuide.controller');
const { requireAuth, requireOwner, authorize } = require('../middleware/auth.middleware');
const { uploadExcel, uploadProductImages } = require('../middleware/upload.middleware');

const router = express.Router();
const handleOwnerProductImportUpload = (req, res, next) => {
  uploadExcel(req, res, (error) => {
    if (!error) return next();
    const isSizeError = String(error?.code || '') === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      message: isSizeError
        ? 'File import qua lon. Vui long su dung file nho hon 10MB.'
        : (error?.message || 'Upload file Excel/CSV that bai.'),
    });
  });
};

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
router.get('/products/:id/size-guide', requireAuth, requireOwner, sizeGuideController.getOwnerProductSizeGuide);
router.post('/products', requireAuth, requireOwner, uploadProductImages, productController.createOwnerProduct);
router.post('/products/import', requireAuth, requireOwner, handleOwnerProductImportUpload, productController.importOwnerProducts);
router.put('/products/:id', requireAuth, requireOwner, uploadProductImages, productController.updateOwnerProduct);
router.put('/products/:id/size-guide', requireAuth, requireOwner, sizeGuideController.upsertOwnerProductSizeGuide);
router.patch('/products/:id/collateral', requireAuth, requireOwner, productController.updateOwnerProductCollateral);
router.delete('/products/:id', requireAuth, requireOwner, productController.deleteOwnerProduct);
router.delete('/products/:id/size-guide', requireAuth, requireOwner, sizeGuideController.deleteOwnerProductSizeGuide);

router.get('/size-guides/global', requireAuth, requireOwner, sizeGuideController.getOwnerGlobalSizeGuide);
router.put('/size-guides/global', requireAuth, requireOwner, sizeGuideController.upsertOwnerGlobalSizeGuide);
router.delete('/size-guides/global', requireAuth, requireOwner, sizeGuideController.deleteOwnerGlobalSizeGuide);

router.get('/staff', requireAuth, requireOwner, staffController.listStaff);
router.get('/staff/:id', requireAuth, requireOwner, staffController.getStaffDetail);
router.post('/staff', requireAuth, requireOwner, staffController.createStaff);
router.patch('/staff/:id/status', requireAuth, requireOwner, staffController.updateStaffStatus);
router.patch('/staff/:id/role', requireAuth, requireOwner, staffController.updateStaffRole);
router.get('/staff/:id/permissions', requireAuth, requireOwner, staffController.getStaffPermissions);
router.patch('/staff/:id/permissions', requireAuth, requireOwner, staffController.updateStaffPermissions);

router.get('/orders', requireAuth, authorize('owner', 'staff'), orderController.getOwnerSaleOrders);
router.patch('/orders/:id/status', requireAuth, authorize('staff'), orderController.updateOwnerSaleOrderStatus);

router.get('/analytics/revenue', requireAuth, requireOwner, analyticsController.getRevenueAnalytics);
router.get('/analytics/rentals', requireAuth, requireOwner, analyticsController.getRentalStats);
router.get('/analytics/inventory', requireAuth, requireOwner, analyticsController.getInventoryStats);
router.get('/analytics/customers', requireAuth, requireOwner, analyticsController.getCustomerStats);
router.get('/analytics/top-products', requireAuth, requireOwner, analyticsController.getTopProducts);
router.get('/analytics/summary', requireAuth, requireOwner, analyticsController.getDashboardSummary);
router.get('/dashboard', requireAuth, requireOwner, analyticsController.getOwnerDashboard);
router.get('/top-products', requireAuth, requireOwner, analyticsController.getOwnerTopProducts);
router.get('/inventory-alerts', requireAuth, requireOwner, analyticsController.getInventoryAlerts);
router.get('/restock-suggestions', requireAuth, requireOwner, analyticsController.getRestockSuggestions);

module.exports = router;
