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
    selected_uni:    z.string().min(1, 'selected_uni is required'),
    selected_cat:    z.string().optional(),
    lat:             z.number().optional(),
    lon:             z.number().optional(),
    session_id:      z.string().optional(),
    actual_category: z.string().optional(),
    searchQuery:     z.string().optional(),
  }),
});

module.exports = { getNearbyPlacesSchema, recommendPlacesSchema };

