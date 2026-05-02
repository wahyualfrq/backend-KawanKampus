const axios = require('axios');
const config = require('../../common/config/env');

class PlaceService {
  async getNearbyPlaces(lat, lng, category) {
    if (!config.googleMapsApiKey) {
      throw new Error('Google Maps API Key is not configured');
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${lat},${lng}`,
          radius: 1000,
          keyword: category,
          key: config.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const results = response.data.results.map(place => ({
        name: place.name,
        rating: place.rating || 0,
        address: place.vicinity || '',
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        open_now: place.opening_hours ? place.opening_hours.open_now : null
      }));

      return results;
    } catch (error) {
      console.error('[PlaceService Error]', error.message);
      const err = new Error('Failed to fetch nearby places');
      err.statusCode = 502; // Bad Gateway
      throw err;
    }
  }
}

module.exports = new PlaceService();
