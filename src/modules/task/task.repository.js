const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TaskRepository {
  async findTasksByUserId(userId, { status, skip, take, sortBy }) {
    const where = { userId };
    if (status) where.status = status;
    
    return prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: sortBy || 'desc' },
    });
  }

  async countTasks(userId, { status }) {
    const where = { userId };
    if (status) where.status = status;
    return prisma.task.count({ where });
  }

  async createTask(data) {
    return prisma.task.create({ data });
  }

  async updateTask(id, userId, data) {
    return prisma.task.updateMany({
      where: { id, userId },
      data,
    });
  }

  async deleteTask(id, userId) {
    return prisma.task.deleteMany({
      where: { id, userId },
    });
  }
}

module.exports = new TaskRepository();
