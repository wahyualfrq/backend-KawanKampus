const { PrismaClient } = require('@prisma/client');

// Singleton pattern — reuse a single PrismaClient across all modules
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;
