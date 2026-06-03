const cron = require('node-cron');
const prisma = require('../config/prisma');

/**
 * Deletes all history entries that were created before today's date.
 */
const cleanHistory = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await prisma.history.deleteMany({
      where: {
        createdAt: {
          lt: todayStart,
        },
      },
    });

    console.log(`🧹 [Cron] Auto cleanup: Deleted ${result.count} history logs from previous dates.`);
  } catch (error) {
    console.error('❌ [Cron] Auto cleanup error:', error);
  }
};

/**
 * Initializes all cron schedulers.
 */
const initScheduler = () => {
  // Run cleanup once on startup
  cleanHistory();

  // Run cleanup every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('⏰ Running scheduled history cleanup at midnight...');
    cleanHistory();
  });

  console.log('📅 Scheduler initialized: daily history cleanup scheduled at midnight (00:00).');
};

module.exports = {
  initScheduler,
};
