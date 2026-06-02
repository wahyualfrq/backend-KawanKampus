const axios = require('axios');
const config = require('../../common/config/env');

// ── Campus center coordinates ─────────────────────────────────────────────────
const CAMPUS_CENTERS = {
  'Universitas Gadjah Mada':                         { lat: -7.7733153,   lon: 110.3892489  },
  'Universitas Airlangga - B':                        { lat: -7.2729075,   lon: 112.7560403  },
  'Universitas Bina Nusantara @Anggrek':              { lat: -6.1950023,   lon: 106.7764187  },
  'Universitas Institut Teknologi Bandung - Ganesha': { lat: -6.8950712,   lon: 107.6099105  },
  'Universitas Brawijaya':                            { lat: -7.9508146,   lon: 112.6132311  },
  'STMIK IKMI CIREBON':                               { lat: -6.7357684,   lon: 108.53979385 },
  'UNIVERSITAS MULTI DATA PALEMBANG':                 { lat: -2.9737715,   lon: 104.75612    },
  'Universitas Indonesia':                            { lat: -6.36894785,  lon: 106.83008385 },
  'Universitas Pendidikan Indonesia Bandung':         { lat: -6.8817098,   lon: 107.5954963  },
};

// ── Fallback config for GET /places/config ────────────────────────────────────
const LAINNYA_CATEGORIES = [
  'Apotek', 'Kedai', 'Kedai Kopi', 'Minimarket', 'Perhentian Bus',
  'Pizza', 'Restoran', 'Restoran Padang', 'Tempat Fitness',
  'Toko Es Krim', 'Warteg',
];

const FALLBACK_CONFIG = {
  source: 'fallback',
  campuses: Object.entries(CAMPUS_CENTERS).map(([name, { lat, lon }]) => ({ name, lat, lon })),
  categories: [
    'Fotokopi', 'Print', 'Makanan', 'Makanan Siap Saji', 'Restoran',
    'Restoran Padang', 'Pizza', 'Warteg', 'Cafe', 'Kedai Kopi',
    'Kedai', 'Toko Es Krim', 'Apotek', 'Minimarket', 'Perhentian Bus',
    'Tempat Fitness',
  ],
  categoryGroups: {
    Fotokopi: ['Fotokopi', 'Print'],
    Makanan:  ['Makanan', 'Restoran', 'Warteg', 'Pizza'],
    Minuman:  ['Cafe', 'Kedai', 'Kedai Kopi'],
    ATK:      ['Print', 'Fotokopi'],
    Lainnya:  LAINNYA_CATEGORIES,
  },
  categoryApiValue: {
    fotokopi: 'Fotokopi',
    makanan:  'Makanan',
    minuman:  'Cafe',
    atk:      'Print',
    all:      'Semua',
  },
  lainnyaCategories: LAINNYA_CATEGORIES,
  campusCenters: CAMPUS_CENTERS,
};

// ── Category expansion map (UI chip → raw AI service categories) ──────────────
const CATEGORY_EXPANSION = {
  'Semua':    ['Fotokopi', 'Print', 'Makanan', 'Restoran', 'Cafe', 'Kedai', 'Minimarket', 'Apotek'],
  'Fotokopi': ['Fotokopi', 'Print'],
  'ATK':      ['Print', 'Fotokopi'],
  'Makanan':  ['Makanan', 'Restoran', 'Warteg', 'Pizza'],
  'Minuman':  ['Cafe', 'Kedai', 'Kedai Kopi'],
};

