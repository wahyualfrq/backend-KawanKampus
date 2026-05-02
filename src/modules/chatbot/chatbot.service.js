const axios = require('axios');
const config = require('../../common/config/env');

class ChatbotService {
  async getChatResponse(userMessage) {
    if (!config.aiApiUrl || !config.aiApiKey) {
      throw new Error('AI API configuration is missing');
    }

    try {
      const payload = {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are KawanKampus AI, an academic assistant for university students. Only answer questions related to academics, study recommendations, or campus life."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      };

      const response = await axios.post(config.aiApiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${config.aiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        reply: response.data.choices[0].message.content,
        source: 'ai'
      };
    } catch (error) {
      console.error('[ChatbotService Error]', error.response?.data || error.message);
      const err = new Error('Failed to communicate with external AI API');
      err.statusCode = 502;
      throw err;
    }
  }
}

module.exports = new ChatbotService();
