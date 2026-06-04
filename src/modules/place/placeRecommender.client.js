const axios = require('axios');
const config = require('../../common/config/env');

// ── Campus coordinates (used for kategori_jarak calculation only) ────────────
const CAMPUS_CENTERS = {
  'universitas gadjah mada':                         { lat: -7.7733153,   lon: 110.3892489  },
  'universitas airlangga - b':                        { lat: -7.2729075,   lon: 112.7560403  },
  'universitas bina nusantara @anggrek':              { lat: -6.1950023,   lon: 106.7764187  },
  'universitas institut teknologi bandung - ganesha': { lat: -6.8950712,   lon: 107.6099105  },
  'universitas brawijaya':                            { lat: -7.9508146,   lon: 112.6132311  },
  'stmik ikmi cirebon':                               { lat: -6.7357684,   lon: 108.53979385 },
  'universitas multi data palembang':                 { lat: -2.9737715,   lon: 104.75612    },
  'universitas indonesia':                            { lat: -6.3689479,   lon: 106.8300839  },
  'universitas pendidikan indonesia bandung':         { lat: -6.8817098,   lon: 107.5954963  },
};

// ── Valid categories accepted by Cloud Run /recommend ────────────────────────
// Exact strings the service uses for Kategori_Awal field.
const VALID_CATEGORIES = new Set([
  'Apotek', 'Cafe', 'Fotokopi', 'Kedai', 'Makanan',
  'Makanan siap saji', 'Minimarket', 'Perhentian bus', 'Pizza',
  'Print', 'Restoran', 'Restoran padang', 'Tempat fitness',
  'Toko es krim', 'Warteg',
]);

// ── Category mapping: UI chip id / raw value → Cloud Run kategori ────────────
// CRITICAL: "Cetak" is NOT a valid category. Never send it.
const CATEGORY_MAP = {
  // from chip id (lowercase)
  'fotokopi': 'Fotokopi',
  'print':    'Print',
  'atk':      'Print',
  'makanan':  'Makanan',
  'minuman':  'Cafe',
  'cafe':     'Cafe',
  // from raw category string (exact or lowercase match)
  'apotek':           'Apotek',
  'kedai':            'Kedai',
  'kedai kopi':       'Cafe',
  'minimarket':       'Minimarket',
  'perhentian bus':   'Perhentian bus',
  'pizza':            'Pizza',
  'restoran':         'Restoran',
  'restoran padang':  'Restoran padang',
  'tempat fitness':   'Tempat fitness',
  'toko es krim':     'Toko es krim',
  'warteg':           'Warteg',
  'makanan siap saji':'Makanan siap saji',
};

/**
 * Map any incoming category string to the exact Cloud Run kategori value.
 * Returns null if the category cannot be resolved to a valid service category.
 */
function resolveKategori(input) {
  if (!input) return null;
  const lower = String(input).toLowerCase().trim();

  // Direct map lookup
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

  // Check if the original (proper case) is already in VALID_CATEGORIES
  const trimmed = String(input).trim();
  if (VALID_CATEGORIES.has(trimmed)) return trimmed;

  // Try finding a partial match in the map keys
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }

  return null; // unknown — do not send to Cloud Run
}

// ── Campus name formatter ────────────────────────────────────────────────────
function formatCampusName(campusName) {
  if (!campusName) return '';
  const lower = String(campusName).toLowerCase().trim();

  if (lower.includes('gadjah mada'))               return 'Universitas Gadjah Mada';
  if (lower.includes('airlangga'))                  return 'Universitas Airlangga - B';
  if (lower.includes('bina nusantara'))             return 'Universitas Bina Nusantara @Anggrek';
  if (lower.includes('itb') || lower.includes('institut teknologi bandung'))
                                                    return 'Universitas Institut Teknologi Bandung - Ganesha';
  if (lower.includes('brawijaya'))                  return 'Universitas Brawijaya';
  if (lower.includes('ikmi cirebon'))               return 'STMIK IKMI CIREBON';
  if (lower.includes('multi data palembang'))       return 'Universitas Multi Data Palembang';
  if (lower.includes('universitas indonesia'))      return 'Universitas Indonesia';
  if (lower.includes('pendidikan indonesia bandung'))return 'Universitas Pendidikan Indonesia Bandung';

  // title-case fallback
  return String(campusName)
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Kategori jarak calculator ─────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getKategoriJarak(campusNameRaw) {
  // Return empty string to retrieve all recommendations across all distances
  // (Jalan Kaki, Perlu Motor, Perlu Mobil) from Cloud Run, then let backend
  // sort them by real physical distance. This avoids displaying too few results
  // for campuses like UGM (which has only 11 walking-distance items).
  return '';
}

// ── isConfigured ─────────────────────────────────────────────────────────────
function isConfigured() {
  const url = config.recommendationApiUrl;
  return typeof url === 'string' && url.trim() !== '';
}

// ── Flatten /recommend/all response (object per category → flat array) ────────
function flattenAllResponse(raw) {
  if (!raw || typeof raw !== 'object') return [];

  // If it's already an array, return as-is
  if (Array.isArray(raw)) return raw;

  const flattened = [];
  for (const [categoryKey, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      // Always stamp Kategori_Awal if missing
      const stamped = { ...item };
      if (!stamped.Kategori_Awal) stamped.Kategori_Awal = categoryKey;
      flattened.push(stamped);
    }
  }
  return flattened;
}

// ── Extract from /recommend (direct array) ───────────────────────────────────
function extractArrayResponse(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.recommendations)) return raw.recommendations;
  if (Array.isArray(raw.results)) return raw.results;
  return [];
}

