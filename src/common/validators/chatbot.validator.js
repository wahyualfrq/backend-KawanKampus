const { z } = require('zod');

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required')
  })
});

module.exports = { chatSchema };
