const axios = require('axios');
const config = require('../../common/config/env');

// ── Fallback config (from real CSV summary) ─────────────────────────────────
// Extra "Lainnya" categories from the real CSV
const LAINNYA_CATEGORIES = [
  'Apotek', 'Kedai', 'Kedai Kopi', 'Minimarket', 'Perhentian Bus',
  'Pizza', 'Restoran', 'Restoran Padang', 'Tempat Fitness',
  'Toko Es Krim', 'Warteg',
];

const FALLBACK_CONFIG = {
  source: 'fallback',
  campuses: [
    { name: 'Universitas Gadjah Mada',                         lat: -7.7733153,   lon: 110.3892489  },
    { name: 'Universitas Airlangga - B',                        lat: -7.2729075,   lon: 112.7560403  },
    { name: 'Universitas Bina Nusantara @Anggrek',              lat: -6.1950023,   lon: 106.7764187  },
    { name: 'Universitas Institut Teknologi Bandung - Ganesha', lat: -6.8950712,   lon: 107.6099105  },
    { name: 'Universitas Brawijaya',                            lat: -7.9508146,   lon: 112.6132311  },
    { name: 'STMIK IKMI CIREBON',                               lat: -6.7357684,   lon: 108.53979385 },
    { name: 'UNIVERSITAS MULTI DATA PALEMBANG',                 lat: -2.9737715,   lon: 104.75612    },
    { name: 'Universitas Indonesia',                             lat: -6.36894785,  lon: 106.83008385 },
    { name: 'Universitas Pendidikan Indonesia Bandung',          lat: -6.8817098,   lon: 107.5954963  },
  ],
  // Flat list of all raw Kategori_Awal values available in CSV
  categories: [
    'Fotokopi', 'Print', 'Makanan', 'Makanan Siap Saji', 'Restoran',
    'Restoran Padang', 'Pizza', 'Warteg', 'Cafe', 'Kedai Kopi',
    'Kedai', 'Toko Es Krim', 'Apotek', 'Minimarket', 'Perhentian Bus',
    'Tempat Fitness',
  ],
  // Maps display group → raw Kategori_Awal values
  categoryGroups: {
    Fotokopi: ['Fotokopi', 'Fotokopi.Csv', 'Fotocopy.Csv', 'Print', 'Print.Csv'],
    Makanan:  ['Makanan', 'Makanan.Csv', 'Makanan Siap Saji', 'Makanan Siap Saji.Csv',
               'Restoran', 'Restoran.Csv', 'Restoran Padang', 'Restoran Padang.Csv',
               'Restaurant.Csv', 'Pizza', 'Pizza.Csv', 'Warteg', 'Warteg.Csv'],
    Minuman:  ['Cafe', 'Cafe.Csv', 'Kedai Kopi', 'Kedai', 'Kedai.Csv',
               'Toko Es Krim', 'Toko Es Krim.Csv', 'Toko Eskrim.Csv'],
    ATK:      ['Print', 'Print.Csv', 'Fotokopi', 'Fotokopi.Csv'],
    Lainnya:  LAINNYA_CATEGORIES,
  },
  // Primary API value to send per chip (safe, exists in CSV)
  categoryApiValue: {
    fotokopi: 'Fotokopi',
    makanan:  'Makanan',
    minuman:  'Cafe',
    atk:      'Print',
    all:      'Fotokopi',
  },
  // Lainnya categories shown in dropdown
  lainnyaCategories: LAINNYA_CATEGORIES,
  // Campus name → lat/lon for demo mode
  campusCenters: {
    'Universitas Gadjah Mada':                         { lat: -7.7733153,  lon: 110.3892489  },
    'Universitas Airlangga - B':                        { lat: -7.2729075,  lon: 112.7560403  },
    'Universitas Bina Nusantara @Anggrek':              { lat: -6.1950023,  lon: 106.7764187  },
    'Universitas Institut Teknologi Bandung - Ganesha': { lat: -6.8950712,  lon: 107.6099105  },
    'Universitas Brawijaya':                            { lat: -7.9508146,  lon: 112.6132311  },
    'STMIK IKMI CIREBON':                               { lat: -6.7357684,  lon: 108.53979385 },
    'UNIVERSITAS MULTI DATA PALEMBANG':                 { lat: -2.9737715,  lon: 104.75612    },
    'Universitas Indonesia':                             { lat: -6.3689479,  lon: 106.8300839  },
    'Universitas Pendidikan Indonesia Bandung':          { lat: -6.8817098,  lon: 107.5954963  },
  },
};

// ── Distance helpers ────────────────────────────────────────────────────────
function extractRawDistance(item) {
  const candidates = [
    item.Jarak_KM, item.Jarak_km, item.distance_km,
    item.distanceMeters, item.distance_m, item.distance_meter,
    item.distance, item.jarak, item.Jarak,
    item.distance_label, item.jarak_label, item.distanceText,
  ];
  for (const v of candidates) {
    if (v != null && v !== '') return v;
  }
  return null;
}

