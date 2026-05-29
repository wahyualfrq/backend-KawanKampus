const settingsService = require('./settings.service');

class SettingsController {
  async getProfile(req, res, next) {
    try {
      const profile = await settingsService.getProfile(req.user.userId);
      res.status(200).json({
        success: true,
        data: profile,
        message: 'Profil berhasil diambil.',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await settingsService.updateProfile(req.user.userId, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Profil berhasil diperbarui.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req, res, next) {
    try {
      const preferences = await settingsService.getPreferences(req.user.userId);
      res.status(200).json({
        success: true,
        data: preferences,
        message: 'Preferensi berhasil diambil.',
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const updated = await settingsService.updatePreferences(req.user.userId, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Preferensi berhasil diperbarui.',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Kata sandi baru dan konfirmasi kata sandi tidak cocok.',
        });
      }

      await settingsService.changePassword(req.user.userId, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: 'Kata sandi berhasil diubah.',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const { password } = req.body;
      await settingsService.deleteAccount(req.user.userId, password);
      res.status(200).json({
        success: true,
        message: 'Akun Anda berhasil dihapus secara permanen.',
      });
    } catch (error) {
      next(error);
    }
  }

  async clearHistory(req, res, next) {
    try {
      const result = await settingsService.clearHistory(req.user.userId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat pencarian tempat dan obrolan AI berhasil dibersihkan.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
