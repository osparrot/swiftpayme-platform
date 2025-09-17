import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from 'dotenv';

// Import routes and middleware
import userRoutes from './routes/userRoutes';
import { loggingMiddleware, errorLoggingMiddleware, correlationMiddleware } from './middleware/logging';
import { globalRateLimit } from './middleware/rateLimit';
import { Logger } from './utils/Logger';
import { ServiceResponse } from './types';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayUserService');

class SwiftPayUserService {
  private app: Application;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3002');
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', true);

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
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    const corsOptions = {
      origin: (origin: string | undefined, callback: Function) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'http://localhost:3011',
          'http://localhost:8080'
        ];
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Correlation-ID',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-Correlation-ID',
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ]
    };

    this.app.use(cors(corsOptions));

    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024 // Only compress responses larger than 1KB
    }));

    // Body parsing middleware
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

    // Cookie parser
    this.app.use(cookieParser());

    // Request correlation and logging
    this.app.use(correlationMiddleware);
    this.app.use(loggingMiddleware);

    // Global rate limiting
    this.app.use(globalRateLimit);

    // Health check endpoint (before other routes)
    this.app.get('/health', this.healthCheck);
    this.app.get('/ready', this.readinessCheck);
    this.app.get('/metrics', this.metricsEndpoint);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/users', userRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe User Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'User Registration & Management',
            'Physical Asset Deposit Tracking',
            'Fiat Account Management',
            'Bitcoin Wallet Integration',
            'KYC/AML Verification',
            'Transaction History',
            'Trading Limits Management',
            'Payment Preferences'
          ],
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            api: '/api/users'
          }
        },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${req.method} ${req.originalUrl} not found`
        },
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
    });
  }

  private initializeErrorHandling(): void {
    // Error logging middleware
    this.app.use(errorLoggingMiddleware);

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      const statusCode = error.statusCode || error.status || 500;
      const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
      
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        statusCode,
        path: req.path,
        method: req.method,
        requestId: (req as any).requestId
      });

      const response: ServiceResponse = {
        success: false,
        error: {
          code: errorCode,
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      };

      res.status(statusCode).json(response);
    });
  }

  private healthCheck = (req: Request, res: Response): void => {
    const response: ServiceResponse = {
      success: true,
      data: {
        service: 'user-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    };
    res.status(200).json(response);
  };

  private readinessCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check database connection
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Check external dependencies
      const checks = {
        database: dbStatus === 'connected',
        // Add other dependency checks here
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'user-service',
          status: isReady ? 'ready' : 'not ready',
          checks,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      res.status(isReady ? 200 : 503).json(response);
    } catch (error) {
      logger.error('Readiness check failed', { error: error.message });
      
      const response: ServiceResponse = {
        success: false,
        error: {
          code: 'READINESS_CHECK_FAILED',
          message: 'Service is not ready'
        },
        timestamp: new Date().toISOString()
      };

      res.status(503).json(response);
    }
  };

  private metricsEndpoint = (req: Request, res: Response): void => {
    // This would integrate with your metrics collection system
    // For now, return basic metrics
    const metrics = {
      service: 'user-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env.SERVICE_VERSION || '1.0.0'
    };

    res.set('Content-Type', 'application/json');
    res.json(metrics);
  };

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_users';
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
        serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT || '5000'),
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
        bufferCommands: false,
        bufferMaxEntries: 0
      });

      logger.info('Connected to MongoDB', { 
        uri: mongoUri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
        database: mongoose.connection.db?.databaseName 
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error: error.message });
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectToDatabase();

      // Start HTTP server
      this.server = createServer(this.app);

      // Configure server timeouts
      this.server.timeout = parseInt(process.env.SERVER_TIMEOUT || '30000');
      this.server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000');
      this.server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT || '10000');

      this.server.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe User service started', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0',
          pid: process.pid
        });
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error', { error: error.message });
        }
        process.exit(1);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start SwiftPayMe user service', { error: error.message });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      // Stop accepting new connections
      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Close database connection
            await mongoose.connection.close();
            logger.info('Database connection closed');

            // Close other connections (Redis, etc.)
            // await redisClient.quit();

            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown', { error: error.message });
            process.exit(1);
          }
        });

        // Force shutdown after timeout
        setTimeout(() => {
          logger.error('Graceful shutdown timeout, forcing exit');
          process.exit(1);
        }, 10000); // 10 seconds
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { 
        error: error.message, 
        stack: error.stack 
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { 
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
      });
      process.exit(1);
    });
  }
}

// Start the service
const swiftPayUserService = new SwiftPayUserService();

if (require.main === module) {
  swiftPayUserService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe user service:', error);
    process.exit(1);
  });
}

export default swiftPayUserService;

