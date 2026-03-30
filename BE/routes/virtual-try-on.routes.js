const express = require('express');
const router = express.Router();

const virtualTryOnController = require('../controllers/virtual-try-on.controller');

/**
 * Virtual Try-On Routes
 * Handles proxy requests to API4.ai Virtual Try-On API
 */

// POST /api/virtual-try-on/generate
// Proxy request to API4.ai virtual try-on
router.post('/generate', virtualTryOnController.generateTryOn);

// GET /api/virtual-try-on/proxy-image?url=<encoded-url>
// Proxy external images to avoid browser CORS issues
router.get('/proxy-image', virtualTryOnController.proxyImage);

module.exports = router;
