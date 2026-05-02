const placeService = require('./place.service');

class PlaceController {
  async getNearbyPlaces(req, res, next) {
    try {
      const { lat, lng, category } = req.query;
      const places = await placeService.getNearbyPlaces(lat, lng, category);
      res.status(200).json({
        success: true,
        data: places,
        message: 'Successfully fetched nearby places'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlaceController();
