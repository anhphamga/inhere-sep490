const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');

// GET /api/products?purpose=buy|fitting&limit=8
router.get('/', productController.getProducts);

// GET /api/products/top-rented?limit=4
router.get('/top-rented', productController.getTopRentedProducts);

// GET /api/products/top-liked?limit=8
router.get('/top-liked', productController.getTopLikedProducts);

// GET /api/products/top-sold?limit=8
router.get('/top-sold', productController.getTopSoldProducts);

// GET /api/products/:id
router.get('/:id', productController.getProductById);

// POST /api/products
router.post('/', productController.createProduct);

// PUT /api/products/:id
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

module.exports = router;
