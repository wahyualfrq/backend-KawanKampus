const { z } = require('zod');

const getNearbyPlacesSchema = z.object({
  query: z.object({
    lat: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid latitude'),
    lng: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid longitude'),
    category: z.string().min(1, 'Category is required'),
  }),
});

const recommendPlacesSchema = z.object({
  body: z.object({
    selected_uni: z.string().min(1, 'selected_uni is required'),
    selected_cat: z.string().min(1, 'selected_cat is required'),
    lat: z.number({ required_error: 'lat is required' }),
    lon: z.number({ required_error: 'lon is required' }),
    session_id: z.string().optional(),
  }),
});

module.exports = { getNearbyPlacesSchema, recommendPlacesSchema };
