import rateLimit from 'express-rate-limit';
import { RedisClient } from '../utils/RedisClient';
import { Logger } from '../utils/Logger';

const logger = new Logger('RateLimit');

// Redis store for rate limiting
class RedisStore {
  private redisClient: RedisClient;
  private prefix: string;

  constructor(prefix = 'rl:') {
    this.redisClient = RedisClient.getInstance();
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    try {
      const redisKey = `${this.prefix}${key}`;
      const current = await this.redisClient.incr(redisKey);
      
      let timeToExpire: number | undefined;
      if (current === 1) {
        // First request, set expiration
        await this.redisClient.expire(redisKey, 60); // 1 minute default
        timeToExpire = 60000; // milliseconds
      } else {
        // Get remaining TTL
        const ttl = await this.redisClient.getClient().ttl(redisKey);
        timeToExpire = ttl > 0 ? ttl * 1000 : undefined;
      }

      return { totalHits: current, timeToExpire };
    } catch (error: any) {
      logger.error('Redis rate limit error', { key, error: error.message });
      // Fallback to allowing the request if Redis fails
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await this.redisClient.decr(redisKey);
    } catch (error: any) {
      logger.error('Redis rate limit decrement error', { key, error: error.message });
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await this.redisClient.del(redisKey);
    } catch (error: any) {
      logger.error('Redis rate limit reset error', { key, error: error.message });
    }
  }
}

// Default rate limit configuration
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: process.env.REDIS_URL ? new RedisStore() : undefined,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip;
  },
  onLimitReached: (req, res, options) => {
    const key = (req as any).user?.id || req.ip;
    logger.warn('Rate limit exceeded', {
      key,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
  }
});

// Strict rate limit for sensitive operations
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each user to 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations, please try again later.'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.REDIS_URL ? new RedisStore('strict:') : undefined,
  keyGenerator: (req) => {
    // Always use user ID for sensitive operations
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error('Authentication required for this operation');
    }
    return userId;
  },
  onLimitReached: (req, res, options) => {
    const userId = (req as any).user?.id;
    logger.warn('Strict rate limit exceeded', {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
  }
});

// Custom rate limiter factory
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Rate limit exceeded'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: process.env.REDIS_URL ? new RedisStore(options.keyPrefix) : undefined,
    keyGenerator: (req) => {
      return (req as any).user?.id || req.ip;
    },
    onLimitReached: (req, res, rateLimitOptions) => {
      const key = (req as any).user?.id || req.ip;
      logger.warn('Custom rate limit exceeded', {
        key,
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        windowMs: options.windowMs,
        max: options.max
      });
    }
  });
};
