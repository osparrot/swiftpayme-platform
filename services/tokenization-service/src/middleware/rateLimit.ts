import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';
import { RateLimitError } from '../utils/Errors';

interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface IRateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export class RateLimitMiddleware {
  private redis: Redis;
  private logger: Logger;
  private defaultConfig: IRateLimitConfig;

  constructor() {
    this.logger = new Logger('RateLimitMiddleware');
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later'
    };

    this.setupRedisEventHandlers();
  }

  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.info('Redis connected for rate limiting');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error: error.message });
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * Create rate limit middleware with specific configuration
   */
  createRateLimit = (config: Partial<IRateLimitConfig> = {}) => {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = finalConfig.keyGenerator!(req);
        const rateLimitInfo = await this.checkRateLimit(key, finalConfig);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': rateLimitInfo.resetTime.toISOString()
        });

        if (rateLimitInfo.remaining < 0) {
          this.logger.warn('Rate limit exceeded', {
            key,
            limit: rateLimitInfo.limit,
            current: rateLimitInfo.current,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.headers['x-request-id']
          });

          throw new RateLimitError(
            rateLimitInfo.limit,
            finalConfig.windowMs,
            {
              key,
              resetTime: rateLimitInfo.resetTime,
              retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000)
            }
          );
        }

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: {
              name: error.name,
              message: error.message,
              code: error.code,
              statusCode: error.statusCode,
              details: error.details,
              timestamp: error.timestamp
            }
          });
        } else {
          // If Redis is down, log error but don't block requests
          this.logger.error('Rate limit check failed', {
            error: error.message,
            requestId: req.headers['x-request-id']
          });
          next();
        }
      }
    };
  };

  /**
   * Check rate limit for a key
   */
  private async checkRateLimit(key: string, config: IRateLimitConfig): Promise<IRateLimitInfo> {
    const now = Date.now();
    const window = Math.floor(now / config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const current = results?.[0]?.[1] as number || 0;

      const resetTime = new Date((window + 1) * config.windowMs);
      const remaining = Math.max(0, config.maxRequests - current);

      return {
        limit: config.maxRequests,
        current,
        remaining,
        resetTime
      };
    } catch (error) {
      this.logger.error('Redis rate limit operation failed', { error: error.message, key });
      
      // Return permissive values if Redis fails
      return {
        limit: config.maxRequests,
        current: 0,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs)
      };
    }
  }

  /**
   * Default key generator based on IP and user ID
   */
  private defaultKeyGenerator = (req: Request): string => {
    const userId = (req as any).user?.userId;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (userId) {
      return `user:${userId}`;
    }
    
    return `ip:${ip}`;
  };

  /**
   * Key generator for API endpoints
   */
  private endpointKeyGenerator = (endpoint: string) => {
    return (req: Request): string => {
      const baseKey = this.defaultKeyGenerator(req);
      return `${baseKey}:${endpoint}`;
    };
  };

  /**
   * Key generator for global rate limiting
   */
  private globalKeyGenerator = (req: Request): string => {
    return 'global';
  };

  /**
   * Predefined rate limit configurations for different operations
   */
  private rateLimitConfigs: Record<string, Partial<IRateLimitConfig>> = {
    // Authentication operations
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyGenerator: (req) => `login:${req.ip}`,
      message: 'Too many login attempts, please try again later'
    },

    // Token operations
    createToken: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: this.endpointKeyGenerator('createToken')
    },

    getToken: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getToken')
    },

    listTokens: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('listTokens')
    },

    updateTokenStatus: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      keyGenerator: this.endpointKeyGenerator('updateTokenStatus')
    },

    // Minting operations
    createMintingRequest: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('createMintingRequest')
    },

    getMintingRequest: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getMintingRequest')
    },

    listMintingRequests: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('listMintingRequests')
    },

    // Burning operations
    createBurningRequest: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('createBurningRequest')
    },

    getBurningRequest: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getBurningRequest')
    },

    listBurningRequests: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('listBurningRequests')
    },

    // Deposit operations
    createDeposit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      keyGenerator: this.endpointKeyGenerator('createDeposit')
    },

    getDeposit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getDeposit')
    },

    listDeposits: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('listDeposits')
    },

    // Withdrawal operations
    createWithdrawal: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: this.endpointKeyGenerator('createWithdrawal')
    },

    getWithdrawal: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getWithdrawal')
    },

    // Reserve operations
    getReserveBalance: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: this.endpointKeyGenerator('getReserveBalance')
    },

    auditReserves: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyGenerator: this.endpointKeyGenerator('auditReserves')
    },

    // Metrics and dashboard
    getTokenMetrics: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: this.endpointKeyGenerator('getTokenMetrics')
    },

    getDashboardStats: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: this.endpointKeyGenerator('getDashboardStats')
    },

    // Health check
    healthCheck: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      keyGenerator: this.globalKeyGenerator
    },

    // Global rate limit
    global: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      keyGenerator: this.globalKeyGenerator
    }
  };

  /**
   * Get rate limit middleware for specific operation
   */
  getRateLimit = (operation: string): any => {
    const config = this.rateLimitConfigs[operation] || this.rateLimitConfigs.global;
    return this.createRateLimit(config);
  };

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    try {
      const pattern = `rate_limit:${key}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info('Rate limit reset', { key, deletedKeys: keys.length });
      }
    } catch (error) {
      this.logger.error('Failed to reset rate limit', { error: error.message, key });
    }
  }

  /**
   * Get current rate limit status for a key
   */
  async getRateLimitStatus(key: string, operation: string = 'global'): Promise<IRateLimitInfo | null> {
    try {
      const config = this.rateLimitConfigs[operation] || this.rateLimitConfigs.global;
      return await this.checkRateLimit(key, config as IRateLimitConfig);
    } catch (error) {
      this.logger.error('Failed to get rate limit status', { error: error.message, key });
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Create singleton instance
const rateLimitMiddleware = new RateLimitMiddleware();

// Export function to get rate limit middleware
export const getRateLimit = rateLimitMiddleware.getRateLimit;

// Export default as a function that takes operation name
export default (operation: string) => rateLimitMiddleware.getRateLimit(operation);

// Export the class for testing
export { RateLimitMiddleware };

