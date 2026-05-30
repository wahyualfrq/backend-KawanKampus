const express = require('express');
const cors = require('cors');
const errorHandler = require('./common/middleware/error.middleware');

// Route Imports
const authRoutes = require('./modules/auth/auth.routes');
const taskRoutes = require('./modules/task/task.routes');
const placeRoutes = require('./modules/place/place.routes');
const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
const favoriteRoutes = require('./modules/favorite/favorite.routes');
const historyRoutes = require('./modules/history/history.routes');
const settingsRoutes = require('./modules/settings/settings.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
