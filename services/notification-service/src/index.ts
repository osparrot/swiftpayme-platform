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
import Queue from 'bull';

// Import routes and middleware
import notificationRoutes from './routes/notificationRoutes';
import templateRoutes from './routes/templateRoutes';
import channelRoutes from './routes/channelRoutes';
import webhookRoutes from './routes/webhookRoutes';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import { Logger } from './utils/Logger';
import { RedisClient } from './utils/RedisClient';
import { NotificationService } from './services/NotificationService';
import { EmailService } from './services/EmailService';
import { SMSService } from './services/SMSService';
import { PushNotificationService } from './services/PushNotificationService';
import { WebhookService } from './services/WebhookService';
import { TemplateService } from './services/TemplateService';
import { ChannelService } from './services/ChannelService';
import { QueueService } from './services/QueueService';
import { AnalyticsService } from './services/AnalyticsService';
import { ServiceResponse } from './types';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayNotificationService');

class SwiftPayNotificationService {
  private app: Application;
  private server: any;
  private io: Server;
  private port: number;
  private notificationService: NotificationService;
  private emailService: EmailService;
  private smsService: SMSService;
  private pushService: PushNotificationService;
  private webhookService: WebhookService;
  private templateService: TemplateService;
  private channelService: ChannelService;
  private queueService: QueueService;
  private analyticsService: AnalyticsService;
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
    this.port = parseInt(process.env.PORT || '3009');
    
