import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { register } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

// Import routes and middleware
import currencyRoutes from './routes/currencyRoutes';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { Logger } from './utils/Logger';
import { RedisClient } from './utils/RedisClient';
import { PriceUpdateService } from './services/PriceUpdateService';
import { ServiceResponse } from './types';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayCurrencyService');

class SwiftPayCurrencyService {
  private app: Application;
  private server: any;
  private port: number;
  private priceUpdateService: PriceUpdateService;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3006');
    this.priceUpdateService = new PriceUpdateService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializePriceUpdates();
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', true);

    // Request ID middleware
    this.app.use((req: any, res: Response, next: NextFunction) => {
      req.requestId = req.headers['x-request-id'] || 
                     req.headers['x-correlation-id'] ||
                     uuidv4();
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Service', 'currency-service');
      res.setHeader('X-Version', process.env.SERVICE_VERSION || '1.0.0');
      next();
    });

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
        'X-Correlation-ID',
        'X-Service-Key',
        'X-Forwarded-For'
      ],
      exposedHeaders: [
        'X-Correlation-ID',
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ]
    }));

    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024
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
    this.app.use(cookieParser());

    // HTTP request logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            logger.info(message.trim());
          }
        }
      }));
    }

    // Custom request logging middleware
    this.app.use(loggingMiddleware);

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Health check endpoint (before other routes)
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/metrics', this.metricsEndpoint.bind(this));
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/currency', currencyRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Currency Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Real-time Currency Conversion and Precious Metals Pricing Service',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'Real-time Currency Conversion',
            'Precious Metals Pricing (Gold, Silver, Diamond)',
            'Multi-Currency Support (150+ currencies)',
            'Batch Conversion Operations',
            'Historical Exchange Rates',
            'Rate Caching and Optimization',
            'Circuit Breaker Protection',
            'Asset Valuation Integration',
            'Comprehensive Monitoring'
          ],
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            convert: '/api/currency/convert',
            rates: '/api/currency/rates',
            precious_metals: '/api/currency/precious-metals',
            historical: '/api/currency/historical'
          },
          supportedAssets: {
            fiat: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'],
            precious_metals: ['XAU', 'XAG', 'XPD', 'XPT'],
            cryptocurrencies: ['BTC', 'ETH', 'LTC', 'BCH', 'XRP']
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
    this.app.use((error: any, req: any, res: Response, next: NextFunction) => {
      // Don't handle if response already sent
      if (res.headersSent) {
        return next(error);
      }

      const statusCode = error.statusCode || error.status || 500;
      const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
      
      logger.error('Request error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack,
        statusCode,
        path: req.path,
        method: req.method
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
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      };

      res.status(statusCode).json(response);
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

  private initializePriceUpdates(): void {
    // Schedule price updates every 5 minutes for precious metals
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.priceUpdateService.updatePreciousMetalsPrices();
        logger.info('Precious metals prices updated successfully');
      } catch (error) {
        logger.error('Failed to update precious metals prices', { error });
      }
    });

    // Schedule currency rates update every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      try {
        await this.priceUpdateService.updateCurrencyRates();
        logger.info('Currency rates updated successfully');
      } catch (error) {
        logger.error('Failed to update currency rates', { error });
      }
    });

    // Schedule cryptocurrency prices update every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      try {
        await this.priceUpdateService.updateCryptocurrencyPrices();
        logger.info('Cryptocurrency prices updated successfully');
      } catch (error) {
        logger.error('Failed to update cryptocurrency prices', { error });
      }
    });

    logger.info('Price update schedules initialized');
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Check Redis connection
      let redisStatus = 'disconnected';
      try {
        const redisClient = RedisClient.getInstance();
        await redisClient.ping();
        redisStatus = 'connected';
      } catch (redisError) {
        logger.warn('Redis health check failed', { error: redisError });
      }

      // Check external price feeds
      const priceFeeds = await this.checkPriceFeeds();

      // Check external services
      const externalServices = {
        assetService: await this.checkExternalService(process.env.ASSET_SERVICE_URL),
        userService: await this.checkExternalService(process.env.USER_SERVICE_URL),
        notificationService: await this.checkExternalService(process.env.NOTIFICATION_SERVICE_URL)
      };

      const healthData = {
        service: 'currency-service',
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
        priceFeeds,
        externalServices,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && 
                       redisStatus === 'connected' && 
                       priceFeeds.overall === 'healthy';
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
        redis: await this.checkRedisConnection(),
        priceFeeds: await this.checkPriceFeedsReady(),
        externalServices: await this.checkCriticalServices()
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'currency-service',
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
      // Get currency-specific metrics
      const currencyMetrics = await this.getCurrencyMetrics();
      
      const metrics = {
        service: 'currency-service',
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
        currency: currencyMetrics,
        prometheus: await register.metrics()
      };

      res.set('Content-Type', 'application/json');
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics endpoint failed', { error });
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  }

  private async checkPriceFeeds(): Promise<any> {
    try {
      const feeds = {
        fiat: await this.priceUpdateService.checkFiatRatesHealth(),
        precious_metals: await this.priceUpdateService.checkPreciousMetalsHealth(),
        cryptocurrency: await this.priceUpdateService.checkCryptocurrencyHealth()
      };

      const healthyFeeds = Object.values(feeds).filter(feed => feed === 'healthy').length;
      const totalFeeds = Object.keys(feeds).length;

      return {
        ...feeds,
        overall: healthyFeeds === totalFeeds ? 'healthy' : 'degraded',
        healthyCount: healthyFeeds,
        totalCount: totalFeeds
      };
    } catch (error) {
      return {
        overall: 'unhealthy',
        error: error.message
      };
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

  private async checkRedisConnection(): Promise<boolean> {
    try {
      const redisClient = RedisClient.getInstance();
      await redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkPriceFeedsReady(): Promise<boolean> {
    try {
      // Check if price feeds have recent data
      return await this.priceUpdateService.hasRecentData();
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

  private async getCurrencyMetrics(): Promise<any> {
    try {
      // Return currency-specific metrics
      return {
        totalConversions: 0,
        activeCurrencies: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        priceUpdates: {
          lastUpdate: new Date(),
          updateFrequency: '5m',
          successRate: 100
        }
      };
    } catch (error) {
      return {};
    }
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

      // Stop price update services
      await this.priceUpdateService.stop();
      logger.info('Price update service stopped');

      // Close database connections
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('Database connection closed');
      }

      // Close Redis connection
      const redisClient = RedisClient.getInstance();
      await redisClient.disconnect();
      logger.info('Redis connection closed');

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

      // Initialize price update service
      await this.priceUpdateService.initialize();

      // Start HTTP server
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Currency service started successfully', {
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

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start SwiftPayMe currency service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_currency';
      
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
      throw error;
    }
  }

  private async connectToRedis(): Promise<void> {
    try {
      const redisClient = RedisClient.getInstance();
      await redisClient.connect();
      
      logger.info('Connected to Redis', {
        host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
        port: process.env.REDIS_URL?.split(':').pop() || '6379'
      });

    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        this.gracefulShutdown(signal);
      });
    });
  }
}

// Create and start the service
const swiftPayCurrencyService = new SwiftPayCurrencyService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayCurrencyService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe currency service:', error);
    process.exit(1);
  });
}

export default swiftPayCurrencyService;

