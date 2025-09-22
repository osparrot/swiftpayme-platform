/**
 * SwiftPayMe Payment Service - Rate Limiting Middleware
 * Redis-based rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

const logger = new Logger('RateLimitMiddleware');

// Create Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_RATE_LIMIT_DB || '2'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.userId || req.ip;
    },
    onLimitReached: (req: Request) => {
      logger.logSecurityEvent('rate_limit_exceeded', req.user?.userId, req.ip, req.correlationId);
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

// Specific rate limiters for different endpoints
export const createPaymentRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment creations per minute
  message: 'Too many payment creation attempts, please try again later'
});

export const retryPaymentRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 retries per 5 minutes
  message: 'Too many retry attempts, please wait before trying again'
});

export const workflowRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 workflow initiations per minute
  message: 'Too many workflow initiations, please try again later'
});

export const analyticsRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 analytics requests per minute
  message: 'Too many analytics requests, please try again later'
});

export default rateLimitMiddleware;

