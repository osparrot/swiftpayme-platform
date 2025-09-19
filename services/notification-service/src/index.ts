/**
 * SwiftPayMe Notification Service - Main Application
 * Enhanced notification system with comprehensive features
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import routes from './routes';
import { NotificationService } from './services/NotificationService';
import eventBus from './utils/EventBus';

const app = express();
const PORT = process.env.PORT || 3008;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/swiftpayme_notifications';

// ==================== MIDDLEWARE ====================

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' }
});
app.use(limiter);

// ==================== DATABASE CONNECTION ====================

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// ==================== ROUTES ====================

app.use('/api', routes);

// ==================== NOTIFICATION SERVICE ====================

const notificationService = new NotificationService();

// Event handling
eventBus.on('notification:event', async (event) => {
  try {
    await notificationService.handleEvent(event);
  } catch (error) {
    console.error('Error handling event:', error);
  }
});

// ==================== SCHEDULED TASKS ====================

setInterval(async () => {
  try {
    await notificationService.processPendingNotifications();
  } catch (error) {
    console.error('Error processing pending notifications:', error);
  }
}, 60 * 1000);

// ==================== ERROR HANDLING ====================

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  try {
    server.close();
    await mongoose.connection.close();
    await eventBus.close();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
  console.log(`🚀 SwiftPayMe Notification Service running on port ${PORT}`);
});

export default app;

