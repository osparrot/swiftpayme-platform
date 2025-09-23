/**
 * SwiftPayMe API Gateway - Route Configurations
 * Comprehensive routing and middleware setup
 */

import { Router, Request, Response, NextFunction } from 'express';
import { GatewayController } from '../controllers/GatewayController';
import { AuthMiddleware } from '../middleware/auth';
import { RateLimitMiddleware } from '../middleware/rateLimit';
import { ValidationMiddleware } from '../middleware/validation';
import { SecurityMiddleware } from '../middleware/security';
import { LoggingMiddleware } from '../middleware/logging';
import { CorsMiddleware } from '../middleware/cors';
import { CompressionMiddleware } from '../middleware/compression';

// ==================== ROUTE CONFIGURATION ====================
export class ApiGatewayRoutes {
  private router: Router;
  private gatewayController: GatewayController;
  private authMiddleware: AuthMiddleware;
  private rateLimitMiddleware: RateLimitMiddleware;
  private validationMiddleware: ValidationMiddleware;
  private securityMiddleware: SecurityMiddleware;
  private loggingMiddleware: LoggingMiddleware;

  constructor() {
    this.router = Router();
    this.gatewayController = new GatewayController();
    this.authMiddleware = new AuthMiddleware();
    this.rateLimitMiddleware = new RateLimitMiddleware();
    this.validationMiddleware = new ValidationMiddleware();
    this.securityMiddleware = new SecurityMiddleware();
    this.loggingMiddleware = new LoggingMiddleware();

    this.setupGlobalMiddleware();
    this.setupRoutes();
  }

  // ==================== GLOBAL MIDDLEWARE ====================
  private setupGlobalMiddleware(): void {
    // CORS middleware
    this.router.use(CorsMiddleware.configure({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Correlation-ID',
        'X-Request-ID',
        'X-User-Agent',
        'X-Forwarded-For'
      ]
    }));

