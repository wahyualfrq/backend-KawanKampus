const placeService = require('./place.service');

class PlaceController {
  async getConfig(req, res, next) {
    try {
      const cfg = await placeService.getConfig();
      res.status(200).json({
        success: true,
        data: cfg,
        source: cfg.source || 'fallback',
        message: 'Config retrieved from local fallback config',
      });
    } catch (error) {
      next(error);
    }
  }

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

  async getRecommendations(req, res, next) {
    try {
      const { selected_uni, selected_cat, lat, lon, session_id, actual_category, searchQuery } = req.body;
      const userId = req.user.userId;

      const recommendations = await placeService.getRecommendations(userId, {
        selected_uni,
        selected_cat,
        lat,
        lon,
        session_id,
        actual_category,
        searchQuery,
      });

      if (recommendations && recommendations.success === false) {
        return res.status(200).json(recommendations);
      }

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
