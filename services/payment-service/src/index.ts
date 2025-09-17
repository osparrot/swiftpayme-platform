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
import paymentRoutes from './routes/paymentRoutes';
import transactionRoutes from './routes/transactionRoutes';
import assetRoutes from './routes/assetRoutes';
import cryptoRoutes from './routes/cryptoRoutes';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import { Logger } from './utils/Logger';
import { RedisClient } from './utils/RedisClient';
import { PaymentOrchestrator } from './services/PaymentOrchestrator';
import { TransactionProcessor } from './services/TransactionProcessor';
import { AssetProcessor } from './services/AssetProcessor';
import { CryptoProcessor } from './services/CryptoProcessor';
import { NotificationService } from './services/NotificationService';
import { QueueManager } from './services/QueueManager';
import { ServiceResponse } from './types';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayPaymentService');

class SwiftPayPaymentService {
  private app: Application;
  private server: any;
  private port: number;
  private paymentOrchestrator: PaymentOrchestrator;
  private transactionProcessor: TransactionProcessor;
  private assetProcessor: AssetProcessor;
  private cryptoProcessor: CryptoProcessor;
  private notificationService: NotificationService;
  private queueManager: QueueManager;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3004');
    
    // Initialize services
    this.paymentOrchestrator = new PaymentOrchestrator();
    this.transactionProcessor = new TransactionProcessor();
    this.assetProcessor = new AssetProcessor();
    this.cryptoProcessor = new CryptoProcessor();
    this.notificationService = new NotificationService();
    this.queueManager = new QueueManager();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeScheduledTasks();
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
      res.setHeader('X-Service', 'payment-service');
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

