const chatbotService = require('./chatbot.service');

class ChatbotController {
  async chat(req, res, next) {
    try {
      const { message } = req.body;
      const result = await chatbotService.getChatResponse(message);
      res.status(200).json({
        success: true,
        data: result,
        message: 'AI response generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatbotController();
