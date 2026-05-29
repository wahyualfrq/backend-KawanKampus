const express = require('express');
const favoriteController = require('./favorite.controller');
const authenticate = require('../../common/middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, favoriteController.getFavorites.bind(favoriteController));
router.post('/', authenticate, favoriteController.addFavorite.bind(favoriteController));
router.delete('/:placeId', authenticate, favoriteController.removeFavorite.bind(favoriteController));

module.exports = router;
