const axios = require('axios');
const config = require('../../common/config/env');

/**
 * Checks if the PLACE_RECOMMENDER_API_URL environment variable is configured safely.
 * Considers null, undefined, empty string, and whitespace-only string as "not configured".
 */
function isConfigured() {
  const url = config.recommendationApiUrl;
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
 * Connect to Place Recommender API when RECOMMENDATION_API_URL is provided.
 * If not configured, returns an object indicating configured: false.
 */
async function fetchPlaceRecommendations(payload) {
  if (!isConfigured()) {
    return {
      configured: false,
      recommendations: []
    };
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("FINAL PAYLOAD TO /recommend:", JSON.stringify(payload, null, 2));
    }

    const response = await axios.post(`${config.recommendationApiUrl}/recommend`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    if (process.env.NODE_ENV === "development") {
      console.log("RAW RECOMMENDATION SERVICE RESPONSE:", JSON.stringify(response.data, null, 2));
    }

    // Service returns { value: [...], Count: N } — normalise to plain array
    const raw = response.data;
    let recommendations = [];
    if (Array.isArray(raw)) {
      recommendations = raw;
    } else if (raw && Array.isArray(raw.value)) {
      recommendations = raw.value;
    } else if (raw && Array.isArray(raw.recommendations)) {
      recommendations = raw.recommendations;
    } else if (raw && Array.isArray(raw.results)) {
      recommendations = raw.results;
    } else if (raw && Array.isArray(raw.data)) {
      recommendations = raw.data;
    }

    return {
      configured: true,
      recommendations
    };
  } catch (error) {
    if (error.response && error.response.data) {
      const detail = error.response.data.detail;
      let msg = '';
      if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg).join(', ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (error.response.data.message) {
        msg = error.response.data.message;
      }
      const err = new Error(msg || 'Layanan rekomendasi menolak permintaan.');
      err.statusCode = error.response.status;
      throw err;
    }
    throw error;
  }
}

module.exports = {
  isConfigured,
  fetchPlaceRecommendations
};
