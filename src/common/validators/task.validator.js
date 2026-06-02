const { z } = require('zod');

const CATEGORIES = ['Akademik', 'Proyek', 'Organisasi', 'Pengembangan Diri', 'Lainnya'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES  = ['TODO', 'IN_PROGRESS', 'DONE'];

const createTaskSchema = z.object({
  body: z.object({
    title:       z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    status:      z.enum(STATUSES).optional(),
    category:    z.string().optional(),
    priority:    z.enum(PRIORITIES).optional(),
    dueDate:     z.string().datetime({ offset: true }).optional().nullable(),
  })
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID')
  }),
  body: z.object({
    title:       z.string().min(1).optional(),
    description: z.string().optional(),
    status:      z.enum(STATUSES).optional(),
    category:    z.string().optional(),
    priority:    z.enum(PRIORITIES).optional(),
    dueDate:     z.string().datetime({ offset: true }).optional().nullable(),
  })
});

const getTasksSchema = z.object({
  query: z.object({
    page:     z.string().regex(/^\d+$/).optional(),
    limit:    z.string().regex(/^\d+$/).optional(),
    status:   z.enum(STATUSES).optional(),
    category: z.string().optional(),
    priority: z.enum(PRIORITIES).optional(),
    sortBy:   z.enum(['desc', 'asc']).optional(),
  })
});

module.exports = { createTaskSchema, updateTaskSchema, getTasksSchema };
