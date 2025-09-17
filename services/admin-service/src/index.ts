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
import { Server } from 'socket.io';
import { createServer } from 'http';
import cron from 'cron';

// Import routes and middleware
import adminRoutes from './routes/adminRoutes';
import userManagementRoutes from './routes/userManagementRoutes';
import assetVerificationRoutes from './routes/assetVerificationRoutes';
import systemMonitoringRoutes from './routes/systemMonitoringRoutes';
import reportsRoutes from './routes/reportsRoutes';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { adminAuthMiddleware } from './middleware/adminAuth';
import { Logger } from './utils/Logger';
import { RedisClient } from './utils/RedisClient';
import { AdminService } from './services/AdminService';
import { UserManagementService } from './services/UserManagementService';
import { AssetVerificationService } from './services/AssetVerificationService';
import { SystemMonitoringService } from './services/SystemMonitoringService';
import { ReportingService } from './services/ReportingService';
import { NotificationService } from './services/NotificationService';
import { ServiceResponse } from './types';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayAdminService');

class SwiftPayAdminService {
  private app: Application;
  private server: any;
  private io: Server;
  private port: number;
  private adminService: AdminService;
  private userManagementService: UserManagementService;
  private assetVerificationService: AssetVerificationService;
  private systemMonitoringService: SystemMonitoringService;
  private reportingService: ReportingService;
  private notificationService: NotificationService;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = parseInt(process.env.PORT || '3008');
    
