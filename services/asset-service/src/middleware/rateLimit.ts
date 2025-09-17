import { Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { AssetRequest } from '../types';
import { TooManyRequestsError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('RateLimitMiddleware');

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: AssetRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  resetTime: Date;
  remaining: number;
}

class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });
  }

  async isAllowed(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    try {
      const now = Date.now();
      const window = Math.floor(now / this.config.windowMs);
      const redisKey = `rate_limit:${key}:${window}`;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results || results.length < 2) {
        throw new Error('Redis pipeline execution failed');
      }

      const [incrResult, expireResult] = results;
      
      if (incrResult[0] || expireResult[0]) {
        throw new Error('Redis operation failed');
      }

      const totalHitsInWindow = incrResult[1] as number;
      const resetTime = new Date((window + 1) * this.config.windowMs);
      const remaining = Math.max(0, this.config.maxRequests - totalHitsInWindow);
      const allowed = totalHitsInWindow <= this.config.maxRequests;

      return {
        allowed,
        info: {
          totalHits: totalHitsInWindow,
          totalHitsInWindow,
          resetTime,
          remaining
        }
      };
    } catch (error) {
      logger.error('Rate limit check failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        info: {
          totalHits: 0,
          totalHitsInWindow: 0,
          resetTime: new Date(Date.now() + this.config.windowMs),
          remaining: this.config.maxRequests
        }
      };
    }
  }

  middleware() {
    return async (req: AssetRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = this.config.keyGenerator ? this.config.keyGenerator(req) : this.defaultKeyGenerator(req);
        const { allowed, info } = await this.isAllowed(key);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'X-RateLimit-Reset': info.resetTime.getTime().toString(),
          'X-RateLimit-Window': this.config.windowMs.toString()
        });

        if (!allowed) {
          logger.warn('Rate limit exceeded', {
            key,
            totalHits: info.totalHits,
            limit: this.config.maxRequests,
            resetTime: info.resetTime,
            userAgent: req.userAgent,
            ip: req.clientIp
          });

          const message = this.config.message || 'Too many requests, please try again later';
          throw new TooManyRequestsError(message);
        }

        logger.debug('Rate limit check passed', {
          key,
          hits: info.totalHits,
          remaining: info.remaining,
          limit: this.config.maxRequests
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private defaultKeyGenerator(req: AssetRequest): string {
    const userId = req.user?.id;
    const ip = req.clientIp || 'unknown';
    
    if (userId) {
      return `user:${userId}`;
    } else {
      return `ip:${ip}`;
    }
  }
}

// Rate limit configurations
const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Too many requests from this IP, please try again later'
  },

  // Authenticated user rate limit
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5000,
    keyGenerator: (req: AssetRequest) => `user:${req.user?.id || 'anonymous'}`
  },

  // Asset creation rate limit
  assetCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (req: AssetRequest) => `asset_creation:${req.user?.id || req.clientIp}`,
    message: 'Too many asset creation requests, please try again later'
  },

  // Wallet creation rate limit
  walletCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    keyGenerator: (req: AssetRequest) => `wallet_creation:${req.user?.id || req.clientIp}`,
    message: 'Too many wallet creation requests, please try again later'
  },

  // Price update rate limit
  priceUpdate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req: AssetRequest) => `price_update:${req.user?.id || req.clientIp}`,
    message: 'Too many price update requests, please try again later'
  },

  // Portfolio access rate limit
  portfolio: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (req: AssetRequest) => `portfolio:${req.user?.id || req.clientIp}`,
    message: 'Too many portfolio requests, please try again later'
  }
};

// Create rate limiter instances
const rateLimiters = {
  general: new RateLimiter(rateLimitConfigs.general),
  authenticated: new RateLimiter(rateLimitConfigs.authenticated),
  assetCreation: new RateLimiter(rateLimitConfigs.assetCreation),
  walletCreation: new RateLimiter(rateLimitConfigs.walletCreation),
  priceUpdate: new RateLimiter(rateLimitConfigs.priceUpdate),
  portfolio: new RateLimiter(rateLimitConfigs.portfolio)
};

// Middleware functions
export const rateLimitMiddleware = (req: AssetRequest, res: Response, next: NextFunction): void => {
  // Apply different rate limits based on authentication status
  if (req.user) {
    rateLimiters.authenticated.middleware()(req, res, next);
  } else {
    rateLimiters.general.middleware()(req, res, next);
  }
};

export const assetCreationRateLimit = rateLimiters.assetCreation.middleware();
export const walletCreationRateLimit = rateLimiters.walletCreation.middleware();
export const priceUpdateRateLimit = rateLimiters.priceUpdate.middleware();
export const portfolioRateLimit = rateLimiters.portfolio.middleware();

// Dynamic rate limiting based on user tier
export const dynamicRateLimit = (req: AssetRequest, res: Response, next: NextFunction): void => {
  const userRole = req.user?.role;
  let config: RateLimitConfig;

  switch (userRole) {
    case 'admin':
      config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10000,
        keyGenerator: (req: AssetRequest) => `admin:${req.user?.id}`
      };
      break;
    case 'premium':
      config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 2000,
        keyGenerator: (req: AssetRequest) => `premium:${req.user?.id}`
      };
      break;
    case 'api_user':
      config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 500,
        keyGenerator: (req: AssetRequest) => `api:${req.user?.id}`
      };
      break;
    default:
      config = rateLimitConfigs.authenticated;
  }

  const rateLimiter = new RateLimiter(config);
  rateLimiter.middleware()(req, res, next);
};

// Rate limit bypass for internal services
export const internalServiceRateLimit = (req: AssetRequest, res: Response, next: NextFunction): void => {
  const internalServiceHeader = req.headers['x-internal-service'];
  const internalServiceSecret = req.headers['x-internal-secret'];

  if (internalServiceHeader && internalServiceSecret === process.env.INTERNAL_SERVICE_SECRET) {
    // Bypass rate limiting for internal services
    logger.debug('Rate limit bypassed for internal service', {
      service: internalServiceHeader,
      requestId: req.requestId
    });
    next();
  } else {
    rateLimitMiddleware(req, res, next);
  }
};

// Health check rate limit (more lenient)
export const healthCheckRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (req: AssetRequest) => `health:${req.clientIp}`,
  message: 'Too many health check requests'
}).middleware();

export default {
  rateLimitMiddleware,
  assetCreationRateLimit,
  walletCreationRateLimit,
  priceUpdateRateLimit,
  portfolioRateLimit,
  dynamicRateLimit,
  internalServiceRateLimit,
  healthCheckRateLimit
};

