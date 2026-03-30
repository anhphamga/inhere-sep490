const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const {
  authenticate,
  authorizeAnyPermission,
  authorizePermission,
} = require('../middleware/auth.middleware');

router.get(
  '/instances',
  authenticate,
  authorizeAnyPermission(['inventory.item.read']),
  productController.getProductInstances
);

router.get(
  '/instances/:id',
  authenticate,
  authorizeAnyPermission(['inventory.item.read']),
  productController.getProductInstanceById
);

router.post(
  '/instances',
  authenticate,
  authorizePermission('inventory.item.create'),
  productController.createProductInstance
);

router.put(
  '/instances/:id',
  authenticate,
  authorizeAnyPermission(['inventory.item.update', 'inventory.item.update_condition']),
  productController.updateProductInstance
);

router.delete(
  '/instances/:id',
  authenticate,
  authorizePermission('inventory.item.delete'),
  productController.deleteProductInstance
);

router.get('/:productId/available-instances', productController.getAvailableInstances);
router.get('/:id/similar', productController.getSimilarProducts);
router.get('/', productController.getProducts);
router.get('/top-rented', productController.getTopRentedProducts);
router.get('/top-liked', productController.getTopLikedProducts);
router.get('/top-sold', productController.getTopSoldProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
