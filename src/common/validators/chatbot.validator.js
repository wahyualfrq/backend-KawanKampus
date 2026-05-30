const { z } = require('zod');

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
    session_id: z.string().optional(),
  }),
});

/**
 * Validator for POST /api/v1/chatbot/place-recommendation
 * Chatbot place recommendation uses AI_API_URL (chatbot service), NOT PLACE_RECOMMENDER_API_URL.
 */
const placeRecommendationSchema = z.object({
  body: z.object({
    selected_uni: z.string().min(1, 'selected_uni is required'),
    selected_cat: z.string().min(1, 'selected_cat is required'),
    lat:          z.number({ required_error: 'lat is required' }),
    lon:          z.number({ required_error: 'lon is required' }),
    session_id:   z.string().optional(),
  }),
});

module.exports = { chatSchema, placeRecommendationSchema };
