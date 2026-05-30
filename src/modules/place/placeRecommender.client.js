const axios = require('axios');
const config = require('../../common/config/env');

/**
 * Checks if the PLACE_RECOMMENDER_API_URL environment variable is configured safely.
 * Considers null, undefined, empty string, and whitespace-only string as "not configured".
 */
function isConfigured() {
  const url = config.placeRecommenderApiUrl;
  if (url === null || url === undefined) {
    return false;
  }
  if (typeof url !== 'string') {
    return false;
  }
  if (url.trim() === '') {
    return false;
  }
  return true;
}

/**
 * Connect to future Place Recommender API when PLACE_RECOMMENDER_API_URL is provided.
 * If not configured, returns an object indicating configured: false.
 */
async function fetchPlaceRecommendations(payload) {
  if (!isConfigured()) {
    return {
      configured: false,
      recommendations: []
    };
  }

  // TODO: Connect to the real place recommender service here when provided.
  // Example future implementation:
  // try {
  //   const response = await axios.post(`${config.placeRecommenderApiUrl}/recommend`, payload, {
  //     headers: { 'Content-Type': 'application/json' },
  //     timeout: 10000
  //   });
  //   return {
  //     configured: true,
  //     recommendations: response.data?.recommendations || response.data || []
  //   };
  // } catch (error) {
  //   console.error('[PlaceRecommenderClient Error]', error.message);
  //   throw error;
  // }

  return {
    configured: true,
    recommendations: []
  };
}

module.exports = {
  isConfigured,
  fetchPlaceRecommendations
};
