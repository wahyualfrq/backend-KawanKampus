const { z } = require('zod');

const getNearbyPlacesSchema = z.object({
  query: z.object({
    lat: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid latitude'),
    lng: z.string().refine(val => !isNaN(parseFloat(val)), 'Invalid longitude'),
    category: z.string().min(1, 'Category is required')
  })
});

module.exports = { getNearbyPlacesSchema };
