const prisma = require('../../common/config/prisma');

class TaskRepository {
  async findTasksByUserId(userId, { status, category, priority, skip, take, sortBy }) {
    const where = { userId };
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    return prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: sortBy || 'desc' },
    });
  }

  async countTasks(userId, { status, category, priority }) {
    const where = { userId };
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    return prisma.task.count({ where });
  }

  async createTask(data) {
    return prisma.task.create({ data });
  }

  async updateTask(id, userId, data) {
    // Use update (not updateMany) to get the updated record back
    return prisma.task.updateMany({
      where: { id, userId },
      data,
    });
  }

  /** Find a single task by id + userId (for returning after update) */
  async findById(id, userId) {
    return prisma.task.findFirst({ where: { id, userId } });
  }

  async deleteTask(id, userId) {
    return prisma.task.deleteMany({
      where: { id, userId },
    });
  }
}

module.exports = new TaskRepository();