    // Initialize services
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.pushService = new PushNotificationService();
    this.webhookService = new WebhookService();
    this.templateService = new TemplateService();
    this.channelService = new ChannelService();
    this.queueService = new QueueService();
    this.analyticsService = new AnalyticsService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeQueues();
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
      res.setHeader('X-Service', 'notification-service');
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
          'http://localhost:3008',
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
        'X-Webhook-Signature',
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
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/templates', templateRoutes);
    this.app.use('/api/channels', channelRoutes);
    this.app.use('/webhooks', webhookRoutes); // No auth for webhooks

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'SwiftPayMe Notification Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Real-time notification system for user and admin communications',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'Multi-Channel Notifications (Email, SMS, Push, Webhook)',
            'Real-Time WebSocket Communication',
            'Template Management System',
            'Queue-Based Processing',
            'Analytics & Reporting',
            'Channel Management',
            'Webhook Integration',
            'Rate Limiting & Throttling',
            'Delivery Tracking',
            'Retry Mechanisms'
          ],
          capabilities: {
            email: 'SMTP and transactional email delivery',
            sms: 'SMS delivery via Twilio and other providers',
            push: 'Mobile and web push notifications',
            webhook: 'HTTP webhook delivery with retry logic',
            realtime: 'WebSocket-based real-time notifications',
            templates: 'Dynamic template rendering with variables',
            analytics: 'Delivery tracking and performance analytics',
            queues: 'Asynchronous processing with Bull queues'
          },
          endpoints: {
            health: '/health',
            ready: '/ready',
            metrics: '/metrics',
            notifications: '/api/notifications',
            templates: '/api/templates',
            channels: '/api/channels',
            webhooks: '/webhooks'
          },
          integrations: {
            userService: process.env.USER_SERVICE_URL || 'http://user-service:3002',
            adminService: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3008',
            assetService: process.env.ASSET_SERVICE_URL || 'http://asset-service:3005',
            paymentService: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004'
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
      logger.info('Client connected to notification service', { socketId: socket.id });

      // Handle authentication
      socket.on('authenticate', async (token) => {
        try {
          // Verify token and get user/admin info
          const user = await this.notificationService.verifyToken(token);
          if (user) {
            socket.data.user = user;
            socket.join(`user-${user.id}`);
            if (user.type === 'admin') {
              socket.join('admin-room');
            }
            socket.emit('authenticated', { success: true, user });
            logger.info('Socket authenticated', { socketId: socket.id, userId: user.id });
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
          }
        } catch (error) {
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
          logger.error('Socket authentication failed', { error, socketId: socket.id });
        }
      });

      // Handle notification preferences
      socket.on('update-preferences', async (preferences) => {
        if (socket.data.user) {
          try {
            await this.notificationService.updateUserPreferences(socket.data.user.id, preferences);
            socket.emit('preferences-updated', { success: true });
          } catch (error) {
            socket.emit('preferences-updated', { success: false, error: 'Failed to update preferences' });
          }
        }
      });

      // Handle notification acknowledgment
      socket.on('acknowledge-notification', async (notificationId) => {
        if (socket.data.user) {
          try {
            await this.notificationService.acknowledgeNotification(notificationId, socket.data.user.id);
            socket.emit('notification-acknowledged', { notificationId, success: true });
          } catch (error) {
            socket.emit('notification-acknowledged', { notificationId, success: false });
          }
        }
      });

      // Handle subscription to notification channels
      socket.on('subscribe-channels', (channels) => {
        if (socket.data.user) {
          channels.forEach((channel: string) => {
            socket.join(`channel-${channel}`);
          });
          logger.info('User subscribed to channels', { 
            userId: socket.data.user.id, 
            channels 
          });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from notification service', { socketId: socket.id });
      });
    });

    // Set up notification broadcasting
    this.setupNotificationBroadcasting();
  }

  private setupNotificationBroadcasting(): void {
    // Listen for notification events from other services
    this.notificationService.on('notification-sent', (notification) => {
      // Broadcast to specific user
      if (notification.userId) {
        this.io.to(`user-${notification.userId}`).emit('notification', notification);
      }

      // Broadcast to admin room if it's an admin notification
      if (notification.type === 'admin' || notification.category === 'admin') {
        this.io.to('admin-room').emit('admin-notification', notification);
      }

      // Broadcast to specific channels
      if (notification.channels) {
        notification.channels.forEach((channel: string) => {
          this.io.to(`channel-${channel}`).emit('channel-notification', notification);
        });
      }
    });

    // Listen for delivery status updates
    this.notificationService.on('delivery-status-updated', (update) => {
      if (update.userId) {
        this.io.to(`user-${update.userId}`).emit('delivery-status', update);
      }
      
      // Notify admins of delivery failures
      if (update.status === 'failed') {
        this.io.to('admin-room').emit('delivery-failure', update);
      }
    });

    // Listen for system alerts
    this.notificationService.on('system-alert', (alert) => {
      this.io.to('admin-room').emit('system-alert', alert);
    });
  }

  private initializeQueues(): void {
    // Initialize notification processing queues
    this.queueService.initialize();

    // Set up queue processors
    this.queueService.process('email', 5, async (job) => {
      return await this.emailService.sendEmail(job.data);
    });

    this.queueService.process('sms', 3, async (job) => {
      return await this.smsService.sendSMS(job.data);
    });

    this.queueService.process('push', 10, async (job) => {
      return await this.pushService.sendPushNotification(job.data);
    });

    this.queueService.process('webhook', 5, async (job) => {
      return await this.webhookService.sendWebhook(job.data);
    });

    // Set up queue event handlers
    this.queueService.on('completed', (job, result) => {
      logger.info('Notification job completed', { 
        jobId: job.id, 
        type: job.queue.name, 
        result 
      });
      
      // Update delivery status
      this.notificationService.updateDeliveryStatus(job.data.notificationId, 'delivered', result);
    });

    this.queueService.on('failed', (job, error) => {
      logger.error('Notification job failed', { 
        jobId: job.id, 
        type: job.queue.name, 
        error: error.message 
      });
      
      // Update delivery status
      this.notificationService.updateDeliveryStatus(job.data.notificationId, 'failed', { error: error.message });
    });

    this.queueService.on('stalled', (job) => {
      logger.warn('Notification job stalled', { 
        jobId: job.id, 
        type: job.queue.name 
      });
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
    // Clean up old notifications daily at 2 AM
    const cleanupJob = new cron.CronJob('0 2 * * *', async () => {
      try {
        await this.notificationService.cleanupOldNotifications();
        logger.info('Old notifications cleanup completed');
      } catch (error) {
        logger.error('Failed to cleanup old notifications', { error });
      }
    });

    // Generate analytics reports daily at 6 AM
    const analyticsJob = new cron.CronJob('0 6 * * *', async () => {
      try {
        await this.analyticsService.generateDailyReport();
        logger.info('Daily analytics report generated');
      } catch (error) {
        logger.error('Failed to generate daily analytics report', { error });
      }
    });

    // Process failed notifications retry every hour
    const retryJob = new cron.CronJob('0 * * * *', async () => {
      try {
        await this.notificationService.retryFailedNotifications();
        logger.info('Failed notifications retry completed');
      } catch (error) {
        logger.error('Failed to retry failed notifications', { error });
      }
    });

    // Update delivery statistics every 15 minutes
    const statsJob = new cron.CronJob('*/15 * * * *', async () => {
      try {
        await this.analyticsService.updateDeliveryStatistics();
      } catch (error) {
        logger.error('Failed to update delivery statistics', { error });
      }
    });

    // Start all cron jobs
    cleanupJob.start();
    analyticsJob.start();
    retryJob.start();
    statsJob.start();

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

      // Check notification services
      const serviceHealth = {
        email: await this.emailService.isHealthy(),
        sms: await this.smsService.isHealthy(),
        push: await this.pushService.isHealthy(),
        webhook: await this.webhookService.isHealthy(),
        template: await this.templateService.isHealthy(),
        queue: await this.queueService.isHealthy()
      };

      // Check queue health
      const queueHealth = await this.queueService.getQueueHealth();

      const healthData = {
        service: 'notification-service',
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
        services: serviceHealth,
        queues: queueHealth,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = dbStatus === 'connected' && 
                       redisStatus === 'connected' &&
                       Object.values(serviceHealth).every(status => status === true);
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
        queues: await this.queueService.isReady(),
        socketIO: this.io !== undefined
      };

      const isReady = Object.values(checks).every(check => check === true);

      const response: ServiceResponse = {
        success: isReady,
        data: {
          service: 'notification-service',
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
      // Get notification-specific metrics
      const notificationMetrics = await this.getNotificationMetrics();
      
      const metrics = {
        service: 'notification-service',
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
        notifications: notificationMetrics,
        queues: await this.queueService.getMetrics(),
        prometheus: await register.metrics()
      };

      res.set('Content-Type', 'application/json');
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics endpoint failed', { error });
      res.status(500).json({ error: 'Metrics unavailable' });
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
      return this.notificationService.isInitialized() && 
             this.emailService.isInitialized() &&
             this.smsService.isInitialized() &&
             this.pushService.isInitialized() &&
             this.webhookService.isInitialized() &&
             this.templateService.isInitialized() &&
             this.channelService.isInitialized() &&
             this.queueService.isInitialized() &&
             this.analyticsService.isInitialized();
    } catch (error) {
      return false;
    }
  }

  private async getNotificationMetrics(): Promise<any> {
    try {
      return {
        sent: await this.analyticsService.getSentCount(),
        delivered: await this.analyticsService.getDeliveredCount(),
        failed: await this.analyticsService.getFailedCount(),
        pending: await this.analyticsService.getPendingCount(),
        channels: {
          email: await this.analyticsService.getChannelMetrics('email'),
          sms: await this.analyticsService.getChannelMetrics('sms'),
          push: await this.analyticsService.getChannelMetrics('push'),
          webhook: await this.analyticsService.getChannelMetrics('webhook')
        },
        templates: await this.analyticsService.getTemplateUsage(),
        deliveryRate: await this.analyticsService.getDeliveryRate(),
        averageDeliveryTime: await this.analyticsService.getAverageDeliveryTime()
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

      // Stop notification services
      await this.notificationService.stop();
      await this.emailService.stop();
      await this.smsService.stop();
      await this.pushService.stop();
      await this.webhookService.stop();
      await this.templateService.stop();
      await this.channelService.stop();
      await this.queueService.stop();
      await this.analyticsService.stop();
      logger.info('Notification services stopped');

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

      // Initialize notification services
      await this.initializeNotificationServices();

      // Start HTTP server
      this.server.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe Notification service started successfully', {
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
      logger.error('Failed to start SwiftPayMe notification service', { error });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftpay_notifications';
      
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

  private async initializeNotificationServices(): Promise<void> {
    try {
      logger.info('Initializing notification services...');

      // Initialize notification service
      await this.notificationService.initialize();
      logger.info('Notification service initialized');

      // Initialize email service
      await this.emailService.initialize();
      logger.info('Email service initialized');

      // Initialize SMS service
      await this.smsService.initialize();
      logger.info('SMS service initialized');

      // Initialize push notification service
      await this.pushService.initialize();
      logger.info('Push notification service initialized');

      // Initialize webhook service
      await this.webhookService.initialize();
      logger.info('Webhook service initialized');

      // Initialize template service
      await this.templateService.initialize();
      logger.info('Template service initialized');

      // Initialize channel service
      await this.channelService.initialize();
      logger.info('Channel service initialized');

      // Initialize queue service
      await this.queueService.initialize();
      logger.info('Queue service initialized');

      // Initialize analytics service
      await this.analyticsService.initialize();
      logger.info('Analytics service initialized');

      logger.info('All notification services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification services', { error });
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
      this.io.emit(event, data);
    }
  }

  // Public method to get Socket.IO instance
  public getSocketIO(): Server {
    return this.io;
  }

  // Public method to get notification service
  public getNotificationService(): NotificationService {
    return this.notificationService;
  }
}

// Create and start the service
const swiftPayNotificationService = new SwiftPayNotificationService();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayNotificationService.start().catch((error) => {
    console.error('Failed to start SwiftPayMe notification service:', error);
    process.exit(1);
  });
}

export default swiftPayNotificationService;

