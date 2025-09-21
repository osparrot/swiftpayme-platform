import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import ExpressBrute from 'express-brute';
import ExpressBruteRedis from 'express-brute-redis';
import Redis from 'ioredis';
import crypto from 'crypto';
import { Logger } from '../utils/Logger';
import { AuthenticatedRequest } from './auth';

const logger = new Logger('SecurityMiddleware');

// Redis client for security features
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_SECURITY_DB || '2')
});

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Brute force protection
  bruteForce: {
    freeRetries: parseInt(process.env.BRUTE_FORCE_FREE_RETRIES || '5'),
    minWait: parseInt(process.env.BRUTE_FORCE_MIN_WAIT || '5000'), // 5 seconds
    maxWait: parseInt(process.env.BRUTE_FORCE_MAX_WAIT || '900000'), // 15 minutes
    lifetime: parseInt(process.env.BRUTE_FORCE_LIFETIME || '86400000') // 24 hours
  },
  
  // Request size limits
  requestLimits: {
    maxBodySize: process.env.MAX_REQUEST_SIZE || '10mb',
    maxParameterLength: parseInt(process.env.MAX_PARAMETER_LENGTH || '1000'),
    maxHeaderSize: parseInt(process.env.MAX_HEADER_SIZE || '8192')
  },
  
  // IP filtering
  ipFiltering: {
    whitelist: process.env.IP_WHITELIST?.split(',') || [],
    blacklist: process.env.IP_BLACKLIST?.split(',') || [],
    enableGeoBlocking: process.env.ENABLE_GEO_BLOCKING === 'true',
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || []
  },
  
  // Content security
  contentSecurity: {
    enableXssProtection: process.env.ENABLE_XSS_PROTECTION !== 'false',
    enableSqlInjectionProtection: process.env.ENABLE_SQL_INJECTION_PROTECTION !== 'false',
    enableCommandInjectionProtection: process.env.ENABLE_COMMAND_INJECTION_PROTECTION !== 'false',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '52428800') // 50MB
  }
};

