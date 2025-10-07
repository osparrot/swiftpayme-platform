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
import cryptoRoutes from './routes/index';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { Logger } from './utils/Logger';
import { RedisClient } from './utils/RedisClient';
import { EnhancedBitcoinService } from './services/EnhancedBitcoinService';
import { EnhancedLightningService } from './services/EnhancedLightningService';
import WalletService from './services/WalletService';
import TransactionService from './services/TransactionService';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayCryptoService');

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

class SwiftPayCryptoService {
  private app: Application;
  private server: any;
  private port: number;
  private bitcoinService: EnhancedBitcoinService;
  private lightningService: EnhancedLightningService;
  private walletService: WalletService;
  private transactionService: TransactionService;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3007');
    
    // Initialize services
    this.bitcoinService = new EnhancedBitcoinService();
    this.lightningService = new EnhancedLightningService();
    this.walletService = new WalletService();
    this.transactionService = new TransactionService();
    
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
      res.setHeader('X-Service', 'crypto-service');
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
    this.app.use('/api/crypto', cryptoRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Crypto Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Bitcoin and Cryptocurrency Management Service',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'Bitcoin Wallet Management',
            'Lightning Network Integration',
            'Multi-Signature Wallets',
            'Real-time Transaction Processing',
            'Secure Key Management',
            'Address Generation and Validation',
            'Transaction Broadcasting',
            'Fee Estimation and Optimization',
            'Compliance Integration',
            'Advanced Monitoring'
          ],
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            wallets: '/api/crypto/wallets',
            transactions: '/api/crypto/transactions',
            addresses: '/api/crypto/addresses',
            lightning: '/api/crypto/lightning'
          },
          supportedNetworks: {
            bitcoin: {
              mainnet: process.env.BITCOIN_NETWORK === 'mainnet',
              testnet: process.env.BITCOIN_NETWORK === 'testnet',
              regtest: process.env.BITCOIN_NETWORK === 'regtest'
            },
            lightning: {
              enabled: process.env.LIGHTNING_ENABLED === 'true',
              network: process.env.LIGHTNING_NETWORK || 'testnet'
            }
          },
          capabilities: {
            walletGeneration: true,
            multiSig: true,
            lightningChannels: true,
            atomicSwaps: false,
            crossChain: false
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
    // Monitor Bitcoin network status every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.bitcoinService.checkNetworkStatus();
        logger.debug('Bitcoin network status check completed');
      } catch (error) {
        logger.error('Bitcoin network status check failed', { error });
      }
    });

    // Monitor Lightning Network status every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      try {
        await this.lightningService.checkNetworkStatus();
        logger.debug('Lightning network status check completed');
      } catch (error) {
        logger.error('Lightning network status check failed', { error });
      }
    });

    // Process pending transactions every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.transactionService.processPendingTransactions();
        logger.debug('Pending transactions processed');
      } catch (error) {
        logger.error('Failed to process pending transactions', { error });
      }
    });

    // Update wallet balances every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        await this.walletService.updateWalletBalances();
        logger.debug('Wallet balances updated');
      } catch (error) {
        logger.error('Failed to update wallet balances', { error });
      }
    });

    // Cleanup old transactions daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.transactionService.cleanupOldTransactions();
        logger.info('Old transactions cleanup completed');
      } catch (error) {
        logger.error('Failed to cleanup old transactions', { error });
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

      // Check Bitcoin Core connection
      const bitcoinStatus = await this.checkBitcoinConnection();

      // Check Lightning Network connection
      const lightningStatus = await this.checkLightningConnection();

      const healthData = {
        service: 'crypto-service',
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
          },
          bitcoin: {
            status: bitcoinStatus,
            network: process.env.BITCOIN_NETWORK || 'testnet',
            host: process.env.BITCOIN_RPC_HOST || 'localhost'
          },
          lightning: {
            status: lightningStatus,
            network: process.env.LIGHTNING_NETWORK || 'testnet',
            host: process.env.LIGHTNING_HOST || 'localhost'
          }
        },
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && 
                       redisStatus === 'connected' && 
                       bitcoinStatus === 'connected';
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
        bitcoin: await this.checkBitcoinReady(),
        lightning: await this.checkLightningReady(),
        services: await this.checkServicesInitialized()
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'crypto-service',
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
      // Get crypto-specific metrics
      const cryptoMetrics = await this.getCryptoMetrics();
      
      const metrics = {
        service: 'crypto-service',
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
        crypto: cryptoMetrics,
        prometheus: await register.metrics()
      };

      res.set('Content-Type', 'application/json');
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics endpoint failed', { error });
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  }

  private async checkBitcoinConnection(): Promise<string> {
    try {
      const isConnected = await this.bitcoinService.isConnected();
      return isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      return 'error';
    }
  }

  private async checkLightningConnection(): Promise<string> {
    try {
      const isConnected = await this.lightningService.isConnected();
      return isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      return 'error';
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

  private async checkBitcoinReady(): Promise<boolean> {
    try {
      return await this.bitcoinService.isReady();
    } catch (error) {
      return false;
    }
  }

  private async checkLightningReady(): Promise<boolean> {
    try {
      return await this.lightningService.isReady();
    } catch (error) {
      return false;
    }
  }

  private async checkServicesInitialized(): Promise<boolean> {
    try {
      return this.bitcoinService.isInitialized() && 
             this.lightningService.isServiceInitialized() &&
             this.walletService.isServiceInitialized() &&
             this.transactionService.isServiceInitialized();
    } catch (error) {
      return false;
    }
  }

  private async getCryptoMetrics(): Promise<any> {
    try {
      // Return crypto-specific metrics
      return {
        wallets: {
          total: await this.walletService.getTotalWallets(),
          active: await this.walletService.getActiveWallets(),
          multiSig: await this.walletService.getMultiSigWallets()
        },
        transactions: {
          total: await this.transactionService.getTotalTransactions(),
          pending: await this.transactionService.getPendingTransactions(),
          confirmed: await this.transactionService.getConfirmedTransactions(),
          failed: await this.transactionService.getFailedTransactions()
        },
        bitcoin: {
          blockHeight: await this.bitcoinService.getBlockHeight(),
          networkHashRate: await this.bitcoinService.getNetworkHashRate(),
          difficulty: await this.bitcoinService.getDifficulty(),
          memPoolSize: await this.bitcoinService.getMemPoolSize()
        },
        lightning: {
          channels: await this.lightningService.getChannelCount(),
          capacity: await this.lightningService.getTotalCapacity(),
          payments: await this.lightningService.getPaymentCount()
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

      // Stop crypto services
      await this.bitcoinService.stop();
      await this.lightningService.stop();
      await this.walletService.stop();
      await this.transactionService.stop();
      logger.info('Crypto services stopped');

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

      // Initialize crypto services
      await this.initializeCryptoServices();

      // Start HTTP server
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Crypto service started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0',
          pid: process.pid,
          bitcoinNetwork: process.env.BITCOIN_NETWORK || 'testnet',
          lightningEnabled: process.env.LIGHTNING_ENABLED === 'true'
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
      logger.error('Failed to start SwiftPayMe crypto service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_crypto';
      
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

  private async initializeCryptoServices(): Promise<void> {
    try {
      logger.info('Initializing crypto services...');

      // Initialize Bitcoin service
      await this.bitcoinService.initialize();
      logger.info('Bitcoin service initialized');

      // Initialize Lightning service (if enabled)
      if (process.env.LIGHTNING_ENABLED === 'true') {
        await this.lightningService.initialize();
        logger.info('Lightning service initialized');
      }

      // Initialize wallet service
      await this.walletService.initialize();
      logger.info('Wallet service initialized');

      // Initialize transaction service
      await this.transactionService.initialize();
      logger.info('Transaction service initialized');

      logger.info('All crypto services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize crypto services', { error });
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
const swiftPayCryptoService = new SwiftPayCryptoService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayCryptoService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe crypto service:', error);
    process.exit(1);
  });
}

export default swiftPayCryptoService;
