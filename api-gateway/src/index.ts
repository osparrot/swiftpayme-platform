import express, { Application, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Import middleware and utilities
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { validationMiddleware } from './middleware/validation';
import { circuitBreakerMiddleware } from './middleware/circuitBreaker';
import { cacheMiddleware } from './middleware/cache';
import { Logger } from './utils/Logger';
import { ServiceDiscovery } from './utils/ServiceDiscovery';
import { HealthChecker } from './utils/HealthChecker';
import { MetricsCollector } from './utils/MetricsCollector';
import { ApiGatewayContracts } from '../shared/contracts/service-contracts';

// Load environment variables
config();

// Initialize logger
const logger = new Logger('SwiftPayApiGateway');

class SwiftPayApiGateway {
  private app: Application;
  private port: number;
  private redis: Redis;
  private serviceDiscovery: ServiceDiscovery;
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    // Initialize utilities
    this.serviceDiscovery = new ServiceDiscovery();
    this.healthChecker = new HealthChecker();
    this.metricsCollector = new MetricsCollector();

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeProxies();
    this.initializeSwagger();
    this.initializeErrorHandling();
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
      res.setHeader('X-Gateway', 'swiftpayme-api-gateway');
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
          'http://localhost:3001',
          'http://localhost:8080',
          'https://app.swiftpayme.com',
          'https://admin.swiftpayme.com'
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
      limit: process.env.MAX_REQUEST_SIZE || '10mb' 
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
    const rateLimitStore = new RedisStore({
      sendCommand: (...args: string[]) => this.redis.call(...args),
    });

    this.app.use(rateLimit({
      store: rateLimitStore,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      }
    }));

    // Metrics collection middleware
    this.app.use((req: any, res: Response, next: NextFunction) => {
      req.startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        this.metricsCollector.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
      });
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoints
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/metrics', this.metricsEndpoint.bind(this));

    // Service discovery endpoint
    this.app.get('/services', this.servicesEndpoint.bind(this));

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'SwiftPayMe API Gateway',
        version: process.env.SERVICE_VERSION || '1.0.0',
        description: 'Unified entry point for all SwiftPayMe microservices',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          ready: '/ready',
          metrics: '/metrics',
          services: '/services',
          docs: '/api-docs',
          api: {
            users: '/api/users',
            assets: '/api/assets',
            currency: '/api/currency',
            crypto: '/api/crypto',
            payments: '/api/payments',
            admin: '/api/admin',
            notifications: '/api/notifications'
          }
        },
        services: this.serviceDiscovery.getServices()
      });
    });
  }

  private initializeProxies(): void {
    // Service configurations
    const services = [
      {
        name: 'user-service',
        path: '/api/users',
        target: process.env.USER_SERVICE_URL || 'http://user-service:3002',
        auth: true
      },
      {
        name: 'asset-service',
        path: '/api/assets',
        target: process.env.ASSET_SERVICE_URL || 'http://asset-service:3005',
        auth: true
      },
      {
        name: 'currency-service',
        path: '/api/currency',
        target: process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3006',
        auth: false // Public pricing data
      },
      {
        name: 'crypto-service',
        path: '/api/crypto',
        target: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3007',
        auth: true
      },
      {
        name: 'payment-service',
        path: '/api/payments',
        target: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004',
        auth: true
      },
      {
        name: 'admin-service',
        path: '/api/admin',
        target: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3008',
        auth: true,
        roles: ['admin', 'super_admin']
      },
      {
        name: 'notification-service',
        path: '/api/notifications',
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009',
        auth: true
      }
    ];

    // Create proxies for each service
    services.forEach(service => {
      this.createServiceProxy(service);
    });

    // Register services with discovery
    services.forEach(service => {
      this.serviceDiscovery.registerService(service.name, service.target);
    });
  }

  private createServiceProxy(service: any): void {
    const proxyOptions: Options = {
      target: service.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${service.path}`]: ''
      },
      timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
      proxyTimeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          service: service.name,
          error: err.message,
          url: req.url
        });

        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `${service.name} is currently unavailable`
            },
            timestamp: new Date().toISOString()
          });
        }
      },
      onProxyReq: (proxyReq, req: any, res) => {
        // Add request ID to forwarded request
        proxyReq.setHeader('X-Request-ID', req.requestId);
        proxyReq.setHeader('X-Forwarded-By', 'swiftpayme-api-gateway');
        
        // Add user context if available
        if (req.user) {
          proxyReq.setHeader('X-User-ID', req.user.id);
          proxyReq.setHeader('X-User-Type', req.user.type);
        }

        logger.debug('Proxying request', {
          service: service.name,
          method: req.method,
          path: req.path,
          requestId: req.requestId
        });
      },
      onProxyRes: (proxyRes, req: any, res) => {
        // Add response headers
        proxyRes.headers['x-proxied-by'] = 'swiftpayme-api-gateway';
        proxyRes.headers['x-service'] = service.name;

        logger.debug('Proxy response received', {
          service: service.name,
          statusCode: proxyRes.statusCode,
          requestId: req.requestId
        });
      }
    };

    // Create middleware chain
    const middlewares = [];

    // Add circuit breaker
    middlewares.push(circuitBreakerMiddleware(service.name, service.target));

    // Add caching for GET requests (if configured)
    if (service.cache) {
      middlewares.push(cacheMiddleware(service.cache));
    }

    // Add authentication if required
    if (service.auth) {
      middlewares.push(authMiddleware(service.roles));
    }

    // Add validation if configured
    if (service.validation) {
      middlewares.push(validationMiddleware(service.validation));
    }

    // Add the proxy middleware
    middlewares.push(createProxyMiddleware(proxyOptions));

    // Apply all middleware to the service path
    this.app.use(service.path, ...middlewares);

    logger.info('Service proxy created', {
      service: service.name,
      path: service.path,
      target: service.target,
      auth: service.auth,
      roles: service.roles
    });
  }

  private initializeSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'SwiftPayMe API Gateway',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description: 'Unified API for SwiftPayMe payment system',
          contact: {
            name: 'SwiftPayMe Team',
            email: 'dev@swiftpayme.com'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: [
          {
            url: process.env.API_BASE_URL || 'http://localhost:3000',
            description: 'API Gateway'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: ['./src/routes/*.ts', './docs/*.yaml']
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'SwiftPayMe API Documentation'
    }));

    // Serve OpenAPI spec as JSON
    this.app.get('/api-docs.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    logger.info('Swagger documentation initialized at /api-docs');
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${req.method} ${req.originalUrl} not found`
        },
        timestamp: new Date().toISOString()
      });
    });

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

      res.status(statusCode).json({
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
      });
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
      
      // Check Redis connection
      let redisStatus = 'disconnected';
      try {
        await this.redis.ping();
        redisStatus = 'connected';
      } catch (redisError) {
        logger.warn('Redis health check failed', { error: redisError });
      }

      // Check service health
      const serviceHealth = await this.healthChecker.checkAllServices();

      const healthData = {
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        connections: {
          redis: {
            status: redisStatus,
            host: process.env.REDIS_HOST || 'redis'
          }
        },
        services: serviceHealth,
        responseTime: Date.now() - startTime
      };

      // Determine overall health status
      const isHealthy = redisStatus === 'connected' && 
                       Object.values(serviceHealth).every((status: any) => status.healthy);
      const statusCode = isHealthy ? 200 : 503;

      if (!isHealthy) {
        healthData.status = 'unhealthy';
      }

      res.status(statusCode).json({
        success: isHealthy,
        data: healthData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if gateway is ready to handle requests
      const checks = {
        redis: await this.checkRedisConnection(),
        services: await this.checkCriticalServices(),
        discovery: this.serviceDiscovery.isReady()
      };

      const isReady = Object.values(checks).every(check => check === true);

      res.status(isReady ? 200 : 503).json({
        success: isReady,
        data: {
          service: 'api-gateway',
          status: isReady ? 'ready' : 'not ready',
          checks,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      
      res.status(503).json({
        success: false,
        error: {
          code: 'READINESS_CHECK_FAILED',
          message: 'Service is not ready'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async metricsEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsCollector.getMetrics();
      
      res.set('Content-Type', 'application/json');
      res.json({
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        ...metrics
      });
    } catch (error) {
      logger.error('Metrics endpoint failed', { error });
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  }

  private async servicesEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const services = this.serviceDiscovery.getServices();
      const serviceHealth = await this.healthChecker.checkAllServices();

      const servicesWithHealth = Object.keys(services).reduce((acc, serviceName) => {
        acc[serviceName] = {
          ...services[serviceName],
          health: serviceHealth[serviceName] || { healthy: false, responseTime: 0 }
        };
        return acc;
      }, {} as any);

      res.json({
        success: true,
        data: {
          services: servicesWithHealth,
          total: Object.keys(services).length,
          healthy: Object.values(serviceHealth).filter((s: any) => s.healthy).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Services endpoint failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICES_CHECK_FAILED',
          message: 'Failed to get services status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async checkRedisConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkCriticalServices(): Promise<boolean> {
    try {
      const criticalServices = ['user-service', 'payment-service'];
      const healthChecks = await Promise.all(
        criticalServices.map(service => this.healthChecker.checkService(service))
      );
      
      return healthChecks.every(check => check.healthy);
    } catch (error) {
      return false;
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
      if (this.app) {
        // Close server if it exists
        // Note: In a real implementation, you'd store the server instance
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.disconnect();
        logger.info('Redis connection closed');
      }

      // Stop service discovery
      await this.serviceDiscovery.stop();
      logger.info('Service discovery stopped');

      // Stop health checker
      await this.healthChecker.stop();
      logger.info('Health checker stopped');

      // Stop metrics collector
      await this.metricsCollector.stop();
      logger.info('Metrics collector stopped');

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
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis');

      // Initialize service discovery
      await this.serviceDiscovery.initialize();
      logger.info('Service discovery initialized');

      // Initialize health checker
      await this.healthChecker.initialize();
      logger.info('Health checker initialized');

      // Initialize metrics collector
      await this.metricsCollector.initialize();
      logger.info('Metrics collector initialized');

      // Start HTTP server
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('SwiftPayMe API Gateway started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0',
          pid: process.pid
        });
      });

      // Graceful shutdown handling
      const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
      signals.forEach(signal => {
        process.on(signal, () => {
          logger.info(`Received ${signal}, starting graceful shutdown`);
          this.gracefulShutdown(signal);
        });
      });

    } catch (error) {
      logger.error('Failed to start SwiftPayMe API Gateway', { error });
      process.exit(1);
    }
  }
}

// Create and start the API Gateway
const swiftPayApiGateway = new SwiftPayApiGateway();

// Start the service if this file is run directly
if (require.main === module) {
  swiftPayApiGateway.start().catch((error) => {
    console.error('Failed to start SwiftPayMe API Gateway:', error);
    process.exit(1);
  });
}

export default swiftPayApiGateway;

