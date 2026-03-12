const express = require('express');

const { getRequestLang, resolveLocalizedField } = require('../utils/i18n');

const router = express.Router();
const Banner = require('../model/Banner.model');

router.get('/', async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const rows = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();

    const data = rows.map((item) => ({
      ...item,
      title: resolveLocalizedField(item, 'title', lang),
      subtitle: resolveLocalizedField(item, 'subtitle', lang),
      imageUrl: String(item.imageUrl || item.imagePath || '').trim(),
    }));

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
