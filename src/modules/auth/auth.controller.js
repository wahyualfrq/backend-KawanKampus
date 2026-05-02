const authService = require('./auth.service');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result, message: 'User registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({ success: true, data: result, message: 'Login successful' });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      res.status(200).json({ success: true, data: { user: req.user }, message: 'User profile retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