    // Health check endpoint (before auth)
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/metrics', this.metricsEndpoint.bind(this));
  }

  private initializeRoutes(): void {
    // Authentication middleware for API routes
    this.app.use('/api', authMiddleware);

    // API routes
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/transactions', transactionRoutes);
    this.app.use('/api/assets', assetRoutes);
    this.app.use('/api/crypto', cryptoRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Payment Processing Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Core payment orchestration engine for asset-to-fiat-to-crypto workflows',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'Asset Deposit Processing',
            'Fiat Account Management',
            'Bitcoin Purchase Processing',
            'Multi-Currency Support',
            'Real-Time Transaction Processing',
            'Payment Orchestration',
            'Compliance Integration',
            'Advanced Analytics',
            'Queue Management',
            'Event-Driven Architecture'
          ],
          workflows: {
            assetDeposit: 'Physical asset → Verification → Valuation → Fiat Credit',
            bitcoinPurchase: 'Fiat Balance → Currency Conversion → Bitcoin Purchase → Wallet Credit',
            assetToBitcoin: 'Asset Deposit → Fiat Credit → Bitcoin Purchase (Full Workflow)',
            fiatTransfer: 'Internal fiat transfers between user accounts',
            cryptoTransfer: 'Bitcoin transfers to external wallets'
          },
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            payments: '/api/payments',
            transactions: '/api/transactions',
            assets: '/api/assets',
            crypto: '/api/crypto'
          },
          integrations: {
            userService: process.env.USER_SERVICE_URL || 'http://user-service:3002',
            assetService: process.env.ASSET_SERVICE_URL || 'http://asset-service:3005',
            currencyService: process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3006',
            cryptoService: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3007',
            notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009'
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

  private initializeScheduledTasks(): void {
    // Process pending transactions every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.transactionProcessor.processPendingTransactions();
        logger.debug('Pending transactions processed');
      } catch (error) {
        logger.error('Failed to process pending transactions', { error });
      }
    });

    // Process asset deposits every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      try {
        await this.assetProcessor.processAssetDeposits();
        logger.debug('Asset deposits processed');
      } catch (error) {
        logger.error('Failed to process asset deposits', { error });
      }
    });

    // Process crypto purchases every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.cryptoProcessor.processCryptoPurchases();
        logger.debug('Crypto purchases processed');
      } catch (error) {
        logger.error('Failed to process crypto purchases', { error });
      }
    });

    // Update payment analytics every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.paymentOrchestrator.updateAnalytics();
        logger.debug('Payment analytics updated');
      } catch (error) {
        logger.error('Failed to update payment analytics', { error });
      }
    });

    // Cleanup completed transactions daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        await this.transactionProcessor.cleanupCompletedTransactions();
        logger.info('Completed transactions cleanup finished');
      } catch (error) {
        logger.error('Failed to cleanup completed transactions', { error });
      }
    });

    // Send daily payment reports at 6 AM
    cron.schedule('0 6 * * *', async () => {
      try {
        await this.notificationService.sendDailyReports();
        logger.info('Daily payment reports sent');
      } catch (error) {
        logger.error('Failed to send daily reports', { error });
      }
    });

    logger.info('Scheduled tasks initialized');
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

      // Check external services
      const externalServices = {
        userService: await this.checkExternalService(process.env.USER_SERVICE_URL),
        assetService: await this.checkExternalService(process.env.ASSET_SERVICE_URL),
        currencyService: await this.checkExternalService(process.env.CURRENCY_SERVICE_URL),
        cryptoService: await this.checkExternalService(process.env.CRYPTO_SERVICE_URL),
        notificationService: await this.checkExternalService(process.env.NOTIFICATION_SERVICE_URL)
      };

      // Check queue status
      const queueStatus = await this.queueManager.getQueueStatus();

      const healthData = {
        service: 'payment-service',
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
        queues: queueStatus,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && 
                       redisStatus === 'connected' &&
                       Object.values(externalServices).every(status => status !== 'error');
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
        services: await this.checkServicesInitialized(),
        queues: await this.queueManager.isReady()
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'payment-service',
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
      // Get payment-specific metrics
      const paymentMetrics = await this.getPaymentMetrics();
      
      const metrics = {
        service: 'payment-service',
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
        payments: paymentMetrics,
        prometheus: await register.metrics()
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

  private async checkRedisConnection(): Promise<boolean> {
    try {
      const redisClient = RedisClient.getInstance();
      await redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkServicesInitialized(): Promise<boolean> {
    try {
      return this.paymentOrchestrator.isInitialized() && 
             this.transactionProcessor.isInitialized() &&
             this.assetProcessor.isInitialized() &&
             this.cryptoProcessor.isInitialized() &&
             this.notificationService.isInitialized() &&
             this.queueManager.isInitialized();
    } catch (error) {
      return false;
    }
  }

  private async getPaymentMetrics(): Promise<any> {
    try {
      // Return payment-specific metrics
      return {
        transactions: {
          total: await this.transactionProcessor.getTotalTransactions(),
          pending: await this.transactionProcessor.getPendingTransactions(),
          completed: await this.transactionProcessor.getCompletedTransactions(),
          failed: await this.transactionProcessor.getFailedTransactions()
        },
        assets: {
          totalDeposits: await this.assetProcessor.getTotalAssetDeposits(),
          pendingVerification: await this.assetProcessor.getPendingVerification(),
          totalValue: await this.assetProcessor.getTotalAssetValue()
        },
        crypto: {
          totalPurchases: await this.cryptoProcessor.getTotalCryptoPurchases(),
          totalVolume: await this.cryptoProcessor.getTotalCryptoVolume(),
          pendingPurchases: await this.cryptoProcessor.getPendingPurchases()
        },
        queues: await this.queueManager.getQueueMetrics()
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

      // Stop processing services
      await this.paymentOrchestrator.stop();
      await this.transactionProcessor.stop();
      await this.assetProcessor.stop();
      await this.cryptoProcessor.stop();
      await this.notificationService.stop();
      await this.queueManager.stop();
      logger.info('Payment services stopped');

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

      // Initialize payment services
      await this.initializePaymentServices();

      // Start HTTP server
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Payment service started successfully', {
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
      logger.error('Failed to start SwiftPayMe payment service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_payments';
      
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

  private async initializePaymentServices(): Promise<void> {
    try {
      logger.info('Initializing payment services...');

      // Initialize queue manager first
      await this.queueManager.initialize();
      logger.info('Queue manager initialized');

      // Initialize payment orchestrator
      await this.paymentOrchestrator.initialize();
      logger.info('Payment orchestrator initialized');

      // Initialize processors
      await this.transactionProcessor.initialize();
      logger.info('Transaction processor initialized');

      await this.assetProcessor.initialize();
      logger.info('Asset processor initialized');

      await this.cryptoProcessor.initialize();
      logger.info('Crypto processor initialized');

      // Initialize notification service
      await this.notificationService.initialize();
      logger.info('Notification service initialized');

      logger.info('All payment services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize payment services', { error });
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
const swiftPayPaymentService = new SwiftPayPaymentService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayPaymentService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe payment service:', error);
    process.exit(1);
  });
}

export default swiftPayPaymentService;

