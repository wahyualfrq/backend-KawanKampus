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
}

module.exports = new ChatbotController();
