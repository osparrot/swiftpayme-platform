/**
 * SwiftPayMe Compliance Service - Main Application
 * Regulatory compliance, AML/KYC, and risk management microservice
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import cron from 'node-cron';
import routes from './routes';
import { Logger } from './utils/Logger';
import { ComplianceService } from './services/ComplianceService';

const app = express();
const PORT = process.env.PORT || 3013;

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
    service: 'SwiftPayMe Compliance Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Compliance Service Error:', err);
  
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
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpayme_compliance';
    await mongoose.connect(mongoUri);
    Logger.info('Compliance Service connected to MongoDB');
  } catch (error) {
    Logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// ==================== SCHEDULED TASKS ====================
const initializeScheduledTasks = (): void => {
  const complianceService = new ComplianceService();
  
  // Daily compliance checks at 1 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      Logger.info('Starting daily compliance checks');
      await complianceService.runDailyComplianceChecks();
      Logger.info('Daily compliance checks completed successfully');
    } catch (error) {
      Logger.error('Error running daily compliance checks:', error);
    }
  });
  
  // Sanctions screening every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    try {
      Logger.info('Starting sanctions screening');
      await complianceService.runSanctionsScreening();
      Logger.info('Sanctions screening completed successfully');
    } catch (error) {
      Logger.error('Error running sanctions screening:', error);
    }
  });
  
  // Risk assessment updates every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      Logger.info('Starting risk assessment updates');
      await complianceService.updateRiskAssessments();
      Logger.info('Risk assessment updates completed successfully');
    } catch (error) {
      Logger.error('Error updating risk assessments:', error);
    }
  });
  
  // Generate compliance reports weekly on Sundays at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    try {
      Logger.info('Starting weekly compliance report generation');
      await complianceService.generateWeeklyComplianceReport();
      Logger.info('Weekly compliance report generated successfully');
    } catch (error) {
      Logger.error('Error generating weekly compliance report:', error);
    }
  });
  
  // Monthly regulatory reporting on the 1st at 3 AM
  cron.schedule('0 3 1 * *', async () => {
    try {
      Logger.info('Starting monthly regulatory reporting');
      await complianceService.generateMonthlyRegulatoryReport();
      Logger.info('Monthly regulatory report generated successfully');
    } catch (error) {
      Logger.error('Error generating monthly regulatory report:', error);
    }
  });
  
  Logger.info('Compliance scheduled tasks initialized');
};

// ==================== SERVER STARTUP ====================
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    initializeScheduledTasks();
    
    app.listen(PORT, () => {
      Logger.info(`SwiftPayMe Compliance Service running on port ${PORT}`);
      Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      Logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    Logger.error('Failed to start Compliance Service:', error);
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
