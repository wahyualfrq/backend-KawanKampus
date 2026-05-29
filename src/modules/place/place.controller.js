const placeService = require('./place.service');

class PlaceController {
  /**
   * GET /api/v1/places/config  (PUBLIC — no auth required)
   * Returns campus list + category mapping from Flask AI or fallback.
   */
  async getConfig(req, res, next) {
    try {
      const cfg = await placeService.getConfig();
      res.status(200).json({
        success: true,
        data: cfg,
        source: cfg.source,
        message: cfg.source && cfg.source.startsWith('flask')
          ? 'Config retrieved from Flask AI'
          : 'Config retrieved from fallback (Flask unavailable)',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/places/nearby?lat=&lng=&category=
   */
  async getNearbyPlaces(req, res, next) {
    try {
      const { lat, lng, category } = req.query;
      const places = await placeService.getNearbyPlaces(lat, lng, category);
      res.status(200).json({
        success: true,
        data: places,
        message: 'Successfully fetched nearby places',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/places/recommend
   * Body: { selected_uni, selected_cat, lat, lon, session_id? }
   */
  async getRecommendations(req, res, next) {
    try {
      const { selected_uni, selected_cat, lat, lon, session_id } = req.body;
      const userId = req.user.userId;

      const recommendations = await placeService.getRecommendations(userId, {
        selected_uni,
        selected_cat,
        lat,
        lon,
        session_id,
      });

      res.status(200).json({
        success: true,
        data: recommendations,
        message: 'Place recommendations retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlaceController();
