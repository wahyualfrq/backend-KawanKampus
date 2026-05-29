const axios = require('axios');
const config = require('../../common/config/env');
const prisma = require('../../common/config/prisma');

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

      // Save to ChatLog (best-effort — don't fail the request if DB save fails)
      try {
        await prisma.chatLog.create({
          data: {
            userId,
            message,
            response: aiReply,
            context: { session_id: payload.session_id, task_mode: true },
          },
        });

        // Save History log
        await prisma.history.create({
          data: {
            userId,
            action: 'ASKED_CHATBOT',
            metadata: {
              message: message.length > 120 ? `${message.substring(0, 120)}...` : message,
              response: aiReply.length > 120 ? `${aiReply.substring(0, 120)}...` : aiReply
            }
          }
        });
      } catch (dbErr) {
        console.warn('[ChatbotService] Failed to save ChatLog/History:', dbErr.message);
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
   * Place recommendation mode: forwards proximity request to Flask AI /chat
   */
  async getPlaceRecommendations(userId, { selected_uni, selected_cat, lat, lon, sessionId }) {
    const aiApiUrl = config.aiApiUrl;
    if (!aiApiUrl) {
      throw new Error('AI_API_URL is not configured in .env');
    }

    const payload = {
      user_id: userId,
      session_id: sessionId || `session_${userId}_${Date.now()}`,
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

      // The Flask AI may return results inside different keys; try to extract
      const data = response.data;
      const recommendations =
        data?.recommendations ||
        data?.results ||
        data?.data ||
        data?.response ||
        data;

      return { recommendations, raw: data };
    } catch (error) {
      console.error('[ChatbotService Place Error]', error.response?.data || error.message);
      const err = new Error('Gagal mendapatkan rekomendasi tempat dari layanan AI.');
      err.statusCode = 502;
      throw err;
    }
  }
}

module.exports = new ChatbotService();
