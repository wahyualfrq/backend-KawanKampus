const taskRepository = require('./task.repository');
const prisma = require('../../common/config/prisma');

class TaskService {
  async getTasks(userId, query) {
    const page  = parseInt(query.page)  || 1;
    const limit = parseInt(query.limit) || 200;
    const skip  = (page - 1) * limit;

    const tasks = await taskRepository.findTasksByUserId(userId, {
      status:   query.status,
      category: query.category,
      priority: query.priority,
      skip,
      take:    limit,
      sortBy:  query.sortBy,
    });

    const total = await taskRepository.countTasks(userId, {
      status:   query.status,
      category: query.category,
      priority: query.priority,
    });

    return {
      tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTask(userId, taskData) {
    const { title, description, status, category, priority, dueDate } = taskData;

    const task = await taskRepository.createTask({
      title,
      description: description || null,
      status:      status    || 'TODO',
      category:    category  || 'Akademik',
      priority:    priority  || 'Medium',
      dueDate:     dueDate   ? new Date(dueDate) : null,
      userId,
    });

    try {
      await prisma.history.create({
        data: {
          userId,
          action: 'CREATED_TASK',
          metadata: {
            taskId:      task.id,
            title:       task.title,
            category:    task.category,
            status:      task.status,
            description: task.description || undefined,
          },
        },
      });
    } catch (err) {
      console.warn('[HistoryLog] Failed to create CREATED_TASK history:', err.message);
    }

    return task;
  }

  async updateTask(taskId, userId, updateData) {
    const { title, description, status, category, priority, dueDate } = updateData;

    const previous = await taskRepository.findById(taskId, userId);
    if (!previous) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const data = {};
    if (title       !== undefined) data.title       = title;
    if (description !== undefined) data.description = description;
    if (status      !== undefined) data.status      = status;
    if (category    !== undefined) data.category    = category;
    if (priority    !== undefined) data.priority    = priority;
    if (dueDate     !== undefined) data.dueDate     = dueDate ? new Date(dueDate) : null;

    const result = await taskRepository.updateTask(taskId, userId, data);

    if (result.count === 0) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const updated = await taskRepository.findById(taskId, userId);

    if (updated) {
      try {
        let action = 'UPDATED_TASK';
        let metadata = {
          taskId:           updated.id,
          title:            updated.title,
          category:         updated.category,
          previousTitle:    previous.title,
          previousCategory: previous.category,
          previousStatus:   previous.status,
          newStatus:        updated.status,
        };

        if (previous.status !== updated.status) {
          if (updated.status === 'DONE') {
            action = 'COMPLETED_TASK';
            metadata = {
              taskId:     updated.id,
              title:      updated.title,
              category:   updated.category,
              fromStatus: previous.status,
              toStatus:   'DONE',
            };
          } else {
            action = 'MOVED_TASK';
            metadata = {
              taskId:     updated.id,
              title:      updated.title,
              category:   updated.category,
              fromStatus: previous.status,
              toStatus:   updated.status,
            };
          }
        }

        await prisma.history.create({
          data: {
            userId,
            action,
            metadata,
          },
        });
      } catch (err) {
        console.warn(`[HistoryLog] Failed to create ${previous.status !== updated.status ? 'status change' : 'update'} history:`, err.message);
      }
    }

    return updated;
  }

  async deleteTask(taskId, userId) {
    const previous = await taskRepository.findById(taskId, userId);
    if (!previous) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const result = await taskRepository.deleteTask(taskId, userId);

    if (result.count === 0) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    try {
      await prisma.history.create({
        data: {
          userId,
          action: 'DELETED_TASK',
          metadata: {
            taskId:         previous.id,
            title:          previous.title,
            category:       previous.category,
            previousStatus: previous.status,
          },
        },
      });
    } catch (err) {
      console.warn('[HistoryLog] Failed to create DELETED_TASK history:', err.message);
    }

    return { id: taskId };
  }
}

module.exports = new TaskService();
