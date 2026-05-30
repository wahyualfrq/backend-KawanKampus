const chatbotService = require('./chatbot.service');

class ChatbotController {
  /**
   * POST /api/v1/chatbot
   * Body: { message, session_id? }
   * Sends message to Flask AI in task_mode and returns the AI reply.
   */
  async chat(req, res, next) {
    try {
      const { message, session_id } = req.body;
      const userId = req.user.userId;

      const result = await chatbotService.getChatResponse(userId, message, session_id);

      res.status(200).json({
        success: true,
        data: result,
        message: 'AI response generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chatbot/place-recommendation
   * Body: { selected_uni, selected_cat, lat, lon, session_id? }
   * Uses AI_API_URL/chat with special_action=recommendation_proximity.
   * This is part of the chatbot conversational service — NOT the Places/Map page.
   */
  async placeRecommendation(req, res, next) {
    try {
      const { selected_uni, selected_cat, lat, lon, session_id } = req.body;
      const userId = req.user.userId;

      const result = await chatbotService.getPlaceRecommendation(userId, {
        selected_uni,
        selected_cat,
        lat,
        lon,
        session_id,
      });

      res.status(200).json({
        success: true,
        message: 'Recommendations generated successfully',
        data: {
          reply:           result.reply,
          recommendations: result.recommendations || [],
        },
      });
    } catch (error) {
      // Return controlled error shape for CHATBOT_PLACE_RECOMMENDATION_FAILED
      if (error.code === 'CHATBOT_PLACE_RECOMMENDATION_FAILED') {
        return res.status(200).json({
          success: false,
          code:    'CHATBOT_PLACE_RECOMMENDATION_FAILED',
          message: error.message || 'Rekomendasi tempat belum bisa diproses saat ini.',
          data:    { reply: null, recommendations: [] },
        });
      }
      next(error);
    }
  }
}

module.exports = new ChatbotController();