// ── Extract from /search ({ message, data: [...] }) ──────────────────────────
function extractSearchResponse(raw) {
  if (!raw || typeof raw !== 'object') return [];

  // Primary path: { message: "...", data: [...] }
  if (Array.isArray(raw.data)) return raw.data;

  // "Tempat yang dicari tidak ditemukan." — no data key → return []
  if (raw.message && (!raw.data || (Array.isArray(raw.data) && raw.data.length === 0))) return [];

  // Fallback paths
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.recommendations)) return raw.recommendations;

  return [];
}

// ── Error builder ─────────────────────────────────────────────────────────────
function buildServiceError(error) {
  if (error.response && error.response.data) {
    const detail = error.response.data.detail;
    let message = '';
    if (Array.isArray(detail)) {
      message = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ');
    } else if (typeof detail === 'string') {
      message = detail;
    } else {
      message = error.response.data.message || error.response.data.error || '';
    }
    const serviceError = new Error(message || 'Layanan rekomendasi menolak permintaan.');
    serviceError.statusCode = error.response.status;
    return serviceError;
  }
  return error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /recommend/all
 * Contract: { kampus, kategori_jarak, top_n }
 * Response: { "Kategori": [...], ... }  →  flatten to array
 */
async function fetchAllRecommendations(payload) {
  if (!isConfigured()) return [];

  const kampus = formatCampusName(payload.kampus || payload.campus || payload.selected_uni || '');
  const kategori_jarak = payload.kategori_jarak || getKategoriJarak(kampus);
  const top_n = payload.top_n || 100;

  // STRICT payload — only what the service accepts
  const apiPayload = { kampus, kategori_jarak, top_n };

  const url = `${config.recommendationApiUrl.replace(/\/$/, '')}/recommend/all`;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Places] endpointUsed: /recommend/all');
    console.log('[Places] outgoingPayload:', JSON.stringify(apiPayload, null, 2));
  }

  try {
    const response = await axios.post(url, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const raw = response.data;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] rawResponseType:', Array.isArray(raw) ? 'array' : typeof raw);
      console.log('[Places] rawResponseKeys:', raw && typeof raw === 'object' ? Object.keys(raw) : null);
    }

    const result = flattenAllResponse(raw);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] normalizedCount (after flatten):', result.length);
    }

    return result;
  } catch (error) {
    console.error('[PlaceRecommenderClient] /recommend/all error:', error.message);
    throw buildServiceError(error);
  }
}

/**
 * POST /recommend
 * Contract: { kampus, kategori, kategori_jarak, top_n }
 * Response: array directly
 */
async function fetchCategoryRecommendations(payload) {
  if (!isConfigured()) return [];

  const kampus = formatCampusName(payload.kampus || payload.campus || payload.selected_uni || '');
  const rawCat = payload.kategori || payload.category || payload.selected_cat || '';
  const kategori = resolveKategori(rawCat);

  if (!kategori) {
    console.warn(`[PlaceRecommenderClient] Unknown category "${rawCat}" — skipping Cloud Run call.`);
    return [];
  }

  const kategori_jarak = payload.kategori_jarak || getKategoriJarak(kampus);
  const top_n = payload.top_n || 100;

  // STRICT payload — only what the service accepts
  const apiPayload = { kampus, kategori, kategori_jarak, top_n };

  const url = `${config.recommendationApiUrl.replace(/\/$/, '')}/recommend`;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Places] endpointUsed: /recommend');
    console.log('[Places] outgoingPayload:', JSON.stringify(apiPayload, null, 2));
  }

  try {
    const response = await axios.post(url, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const raw = response.data;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] rawResponseType:', Array.isArray(raw) ? 'array' : typeof raw);
      console.log('[Places] rawResponseKeys:', raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : null);
    }

    const result = extractArrayResponse(raw);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] normalizedCount:', result.length);
    }

    return result;
  } catch (error) {
    console.error('[PlaceRecommenderClient] /recommend error:', error.message);
    throw buildServiceError(error);
  }
}

/**
 * POST /search
 * Contract: { kampus, query, top_n }
 * Response: { message, data: [...] }  or  { message: "tidak ditemukan." }
 */
async function searchPlaces(payload) {
  if (!isConfigured()) return [];

  const kampus = formatCampusName(payload.kampus || payload.campus || payload.selected_uni || '');
  const query  = payload.query || payload.q || payload.searchQuery || '';
  const top_n  = payload.top_n || 100;

  // STRICT payload — only what the service accepts
  const apiPayload = { kampus, query, top_n };

  const url = `${config.recommendationApiUrl.replace(/\/$/, '')}/search`;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Places] endpointUsed: /search');
    console.log('[Places] outgoingPayload:', JSON.stringify(apiPayload, null, 2));
  }

  try {
    const response = await axios.post(url, apiPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const raw = response.data;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] rawResponseType:', Array.isArray(raw) ? 'array' : typeof raw);
      console.log('[Places] rawResponseKeys:', raw && typeof raw === 'object' ? Object.keys(raw) : null);
    }

    const result = extractSearchResponse(raw);
    const matchedResult = result.filter(item => item.similarity != null && item.similarity > 0);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Places] normalizedCount:', matchedResult.length);
    }

    return matchedResult;
  } catch (error) {
    // "Tempat tidak ditemukan" might come as a 404 — treat as empty array
    if (error.response && error.response.status === 404) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Places] /search returned 404 — treating as empty result.');
      }
      return [];
    }
    console.error('[PlaceRecommenderClient] /search error:', error.message);
    throw buildServiceError(error);
  }
}

module.exports = {
  isConfigured,
  fetchAllRecommendations,
  fetchCategoryRecommendations,
  searchPlaces,
  resolveKategori,
};