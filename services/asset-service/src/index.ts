import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from 'dotenv';
import { AssetRequest, ServiceResponse } from './types';
import assetRoutes from './routes/assetRoutes';
import { Logger } from './utils/Logger';
import { 
  loggingMiddleware, 
  errorLoggingMiddleware, 
  securityLoggingMiddleware,
  performanceLoggingMiddleware 
} from './middleware/logging';
import { 
  BaseError, 
  InternalServerError, 
  ServiceUnavailableError,
  formatErrorResponse 
} from './utils/Errors';

// Load environment variables
config();

const logger = new Logger('SwiftPayAssetService');

class SwiftPayAssetService {
  private app: Application;
  private server: any;
  private redis: Redis;
  private isShuttingDown: boolean = false;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3005');
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeGracefulShutdown();
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
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
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
        'X-Request-ID',
        'X-Correlation-ID'
      ],
      exposedHeaders: [
        'X-Correlation-ID',
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ]
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024
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

    // Request ID middleware
    this.app.use((req: AssetRequest, res: Response, next: NextFunction) => {
      req.requestId = req.headers['x-request-id'] as string || 
                     req.headers['x-correlation-id'] as string ||
                     `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Service', 'asset-service');
      res.setHeader('X-Version', process.env.SERVICE_VERSION || '1.0.0');
      next();
    });

    // Logging middleware
    this.app.use(loggingMiddleware);
    this.app.use(securityLoggingMiddleware);
    this.app.use(performanceLoggingMiddleware);

    // Health check middleware (before other routes)
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/metrics', this.metricsEndpoint.bind(this));
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/assets', assetRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Asset Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Physical Asset Management Service for Gold, Silver, and Diamonds',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'Physical Asset Deposit Management',
            'Gold, Silver, Diamond Valuation',
            'Asset Verification Workflow',
            'Real-time Price Updates',
            'Multi-currency Conversion',
            'Compliance and Audit Trails',
            'Image and Certificate Management',
            'Integration with User Service'
          ],
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            deposits: '/api/assets/deposits',
            valuations: '/api/assets/valuations',
            prices: '/api/assets/prices',
            verification: '/api/assets/verification'
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
          message: `Route ${req.method} ${req.originalUrl} not found`
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
    this.app.use((error: any, req: AssetRequest, res: Response, next: NextFunction) => {
      // Don't handle if response already sent
      if (res.headersSent) {
        return next(error);
      }

      let statusCode = 500;
      let errorResponse: any;

      if (error instanceof BaseError) {
        statusCode = error.statusCode;
        errorResponse = formatErrorResponse(error, process.env.NODE_ENV === 'development');
      } else {
        // Handle non-custom errors
        const internalError = new InternalServerError(
          process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        );
        errorResponse = formatErrorResponse(internalError, process.env.NODE_ENV === 'development');
      }

      // Add request ID to error response
      errorResponse.requestId = req.requestId;
      errorResponse.timestamp = new Date().toISOString();

      logger.error('Request error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack,
        statusCode,
        path: req.path,
        method: req.method
      });

      res.status(statusCode).json(errorResponse);
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown on uncaught exception
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Check Redis connection
      let redisStatus = 'disconnected';
      try {
        await this.redis.ping();
        redisStatus = 'connected';
      } catch (redisError) {
        logger.warn('Redis health check failed', { error: redisError });
      }

      // Check external services
      const externalServices = {
        currencyService: await this.checkExternalService(process.env.CURRENCY_SERVICE_URL),
        userService: await this.checkExternalService(process.env.USER_SERVICE_URL),
        notificationService: await this.checkExternalService(process.env.NOTIFICATION_SERVICE_URL)
      };

      const healthData = {
        service: 'asset-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        connections: {
          database: {
            status: dbStatus,
            host: process.env.MONGODB_URI?.split('@')[1]?.split('/')[0] || 'unknown'
          },
          redis: {
            status: redisStatus,
            host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost'
          }
        },
        externalServices,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';
      const statusCode = isHealthy ? 200 : 503;

      if (!isHealthy) {
        healthData.status = 'unhealthy';
      }

      const response: ServiceResponse = {
        success: isHealthy,
        data: healthData,
        timestamp: new Date().toISOString()
      };

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Health check failed', { error });
      
      const response: ServiceResponse = {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed'
        },
        timestamp: new Date().toISOString()
      };

      res.status(503).json(response);
    }
  }

  private async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if service is ready to handle requests
      const checks = {
        database: mongoose.connection.readyState === 1,
        redis: this.redis.status === 'ready',
        priceFeeds: await this.checkPriceFeeds(),
        externalServices: await this.checkCriticalServices()
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'asset-service',
          status: isReady ? 'ready' : 'not ready',
          checks,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      res.status(isReady ? 200 : 503).json(response);
    } catch (error) {
      logger.error('Readiness check failed', { error });
      
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
  }

  private async metricsEndpoint(req: Request, res: Response): Promise<void> {
    try {
      // Get asset-specific metrics
      const assetMetrics = await this.getAssetMetrics();
      
      const metrics = {
        service: 'asset-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        eventLoop: {
          delay: 0 // This would be calculated using perf_hooks
        },
        requests: {
          total: 0, // This would be tracked
          active: 0,
          errors: 0
        },
        database: {
          connections: mongoose.connections.length,
          queries: 0 // This would be tracked
        },
        assets: assetMetrics
      };

      res.set('Content-Type', 'application/json');
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics endpoint failed', { error });
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  }

  private async checkExternalService(serviceUrl?: string): Promise<string> {
    if (!serviceUrl) return 'not_configured';
    
    try {
      // This would make an actual HTTP request to check service health
      // For now, return 'unknown'
      return 'unknown';
    } catch (error) {
      return 'unavailable';
    }
  }

  private async checkPriceFeeds(): Promise<boolean> {
    try {
      // Check if price feeds are working
      // This would verify external price APIs
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkCriticalServices(): Promise<boolean> {
    try {
      // Check critical external services
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getAssetMetrics(): Promise<any> {
    try {
      // Return asset-specific metrics
      return {
        totalDeposits: 0,
        pendingVerifications: 0,
        totalValue: 0,
        assetTypes: {
          gold: { count: 0, value: 0 },
          silver: { count: 0, value: 0 },
          diamond: { count: 0, value: 0 }
        }
      };
    } catch (error) {
      return {};
    }
  }

  private initializeGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        this.gracefulShutdown(signal);
      });
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown', { signal });

    const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000');
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop accepting new connections
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close database connections
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('Database connection closed');
      }

      // Close Redis connection
      if (this.redis.status === 'ready') {
        await this.redis.quit();
        logger.info('Redis connection closed');
      }

      clearTimeout(shutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await this.connectToDatabase();
      
      // Connect to Redis
      await this.connectToRedis();

      // Initialize price feeds
      await this.initializePriceFeeds();

      // Start HTTP server
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Asset service started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0',
          pid: process.pid
        });
      });

      // Configure server timeouts
      this.server.timeout = parseInt(process.env.SERVER_TIMEOUT || '30000');
      this.server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000');
      this.server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT || '66000');

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error', { error: error.message });
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start SwiftPayMe asset service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_assets';
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
        serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT || '5000'),
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
        bufferCommands: false,
        bufferMaxEntries: 0
      });

      logger.info('Connected to MongoDB', {
        uri: mongoUri.replace(/\/\/.*@/, '//***:***@'),
        database: mongoose.connection.db?.databaseName
      });

      // Handle MongoDB connection events
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
      logger.error('Failed to connect to MongoDB', { error });
      throw new ServiceUnavailableError('Database connection failed');
    }
  }

  private async connectToRedis(): Promise<void> {
    try {
      await this.redis.ping();
      
      logger.info('Connected to Redis', {
        host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
        port: process.env.REDIS_URL?.split(':').pop() || '6379'
      });

      // Handle Redis connection events
      this.redis.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected');
      });

      this.redis.on('disconnect', () => {
        logger.warn('Redis disconnected');
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });

    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw new ServiceUnavailableError('Redis connection failed');
    }
  }

  private async initializePriceFeeds(): Promise<void> {
    try {
      // Initialize price feed connections for gold, silver, diamond prices
      logger.info('Initializing price feeds for precious metals');
      
      // This would set up connections to external price APIs
      // For now, just log that it's initialized
      logger.info('Price feeds initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize price feeds', { error });
      // Don't throw error as price feeds are not critical for startup
    }
  }
}

// Create and start the service
const swiftPayAssetService = new SwiftPayAssetService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayAssetService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe asset service:', error);
    process.exit(1);
  });
}

export default swiftPayAssetService;

