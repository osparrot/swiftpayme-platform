import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'redis';
import { Request, Response } from 'express';
import { UserRequest } from '../types';
import { Logger } from '../utils/Logger';
import { TooManyRequestsError } from '../utils/Errors';

const logger = new Logger('RateLimitMiddleware');

// Create Redis client for rate limiting
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    commandTimeout: 5000
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limit client error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis rate limit client connected');
});

// Initialize Redis connection
redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis for rate limiting', { error: err.message });
});

// Rate limit configurations
const rateLimitConfigs = {
  // Authentication endpoints
  register: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `register:${req.ip}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `login:${req.ip}:${req.body?.email || 'unknown'}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `password_reset:${req.ip}:${req.body?.email || 'unknown'}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  passwordChange: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many password change attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `password_change:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  emailVerification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: 'Too many email verification attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `email_verify:${req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  phoneVerification: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many phone verification attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `phone_verify:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  twoFactorSetup: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    message: 'Too many two-factor setup attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `2fa_setup:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  twoFactorVerify: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: 'Too many two-factor verification attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `2fa_verify:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // Profile and data endpoints
  profile: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many profile requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `profile:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  profileUpdate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 updates per window
    message: 'Too many profile update attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `profile_update:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  documentUpload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: 'Too many document upload attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `doc_upload:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // Session management
  sessions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many session requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `sessions:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  logout: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 logout attempts per window
    message: 'Too many logout attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `logout:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  // Activity and audit
  activities: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many activity requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `activities:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  notifications: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many notification requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `notifications:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  // Preferences
  preferences: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many preference requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `preferences:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  preferencesUpdate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 updates per window
    message: 'Too many preference update attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `preferences_update:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // API key management
  apiKeys: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many API key requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `api_keys:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  apiKeyCreate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 API keys per hour
    message: 'Too many API key creation attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `api_key_create:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // Admin endpoints
  adminUsers: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window for admin
    message: 'Too many admin user requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `admin_users:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  adminActions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 admin actions per window
    message: 'Too many admin actions, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: UserRequest) => `admin_actions:${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // Global rate limit
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window per IP
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `global:${req.ip}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

// Create rate limiter function
export const createRateLimiter = (configName: keyof typeof rateLimitConfigs) => {
  const config = rateLimitConfigs[configName];
  
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    ...config,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        configName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: (req as UserRequest).user?.id
      });

      const error = new TooManyRequestsError(config.message);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    },
    onLimitReached: (req: Request) => {
      logger.warn('Rate limit reached', {
        configName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: (req as UserRequest).user?.id
      });
    }
  });
};

// Middleware factory
export const rateLimitMiddleware = (configName: keyof typeof rateLimitConfigs) => {
  return createRateLimiter(configName);
};

// Global rate limiter
export const globalRateLimit = createRateLimiter('global');

// Dynamic rate limiter based on user tier
export const dynamicRateLimit = (req: UserRequest, res: Response, next: Function) => {
  const user = req.user;
  let maxRequests = 100; // Default for unauthenticated users
  
  if (user) {
    // Adjust limits based on user role/tier
    switch (user.role) {
      case 'admin':
      case 'moderator':
        maxRequests = 1000;
        break;
      case 'premium':
        maxRequests = 500;
        break;
      case 'user':
        maxRequests = 200;
        break;
      default:
        maxRequests = 100;
    }
  }

  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    keyGenerator: (req: Request) => `dynamic:${(req as UserRequest).user?.id || req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Dynamic rate limit exceeded', {
        ip: req.ip,
        userId: (req as UserRequest).user?.id,
        userRole: (req as UserRequest).user?.role,
        maxRequests,
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  limiter(req, res, next);
};

// IP-based rate limiter for suspicious activity
export const suspiciousActivityLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Very restrictive for suspicious IPs
  keyGenerator: (req: Request) => `suspicious:${req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error('Suspicious activity rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'SUSPICIOUS_ACTIVITY_BLOCKED',
        message: 'Suspicious activity detected. Access temporarily restricted.'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Burst protection for critical endpoints
export const burstProtection = (maxBurst: number = 5, windowMs: number = 1000) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs,
    max: maxBurst,
    keyGenerator: (req: Request) => `burst:${(req as UserRequest).user?.id || req.ip}:${req.path}`,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Burst protection triggered', {
        ip: req.ip,
        userId: (req as UserRequest).user?.id,
        path: req.path,
        method: req.method,
        maxBurst,
        windowMs
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'BURST_LIMIT_EXCEEDED',
          message: 'Too many requests in a short time. Please slow down.'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Cleanup function for graceful shutdown
export const cleanup = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Rate limit Redis client disconnected');
  } catch (error) {
    logger.error('Error disconnecting rate limit Redis client', { error: error.message });
  }
};

// Health check for rate limiting service
export const healthCheck = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Rate limiting health check failed', { error: error.message });
    return false;
  }
};

export default {
  rateLimitMiddleware,
  globalRateLimit,
  dynamicRateLimit,
  suspiciousActivityLimiter,
  burstProtection,
  cleanup,
  healthCheck
};

