const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const errorHandler = require('./common/middleware/error.middleware');
const config = require('./common/config/env');

// Global Uncaught Exception & Rejection Handlers to prevent serverless function crash
process.on('uncaughtException', (error) => {
  console.error('🔥 CRITICAL: Uncaught Exception detected:', error.message, error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL: Unhandled Rejection at Promise:', promise, 'reason:', reason);
});

// Validate key environment variables on startup
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is missing!');
}
if (!process.env.JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET environment variable is missing. Falling back to default.');
}

// Route Imports
const authRoutes = require('./modules/auth/auth.routes');
const taskRoutes = require('./modules/task/task.routes');
const placeRoutes = require('./modules/place/place.routes');
const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
const favoriteRoutes = require('./modules/favorite/favorite.routes');
const historyRoutes = require('./modules/history/history.routes');
const settingsRoutes = require('./modules/settings/settings.routes');

const app = express();

// Security Headers
app.use(helmet());

// Dynamic CORS Configuration
const allowedOrigins = config.allowedOrigins 
  ? config.allowedOrigins.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Compression for performance
app.use(compression());

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 150, // Limit each IP to 150 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Payload limit setup (secure against huge inputs, but allows base64 avatar uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/places', placeRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/histories', historyRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global Error Handler (must be the last middleware)
app.use(errorHandler);

module.exports = app;
