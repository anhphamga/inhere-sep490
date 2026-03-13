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

module.exports = router;
