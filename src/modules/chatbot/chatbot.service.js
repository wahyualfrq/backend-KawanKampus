const axios = require('axios');
const config = require('../../common/config/env');
const prisma = require('../../common/config/prisma');

// ── Distance parsing helpers ──────────────────────────────────────────────────
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
    if (kmMatch) {
      const n = parseFloat(kmMatch[1].replace(',', '.'));
      return isNaN(n) ? null : Math.round(n * 1000);
    }
    const mMatch = s.match(/(\d+[.,]?\d*)\s*m\b/i);
    if (mMatch) {
      const n = parseFloat(mMatch[1].replace(',', '.'));
      return isNaN(n) ? null : Math.round(n);
    }
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

class ChatbotService {
  /**
   * Task-mode chatbot: sends message to Flask AI /chat with task_mode=true
   * Saves the exchange to ChatLog.
   */
  async getChatResponse(userId, message, sessionId) {
    const aiApiUrl = config.aiApiUrl;
    if (!aiApiUrl) {
      throw new Error('AI_API_URL is not configured in .env');
    }

    const payload = {
      user_id: userId,
      session_id: sessionId || `session_${userId}_${Date.now()}`,
      message,
      task_mode: true,
    };

    try {
      const response = await axios.post(`${aiApiUrl}/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const aiReply =
        response.data?.response ||
        response.data?.reply ||
        response.data?.message ||
        'Maaf, saya tidak dapat memproses permintaan saat ini.';

      let chatbotHistoryEnabled = true;
      try {
        const settings = await prisma.userSetting.findUnique({
          where: { userId },
        });
        if (settings) {
          chatbotHistoryEnabled = settings.chatbotHistoryEnabled;
        }
      } catch (dbErr) {
        console.warn('[ChatbotService] Failed to load user settings:', dbErr.message);
      }

      if (chatbotHistoryEnabled) {
        try {
          await prisma.chatLog.create({
            data: {
              userId,
              message,
              response: aiReply,
              context: { session_id: payload.session_id, task_mode: true },
            },
          });
        } catch (dbErr) {
          console.warn('[ChatbotService] Failed to save ChatLog:', dbErr.message);
        }

        try {
          const messagePreview = message.length > 120 ? `${message.substring(0, 117)}...` : message;
          const responsePreview = aiReply.length > 160 ? `${aiReply.substring(0, 157)}...` : aiReply;

          // Save History log
          await prisma.history.create({
            data: {
              userId,
              action: 'ASKED_CHATBOT',
              metadata: {
                messagePreview,
                responsePreview,
                mode: 'chat'
              }
            }
          });
        } catch (dbErr) {
          console.warn('[ChatbotService] Failed to save History:', dbErr.message);
        }
      }

      return { reply: aiReply, source: 'ai' };
    } catch (error) {
      console.error('[ChatbotService Error]', error.response?.data || error.message);
      const err = new Error('Gagal berkomunikasi dengan layanan AI. Coba lagi.');
      err.statusCode = 502;
      throw err;
    }
  }

  /**
   * Chatbot place recommendation mode.
   * Uses AI_API_URL/chat with special_action=recommendation_proximity.
   * This is part of the chatbot conversational service — NOT the Places/Map page.
   * PLACE_RECOMMENDER_API_URL is NOT used here.
   */
  async getPlaceRecommendation(userId, { selected_uni, selected_cat, lat, lon, session_id }) {
    const aiApiUrl = config.aiApiUrl;
    if (!aiApiUrl) {
      const err = new Error('AI_API_URL is not configured in .env');
      err.statusCode = 503;
      throw err;
    }

    const sessionId = session_id || `session_${userId}_${Date.now()}`;

    const payload = {
      user_id:        userId,
      session_id:     sessionId,
      message:        '',
      special_action: 'recommendation_proximity',
      selected_uni,
      selected_cat,
      lat:            parseFloat(lat),
      lon:            parseFloat(lon),
    };

    try {
      const response = await axios.post(`${aiApiUrl}/chat`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const raw = response.data;

      // Extract recommendations list (multiple possible keys from AI service)
      const rawList =
        raw?.recommendations ||
        raw?.results         ||
        (Array.isArray(raw?.data) ? raw.data : null) ||
        (Array.isArray(raw)       ? raw      : null);

      // Extract free-text reply
      const replyText =
        raw?.response ||
        raw?.reply    ||
        raw?.message  ||
        null;

      // Normalise recommendation items
      const recommendations = Array.isArray(rawList)
        ? rawList.map((item, idx) => this._normalizePlaceItem(item, idx, selected_cat))
        : [];

      let chatbotHistoryEnabled = true;
      try {
        const settings = await prisma.userSetting.findUnique({
          where: { userId },
        });
        if (settings) {
          chatbotHistoryEnabled = settings.chatbotHistoryEnabled;
        }
      } catch (dbErr) {
        console.warn('[ChatbotService] Failed to load user settings:', dbErr.message);
      }

      if (chatbotHistoryEnabled) {
        // Best-effort ChatLog save
        const logMessage  = `Rekomendasi tempat: ${selected_uni} - ${selected_cat}`;
        const logResponse = recommendations.length > 0
          ? `Ditemukan ${recommendations.length} tempat`
          : (replyText || 'Tidak ada hasil');

        try {
          await prisma.chatLog.create({
            data: {
              userId,
              message:  logMessage,
              response: logResponse,
              context: {
                session_id:   sessionId,
                selected_uni,
                selected_cat,
                lat,
                lon,
                mode: 'place_recommendation',
              },
            },
          });
        } catch (dbErr) {
          console.warn('[ChatbotService] Failed to save place recommendation ChatLog:', dbErr.message);
        }
      }

      try {
        await prisma.history.create({
          data: {
            userId,
            action:   'SEARCHED_PLACE',
            metadata: {
              campus: selected_uni,
              category: selected_cat,
              resultCount: recommendations.length,
              rawCategoriesUsed: [selected_cat],
              source: "chatbot_recommendation"
            },
          },
        });
      } catch (dbErr) {
        console.warn('[ChatbotService] Failed to save place recommendation History:', dbErr.message);
      }

      return { reply: replyText, recommendations };
    } catch (error) {
      console.error('[ChatbotService Place Rec Error]', error.response?.data || error.message);
      const err = new Error('Rekomendasi tempat belum bisa diproses saat ini.');
      err.statusCode = 502;
      err.code       = 'CHATBOT_PLACE_RECOMMENDATION_FAILED';
      throw err;
    }
  }

  /** Safely normalise one AI place item — never returns NaN/null in visible fields */
  _normalizePlaceItem(item, idx, fallbackCategory) {
    const rank = idx + 1;
    const name     = item.Nama_Tempat || item.name || item.nama || item.Nama || `Tempat ${rank}`;
    const category = item.Kategori_Awal || item.category || item.kategori || item.Kategori || fallbackCategory || '';
    const mapLink  = item.Google_Maps_Link || item.mapLink || item.map_link || item.maps_url || '';
    const address  = item.address  || item.alamat || item.Alamat || '';
    const description = item.description || item.Tags || '';

    // Distance
    let distanceMeters = null;
    if (item.Jarak_KM != null) {
      const km = parseFloat(item.Jarak_KM);
      distanceMeters = isNaN(km) ? null : Math.round(km * 1000);
    } else {
      const raw = extractRawDistance(item);
      distanceMeters = parseDistanceToMeters(raw);
      const isKmField = ['distance_km', 'Jarak_km'].some(k => item[k] != null);
      if (isKmField && typeof raw === 'number' && raw < 50) distanceMeters = Math.round(raw * 1000);
    }

    const rawDist = extractRawDistance(item);
    const distanceText = formatDistanceLabel(distanceMeters) || 
      (typeof rawDist === 'string' ? rawDist.replace('📍 Jarak:', '').trim() : null);

    // Rating
    const rawRating = item.Rating ?? item.rating;
    const rating    = rawRating != null && !isNaN(parseFloat(rawRating)) ? parseFloat(rawRating) : null;

    // Reviews
    const rawReviews = item.Total_Reviews ?? item.total_reviews ?? item.reviews;
    const reviews    = rawReviews != null && !isNaN(parseInt(rawReviews, 10)) ? parseInt(rawReviews, 10) : null;

    return {
      id:             item.id || String(rank),
      rank,
      name,
      category,
      distanceMeters,
      distanceText,
      mapLink,
      address,
      description,
      rating,
      reviews,
    };
  }
}

module.exports = new ChatbotService();
