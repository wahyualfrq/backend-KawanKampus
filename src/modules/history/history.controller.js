const prisma = require('../../common/config/prisma');

class HistoryController {
  async getHistories(req, res, next) {
    try {
      const userId = req.user.userId;
      const histories = await prisma.history.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: histories,
        message: 'Histories retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async createHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { action, metadata } = req.body;

      if (!action) {
        return res.status(400).json({ success: false, message: 'Action is required' });
      }

      const history = await prisma.history.create({
        data: {
          userId,
          action,
          metadata: metadata || {}
        }
      });

      res.status(201).json({
        success: true,
        data: history,
        message: 'History activity saved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const record = await prisma.history.findFirst({
        where: { id, userId }
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'History record not found' });
      }

      await prisma.history.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'History record deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  async clearHistories(req, res, next) {
    try {
      const userId = req.user.userId;

      await prisma.history.deleteMany({
        where: { userId }
      });

      res.status(200).json({
        success: true,
        message: 'All history activities cleared'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HistoryController();
