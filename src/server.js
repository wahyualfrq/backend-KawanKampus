const app = require('./app');
const config = require('./common/config/env');
const prisma = require('./common/config/prisma');

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully via Singleton');

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
