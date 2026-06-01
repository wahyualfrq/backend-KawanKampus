const axios = require('axios');
const config = require('../../common/config/env');

const CAMPUS_CENTERS = {
  'universitas gadjah mada': { lat: -7.7733153, lon: 110.3892489 },
  'universitas airlangga - b': { lat: -7.2729075, lon: 112.7560403 },
  'universitas bina nusantara @anggrek': { lat: -6.1950023, lon: 106.7764187 },
  'universitas institut teknologi bandung - ganesha': { lat: -6.8950712, lon: 107.6099105 },
  'universitas brawijaya': { lat: -7.9508146, lon: 112.6132311 },
  'stmik ikmi cirebon': { lat: -6.7357684, lon: 108.53979385 },
  'universitas multi data palembang': { lat: -2.9737715, lon: 104.75612 },
  'universitas indonesia': { lat: -6.3689479, lon: 106.8300839 },
  'universitas pendidikan indonesia bandung': { lat: -6.8817098, lon: 107.5954963 },
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function getKategoriJarak(campusName, lat, lon) {
  if (!campusName || lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return 'Perlu Motor';
  }
  const key = campusName.toLowerCase().trim();
  const center = CAMPUS_CENTERS[key];
  if (!center) {
    return 'Perlu Motor';
  }
  const dist = getDistance(lat, lon, center.lat, center.lon);
  return dist <= 1.0 ? 'Jalan Kaki' : 'Perlu Motor';
}

function getKategori(selectedCat) {
  if (!selectedCat) return 'Cetak';
  const catLower = selectedCat.toLowerCase().trim();
  if (catLower.includes('makan') || catLower === 'makanan') {
    return 'Makanan';
  }
  if (catLower.includes('minum') || catLower === 'minuman' || catLower.includes('cafe') || catLower.includes('kopi')) {
    return 'Minuman';
  }
  if (catLower.includes('cetak') || catLower.includes('print') || catLower.includes('fotokopi') || catLower.includes('atk')) {
    return 'Cetak';
  }
  return selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1).toLowerCase();
}

function formatCampusName(campusName) {
  if (!campusName) return '';
  const lower = campusName.toLowerCase().trim();
  if (lower.includes('multi data palembang')) {
    return 'Universitas Multi Data Palembang';
  }
  if (lower.includes('gadjah mada')) {
    return 'Universitas Gadjah Mada';
  }
  if (lower.includes('airlangga')) {
    return 'Universitas Airlangga - B';
  }
  if (lower.includes('bina nusantara')) {
    return 'Universitas Bina Nusantara @Anggrek';
  }
  if (lower.includes('itb') || lower.includes('institut teknologi bandung')) {
    return 'Universitas Institut Teknologi Bandung - Ganesha';
  }
  if (lower.includes('brawijaya')) {
    return 'Universitas Brawijaya';
  }
  if (lower.includes('ikmi cirebon')) {
    return 'STMIK IKMI CIREBON';
  }
  if (lower.includes('universitas indonesia')) {
    return 'Universitas Indonesia';
  }
  if (lower.includes('pendidikan indonesia bandung')) {
    return 'Universitas Pendidikan Indonesia Bandung';
  }
  return campusName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

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

  try {
    const apiPayload = {
      kampus: formatCampusName(payload.selected_uni),
      kategori: getKategori(payload.selected_cat),
      kategori_jarak: getKategoriJarak(payload.selected_uni, payload.lat, payload.lon),
      top_n: 10
    };

    console.log('[PlaceRecommenderClient] Calling external API:', `${config.placeRecommenderApiUrl}/recommend`, apiPayload);

    const response = await axios.post(`${config.placeRecommenderApiUrl}/recommend`, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    return {
      configured: true,
      recommendations: response.data || []
    };
  } catch (error) {
    console.error('[PlaceRecommenderClient Error]', error.message);
    throw error;
  }
}

module.exports = {
  isConfigured,
  fetchPlaceRecommendations
};