// Suspicious patterns for detection
const SUSPICIOUS_PATTERNS = {
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ],
  
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%27)|(%3D)|(%3B)|(%2D%2D))/gi,
    /(\b(WAITFOR|DELAY)\b)/gi
  ],
  
  commandInjection: [
    /(\||&|;|\$\(|\`)/g,
    /(wget|curl|nc|netcat|ping|nslookup|dig)/gi,
    /(rm|mv|cp|cat|ls|ps|kill|chmod|chown)/gi
  ],
  
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\\/g,
    /%2e%2e%2f/gi,
    /%252e%252e%252f/gi
  ],
  
  ldapInjection: [
    /(\*|\(|\)|\\|\/|\||&)/g
  ]
};

// Brute force protection store
const bruteForceStore = new ExpressBruteRedis({
  client: redis
});

const bruteForce = new ExpressBrute(bruteForceStore, {
  freeRetries: SECURITY_CONFIG.bruteForce.freeRetries,
  minWait: SECURITY_CONFIG.bruteForce.minWait,
  maxWait: SECURITY_CONFIG.bruteForce.maxWait,
  lifetime: SECURITY_CONFIG.bruteForce.lifetime,
  failCallback: (req: any, res: Response, next: NextFunction, nextValidRequestDate: Date) => {
    logger.security('Brute force attack detected', {
      securityEvent: 'brute_force_attack',
      severity: 'high',
      sourceIp: req.ip,
      userAgent: req.get('User-Agent'),
      resource: req.path,
      action: req.method,
      result: 'blocked',
      nextValidRequestDate: nextValidRequestDate.toISOString(),
      requestId: req.requestId
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts. Please try again later.',
        retryAfter: nextValidRequestDate.toISOString()
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiting middleware
export function createRateLimitMiddleware(options?: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
}) {
  const config = {
    ...SECURITY_CONFIG.rateLimiting,
    ...options
  };

  return rateLimit({
    store: new (require('rate-limit-redis'))({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: config.windowMs,
    max: config.max,
    keyGenerator: config.keyGenerator || ((req: Request) => {
      // Use API key ID if available, otherwise IP
      const apiKey = (req as any).apiKey;
      return apiKey ? `api:${apiKey.id}` : req.ip;
    }),
    skip: config.skipIf || (() => false),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this source'
      }
    },
    onLimitReached: (req: any, res: Response, options: any) => {
      logger.security('Rate limit exceeded', {
        securityEvent: 'rate_limit_exceeded',
        severity: 'medium',
        sourceIp: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        result: 'blocked',
        limit: options.max,
        windowMs: options.windowMs,
        requestId: req.requestId
      });
    }
  });
}

// Slow down middleware for progressive delays
export function createSlowDownMiddleware(options?: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
  maxDelayMs?: number;
}) {
  return slowDown({
    store: new (require('rate-limit-redis'))({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes
    delayAfter: options?.delayAfter || 50, // Allow 50 requests per windowMs without delay
    delayMs: options?.delayMs || 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: options?.maxDelayMs || 20000, // Max delay of 20 seconds
    onLimitReached: (req: any, res: Response, options: any) => {
      logger.security('Request slow down triggered', {
        securityEvent: 'request_slowdown',
        severity: 'low',
        sourceIp: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        result: 'delayed',
        delay: options.delay,
        requestId: req.requestId
      });
    }
  });
}

// IP filtering middleware
export function ipFilteringMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;
    const { whitelist, blacklist } = SECURITY_CONFIG.ipFiltering;

    try {
      // Check whitelist (if configured)
      if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
        logger.security('IP not in whitelist', {
          securityEvent: 'ip_not_whitelisted',
          severity: 'medium',
          sourceIp: clientIp,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          requestId: (req as any).requestId
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied from this IP address'
          },
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Check blacklist
      if (blacklist.includes(clientIp)) {
        logger.security('IP in blacklist', {
          securityEvent: 'ip_blacklisted',
          severity: 'high',
          sourceIp: clientIp,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          requestId: (req as any).requestId
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'IP_BLOCKED',
            message: 'Access denied from this IP address'
          },
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Check dynamic blacklist (IPs that have been temporarily blocked)
      const isBlocked = await redis.get(`blocked_ip:${clientIp}`);
      if (isBlocked) {
        logger.security('IP temporarily blocked', {
          securityEvent: 'ip_temporarily_blocked',
          severity: 'medium',
          sourceIp: clientIp,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          requestId: (req as any).requestId
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'IP_TEMPORARILY_BLOCKED',
            message: 'Access temporarily denied from this IP address'
          },
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString()
        });
      }

      next();

    } catch (error) {
      logger.error('IP filtering middleware error', {
        error: error.message,
        requestId: (req as any).requestId
      });
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
}

// Content security middleware
export function contentSecurityMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestData = {
        body: JSON.stringify(req.body || {}),
        query: JSON.stringify(req.query || {}),
        params: JSON.stringify(req.params || {}),
        headers: JSON.stringify(req.headers || {})
      };

      const threats = detectThreats(requestData);

      if (threats.length > 0) {
        const riskScore = calculateRiskScore(threats);
        
        logger.security('Security threat detected', {
          securityEvent: 'content_threat_detected',
          severity: riskScore > 80 ? 'critical' : riskScore > 60 ? 'high' : 'medium',
          sourceIp: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: riskScore > 80 ? 'blocked' : 'flagged',
          riskScore,
          threats,
          requestId: (req as any).requestId
        });

        // Block high-risk requests
        if (riskScore > 80) {
          // Temporarily block the IP
          await blockIpTemporarily(req.ip, 3600); // 1 hour

          return res.status(400).json({
            success: false,
            error: {
              code: 'SECURITY_THREAT_DETECTED',
              message: 'Request contains potentially malicious content'
            },
            requestId: (req as any).requestId,
            timestamp: new Date().toISOString()
          });
        }

        // Flag medium-risk requests but allow them to continue
        (req as any).securityFlags = {
          riskScore,
          threats
        };
      }

      next();

    } catch (error) {
      logger.error('Content security middleware error', {
        error: error.message,
        requestId: (req as any).requestId
      });
      next(); // Continue on error
    }
  };
}

// Request size validation middleware
export function requestSizeMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxParameterLength, maxHeaderSize } = SECURITY_CONFIG.requestLimits;

      // Check parameter lengths
      const allParams = { ...req.query, ...req.params };
      for (const [key, value] of Object.entries(allParams)) {
        if (typeof value === 'string' && value.length > maxParameterLength) {
          logger.security('Parameter length exceeded', {
            securityEvent: 'parameter_length_exceeded',
            severity: 'medium',
            sourceIp: req.ip,
            userAgent: req.get('User-Agent'),
            resource: req.path,
            action: req.method,
            result: 'blocked',
            parameter: key,
            length: value.length,
            maxLength: maxParameterLength,
            requestId: (req as any).requestId
          });

          return res.status(400).json({
            success: false,
            error: {
              code: 'PARAMETER_TOO_LONG',
              message: `Parameter '${key}' exceeds maximum length`
            },
            requestId: (req as any).requestId,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check header sizes
      const headerSize = JSON.stringify(req.headers).length;
      if (headerSize > maxHeaderSize) {
        logger.security('Header size exceeded', {
          securityEvent: 'header_size_exceeded',
          severity: 'medium',
          sourceIp: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          headerSize,
          maxHeaderSize,
          requestId: (req as any).requestId
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'HEADERS_TOO_LARGE',
            message: 'Request headers exceed maximum size'
          },
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString()
        });
      }

      next();

    } catch (error) {
      logger.error('Request size middleware error', {
        error: error.message,
        requestId: (req as any).requestId
      });
      next();
    }
  };
}

// CSRF protection middleware
export function csrfProtectionMiddleware() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip CSRF for API key authentication
    if ((req as any).apiKey) {
      return next();
    }

    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    try {
      const csrfToken = req.headers['x-csrf-token'] as string;
      const sessionToken = req.headers['x-session-token'] as string;

      if (!csrfToken || !sessionToken) {
        logger.security('Missing CSRF token', {
          securityEvent: 'csrf_token_missing',
          severity: 'medium',
          sourceIp: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          requestId: req.requestId
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token is required'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Verify CSRF token
      const expectedToken = generateCsrfToken(sessionToken);
      if (csrfToken !== expectedToken) {
        logger.security('Invalid CSRF token', {
          securityEvent: 'csrf_token_invalid',
          severity: 'high',
          sourceIp: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          result: 'blocked',
          requestId: req.requestId
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid CSRF token'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      next();

    } catch (error) {
      logger.error('CSRF protection middleware error', {
        error: error.message,
        requestId: req.requestId
      });
      next();
    }
  };
}

// Security headers middleware
export function securityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS header for HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  };
}

// Helper functions
function detectThreats(data: any): string[] {
  const threats: string[] = [];
  const content = JSON.stringify(data).toLowerCase();

  // Check for XSS
  if (SECURITY_CONFIG.contentSecurity.enableXssProtection) {
    for (const pattern of SUSPICIOUS_PATTERNS.xss) {
      if (pattern.test(content)) {
        threats.push('xss');
        break;
      }
    }
  }

  // Check for SQL injection
  if (SECURITY_CONFIG.contentSecurity.enableSqlInjectionProtection) {
    for (const pattern of SUSPICIOUS_PATTERNS.sqlInjection) {
      if (pattern.test(content)) {
        threats.push('sql_injection');
        break;
      }
    }
  }

  // Check for command injection
  if (SECURITY_CONFIG.contentSecurity.enableCommandInjectionProtection) {
    for (const pattern of SUSPICIOUS_PATTERNS.commandInjection) {
      if (pattern.test(content)) {
        threats.push('command_injection');
        break;
      }
    }
  }

  // Check for path traversal
  for (const pattern of SUSPICIOUS_PATTERNS.pathTraversal) {
    if (pattern.test(content)) {
      threats.push('path_traversal');
      break;
    }
  }

  // Check for LDAP injection
  for (const pattern of SUSPICIOUS_PATTERNS.ldapInjection) {
    if (pattern.test(content)) {
      threats.push('ldap_injection');
      break;
    }
  }

  return threats;
}

function calculateRiskScore(threats: string[]): number {
  const threatScores: { [key: string]: number } = {
    xss: 30,
    sql_injection: 40,
    command_injection: 50,
    path_traversal: 35,
    ldap_injection: 25
  };

  return threats.reduce((score, threat) => score + (threatScores[threat] || 10), 0);
}

async function blockIpTemporarily(ip: string, seconds: number): Promise<void> {
  try {
    await redis.setex(`blocked_ip:${ip}`, seconds, 'true');
  } catch (error) {
    logger.error('Failed to block IP temporarily', { error, ip });
  }
}

function generateCsrfToken(sessionToken: string): string {
  const secret = process.env.CSRF_SECRET || 'csrf-secret';
  return crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
}

// Export brute force middleware
export const bruteForceProtection = bruteForce.prevent;

// Export all security middleware
export {
  createRateLimitMiddleware,
  createSlowDownMiddleware,
  ipFilteringMiddleware,
  contentSecurityMiddleware,
  requestSizeMiddleware,
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  SECURITY_CONFIG
};

