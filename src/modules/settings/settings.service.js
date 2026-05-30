const bcrypt = require('bcrypt');
const prisma = require('../../common/config/prisma');

class SettingsService {
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        university: true,
        faculty: true,
        prodi: true,
        cohortYear: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const err = new Error('Pengguna tidak ditemukan.');
      err.statusCode = 404;
      throw err;
    }

    return user;
  }

  async updateProfile(userId, data) {
    // Exclude restricted fields
    const { email, password, role, ...updateData } = data;

    // Additional validation for base64 avatars
    if (updateData.avatarUrl && updateData.avatarUrl.startsWith('data:')) {
      if (!updateData.avatarUrl.startsWith('data:image/')) {
        const err = new Error('Format foto profil tidak valid. Harus berupa gambar.');
        err.statusCode = 400;
        throw err;
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        university: true,
        faculty: true,
        prodi: true,
        cohortYear: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async getPreferences(userId) {
    // Check if settings already exist, otherwise create defaults automatically
    return prisma.userSetting.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId, data) {
    return prisma.userSetting.update({
      where: { userId },
      data,
    });
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const err = new Error('Pengguna tidak ditemukan.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const err = new Error('Kata sandi saat ini salah.');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  async deleteAccount(userId, password) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const err = new Error('Pengguna tidak ditemukan.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Konfirmasi kata sandi salah.');
      err.statusCode = 400;
      throw err;
    }

    // Cascade delete via Prisma/PostgreSQL schema setup
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  async clearHistory(userId) {
    const [historiesDeleted, chatLogsDeleted] = await prisma.$transaction([
      prisma.history.deleteMany({ where: { userId } }),
      prisma.chatLog.deleteMany({ where: { userId } }),
    ]);

    return {
      success: true,
      historiesCount: historiesDeleted.count,
      chatLogsCount: chatLogsDeleted.count,
    };
  }
}

module.exports = new SettingsService();
