const app = require('./app');
const config = require('./common/config/env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const startServer = async () => {
  try {
    // Test Database Connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(config.port, () => {
      console.log(`🚀 KawanKampus API is running on http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
