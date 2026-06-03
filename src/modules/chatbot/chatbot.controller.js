const chatbotService = require('./chatbot.service');

class ChatbotController {
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