// ── Pure utility functions ────────────────────────────────────────────────────

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistanceLabel(meters) {
  if (meters == null || typeof meters !== 'number' || isNaN(meters)) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Parse a "📍 Jarak: 359 m" or "1.2 km" or raw number → metres | null.
 */
function parseDistanceText(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return isFinite(value) && !isNaN(value) ? value : null;
  if (typeof value === 'string') {
    const s = value.trim();
    const kmMatch = s.match(/(\d+[.,]?\d*)\s*km/i);
    if (kmMatch) { const n = parseFloat(kmMatch[1].replace(',', '.')); return isNaN(n) ? null : Math.round(n * 1000); }
    const mMatch  = s.match(/(\d+[.,]?\d*)\s*m\b/i);
    if (mMatch)  { const n = parseFloat(mMatch[1].replace(',',  '.')); return isNaN(n) ? null : Math.round(n); }
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Extract lat/lon from a Google Maps link.
 * Handles:
 *   ?query=lat,lon  |  @lat,lon  |  /search/?...query=lat,lon  |  !3d lat !4d lon
 */
function extractCoordsFromMapLink(mapLink) {
  if (!mapLink) return { lat: null, lon: null };

  const coordsMatch =
    mapLink.match(/(?:query|q|search\/|@|dir\/)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i) ||
    mapLink.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lon = parseFloat(coordsMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  const match3d4d = mapLink.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/i);
  if (match3d4d) {
    const lat = parseFloat(match3d4d[1]);
    const lon = parseFloat(match3d4d[2]);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  return { lat: null, lon: null };
}

function deduplicatePlaces(places) {
  const seenMapLinks = new Set();
  const seenNameCats = new Set();
  const seenNameLocs = new Set();
  const unique = [];

  for (const place of places) {
    const mapLinkKey = place.mapLink ? place.mapLink.trim() : null;
    const nameCatKey = (place.name && place.category) ? `${place.name.toLowerCase().trim()}_${place.category.toLowerCase().trim()}` : null;
    const nameLocKey = (place.name && place.lat != null && place.lon != null) ? `${place.name.toLowerCase().trim()}_${place.lat}_${place.lon}` : null;

    let isDuplicate = false;
    if (mapLinkKey && seenMapLinks.has(mapLinkKey)) isDuplicate = true;
    if (nameCatKey && seenNameCats.has(nameCatKey)) isDuplicate = true;
    if (nameLocKey && seenNameLocs.has(nameLocKey)) isDuplicate = true;

    if (!isDuplicate) {
      if (mapLinkKey) seenMapLinks.add(mapLinkKey);
      if (nameCatKey) seenNameCats.add(nameCatKey);
      if (nameLocKey) seenNameLocs.add(nameLocKey);
      unique.push(place);
    }
  }
  return unique;
}

/**
 * Extract the raw item list from any recommendation response shape.
 * Supported: { recommendations }, { results }, { data }, direct array.
 */
function extractItemList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.recommendations && Array.isArray(raw.recommendations)) return raw.recommendations;
  if (raw.results && Array.isArray(raw.results)) return raw.results;
  if (raw.data) {
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data.recommendations && Array.isArray(raw.data.recommendations)) return raw.data.recommendations;
    if (raw.data.results && Array.isArray(raw.data.results)) return raw.data.results;
  }
  return [];
}

/**
 * Normalize a raw response item into the standard shape.
 */
function normalizeItem(item, idx, fallbackCategory, campusLat, campusLon) {
  const rank = idx + 1;

  // Name mapping: name / nama / Nama_Tempat
  const name = item.name || item.nama || item.Nama_Tempat || `Tempat ${rank}`;

  // Category mapping: category / kategori / Kategori_Awal
  let category = item.category || item.kategori || item.Kategori_Awal || '';
  if (!category && item.hours) {
    category = item.hours.split(' - ')[0].trim();
  }
  if (!category) category = fallbackCategory || '';

  // Map link mapping: mapLink / map_link / Google_Maps_Link
  const mapLink = item.mapLink || item.map_link || item.Google_Maps_Link || '';

  // Coordinates mapping: lat / latitude / Latitude, lon / lng / longitude / Longitude
  let parsedLat = null;
  let parsedLon = null;
  const rawLat = item.lat ?? item.latitude ?? item.Latitude;
  const rawLon = item.lon ?? item.lng ?? item.longitude ?? item.Longitude;
  if (rawLat != null && rawLat !== '') {
    const pLat = parseFloat(rawLat);
    if (!isNaN(pLat)) parsedLat = pLat;
  }
  if (rawLon != null && rawLon !== '') {
    const pLon = parseFloat(rawLon);
    if (!isNaN(pLon)) parsedLon = pLon;
  }

  // Extract from mapLink if null
  if ((parsedLat == null || parsedLon == null) && mapLink) {
    const extracted = extractCoordsFromMapLink(mapLink);
    if (extracted.lat != null && extracted.lon != null) {
      parsedLat = extracted.lat;
      parsedLon = extracted.lon;
    }
  }

  const lat = parsedLat;
  const lon = parsedLon;

  // Distance mapping: distanceText / distance / jarak
  const rawDistanceText = item.distanceText ?? item.distance ?? item.jarak ?? null;

  let distanceMeters = null;
  if (campusLat != null && campusLon != null && lat != null && lon != null) {
    distanceMeters = getHaversineDistance(campusLat, campusLon, lat, lon);
  }

  if (distanceMeters === null && rawDistanceText !== null) {
    distanceMeters = parseDistanceText(rawDistanceText);
  }

  if (distanceMeters === null && item.Jarak_KM != null) {
    const km = parseFloat(item.Jarak_KM);
    if (!isNaN(km)) distanceMeters = Math.round(km * 1000);
  }

  let distanceText = '-';
  if (distanceMeters !== null && !isNaN(distanceMeters)) {
    distanceText = formatDistanceLabel(distanceMeters);
  } else if (rawDistanceText !== null && rawDistanceText !== '') {
    const parsed = parseDistanceText(rawDistanceText);
    if (parsed !== null) {
      distanceMeters = parsed;
      distanceText = formatDistanceLabel(distanceMeters);
    } else {
      distanceText = String(rawDistanceText);
    }
  }

  // Rating & Reviews mapping
  const rawRating = item.rating ?? item.Rating ?? null;
  const rawReviews = item.reviews ?? item.Total_Reviews ?? item.totalReviews ?? null;
  const rating = (rawRating !== null && !isNaN(parseFloat(rawRating))) ? parseFloat(rawRating) : null;
  const reviews = (rawReviews !== null && !isNaN(parseInt(rawReviews, 10))) ? parseInt(rawReviews, 10) : null;

  return {
    id:             item.id || String(rank),
    rank,
    name,
    category,
    distanceMeters,
    distanceText,
    address:        item.address || item.alamat || item.Alamat || '',
    description:    item.description || item.deskripsi || item.Deskripsi || item.Tags || '',
    mapLink,
    rating,
    reviews,
    lat,
    lon,
    googleCategory:      item.Kategori_Google    || item.googleCategory    || null,
    trustScore:          item.Skor_Kepercayaan   != null ? parseFloat(item.Skor_Kepercayaan) : (item.trustScore || null),
    tags:                item.Tags               || item.tags              || null,
    popularityCategory:  item.Kategori_Popularitas || item.popularityCategory || null,
    distanceCategory:    item.Kategori_Jarak     || item.distanceCategory  || null,
    recommendationScore: item.recommendation_score || item.recommendationScore || null,
  };
}

const MAX_RECOMMENDATIONS = 15;

// ── Service class ─────────────────────────────────────────────────────────────
class PlaceService {

  /** GET /places/config */
  async getConfig() {
    return { ...FALLBACK_CONFIG };
  }

  /** GET /places/nearby — unchanged Google Maps integration */
  async getNearbyPlaces(lat, lng, category) {
    if (!config.googleMapsApiKey) throw new Error('Google Maps API Key is not configured');
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: { location: `${lat},${lng}`, radius: 1000, keyword: category, key: config.googleMapsApiKey },
      });
      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }
      return response.data.results.map(place => ({
        name: place.name, rating: place.rating || 0, address: place.vicinity || '',
        location: { lat: place.geometry.location.lat, lng: place.geometry.location.lng },
        open_now: place.opening_hours ? place.opening_hours.open_now : null,
      }));
    } catch (error) {
      console.error('[PlaceService] getNearbyPlaces error:', error.message);
      const err = new Error('Failed to fetch nearby places'); err.statusCode = 502; throw err;
    }
  }

  /**
   * POST /places/recommend
   * Uses RECOMMENDATION_API_URL /recommend
   * Never sends "Semua" directly — expands categories in backend.
   */
  async getRecommendations(userId, { selected_uni, selected_cat, lat, lon, actual_category }) {
    // Guard: recommendationApiUrl must be configured
    if (!config.recommendationApiUrl) {
      return {
        success: false,
        code: 'PLACE_RECOMMENDER_NOT_CONFIGURED',
        message: 'Layanan rekomendasi tempat belum dikonfigurasi.',
        recommendations: [],
      };
    }

    // Input validation
    if (!selected_uni || !selected_cat) {
      const err = new Error('Parameter pencarian tidak lengkap.');
      err.statusCode = 400;
      throw err;
    }

    // Always use campus center coordinates — never browser geolocation
    const campusCenter = CAMPUS_CENTERS[selected_uni];
    if (!campusCenter) {
      const err = new Error('Kampus tidak didukung.');
      err.statusCode = 400;
      throw err;
    }
    const campusLat = campusCenter.lat;
    const campusLon = campusCenter.lon;

    // Expand UI category → raw category list for AI service
    let rawCategories;
    if (CATEGORY_EXPANSION[selected_cat]) {
      rawCategories = CATEGORY_EXPANSION[selected_cat];
    } else if (selected_cat === 'Lainnya' && actual_category) {
      rawCategories = [actual_category];
    } else {
      rawCategories = [selected_cat];
    }

    // Query all raw categories in parallel — skip failures
    const tasks = rawCategories.map(cat => this._fetchSingleCategory(userId, selected_uni, cat, campusLat, campusLon));
    const results = await Promise.allSettled(tasks);

    let hasSuccessfulCall = false;
    let rawList = [];

    for (const res of results) {
      if (res.status === 'fulfilled') {
        hasSuccessfulCall = true;
        rawList.push(...res.value);
      } else {
        console.warn('[PlaceService] Category fetch failed:', res.reason?.message || res.reason);
      }
    }

    // All categories failed → service error
    if (!hasSuccessfulCall) {
      const err = new Error('Layanan rekomendasi sedang bermasalah. Coba lagi nanti.');
      err.statusCode = 502;
      throw err;
    }

    // Save history log (best-effort)
    try {
      const prisma = require('../../common/config/prisma');
      await prisma.history.create({
        data: {
          userId,
          action: 'SEARCHED_PLACE',
          metadata: { campus: selected_uni, category: selected_cat, resultCount: rawList.length }
        }
      });
    } catch (e) {
      console.warn('[PlaceService] Failed to save search history log:', e.message);
    }

    // Normalize
    const normalizedList = rawList.map((item, idx) =>
      normalizeItem(item, idx, item.Kategori_Awal || selected_cat, campusLat, campusLon)
    );

    // Deduplicate
    const uniqueList = deduplicatePlaces(normalizedList);

    // Sort by distance ascending (nulls last)
    uniqueList.sort((a, b) => {
      if (a.distanceMeters == null && b.distanceMeters == null) return 0;
      if (a.distanceMeters == null) return 1;
      if (b.distanceMeters == null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    const totalBeforeLimit = uniqueList.length;

    // Top 15
    const finalRecommendations = uniqueList.slice(0, MAX_RECOMMENDATIONS).map((place, idx) => {
      place.rank = idx + 1;
      place.id   = place.id || String(idx + 1);
      return place;
    });

    return {
      selectedCampus:    selected_uni,
      selectedCategory:  selected_cat,
      rawCategoriesUsed: rawCategories,
      totalBeforeLimit,
      returnedCount:     finalRecommendations.length,
      limit:             MAX_RECOMMENDATIONS,
      recommendations:   finalRecommendations,
    };
  }

  /**
   * Calls RECOMMENDATION_API_URL/recommend
   */
  async _fetchSingleCategory(userId, selected_uni, rawCategory, campusLat, campusLon) {
    const url = `${config.recommendationApiUrl}/recommend`;
    const payload = {
      kampus: selected_uni,
      kategori: rawCategory,
      kategori_jarak: 'Jalan Kaki',
      latitude: campusLat,
      longitude: campusLon,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log("PLACES USING RECOMMENDATION_API_URL:", config.recommendationApiUrl);
      console.log("OUTGOING RECOMMENDATION URL:", url);
      console.log("OUTGOING RECOMMENDATION PAYLOAD:", JSON.stringify(payload, null, 2));
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log("RAW RECOMMENDATION RESPONSE:", JSON.stringify(response.data, null, 2));
    }

    const list = extractItemList(response.data);
    return Array.isArray(list) ? list : [];
  }
}

module.exports = new PlaceService();
