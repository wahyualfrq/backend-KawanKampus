const { z } = require('zod');

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
  })
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID')
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
  })
});

const getTasksSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    sortBy: z.enum(['desc', 'asc']).optional()
  })
});

module.exports = { createTaskSchema, updateTaskSchema, getTasksSchema };
