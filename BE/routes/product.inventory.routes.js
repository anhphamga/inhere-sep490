const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');

const {
  authenticate,
  authorizeAnyPermission,
} = require('../middleware/auth.middleware');

/**
 * GET /api/products/:productId/inventory
 * Get detailed inventory for a product (same as instances but kept for backward compat)
 */
router.get(
  '/:productId/inventory',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  productController.getProductInstances
);

/**
 * GET /api/products/:productId/instances
 * Get all instances for a product
 * Query params: lifecycleStatus, conditionLevel, page, limit, search
 */
router.get(
  '/:productId/instances',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  productController.getProductInstances
);

/**
 * GET /api/products/instances/all
 * Get all instances across all products (no productId filter)
 */
router.get(
  '/instances/all',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  productController.getProductInstances
);

module.exports = router;