    // Initialize services
    this.adminService = new AdminService();
    this.userManagementService = new UserManagementService();
    this.assetVerificationService = new AssetVerificationService();
    this.systemMonitoringService = new SystemMonitoringService();
    this.reportingService = new ReportingService();
    this.notificationService = new NotificationService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketIO();
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
      res.setHeader('X-Service', 'admin-service');
      res.setHeader('X-Version', process.env.SERVICE_VERSION || '1.0.0');
      next();
    });

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
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
        'X-Admin-Token',
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
      limit: process.env.MAX_REQUEST_SIZE || '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: process.env.MAX_REQUEST_SIZE || '50mb' 
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
    // Admin authentication middleware for API routes
    this.app.use('/api', adminAuthMiddleware);

    // API routes
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/users', userManagementRoutes);
    this.app.use('/api/assets', assetVerificationRoutes);
    this.app.use('/api/system', systemMonitoringRoutes);
    this.app.use('/api/reports', reportsRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Admin Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Administrative interface for SwiftPayMe system management',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'User Management & Administration',
            'Asset Verification & Approval',
            'System Monitoring & Analytics',
            'Compliance Management',
            'Transaction Oversight',
            'Real-Time Notifications',
            'Comprehensive Reporting',
            'Security Management',
            'Configuration Management',
            'Audit Trail Management'
          ],
          capabilities: {
            userManagement: 'Complete user lifecycle management and KYC oversight',
            assetVerification: 'Professional asset verification and valuation approval',
            systemMonitoring: 'Real-time system health and performance monitoring',
            compliance: 'AML/KYC compliance management and reporting',
            reporting: 'Comprehensive business and operational reporting',
            security: 'Security incident management and access control'
          },
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            admin: '/api/admin',
            users: '/api/users',
            assets: '/api/assets',
            system: '/api/system',
            reports: '/api/reports'
          },
          integrations: {
            userService: process.env.USER_SERVICE_URL || 'http://user-service:3002',
            assetService: process.env.ASSET_SERVICE_URL || 'http://asset-service:3005',
            paymentService: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004',
            cryptoService: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3007',
            currencyService: process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3006'
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

  private initializeSocketIO(): void {
    // Socket.IO connection handling
    this.io.on('connection', (socket) => {
      logger.info('Admin client connected', { socketId: socket.id });

      // Join admin room for broadcasts
      socket.join('admin-room');

      // Handle admin authentication
      socket.on('authenticate', async (token) => {
        try {
          // Verify admin token
          const adminUser = await this.adminService.verifyAdminToken(token);
          if (adminUser) {
            socket.data.adminUser = adminUser;
            socket.join(`admin-${adminUser.id}`);
            socket.emit('authenticated', { success: true, user: adminUser });
            logger.info('Admin authenticated via socket', { adminId: adminUser.id });
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
          }
        } catch (error) {
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
          logger.error('Socket authentication failed', { error });
        }
      });

      // Handle real-time monitoring subscriptions
      socket.on('subscribe-monitoring', (channels) => {
        if (socket.data.adminUser) {
          channels.forEach((channel: string) => {
            socket.join(`monitoring-${channel}`);
          });
          logger.info('Admin subscribed to monitoring channels', { 
            adminId: socket.data.adminUser.id, 
            channels 
          });
        }
      });

      // Handle asset verification updates
      socket.on('asset-verification-update', async (data) => {
        if (socket.data.adminUser) {
          try {
            await this.assetVerificationService.updateAssetVerification(data);
            this.io.to('admin-room').emit('asset-verification-updated', data);
          } catch (error) {
            socket.emit('error', { message: 'Failed to update asset verification' });
          }
        }
      });

      // Handle user management actions
      socket.on('user-action', async (data) => {
        if (socket.data.adminUser) {
          try {
            await this.userManagementService.performUserAction(data);
            this.io.to('admin-room').emit('user-action-completed', data);
          } catch (error) {
            socket.emit('error', { message: 'Failed to perform user action' });
          }
        }
      });

      socket.on('disconnect', () => {
        logger.info('Admin client disconnected', { socketId: socket.id });
      });
    });

    // Set up real-time monitoring broadcasts
    this.setupRealTimeMonitoring();
  }

  private setupRealTimeMonitoring(): void {
    // Broadcast system metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.systemMonitoringService.getSystemMetrics();
        this.io.to('monitoring-system').emit('system-metrics', metrics);
      } catch (error) {
        logger.error('Failed to broadcast system metrics', { error });
      }
    }, 30000);

    // Broadcast transaction metrics every minute
    setInterval(async () => {
      try {
        const metrics = await this.systemMonitoringService.getTransactionMetrics();
        this.io.to('monitoring-transactions').emit('transaction-metrics', metrics);
      } catch (error) {
        logger.error('Failed to broadcast transaction metrics', { error });
      }
    }, 60000);

    // Broadcast user activity every 2 minutes
    setInterval(async () => {
      try {
        const activity = await this.systemMonitoringService.getUserActivity();
        this.io.to('monitoring-users').emit('user-activity', activity);
      } catch (error) {
        logger.error('Failed to broadcast user activity', { error });
      }
    }, 120000);
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
    // Generate daily reports at 6 AM
    const dailyReportJob = new cron.CronJob('0 6 * * *', async () => {
      try {
        await this.reportingService.generateDailyReport();
        logger.info('Daily report generated successfully');
      } catch (error) {
        logger.error('Failed to generate daily report', { error });
      }
    });

    // Generate weekly reports on Monday at 7 AM
    const weeklyReportJob = new cron.CronJob('0 7 * * 1', async () => {
      try {
        await this.reportingService.generateWeeklyReport();
        logger.info('Weekly report generated successfully');
      } catch (error) {
        logger.error('Failed to generate weekly report', { error });
      }
    });

    // Generate monthly reports on the 1st at 8 AM
    const monthlyReportJob = new cron.CronJob('0 8 1 * *', async () => {
      try {
        await this.reportingService.generateMonthlyReport();
        logger.info('Monthly report generated successfully');
      } catch (error) {
        logger.error('Failed to generate monthly report', { error });
      }
    });

    // System health check every 5 minutes
    const healthCheckJob = new cron.CronJob('*/5 * * * *', async () => {
      try {
        await this.systemMonitoringService.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    });

    // Cleanup old audit logs weekly
    const auditCleanupJob = new cron.CronJob('0 2 * * 0', async () => {
      try {
        await this.adminService.cleanupOldAuditLogs();
        logger.info('Audit logs cleanup completed');
      } catch (error) {
        logger.error('Failed to cleanup audit logs', { error });
      }
    });

    // Start all cron jobs
    dailyReportJob.start();
    weeklyReportJob.start();
    monthlyReportJob.start();
    healthCheckJob.start();
    auditCleanupJob.start();

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
        paymentService: await this.checkExternalService(process.env.PAYMENT_SERVICE_URL),
        cryptoService: await this.checkExternalService(process.env.CRYPTO_SERVICE_URL),
        currencyService: await this.checkExternalService(process.env.CURRENCY_SERVICE_URL)
      };

      // Check admin services
      const adminServices = {
        userManagement: this.userManagementService.isHealthy(),
        assetVerification: this.assetVerificationService.isHealthy(),
        systemMonitoring: this.systemMonitoringService.isHealthy(),
        reporting: this.reportingService.isHealthy(),
        notifications: this.notificationService.isHealthy()
      };

      const healthData = {
        service: 'admin-service',
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
          socketIO: {
            status: 'active',
            connectedClients: this.io.engine.clientsCount
          }
        },
        externalServices,
        adminServices,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && 
                       redisStatus === 'connected' &&
                       Object.values(externalServices).every(status => status !== 'error') &&
                       Object.values(adminServices).every(status => status === true);
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
        socketIO: this.io !== undefined
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'admin-service',
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
      // Get admin-specific metrics
      const adminMetrics = await this.getAdminMetrics();
      
      const metrics = {
        service: 'admin-service',
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
        socketIO: {
          connectedClients: this.io.engine.clientsCount,
          totalConnections: 0 // This would be tracked
        },
        admin: adminMetrics,
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
      return this.adminService.isInitialized() && 
             this.userManagementService.isInitialized() &&
             this.assetVerificationService.isInitialized() &&
             this.systemMonitoringService.isInitialized() &&
             this.reportingService.isInitialized() &&
             this.notificationService.isInitialized();
    } catch (error) {
      return false;
    }
  }

  private async getAdminMetrics(): Promise<any> {
    try {
      // Return admin-specific metrics
      return {
        users: {
          total: await this.userManagementService.getTotalUsers(),
          active: await this.userManagementService.getActiveUsers(),
          pendingKyc: await this.userManagementService.getPendingKycUsers(),
          suspended: await this.userManagementService.getSuspendedUsers()
        },
        assets: {
          pendingVerification: await this.assetVerificationService.getPendingVerifications(),
          verified: await this.assetVerificationService.getVerifiedAssets(),
          rejected: await this.assetVerificationService.getRejectedAssets(),
          totalValue: await this.assetVerificationService.getTotalAssetValue()
        },
        system: {
          alerts: await this.systemMonitoringService.getActiveAlerts(),
          performance: await this.systemMonitoringService.getPerformanceMetrics(),
          errors: await this.systemMonitoringService.getErrorCount()
        },
        reports: {
          generated: await this.reportingService.getGeneratedReportsCount(),
          scheduled: await this.reportingService.getScheduledReportsCount()
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
      // Close Socket.IO connections
      this.io.close();
      logger.info('Socket.IO connections closed');

      // Stop accepting new connections
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Stop admin services
      await this.adminService.stop();
      await this.userManagementService.stop();
      await this.assetVerificationService.stop();
      await this.systemMonitoringService.stop();
      await this.reportingService.stop();
      await this.notificationService.stop();
      logger.info('Admin services stopped');

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

      // Initialize admin services
      await this.initializeAdminServices();

      // Start HTTP server
      this.server.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Admin service started successfully', {
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
      logger.error('Failed to start SwiftPayMe admin service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_admin';
      
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

  private async initializeAdminServices(): Promise<void> {
    try {
      logger.info('Initializing admin services...');

      // Initialize admin service
      await this.adminService.initialize();
      logger.info('Admin service initialized');

      // Initialize user management service
      await this.userManagementService.initialize();
      logger.info('User management service initialized');

      // Initialize asset verification service
      await this.assetVerificationService.initialize();
      logger.info('Asset verification service initialized');

      // Initialize system monitoring service
      await this.systemMonitoringService.initialize();
      logger.info('System monitoring service initialized');

      // Initialize reporting service
      await this.reportingService.initialize();
      logger.info('Reporting service initialized');

      // Initialize notification service
      await this.notificationService.initialize();
      logger.info('Notification service initialized');

      logger.info('All admin services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize admin services', { error });
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

  // Public method to broadcast notifications
  public broadcastNotification(event: string, data: any, room?: string): void {
    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.to('admin-room').emit(event, data);
    }
  }

  // Public method to get Socket.IO instance
  public getSocketIO(): Server {
    return this.io;
  }
}

// Create and start the service
const swiftPayAdminService = new SwiftPayAdminService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayAdminService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe admin service:', error);
    process.exit(1);
  });
}

export default swiftPayAdminService;

