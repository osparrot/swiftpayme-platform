/**
 * SwiftPayMe API Gateway - Rate Limiting Middleware
 * Advanced rate limiting with Redis backend
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

// ==================== INTERFACES ====================
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsPerWindow: number;
  resetTime: Date;
  remaining: number;
}

// ==================== RATE LIMIT MIDDLEWARE ====================
export class RateLimitMiddleware {
  private redis: Redis;
  private logger: Logger;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_RATE_LIMIT_DB || '2')
    });
    
    this.logger = new Logger('RateLimitMiddleware');
  }

  // ==================== RATE LIMIT FACTORIES ====================
  
  public globalRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      keyGenerator: (req) => `global:${this.getClientIP(req)}`,
      message: 'Too many requests from this IP, please try again later'
    });
  }

  public authRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyGenerator: (req) => `auth:${this.getClientIP(req)}`,
      message: 'Too many authentication attempts, please try again later'
    });
  }

  public userRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req) => `user:${this.getUserId(req)}`,
      message: 'Rate limit exceeded for user operations'
    });
  }

  public adminRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      keyGenerator: (req) => `admin:${this.getUserId(req)}`,
      message: 'Rate limit exceeded for admin operations'
    });
  }

  public publicRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req) => `public:${this.getClientIP(req)}`,
      message: 'Rate limit exceeded for public API'
    });
  }

  public assetRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: (req) => `asset:${this.getUserId(req)}`,
      message: 'Asset operation rate limit exceeded'
    });
  }

  public cryptoRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      keyGenerator: (req) => `crypto:${this.getUserId(req)}`,
      message: 'Crypto operation rate limit exceeded'
    });
  }

  public paymentRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      keyGenerator: (req) => `payment:${this.getUserId(req)}`,
      message: 'Payment operation rate limit exceeded'
    });
  }

  public tokenRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      keyGenerator: (req) => `token:${this.getUserId(req)}`,
      message: 'Token operation rate limit exceeded'
    });
  }

  public defaultRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req) => `default:${this.getClientIP(req)}`,
      message: 'Rate limit exceeded'
    });
  }

  // ==================== CORE RATE LIMIT IMPLEMENTATION ====================
  
  private createRateLimit(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : this.getClientIP(req);
        const rateLimitKey = `rate_limit:${key}`;
        
        const rateLimitInfo = await this.checkRateLimit(rateLimitKey, config);
        
        // Set rate limit headers
        if (config.headers !== false) {
          this.setRateLimitHeaders(res, rateLimitInfo, config);
        }

        if (rateLimitInfo.remaining < 0) {
          this.logger.warn('Rate limit exceeded', {
            key,
            totalHits: rateLimitInfo.totalHits,
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
            ip: this.getClientIP(req),
            userAgent: req.get('user-agent')
          });

          return res.status(429).json({
            error: {
              message: config.message || 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000),
              limit: config.maxRequests,
              remaining: 0,
              resetTime: rateLimitInfo.resetTime.toISOString()
            }
          });
        }

        next();
      } catch (error) {
        this.logger.error('Rate limit middleware error', {
          error: error.message,
          stack: error.stack
        });
        
        // Continue on error to avoid blocking requests
        next();
      }
    };
  }

  // ==================== RATE LIMIT LOGIC ====================
  
  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Use Redis sorted set for sliding window
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in current window
    pipeline.zcard(key);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const totalHitsPerWindow = results[2][1] as number;
    const resetTime = new Date(now + config.windowMs);
    const remaining = Math.max(0, config.maxRequests - totalHitsPerWindow);

    return {
      totalHits: totalHitsPerWindow,
      totalHitsPerWindow,
      resetTime,
      remaining
    };
  }

  // ==================== ADVANCED RATE LIMITING ====================
  
  /**
   * Create custom rate limit with multiple windows
   */
  public createMultiWindowRateLimit(windows: Array<{ windowMs: number; maxRequests: number }>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const baseKey = `multi:${this.getClientIP(req)}`;
        
        for (const window of windows) {
          const key = `${baseKey}:${window.windowMs}`;
          const rateLimitInfo = await this.checkRateLimit(key, {
            windowMs: window.windowMs,
            maxRequests: window.maxRequests
          });

          if (rateLimitInfo.remaining < 0) {
            this.setRateLimitHeaders(res, rateLimitInfo, window);
            
            return res.status(429).json({
              error: {
                message: `Rate limit exceeded: ${window.maxRequests} requests per ${window.windowMs / 1000} seconds`,
                code: 'RATE_LIMIT_EXCEEDED',
                window: window.windowMs,
                limit: window.maxRequests,
                remaining: 0
              }
            });
          }
        }

        next();
      } catch (error) {
        this.logger.error('Multi-window rate limit error', { error: error.message });
        next();
      }
    };
  }

  /**
   * Create adaptive rate limit based on user tier
   */
  public createAdaptiveRateLimit() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = this.getUserId(req);
        const userTier = await this.getUserTier(userId);
        
        const config = this.getRateLimitConfigForTier(userTier);
        const key = `adaptive:${userId}`;
        
        const rateLimitInfo = await this.checkRateLimit(key, config);
        
        this.setRateLimitHeaders(res, rateLimitInfo, config);

        if (rateLimitInfo.remaining < 0) {
          return res.status(429).json({
            error: {
              message: `Rate limit exceeded for ${userTier} tier`,
              code: 'RATE_LIMIT_EXCEEDED',
              tier: userTier,
              limit: config.maxRequests,
              remaining: 0
            }
          });
        }

        next();
      } catch (error) {
        this.logger.error('Adaptive rate limit error', { error: error.message });
        next();
      }
    };
  }

  // ==================== UTILITY METHODS ====================
  
  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private getUserId(req: Request): string {
    const user = (req as any).user;
    return user?.userId || user?.adminId || this.getClientIP(req);
  }

  private async getUserTier(userId: string): Promise<string> {
    try {
      // In a real implementation, this would query the user service
      const tierData = await this.redis.get(`user_tier:${userId}`);
      return tierData || 'basic';
    } catch (error) {
      return 'basic';
    }
  }

  private getRateLimitConfigForTier(tier: string): RateLimitConfig {
    const configs = {
      basic: {
        windowMs: 60 * 1000,
        maxRequests: 60,
        message: 'Basic tier rate limit exceeded'
      },
      premium: {
        windowMs: 60 * 1000,
        maxRequests: 200,
        message: 'Premium tier rate limit exceeded'
      },
      enterprise: {
        windowMs: 60 * 1000,
        maxRequests: 1000,
        message: 'Enterprise tier rate limit exceeded'
      }
    };

    return configs[tier] || configs.basic;
  }

  private setRateLimitHeaders(res: Response, rateLimitInfo: RateLimitInfo, config: RateLimitConfig | { maxRequests: number }): void {
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
      'X-RateLimit-Reset': rateLimitInfo.resetTime.toISOString(),
      'X-RateLimit-Reset-Timestamp': rateLimitInfo.resetTime.getTime().toString()
    });

    if (rateLimitInfo.remaining < 0) {
      res.set({
        'Retry-After': Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000).toString()
      });
    }
  }

  // ==================== CLEANUP ====================
  
  public async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}

export default RateLimitMiddleware;

