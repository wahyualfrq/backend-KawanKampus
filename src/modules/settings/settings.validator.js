const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    phone: z.string().nullable().optional(),
    university: z.string().nullable().optional(),
    faculty: z.string().nullable().optional(),
    prodi: z.string().nullable().optional(),
    cohortYear: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    bio: z.string().max(160, 'Bio must be at most 160 characters').nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }),
});

const updatePreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.enum(['id', 'en']).optional(),
    distanceUnit: z.enum(['meter', 'kilometer']).optional(),
    timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    chatbotHistoryEnabled: z.boolean().optional(),
    locationAccessEnabled: z.boolean().optional(),
    privacyMode: z.boolean().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  }),
});

const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password confirmation is required'),
  }),
});

module.exports = {
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
