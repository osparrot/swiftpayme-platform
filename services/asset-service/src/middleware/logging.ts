import { Response, NextFunction } from 'express';
import { AssetRequest } from '../types';
import { Logger } from '../utils/Logger';

const logger = new Logger('RequestLogger');

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: any;
}

export const loggingMiddleware = (req: AssetRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  req.startTime = startTime;
  
  // Generate request ID if not present
  if (!req.requestId) {
    req.requestId = generateRequestId();
  }

  // Capture request details
  const requestData: RequestLogData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.clientIp || req.ip || req.connection.remoteAddress || 'unknown',
    userId: req.user?.id,
    startTime
  };

  // Log incoming request
  logger.info('Incoming request', {
    ...requestData,
    headers: sanitizeHeaders(req.headers),
    query: req.query,
    body: sanitizeRequestBody(req.body, req.method)
  });

  // Capture response details
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;
  let responseSize = 0;

  // Override res.send to capture response
  res.send = function(body: any) {
    responseBody = body;
    responseSize = Buffer.byteLength(body || '', 'utf8');
    return originalSend.call(this, body);
  };

  // Override res.json to capture response
  res.json = function(body: any) {
    responseBody = body;
    responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
    return originalJson.call(this, body);
  };

  // Log response when request finishes
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseData: RequestLogData = {
      ...requestData,
      endTime,
      duration,
      statusCode: res.statusCode,
      responseSize
    };

    // Determine log level based on status code and duration
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400 || duration > 5000) {
      logLevel = 'warn';
    }

    logger[logLevel]('Request completed', {
      ...responseData,
      response: sanitizeResponseBody(responseBody, res.statusCode)
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        duration,
        userId: req.user?.id
      });
    }

    // Log large responses
    if (responseSize > 1024 * 1024) { // 1MB
      logger.warn('Large response detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        responseSize,
        userId: req.user?.id
      });
    }
  });

  // Log errors
  res.on('error', (error) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.error('Request error', {
      ...requestData,
      endTime,
      duration,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  });

  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (
  error: any,
  req: AssetRequest,
  res: Response,
  next: NextFunction
): void => {
  const errorData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?.id,
    ip: req.clientIp || req.ip,
    userAgent: req.headers['user-agent'],
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString()
  };

  // Log error with appropriate level
  if (error.statusCode >= 500 || !error.statusCode) {
    logger.error('Server error', errorData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error', errorData);
  } else {
    logger.info('Request error', errorData);
  }

  next(error);
};

// Security logging middleware
export const securityLoggingMiddleware = (req: AssetRequest, res: Response, next: NextFunction): void => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /data:.*base64/i  // Data URI attacks
  ];

  const requestString = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.clientIp || req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      suspiciousContent: requestString.substring(0, 500)
    });
  }

  // Log authentication failures
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if ((authHeader || apiKey) && !req.user) {
    logger.warn('Authentication failure', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.clientIp || req.ip,
      userAgent: req.headers['user-agent'],
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey
    });
  }

  next();
};

// Performance logging middleware
export const performanceLoggingMiddleware = (req: AssetRequest, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // Log performance metrics for slow requests or high memory usage
    if (duration > 500 || Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024) { // 10MB
      logger.info('Performance metrics', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        duration,
        memoryDelta,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
  });

  next();
};

// Helper functions
function generateRequestId(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'cookie',
    'x-auth-token',
    'x-access-token'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

function sanitizeRequestBody(body: any, method: string): any {
  if (!body || method === 'GET') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'privateKey',
    'mnemonic',
    'secret',
    'token',
    'encryptedPrivateKey'
  ];

  function recursiveSanitize(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        (result as any)[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        (result as any)[key] = recursiveSanitize(obj[key]);
      } else {
        (result as any)[key] = obj[key];
      }
    }

    return result;
  }

  return recursiveSanitize(sanitized);
}

function sanitizeResponseBody(body: any, statusCode: number): any {
  if (!body || statusCode >= 400) {
    return body;
  }

  // Don't log large response bodies
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  if (bodyString.length > 1000) {
    return '[LARGE_RESPONSE_BODY]';
  }

  return body;
}

// Audit logging for specific actions
export const auditLog = (action: string, details?: any) => {
  return (req: AssetRequest, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logger.info('Audit log', {
          action,
          requestId: req.requestId,
          userId: req.user?.id,
          ip: req.clientIp || req.ip,
          timestamp: new Date().toISOString(),
          details: details || {
            method: req.method,
            url: req.originalUrl || req.url,
            params: req.params,
            query: req.query
          }
        });
      }
    });

    next();
  };
};

export default {
  loggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  performanceLoggingMiddleware,
  auditLog
};

