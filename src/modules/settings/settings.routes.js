const express = require('express');
const settingsController = require('./settings.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const {
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require('./settings.validator');

const router = express.Router();

router.use(authenticate);

router.get('/profile', settingsController.getProfile);
router.put('/profile', validate(updateProfileSchema), settingsController.updateProfile);

router.get('/preferences', settingsController.getPreferences);
router.put('/preferences', validate(updatePreferencesSchema), settingsController.updatePreferences);

router.put('/security/password', validate(changePasswordSchema), settingsController.changePassword);

router.delete('/account', validate(deleteAccountSchema), settingsController.deleteAccount);

router.post('/privacy/clear-history', settingsController.clearHistory);

module.exports = router;
