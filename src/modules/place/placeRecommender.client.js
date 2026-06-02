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
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatCampusName(campusName) {
  if (!campusName) return '';

  const lower = String(campusName).toLowerCase().trim();

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

  return String(campusName)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getKategori(selectedCat) {
  if (!selectedCat) return 'Cetak';

  const catLower = String(selectedCat).toLowerCase().trim();

  if (
    catLower.includes('makan') ||
    catLower.includes('restoran') ||
    catLower.includes('restaurant') ||
    catLower.includes('warteg') ||
    catLower.includes('pizza')
  ) {
    return 'Makanan';
  }

  if (
    catLower.includes('minum') ||
    catLower.includes('cafe') ||
    catLower.includes('kafe') ||
    catLower.includes('kedai') ||
    catLower.includes('kopi')
  ) {
    return 'Minuman';
  }

  if (
    catLower.includes('cetak') ||
    catLower.includes('print') ||
    catLower.includes('fotokopi') ||
    catLower.includes('fotocopy') ||
    catLower.includes('atk')
  ) {
    return 'Cetak';
  }

  return String(selectedCat).charAt(0).toUpperCase() + String(selectedCat).slice(1).toLowerCase();
}

function getKategoriJarak(campusName, lat, lon) {
  if (!campusName || lat == null || lon == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
    return 'Perlu Motor';
  }

  const key = String(campusName).toLowerCase().trim();
  const center = CAMPUS_CENTERS[key];

  if (!center) {
    return 'Perlu Motor';
  }

  const distanceKm = getDistance(Number(lat), Number(lon), center.lat, center.lon);

  return distanceKm <= 1.0 ? 'Jalan Kaki' : 'Perlu Motor';
}

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

function extractRecommendations(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== 'object') {
    return [];
  }

  if (Array.isArray(raw.value)) {
    return raw.value;
  }

  if (Array.isArray(raw.recommendations)) {
    return raw.recommendations;
  }

  if (Array.isArray(raw.results)) {
    return raw.results;
  }

  if (Array.isArray(raw.data)) {
    return raw.data;
  }

  if (raw.data && Array.isArray(raw.data.recommendations)) {
    return raw.data.recommendations;
  }

  if (raw.data && Array.isArray(raw.data.results)) {
    return raw.data.results;
  }

  return [];
}

function buildRecommendationPayload(payload = {}) {
  const selectedCampus = payload.selected_uni || payload.kampus || payload.campus || '';
  const selectedCategory = payload.selected_cat || payload.kategori || payload.category || 'Cetak';

  const latitude = payload.latitude ?? payload.lat;
  const longitude = payload.longitude ?? payload.lon ?? payload.lng;

  return {
    kampus: formatCampusName(selectedCampus),
    kategori: getKategori(selectedCategory),
    kategori_jarak:
      payload.kategori_jarak ||
      payload.kategoriJarak ||
      getKategoriJarak(selectedCampus, latitude, longitude),
    latitude: Number(latitude),
    longitude: Number(longitude),
    top_n: payload.top_n || payload.topN || 15,
  };
}

function buildServiceError(error) {
  if (error.response && error.response.data) {
    const detail = error.response.data.detail;
    let message = '';

    if (Array.isArray(detail)) {
      message = detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(', ');
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (error.response.data.message) {
      message = error.response.data.message;
    } else if (error.response.data.error) {
      message = error.response.data.error;
    }

    const serviceError = new Error(message || 'Layanan rekomendasi menolak permintaan.');
    serviceError.statusCode = error.response.status;
    return serviceError;
  }

  return error;
}

async function fetchPlaceRecommendations(payload) {
  if (!isConfigured()) {
    return {
      configured: false,
      recommendations: [],
    };
  }

  const apiPayload = buildRecommendationPayload(payload);
  const url = `${config.recommendationApiUrl.replace(/\/$/, '')}/recommend`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PlaceRecommenderClient] URL:', url);
      console.log('[PlaceRecommenderClient] FINAL PAYLOAD TO /recommend:', JSON.stringify(apiPayload, null, 2));
    }

    const response = await axios.post(url, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[PlaceRecommenderClient] RAW RESPONSE:', JSON.stringify(response.data, null, 2));
    }

    return {
      configured: true,
      recommendations: extractRecommendations(response.data),
      raw: response.data,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[PlaceRecommenderClient Error]', error.message);
    }

    throw buildServiceError(error);
  }
}

module.exports = {
  isConfigured,
  fetchPlaceRecommendations,
};