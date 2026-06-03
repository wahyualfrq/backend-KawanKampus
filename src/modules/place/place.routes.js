const express = require('express');
const placeController = require('./place.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { getNearbyPlacesSchema, recommendPlacesSchema } = require('../../common/validators/place.validator');

const router = express.Router();

router.get('/config', placeController.getConfig.bind(placeController));

router.use(authenticate);

router.get('/nearby', validate(getNearbyPlacesSchema), placeController.getNearbyPlaces.bind(placeController));

router.post('/recommend', validate(recommendPlacesSchema), placeController.getRecommendations.bind(placeController));

module.exports = router;
