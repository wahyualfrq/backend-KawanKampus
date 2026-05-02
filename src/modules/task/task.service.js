const taskRepository = require('./task.repository');

class TaskService {
  async getTasks(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const tasks = await taskRepository.findTasksByUserId(userId, {
      status: query.status,
      skip,
      take: limit,
      sortBy: query.sortBy
    });
    
    const total = await taskRepository.countTasks(userId, { status: query.status });
    
    return {
      tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createTask(userId, taskData) {
    const { title, description, status } = taskData;
    

    return taskRepository.createTask({
      title,
      description,
      status: status || 'TODO',
      userId,
    });
  }

  async updateTask(taskId, userId, updateData) {
    const result = await taskRepository.updateTask(taskId, userId, updateData);
    
    if (result.count === 0) {
      const error = new Error('Task not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    
    return { id: taskId, ...updateData };
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
