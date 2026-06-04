const axios = require('axios');
const config = require('../../common/config/env');
const placeRecommenderClient = require('./placeRecommender.client');

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

// ── Lainnya sub-categories (sent as-is to /recommend) ────────────────────────
const LAINNYA_CATEGORIES = [
  'Apotek', 'Kedai', 'Kedai Kopi', 'Minimarket', 'Perhentian bus',
  'Pizza', 'Restoran', 'Restoran padang', 'Tempat fitness',
  'Toko es krim', 'Warteg',
];

// ── Config served to frontend ─────────────────────────────────────────────────
const FALLBACK_CONFIG = {
  source: 'fallback',
  campuses: Object.entries(CAMPUS_CENTERS).map(([name, { lat, lon }]) => ({ name, lat, lon })),
  categories: [
    'Fotokopi', 'Print', 'Makanan', 'Makanan siap saji', 'Restoran',
    'Restoran padang', 'Pizza', 'Warteg', 'Cafe', 'Kedai Kopi',
    'Kedai', 'Toko es krim', 'Apotek', 'Minimarket', 'Perhentian bus',
    'Tempat fitness',
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

// ── Distance utilities ────────────────────────────────────────────────────────
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
  if (meters == null || typeof meters !== 'number' || isNaN(meters)) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

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

// ── Coordinate extraction from Google Maps link ───────────────────────────────
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

// ── Deduplication ─────────────────────────────────────────────────────────────
function deduplicatePlaces(places) {
  const seenMapLinks  = new Set();
  const seenNameCats  = new Set();
  const seenNameLocs  = new Set();
  const unique = [];

  for (const place of places) {
    const mapLinkKey = place.mapLink ? place.mapLink.trim() : null;
    const nameCatKey = (place.name && place.category)
      ? `${place.name.toLowerCase().trim()}_${place.category.toLowerCase().trim()}` : null;
    const nameLocKey = (place.name && place.lat != null && place.lon != null)
      ? `${place.name.toLowerCase().trim()}_${place.lat}_${place.lon}` : null;

    let isDuplicate = false;
    if (mapLinkKey && seenMapLinks.has(mapLinkKey)) isDuplicate = true;
    if (!isDuplicate && nameCatKey && seenNameCats.has(nameCatKey)) isDuplicate = true;
    if (!isDuplicate && nameLocKey && seenNameLocs.has(nameLocKey)) isDuplicate = true;

    if (!isDuplicate) {
      if (mapLinkKey) seenMapLinks.add(mapLinkKey);
      if (nameCatKey) seenNameCats.add(nameCatKey);
      if (nameLocKey) seenNameLocs.add(nameLocKey);
      unique.push(place);
    }
  }
  return unique;
}

// ── Item normalizer ───────────────────────────────────────────────────────────
// Maps raw Cloud Run item fields to the standardized frontend shape.
function normalizeItem(item, idx, fallbackCategory, campusLat, campusLon) {
  const rank = idx + 1;

  // Name
  const name = item.Nama_Tempat || item.name || item.nama || item.Nama || `Tempat ${rank}`;

  // Category — prefer Kategori_Awal (stamped during flatten)
  let category =
    item.Kategori_Awal || item.category || item.kategori || item.Kategori || fallbackCategory || '';

  // Map link
  const mapLink = item.Google_Maps_Link || item.mapLink || item.map_link || item.googleMapsUrl || '';

  // Coordinates — try direct fields first, then mapLink extraction
  let parsedLat = null;
  let parsedLon = null;
  const rawLat = item.Latitude ?? item.lat ?? item.latitude;
  const rawLon = item.Longitude ?? item.lon ?? item.lng ?? item.longitude;
  if (rawLat != null && rawLat !== '') { const v = parseFloat(rawLat); if (!isNaN(v)) parsedLat = v; }
  if (rawLon != null && rawLon !== '') { const v = parseFloat(rawLon); if (!isNaN(v)) parsedLon = v; }
  if ((parsedLat == null || parsedLon == null) && mapLink) {
    const extracted = extractCoordsFromMapLink(mapLink);
    if (extracted.lat != null && extracted.lon != null) {
      parsedLat = extracted.lat;
      parsedLon = extracted.lon;
    }
  }

  // Distance — prefer Jarak_KM (km float) from Cloud Run, compute haversine as secondary
  let distanceMeters = null;
  const jarakKm = item.Jarak_KM != null ? parseFloat(item.Jarak_KM) : null;

  if (jarakKm !== null && !isNaN(jarakKm)) {
    distanceMeters = Math.round(jarakKm * 1000);
  } else if (campusLat != null && campusLon != null && parsedLat != null && parsedLon != null) {
    distanceMeters = getHaversineDistance(campusLat, campusLon, parsedLat, parsedLon);
  } else {
    // Fallback: parse any text distance field
    const rawDist = item.distanceText ?? item.distance ?? item.jarak ?? null;
    distanceMeters = parseDistanceText(rawDist);
  }

  // Build distanceText — never show NaN or undefined
  const distanceText = (distanceMeters != null && !isNaN(distanceMeters))
    ? formatDistanceLabel(distanceMeters)
    : '';

  // Rating & reviews
  const rawRating  = item.Rating  ?? item.rating  ?? null;
  const rawReviews = item.Total_Reviews ?? item.reviews ?? item.totalReviews ?? null;
  const rating  = (rawRating  != null && !isNaN(parseFloat(rawRating)))  ? parseFloat(rawRating)  : null;
  const reviews = (rawReviews != null && !isNaN(parseInt(rawReviews, 10))) ? parseInt(rawReviews, 10) : null;

  return {
    id:                  item.id || String(rank),
    rank,
    name,
    category,
    rawCategory:         item.Kategori_Awal || item.kategori || item.category || fallbackCategory || '',
    distanceMeters,
    distanceText,
    address:             item.Alamat    || item.address    || item.alamat    || '',
    description:         item.Tags      || item.description || item.deskripsi || item.Deskripsi || '',
    mapLink,
    rating,
    reviews,
    lat:                 parsedLat,
    lon:                 parsedLon,
    googleCategory:      item.Kategori_Google      || item.googleCategory      || null,
    trustScore:          item.Skor_Kepercayaan != null
                           ? parseFloat(item.Skor_Kepercayaan)
                           : (item.trustScore || null),
    tags:                item.Tags                 || item.tags                || null,
    popularityCategory:  item.Kategori_Popularitas || item.popularityCategory  || null,
    distanceCategory:    item.Kategori_Jarak       || item.distanceCategory    || null,
    recommendationScore: item.recommendation_score || item.recommendationScore || null,
    similarity:          item.similarity           || null,
    campus:              item.Kampus               || item.campus              || null,
  };
}

const FETCH_LIMIT = 100;

class PlaceService {

  async getConfig() {
    return { ...FALLBACK_CONFIG };
  }

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

  async getRecommendations(userId, { selected_uni, selected_cat, lat, lon, searchQuery, actual_category }) {
    if (!placeRecommenderClient.isConfigured()) {
      return {
        success: false,
        code: 'PLACE_RECOMMENDER_NOT_CONFIGURED',
        message: 'Layanan rekomendasi tempat belum dikonfigurasi.',
        recommendations: [],
      };
    }

    if (!selected_uni) {
      const err = new Error('Parameter pencarian tidak lengkap.'); err.statusCode = 400; throw err;
    }

    const campusCenter = CAMPUS_CENTERS[selected_uni];
    if (!campusCenter) {
      const err = new Error('Kampus tidak didukung.'); err.statusCode = 400; throw err;
    }

    const campusLat = campusCenter.lat;
    const campusLon = campusCenter.lon;

    let rawList = [];
    let endpointUsed = '';

    // ── Route to the correct Cloud Run endpoint ──────────────────────────────
    if (searchQuery && searchQuery.trim()) {
      // Search mode: POST /search
      endpointUsed = '/search';
      rawList = await placeRecommenderClient.searchPlaces({
        kampus:  selected_uni,
        query:   searchQuery.trim(),
        top_n:   FETCH_LIMIT,
      });

    } else if (!selected_cat || selected_cat === 'Semua') {
      // "All" mode: POST /recommend/all
      endpointUsed = '/recommend/all';
      rawList = await placeRecommenderClient.fetchAllRecommendations({
        kampus:  selected_uni,
        top_n:   FETCH_LIMIT,
      });

    } else {
      // Specific category: POST /recommend
      endpointUsed = '/recommend';

      // Resolve actual category to send (Lainnya uses actual_category)
      let categoryToSend = selected_cat;
      if (selected_cat === 'Lainnya' && actual_category) {
        categoryToSend = actual_category;
      }

      rawList = await placeRecommenderClient.fetchCategoryRecommendations({
        kampus:   selected_uni,
        kategori: categoryToSend,
        top_n:    FETCH_LIMIT,
      });
    }

    // ── Normalize ────────────────────────────────────────────────────────────
    const normalizedList = rawList.map((item, idx) =>
      normalizeItem(item, idx, selected_cat, campusLat, campusLon)
    );

    // ── Deduplicate & sort by distance ────────────────────────────────────────
    const uniqueList = deduplicatePlaces(normalizedList);
    uniqueList.sort((a, b) => {
      if (a.distanceMeters == null && b.distanceMeters == null) return 0;
      if (a.distanceMeters == null) return 1;
      if (b.distanceMeters == null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    const totalBeforeLimit = uniqueList.length;

    // Assign final rank/id and return up to FETCH_LIMIT
    const finalRecommendations = uniqueList.slice(0, FETCH_LIMIT).map((place, idx) => {
      place.rank = idx + 1;
      place.id   = place.id || String(idx + 1);
      return place;
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PlaceService] endpointUsed: ${endpointUsed} | rawList: ${rawList.length} | afterDedup: ${totalBeforeLimit} | returned: ${finalRecommendations.length}`);
    }

    // ── History logging ───────────────────────────────────────────────────────
    try {
      const prisma = require('../../common/config/prisma');
      const trimmedQuery = searchQuery ? searchQuery.trim() : '';
      const shouldLog = !searchQuery || trimmedQuery.length >= 2;

      if (shouldLog) {
        await prisma.history.create({
          data: {
            userId: String(userId),
            action: 'SEARCHED_PLACE',
            metadata: {
              campus:        selected_uni,
              category:      selected_cat,
              searchQuery:   trimmedQuery || null,
              resultCount:   finalRecommendations.length,
              endpointUsed,
              source:        'places_recommendation',
            },
          },
        });
      }
    } catch (e) {
      console.warn('[PlaceService] Failed to save search history log:', e.message);
    }

    return {
      selectedCampus:   selected_uni,
      selectedCategory: selected_cat,
      searchQuery:      searchQuery || null,
      endpointUsed,
      totalBeforeLimit,
      returnedCount:    finalRecommendations.length,
      fetchLimit:       FETCH_LIMIT,
      recommendations:  finalRecommendations,
    };
  }
}

module.exports = new PlaceService();
