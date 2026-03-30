const express = require('express');
const favoriteController = require('../controllers/favorite.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/toggle', requireAuth, favoriteController.toggleFavorite);
router.get('/my', requireAuth, favoriteController.getMyFavorites);
router.get('/check/:productId', requireAuth, favoriteController.checkFavorite);

module.exports = router;
