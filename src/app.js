const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const errorHandler = require('./common/middleware/error.middleware');
const config = require('./common/config/env');

process.on('uncaughtException', (error) => {
  console.error('🔥 CRITICAL: Uncaught Exception detected:', error.message, error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL: Unhandled Rejection at Promise:', promise, 'reason:', reason);
});

if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is missing!');
}
if (!process.env.JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET environment variable is missing. Falling back to default.');
}

const authRoutes = require('./modules/auth/auth.routes');
const taskRoutes = require('./modules/task/task.routes');
const placeRoutes = require('./modules/place/place.routes');
const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
const favoriteRoutes = require('./modules/favorite/favorite.routes');
const historyRoutes = require('./modules/history/history.routes');
const settingsRoutes = require('./modules/settings/settings.routes');

const app = express();

app.use(helmet());

const allowedOrigins = config.allowedOrigins 
  ? config.allowedOrigins.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
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

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 150,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/places', placeRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/histories', historyRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Welcome to KawanKampus API Production Serverless', 
    timestamp: new Date() 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use(errorHandler);

module.exports = app;
