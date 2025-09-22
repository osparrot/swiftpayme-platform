/**
 * SwiftPayMe Analytics Service - Main Application
 * Business intelligence and data analytics microservice
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import cron from 'node-cron';
import routes from './routes';
import { Logger } from './utils/Logger';
import { AnalyticsService } from './services/AnalyticsService';

const app = express();
const PORT = process.env.PORT || 3012;

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ROUTES ====================
app.use('/api/v1', routes);

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'SwiftPayMe Analytics Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Analytics Service Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== 404 HANDLER ====================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// ==================== DATABASE CONNECTION ====================
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpayme_analytics';
    await mongoose.connect(mongoUri);
    Logger.info('Analytics Service connected to MongoDB');
  } catch (error) {
    Logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// ==================== SCHEDULED TASKS ====================
const initializeScheduledTasks = (): void => {
  const analyticsService = new AnalyticsService();
  
  // Generate daily reports at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      Logger.info('Starting daily analytics report generation');
      await analyticsService.generateDailyReport();
      Logger.info('Daily analytics report generated successfully');
    } catch (error) {
      Logger.error('Error generating daily report:', error);
    }
  });
  
  // Generate weekly reports on Sundays at 3 AM
  cron.schedule('0 3 * * 0', async () => {
    try {
      Logger.info('Starting weekly analytics report generation');
      await analyticsService.generateWeeklyReport();
      Logger.info('Weekly analytics report generated successfully');
    } catch (error) {
      Logger.error('Error generating weekly report:', error);
    }
  });
  
  // Generate monthly reports on the 1st at 4 AM
  cron.schedule('0 4 1 * *', async () => {
    try {
      Logger.info('Starting monthly analytics report generation');
      await analyticsService.generateMonthlyReport();
      Logger.info('Monthly analytics report generated successfully');
    } catch (error) {
      Logger.error('Error generating monthly report:', error);
    }
  });
  
  // Update real-time metrics every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await analyticsService.updateRealTimeMetrics();
    } catch (error) {
      Logger.error('Error updating real-time metrics:', error);
    }
  });
  
  Logger.info('Analytics scheduled tasks initialized');
};

// ==================== SERVER STARTUP ====================
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    initializeScheduledTasks();
    
    app.listen(PORT, () => {
      Logger.info(`SwiftPayMe Analytics Service running on port ${PORT}`);
      Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      Logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    Logger.error('Failed to start Analytics Service:', error);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close database connection
  mongoose.connection.close(() => {
    Logger.info('MongoDB connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer().catch((error) => {
  Logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;

