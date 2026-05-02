const taskService = require('./task.service');

class TaskController {
  async getTasks(req, res, next) {
    try {
      const result = await taskService.getTasks(req.user.userId, req.query);
      res.status(200).json({ success: true, data: result, message: 'Tasks retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.user.userId, req.body);
      res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const result = await taskService.updateTask(id, req.user.userId, req.body);
      res.status(200).json({ success: true, data: result, message: 'Task updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const result = await taskService.deleteTask(id, req.user.userId);
      res.status(200).json({ success: true, data: result, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
