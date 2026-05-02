const express = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../../common/validators/auth.validator');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.get('/me', authenticate, authController.getMe.bind(authController));

module.exports = router;
