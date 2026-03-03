const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimit');
const { translateService } = require('../services/translateService');

const router = express.Router();

const translateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
});

router.use(translateLimiter);

router.post('/', async (req, res) => {
  try {
    const { text, source = 'vi', target = 'en', contextKey = '' } = req.body || {};
    const result = await translateService.translateText({ text, source, target, contextKey });
    return res.status(200).json({
      translatedText: result.translatedText,
      ...(result.fallback ? { fallback: true } : {}),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const items = req.body?.items;
    const result = await translateService.translateBatch(items);
    return res.status(200).json({
      translations: result.translations,
      ...(Object.keys(result.fallback || {}).length > 0 ? { fallback: result.fallback } : {}),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
