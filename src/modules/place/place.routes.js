const express = require('express');
const placeController = require('./place.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { getNearbyPlacesSchema, recommendPlacesSchema } = require('../../common/validators/place.validator');

const router = express.Router();

// ── Public route (no auth) ────────────────────────────────────────────────
// GET /api/v1/places/config
router.get('/config', placeController.getConfig.bind(placeController));

// ── Protected routes ──────────────────────────────────────────────────────
router.use(authenticate);

// GET /api/v1/places/nearby
router.get('/nearby', validate(getNearbyPlacesSchema), placeController.getNearbyPlaces.bind(placeController));

// POST /api/v1/places/recommend
router.post('/recommend', validate(recommendPlacesSchema), placeController.getRecommendations.bind(placeController));

module.exports = router;
