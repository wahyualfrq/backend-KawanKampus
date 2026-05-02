const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const config = require('../../common/config/env');

class AuthService {
  async register(data) {
    const { email, password, name } = data;

    // Check if user exists
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await authRepository.createUser({
      email,
      password: hashedPassword,
      name,
    });

    // Generate Token
    const token = this._generateToken(newUser.id, newUser.email);

    return {
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      token,
    };
  }

  async login(email, password) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this._generateToken(user.id, user.email);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  _generateToken(userId, email) {
    return jwt.sign({ userId, email }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  }
}

module.exports = new AuthService();