function parseDistanceToMeters(value) {
  if (value == null) return null;
  if (typeof value === 'number') return (!isFinite(value) || isNaN(value)) ? null : value;
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

function formatDistanceLabel(meters) {
  if (meters == null || typeof meters !== 'number' || isNaN(meters)) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

// ── Service ─────────────────────────────────────────────────────────────────
class PlaceService {

  /**
   * GET /places/config
   * Tries multiple Flask AI endpoints to discover the full campus list.
   * Falls back to FALLBACK_CONFIG only when ALL Flask attempts fail.
   */
  async getConfig() {
    const aiApiUrl = config.aiApiUrl;
    if (aiApiUrl) {
      // Attempt 1: GET /data/config
      try {
        const res = await axios.get(`${aiApiUrl}/data/config`, { timeout: 5000 });
        const campuses = this._extractCampuses(res.data);
        if (campuses.length > 0) {
          console.log(`[PlaceService] Flask /data/config → ${campuses.length} campuses`);
          return this._buildConfig('flask:/data/config', campuses, res.data);
        }
      } catch (e) { console.warn('[PlaceService] Flask /data/config failed:', e.message); }

      // Attempt 2: GET /campuses
      try {
        const res = await axios.get(`${aiApiUrl}/campuses`, { timeout: 5000 });
        const campuses = this._extractCampuses(res.data);
        if (campuses.length > 0) {
          console.log(`[PlaceService] Flask /campuses → ${campuses.length} campuses`);
          return this._buildConfig('flask:/campuses', campuses, {});
        }
      } catch (e) { console.warn('[PlaceService] Flask /campuses failed:', e.message); }

      // Attempt 3: GET /data  (some Flask apps expose raw data summary here)
      try {
        const res = await axios.get(`${aiApiUrl}/data`, { timeout: 5000 });
        const campuses = this._extractCampuses(res.data);
        if (campuses.length > 0) {
          console.log(`[PlaceService] Flask /data → ${campuses.length} campuses`);
          return this._buildConfig('flask:/data', campuses, {});
        }
      } catch (e) { console.warn('[PlaceService] Flask /data failed:', e.message); }

      // Attempt 4: POST /chat with special_action=list_campuses
      try {
        const res = await axios.post(`${aiApiUrl}/chat`, {
          special_action: 'list_campuses',
          user_id: 'system',
          session_id: `config_${Date.now()}`,
        }, { timeout: 8000 });
        const campuses = this._extractCampuses(res.data);
        if (campuses.length > 0) {
          console.log(`[PlaceService] Flask /chat list_campuses → ${campuses.length} campuses`);
          return this._buildConfig('flask:/chat', campuses, {});
        }
      } catch (e) { console.warn('[PlaceService] Flask /chat list_campuses failed:', e.message); }
    }

    console.info('[PlaceService] All Flask attempts failed → using hardcoded fallback config');
    return { ...FALLBACK_CONFIG };
  }

  /** Extract campus objects from any Flask response shape */
  _extractCampuses(data) {
    if (!data) return [];

    // Shape: { campuses: [...] } or { campus_list: [...] } or { data: [...] } or { kampus: [...] }
    const list =
      (Array.isArray(data.campuses)     && data.campuses)     ||
      (Array.isArray(data.campus_list)  && data.campus_list)  ||
      (Array.isArray(data.Kampus)       && data.Kampus)        ||
      (Array.isArray(data.kampus)       && data.kampus)        ||
      (Array.isArray(data.kampus_list)  && data.kampus_list)   ||
      (Array.isArray(data.universities) && data.universities)  ||
      (Array.isArray(data.data)         && data.data)          ||
      (Array.isArray(data)              && data)               ||
      [];

    return list
      .map(c => {
        const rawName = typeof c === 'string' ? c : (c.name || c.Kampus || c.campus || c.university || '');
        const name = rawName.trim();
        if (!name) return null;
        // Use our known coordinates if available, otherwise null (no demo mode for unknown campuses)
        const known = FALLBACK_CONFIG.campusCenters?.[name];
        return {
          name,
          lat: c.lat ?? c.latitude  ?? known?.lat ?? null,
          lon: c.lon ?? c.longitude ?? c.lng ?? known?.lon ?? null,
        };
      })
      .filter(Boolean);
  }

  /** Merge extracted campuses with the full FALLBACK_CONFIG structure */
  _buildConfig(source, campuses, flaskData) {
    return {
      ...FALLBACK_CONFIG,
      source,
      campuses,
      // Keep our known campus centers for any campus we have coords for
      campusCenters: campuses.reduce((acc, c) => {
        if (c.lat && c.lon) acc[c.name] = { lat: c.lat, lon: c.lon };
        return acc;
      }, { ...FALLBACK_CONFIG.campusCenters }),
      categoryGroups:   flaskData.categoryGroups   || FALLBACK_CONFIG.categoryGroups,
      categoryApiValue: flaskData.categoryApiValue || FALLBACK_CONFIG.categoryApiValue,
      lainnyaCategories: flaskData.lainnyaCategories || FALLBACK_CONFIG.lainnyaCategories,
    };
  }

  /**
   * GET /places/nearby — keeps original Google Maps integration.
   */
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
   * POST /places/recommend — calls Flask AI, normalises response.
   */
  async getRecommendations(userId, { selected_uni, selected_cat, lat, lon, session_id }) {
    const aiApiUrl = config.aiApiUrl;
    if (!aiApiUrl) throw new Error('AI_API_URL is not configured in .env');

    const payload = {
      user_id: userId,
      session_id: session_id || `session_${userId}_${Date.now()}`,
      special_action: 'recommendation_proximity',
      selected_uni,
      selected_cat,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    };

    try {
      const response = await axios.post(`${aiApiUrl}/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('RAW AI PLACE RESPONSE:', JSON.stringify(response.data, null, 2));
      }
      const data = response.data;
      const rawList = data?.recommendations || data?.results || data?.data ||
        (Array.isArray(data) ? data : null);

      if (Array.isArray(rawList)) {
        // Save history log
        try {
          const prisma = require('../../common/config/prisma');
          await prisma.history.create({
            data: {
              userId,
              action: 'SEARCHED_PLACE',
              metadata: {
                campus: selected_uni,
                category: selected_cat,
                resultCount: rawList.length
              }
            }
          });
        } catch (e) {
          console.warn('[PlaceService] Failed to save search history log:', e.message);
        }

        return rawList.map((item, idx) => this._normalizeItem(item, idx, selected_cat));
      }

      // Freeform text fallback
      return [{
        id: '1', rank: 1, name: 'Rekomendasi AI', category: selected_cat,
        distanceMeters: null, distanceText: '-',
        address: typeof data?.response === 'string' ? data.response : JSON.stringify(data),
        description: '', mapLink: '', rating: null, lat: null, lon: null,
      }];
    } catch (error) {
      console.error('[PlaceService] getRecommendations error:', error.response?.data || error.message);
      const err = new Error('Gagal mendapatkan rekomendasi tempat dari layanan AI.');
      err.statusCode = 502; throw err;
    }
  }

  _normalizeItem(item, idx, fallbackCategory) {
    const rank = idx + 1;
    const name     = item.Nama_Tempat || item.name || item.nama || item.Nama || `Tempat ${rank}`;
    const category = item.Kategori_Awal || item.category || item.kategori || item.Kategori || fallbackCategory || '';
    const mapLink  = item.Google_Maps_Link || item.mapLink || item.map_link || item.maps_url || item.google_maps_url || '';
    
    // Parse coordinates if they are provided, otherwise extract from mapLink query
    let lat = item.Latitude  || item.lat  || item.latitude  || null;
    let lon = item.Longitude || item.lon  || item.lng       || item.longitude || null;

    let parsedLat = lat !== null ? parseFloat(lat) : null;
    let parsedLon = lon !== null ? parseFloat(lon) : null;

    if ((parsedLat === null || parsedLon === null || isNaN(parsedLat) || isNaN(parsedLon)) && mapLink) {
      const coordsMatch = mapLink.match(/(?:query|q|search\/|@)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i) ||
                          mapLink.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordsMatch) {
        const latVal = parseFloat(coordsMatch[1]);
        const lonVal = parseFloat(coordsMatch[2]);
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          parsedLat = latVal;
          parsedLon = lonVal;
        }
      }
    }

    const address  = item.address || item.alamat || item.Alamat || '';
    const rawRating = item.Rating || item.rating;

    // Distance — Jarak_KM is km in the CSV
    let distanceMeters = null;
    if (item.Jarak_KM != null) {
      const km = parseFloat(item.Jarak_KM);
      distanceMeters = isNaN(km) ? null : Math.round(km * 1000);
    } else {
      const raw = extractRawDistance(item);
      distanceMeters = parseDistanceToMeters(raw);
      // If field name contains 'km' and value looks like km (<50), convert
      const isKmField = ['distance_km', 'Jarak_km'].some(k => item[k] != null);
      if (isKmField && typeof raw === 'number' && raw < 50) distanceMeters = Math.round(raw * 1000);
    }

    const rawReviews = item.Total_Reviews || item.total_reviews || item.reviewCount || item.reviews;
    const reviews = rawReviews != null && !isNaN(parseInt(rawReviews, 10)) ? parseInt(rawReviews, 10) : null;

    return {
      id:             item.id || String(rank),
      rank,
      name,
      category,
      distanceMeters,
      distanceText:   formatDistanceLabel(distanceMeters) || '-',
      address,
      description:    item.description || item.deskripsi || item.Deskripsi || item.Tags || '',
      mapLink,
      rating:         rawRating != null && !isNaN(parseFloat(rawRating)) ? parseFloat(rawRating) : null,
      reviews,
      lat:            parsedLat && !isNaN(parsedLat) ? parsedLat : null,
      lon:            parsedLon && !isNaN(parsedLon) ? parsedLon : null,
    };
  }
}

module.exports = new PlaceService();
