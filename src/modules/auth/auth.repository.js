const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AuthRepository {
  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(userData) {
    return prisma.user.create({ data: userData });
  }
}

module.exports = new AuthRepository();
