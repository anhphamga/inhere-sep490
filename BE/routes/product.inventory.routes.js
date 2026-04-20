const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');

const {
  authenticate,
  authorizeAnyPermission,
} = require('../middleware/auth.middleware');

const getProductInventoryDetails = async (req, res) => {
  req.query = { ...req.query, productId: req.params.productId };
  return productController.getProductInstances(req, res);
};

const getProductInstances = async (req, res) => {
  req.query = { ...req.query, productId: req.params.productId };
  return productController.getProductInstances(req, res);
};

const getAllInstances = async (req, res) => {
  return productController.getProductInstances(req, res);
};

/**
 * GET /api/products/:productId/inventory
 * Get detailed inventory for a product
 * Returns instances, statistics, and summary
 */
router.get(
  '/:productId/inventory',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  getProductInventoryDetails
);

/**
 * GET /api/products/:productId/instances
 * Get all instances for a product with optional filters
 * Query params: size (string), status (Available|Rented|Washing|Reserved|Repair|Lost|Sold)
 */
router.get(
  '/:productId/instances',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  getProductInstances
);

/**
 * GET /api/products/instances/all
 * Get all instances across all products with optional filters
 * Query params: size (string), status (Available|Rented|Washing|Reserved|Repair|Lost|Sold)
 */
router.get(
  '/instances/all',
  authenticate,
  authorizeAnyPermission(['inventory.read', 'inventory.item.read']),
  getAllInstances
);

module.exports = router;
