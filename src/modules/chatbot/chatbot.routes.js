const express = require('express');
const chatbotController = require('./chatbot.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { chatSchema, placeRecommendationSchema } = require('../../common/validators/chatbot.validator');

const router = express.Router();

router.use(authenticate);

// POST /api/v1/chatbot — Bantu Tugas (task-help AI chat)
router.post('/', validate(chatSchema), chatbotController.chat.bind(chatbotController));

// POST /api/v1/chatbot/place-recommendation — Chatbot place recommendation via AI_API_URL
// Note: uses chatbot AI service (AI_API_URL), NOT PLACE_RECOMMENDER_API_URL
router.post(
  '/place-recommendation',
  validate(placeRecommendationSchema),
  chatbotController.placeRecommendation.bind(chatbotController)
);

module.exports = router;

