const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// ============================================
// PRODUCT INSTANCE ROUTES (Quản lý tồn kho) - PHẢI ĐẶT TRƯỚC /:id
// ============================================

// GET /api/products/instances - Danh sách tất cả instances (có filter)
router.get('/instances', authenticate, authorize('Staff', 'Owner'), productController.getProductInstances);

// GET /api/products/instances/:id - Chi tiết một instance
router.get('/instances/:id', authenticate, authorize('Staff', 'Owner'), productController.getProductInstanceById);

// POST /api/products/instances - Tạo mới instance
router.post('/instances', authenticate, authorize('Staff', 'Owner'), productController.createProductInstance);

// PUT /api/products/instances/:id - Cập nhật instance (giá, trạng thái, tình trạng)
router.put('/instances/:id', authenticate, authorize('Staff', 'Owner'), productController.updateProductInstance);

// DELETE /api/products/instances/:id - Xóa instance
router.delete('/instances/:id', authenticate, authorize('Staff', 'Owner'), productController.deleteProductInstance);

// GET /api/products/:productId/available-instances - Danh sách instance còn available (cho customer)
router.get('/:productId/available-instances', productController.getAvailableInstances);

// ============================================
// END PRODUCT INSTANCE ROUTES
// ============================================

// GET /api/products?purpose=buy|fitting&limit=8
router.get('/', productController.getProducts);

// GET /api/products/top-rented?limit=4
router.get('/top-rented', productController.getTopRentedProducts);

// GET /api/products/top-liked?limit=8
router.get('/top-liked', productController.getTopLikedProducts);

// GET /api/products/top-sold?limit=8
router.get('/top-sold', productController.getTopSoldProducts);

// GET /api/products/:id - PHẢI ĐẶT SAU CÙNG
router.get('/:id', productController.getProductById);

// POST /api/products
router.post('/', productController.createProduct);

// PUT /api/products/:id
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

module.exports = router;
