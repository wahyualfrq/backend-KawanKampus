const taskRepository = require('./task.repository');

class TaskService {
  async getTasks(userId, query) {
    // Use a high limit so the Kanban board gets all tasks (client does filtering)
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

    return taskRepository.createTask({
      title,
      description: description || null,
      status:      status    || 'TODO',
      category:    category  || 'Akademik',
      priority:    priority  || 'Medium',
      dueDate:     dueDate   ? new Date(dueDate) : null,
      userId,
    });
  }

  async updateTask(taskId, userId, updateData) {
    const { title, description, status, category, priority, dueDate } = updateData;

    // Build only provided fields
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

    // Return the full updated task so the frontend store can merge it correctly
    const updated = await taskRepository.findById(taskId, userId);
    return updated;
  }

  async deleteTask(taskId, userId) {
    const result = await taskRepository.deleteTask(taskId, userId);

    if (result.count === 0) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    return { id: taskId };
  }
}

module.exports = new TaskService();