    // Compression middleware
    this.router.use(CompressionMiddleware.configure({
      threshold: 1024,
      level: 6,
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return CompressionMiddleware.filter(req, res);
      }
    }));

    // Security middleware
    this.router.use(this.securityMiddleware.helmet());
    this.router.use(this.securityMiddleware.sanitizeInput());
    this.router.use(this.securityMiddleware.preventXSS());

    // Logging middleware
    this.router.use(this.loggingMiddleware.requestLogger());

    // Rate limiting (global)
    this.router.use(this.rateLimitMiddleware.globalRateLimit());
  }

  // ==================== ROUTE SETUP ====================
  private setupRoutes(): void {
    // Health check routes (no authentication required)
    this.setupHealthRoutes();

    // Metrics and monitoring routes (admin authentication required)
    this.setupMonitoringRoutes();

    // Public API routes (rate limited, no authentication)
    this.setupPublicRoutes();

    // User API routes (authentication required)
    this.setupUserRoutes();

    // Admin API routes (admin authentication required)
    this.setupAdminRoutes();

    // Service-specific routes
    this.setupServiceRoutes();

    // Catch-all proxy route (must be last)
    this.setupProxyRoutes();
  }

  // ==================== HEALTH ROUTES ====================
  private setupHealthRoutes(): void {
    // Gateway health check
    this.router.get('/health', this.gatewayController.healthCheck);

    // Detailed health check with service status
    this.router.get('/health/detailed', 
      this.authMiddleware.requireAdmin(),
      this.gatewayController.healthCheck
    );

    // Readiness probe
    this.router.get('/ready', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0'
      });
    });

    // Liveness probe
    this.router.get('/live', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });
  }

  // ==================== MONITORING ROUTES ====================
  private setupMonitoringRoutes(): void {
    // Metrics endpoint
    this.router.get('/metrics',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.gatewayController.getMetrics
    );

    // System information
    this.router.get('/system/info',
      this.authMiddleware.requireAdmin(),
      (req: Request, res: Response) => {
        res.json({
          node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            version: process.env.APP_VERSION || '1.0.0',
            timestamp: new Date().toISOString()
          }
        });
      }
    );
  }

  // ==================== PUBLIC ROUTES ====================
  private setupPublicRoutes(): void {
    // Public currency rates (cached, rate limited)
    this.router.get('/public/rates',
      this.rateLimitMiddleware.publicRateLimit(),
      this.validationMiddleware.validateQuery({
        from: { type: 'string', optional: true },
        to: { type: 'string', optional: true },
        amount: { type: 'number', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Public asset prices
    this.router.get('/public/assets/prices',
      this.rateLimitMiddleware.publicRateLimit(),
      this.validationMiddleware.validateQuery({
        asset: { type: 'string', optional: true },
        currency: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Public system status
    this.router.get('/public/status',
      this.rateLimitMiddleware.publicRateLimit(),
      (req: Request, res: Response) => {
        res.json({
          status: 'operational',
          services: ['user', 'asset', 'currency', 'crypto', 'payment'],
          timestamp: new Date().toISOString()
        });
      }
    );
  }

  // ==================== USER ROUTES ====================
  private setupUserRoutes(): void {
    // User authentication routes
    this.router.post('/auth/login',
      this.rateLimitMiddleware.authRateLimit(),
      this.validationMiddleware.validateBody({
        email: { type: 'string', required: true },
        password: { type: 'string', required: true }
      }),
      this.gatewayController.proxyRequest
    );

    this.router.post('/auth/register',
      this.rateLimitMiddleware.authRateLimit(),
      this.validationMiddleware.validateBody({
        email: { type: 'string', required: true },
        password: { type: 'string', required: true },
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true }
      }),
      this.gatewayController.proxyRequest
    );

    this.router.post('/auth/logout',
      this.authMiddleware.requireAuth(),
      this.gatewayController.proxyRequest
    );

    this.router.post('/auth/refresh',
      this.rateLimitMiddleware.authRateLimit(),
      this.validationMiddleware.validateBody({
        refreshToken: { type: 'string', required: true }
      }),
      this.gatewayController.proxyRequest
    );

    // User profile routes
    this.router.get('/users/profile',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.userRateLimit(),
      this.gatewayController.proxyRequest
    );

    this.router.put('/users/profile',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.userRateLimit(),
      this.validationMiddleware.validateBody({
        firstName: { type: 'string', optional: true },
        lastName: { type: 'string', optional: true },
        phone: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // User account routes
    this.router.get('/accounts/balances',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.userRateLimit(),
      this.gatewayController.proxyRequest
    );

    this.router.get('/accounts/transactions',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.userRateLimit(),
      this.validationMiddleware.validateQuery({
        page: { type: 'number', optional: true },
        limit: { type: 'number', optional: true },
        type: { type: 'string', optional: true },
        status: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );
  }

  // ==================== ADMIN ROUTES ====================
  private setupAdminRoutes(): void {
    // Admin authentication
    this.router.post('/admin/auth/login',
      this.rateLimitMiddleware.adminRateLimit(),
      this.validationMiddleware.validateBody({
        email: { type: 'string', required: true },
        password: { type: 'string', required: true },
        mfaCode: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // User management
    this.router.get('/admin/users',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.validationMiddleware.validateQuery({
        page: { type: 'number', optional: true },
        limit: { type: 'number', optional: true },
        search: { type: 'string', optional: true },
        status: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    this.router.get('/admin/users/:userId',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.validationMiddleware.validateParams({
        userId: { type: 'string', required: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Asset management
    this.router.get('/admin/assets/pending',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.gatewayController.proxyRequest
    );

    this.router.post('/admin/assets/:assetId/approve',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.validationMiddleware.validateParams({
        assetId: { type: 'string', required: true }
      }),
      this.validationMiddleware.validateBody({
        approvalNotes: { type: 'string', optional: true },
        valuationOverride: { type: 'number', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    this.router.post('/admin/assets/:assetId/reject',
      this.authMiddleware.requireAdmin(),
      this.rateLimitMiddleware.adminRateLimit(),
      this.validationMiddleware.validateParams({
        assetId: { type: 'string', required: true }
      }),
      this.validationMiddleware.validateBody({
        rejectionReason: { type: 'string', required: true },
        rejectionNotes: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );
  }

  // ==================== SERVICE-SPECIFIC ROUTES ====================
  private setupServiceRoutes(): void {
    // Asset deposit routes
    this.router.post('/assets/deposits',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.assetRateLimit(),
      this.validationMiddleware.validateBody({
        assetType: { type: 'string', required: true },
        weight: { type: 'number', required: true },
        purity: { type: 'number', optional: true },
        description: { type: 'string', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Currency conversion routes
    this.router.post('/currency/convert',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.userRateLimit(),
      this.validationMiddleware.validateBody({
        from: { type: 'string', required: true },
        to: { type: 'string', required: true },
        amount: { type: 'number', required: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Crypto transaction routes
    this.router.post('/crypto/bitcoin/send',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.cryptoRateLimit(),
      this.validationMiddleware.validateBody({
        toAddress: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        feeRate: { type: 'number', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Payment processing routes
    this.router.post('/payments/process',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.paymentRateLimit(),
      this.validationMiddleware.validateBody({
        type: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        currency: { type: 'string', required: true },
        metadata: { type: 'object', optional: true }
      }),
      this.gatewayController.proxyRequest
    );

    // Tokenization routes
    this.router.post('/tokens/mint',
      this.authMiddleware.requireAuth(),
      this.rateLimitMiddleware.tokenRateLimit(),
      this.validationMiddleware.validateBody({
        assetId: { type: 'string', required: true },
        amount: { type: 'number', required: true }
      }),
      this.gatewayController.proxyRequest
    );
  }

  // ==================== PROXY ROUTES ====================
  private setupProxyRoutes(): void {
    // Catch-all proxy route (must be last)
    this.router.all('*',
      this.authMiddleware.optionalAuth(), // Optional authentication
      this.rateLimitMiddleware.defaultRateLimit(),
      this.gatewayController.proxyRequest
    );
  }

  // ==================== ERROR HANDLING ====================
  private setupErrorHandling(): void {
    // 404 handler
    this.router.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Global error handler
    this.router.use((error: any, req: Request, res: Response, next: NextFunction) => {
      const statusCode = error.statusCode || error.status || 500;
      
      res.status(statusCode).json({
        error: {
          message: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  // ==================== GETTER ====================
  public getRouter(): Router {
    this.setupErrorHandling();
    return this.router;
  }
}

// ==================== EXPORT ====================
export default ApiGatewayRoutes;

