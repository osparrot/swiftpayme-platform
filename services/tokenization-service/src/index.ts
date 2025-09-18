import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Import models and types
import { Token } from './models/Token';
import { MintingRequest } from './models/MintingRequest';
import { BurningRequest } from './models/BurningRequest';
import { TokenizationRequest, ServiceResponse } from './types';

// Import utilities and middleware
import { Logger } from './utils/Logger';
import { EventBus } from '../../shared/events/event-bus';
import { Encryption } from '../../shared/utils/Encryption';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayTokenizationService');

class TokenizationService {
  private app: Application;
  private server: any;
  private redis: Redis;
  private eventBus: EventBus;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    
    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    // Initialize Event Bus
    this.eventBus = new EventBus(this.redis);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeGracefulShutdown();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
        'X-API-Key'
      ],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024 // Only compress responses larger than 1KB
    }));

    // Body parsing
    this.app.use(express.json({
      limit: process.env.MAX_REQUEST_SIZE || '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: process.env.MAX_REQUEST_SIZE || '10mb'
    }));

    // Input sanitization
    this.app.use(sanitize);

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
      res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });

    // Health check endpoint (before other middleware)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', (req: Request, res: Response) => {
      // In a real implementation, this would return Prometheus metrics
      res.set('Content-Type', 'text/plain');
      res.send('# Tokenization Service Metrics\n# TODO: Implement Prometheus metrics\n');
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/tokenization', tokenizationRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'SwiftPay Tokenization Service',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/tokenization'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          name: 'NotFoundError',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          code: 'ROUTE_NOT_FOUND',
          statusCode: 404,
          timestamp: new Date()
        }
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      // Log the error
      ErrorHandler.logError(error, this.logger, {
        requestId: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        userId: (req as any).user?.userId,
        ip: req.ip
      });

      // Send error response
      const errorResponse = ErrorHandler.getErrorResponse(error);
      res.status(errorResponse.error.statusCode).json(errorResponse);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.shutdown('SIGTERM');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack
      });
      
      // Graceful shutdown
      this.shutdown('SIGTERM');
    });
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay-tokenization';
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      });

      this.logger.info('MongoDB connected successfully', {
        uri: mongoUri.replace(/\/\/.*@/, '//***:***@') // Hide credentials in logs
      });

      // Handle MongoDB connection events
      mongoose.connection.on('error', (error) => {
        this.logger.error('MongoDB connection error', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        this.logger.info('MongoDB reconnected');
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown`);
        this.shutdown(signal);
      });
    });
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    this.logger.info('Starting graceful shutdown', { signal });

    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            this.logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close database connection
      await mongoose.connection.close();
      this.logger.info('MongoDB connection closed');

      // Close Redis connection
      await this.redis.quit();
      this.logger.info('Redis connection closed');

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Start the server
   */
  private server: any;

  public async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    this.server = this.app.listen(port, host, () => {
      this.logger.info('Tokenization service started', {
        port,
        host,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0',
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    this.server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        this.logger.error(`Port ${port} is already in use`);
      } else {
        this.logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get Redis instance
   */
  public getRedis(): Redis {
    return this.redis;
  }
}

// Create and start the application
const app = new TokenizationServiceApp();

// Start the server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    console.error('Failed to start tokenization service:', error);
    process.exit(1);
  });
}

export default app;

