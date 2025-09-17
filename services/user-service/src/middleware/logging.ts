import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserRequest } from '../types';
import { Logger } from '../utils/Logger';

const logger = new Logger('RequestLogger');

export interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  path: string;
  query: any;
  headers: Record<string, string>;
  body?: any;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  clientIp: string;
  userAgent: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: any;
}

// Request logging middleware
export const loggingMiddleware = (req: UserRequest, res: Response, next: NextFunction): void => {
  // Generate request ID if not present
  const requestId = req.requestId || uuidv4();
  req.requestId = requestId;

  // Capture start time
  const startTime = Date.now();
  req.startTime = startTime;

  // Extract client information
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  req.clientIp = clientIp;
  req.userAgent = userAgent;

  // Prepare log data
  const logData: RequestLogData = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
    clientIp,
    userAgent,
    startTime
  };

  // Add body for non-GET requests (sanitized)
  if (req.method !== 'GET' && req.body) {
    logData.body = sanitizeRequestBody(req.body, req.path);
  }

  // Log incoming request
  logger.info('Incoming request', logData);

  // Capture response data
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

    const responseLogData: RequestLogData = {
      ...logData,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      endTime,
      duration,
      statusCode: res.statusCode,
      responseSize
    };

    // Add sanitized response body for errors or debug mode
    if (res.statusCode >= 400 || process.env.LOG_RESPONSE_BODY === 'true') {
      responseLogData.body = sanitizeResponseBody(responseBody, req.path);
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', responseLogData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', responseLogData);
    } else {
      logger.info('Request completed successfully', responseLogData);
    }

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        ...responseLogData,
        slowRequest: true,
        threshold: 5000
      });
    }

    // Collect metrics
    collectRequestMetrics(responseLogData);
  });

  // Log request errors
  res.on('error', (error) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.error('Request error', {
      ...logData,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
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
export const errorLoggingMiddleware = (error: any, req: UserRequest, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || uuidv4();
  const endTime = Date.now();
  const duration = req.startTime ? endTime - req.startTime : 0;

  const errorLogData = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body, req.path) : undefined,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    clientIp: req.clientIp,
    userAgent: req.userAgent,
    startTime: req.startTime,
    endTime,
    duration,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode || 500
    }
  };

  logger.error('Request error', errorLogData);

  // Collect error metrics
  collectErrorMetrics(errorLogData);

  next(error);
};

// Security event logging
export const logSecurityEvent = (req: UserRequest, eventType: string, details: any = {}): void => {
  const securityLogData = {
    requestId: req.requestId,
    eventType,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    clientIp: req.clientIp,
    userAgent: req.userAgent,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    details,
    severity: getSeverityLevel(eventType)
  };

  logger.warn('Security event', securityLogData);

  // Send to security monitoring system
  if (process.env.SECURITY_MONITORING_ENABLED === 'true') {
    sendToSecurityMonitoring(securityLogData);
  }
};

// Audit logging for compliance
export const logAuditEvent = (req: UserRequest, action: string, resource: string, details: any = {}): void => {
  const auditLogData = {
    requestId: req.requestId,
    action,
    resource,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    clientIp: req.clientIp,
    userAgent: req.userAgent,
    timestamp: new Date().toISOString(),
    details,
    compliance: true
  };

  logger.info('Audit event', auditLogData);

  // Send to audit system
  if (process.env.AUDIT_LOGGING_ENABLED === 'true') {
    sendToAuditSystem(auditLogData);
  }
};

// Performance logging
export const logPerformanceMetric = (req: UserRequest, metric: string, value: number, unit: string = 'ms'): void => {
  const performanceLogData = {
    requestId: req.requestId,
    metric,
    value,
    unit,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  logger.debug('Performance metric', performanceLogData);
};

// Helper functions
const sanitizeHeaders = (headers: any): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  Object.keys(headers).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = headers[key];
    }
  });

  return sanitized;
};

const sanitizeRequestBody = (body: any, path: string): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password', 'currentPassword', 'newPassword', 'confirmPassword',
    'token', 'secret', 'key', 'apiKey', 'accessToken', 'refreshToken',
    'ssn', 'socialSecurityNumber', 'creditCard', 'bankAccount',
    'twoFactorSecret', 'backupCodes', 'securityAnswer'
  ];

  // Recursively sanitize nested objects
  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(obj[key]);
        }
      });
      return result;
    }

    return obj;
  };

  return sanitizeObject(sanitized);
};

const sanitizeResponseBody = (body: any, path: string): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // For error responses, only log the error structure
  if (body.error) {
    return {
      success: body.success,
      error: {
        code: body.error.code,
        message: body.error.message
      },
      timestamp: body.timestamp
    };
  }

  // For successful responses, limit the data logged
  if (body.data) {
    return {
      success: body.success,
      dataType: Array.isArray(body.data) ? 'array' : typeof body.data,
      dataSize: Array.isArray(body.data) ? body.data.length : Object.keys(body.data || {}).length,
      timestamp: body.timestamp
    };
  }

  return body;
};

const getSeverityLevel = (eventType: string): string => {
  const highSeverityEvents = [
    'brute_force_attack', 'sql_injection', 'xss_attempt', 'unauthorized_access',
    'privilege_escalation', 'data_breach', 'account_takeover'
  ];

  const mediumSeverityEvents = [
    'failed_login', 'suspicious_activity', 'rate_limit_exceeded',
    'invalid_token', 'permission_denied'
  ];

  if (highSeverityEvents.includes(eventType)) {
    return 'high';
  } else if (mediumSeverityEvents.includes(eventType)) {
    return 'medium';
  } else {
    return 'low';
  }
};

const collectRequestMetrics = (logData: RequestLogData): void => {
  // This would integrate with your metrics collection system
  // For example, Prometheus, StatsD, etc.
  
  if (process.env.METRICS_ENABLED === 'true') {
    // Example metrics collection
    const metrics = {
      request_duration: logData.duration,
      request_count: 1,
      response_size: logData.responseSize,
      status_code: logData.statusCode,
      method: logData.method,
      path: logData.path,
      user_id: logData.userId
    };

    // Send to metrics system
    // metricsClient.record(metrics);
  }
};

const collectErrorMetrics = (errorLogData: any): void => {
  if (process.env.METRICS_ENABLED === 'true') {
    const errorMetrics = {
      error_count: 1,
      error_type: errorLogData.error.name,
      error_code: errorLogData.error.code,
      status_code: errorLogData.error.statusCode,
      method: errorLogData.method,
      path: errorLogData.path,
      user_id: errorLogData.userId
    };

    // Send to metrics system
    // metricsClient.record(errorMetrics);
  }
};

const sendToSecurityMonitoring = (securityLogData: any): void => {
  // This would send to your security monitoring system
  // For example, SIEM, security dashboard, etc.
  
  try {
    // Example: Send to security webhook
    // await fetch(process.env.SECURITY_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(securityLogData)
    // });
  } catch (error) {
    logger.error('Failed to send security event to monitoring system', { error: error.message });
  }
};

const sendToAuditSystem = (auditLogData: any): void => {
  // This would send to your audit logging system
  // For compliance and regulatory requirements
  
  try {
    // Example: Send to audit database or service
    // await auditService.log(auditLogData);
  } catch (error) {
    logger.error('Failed to send audit event to audit system', { error: error.message });
  }
};

// Request correlation middleware
export const correlationMiddleware = (req: UserRequest, res: Response, next: NextFunction): void => {
  // Check for existing correlation ID from upstream services
  const correlationId = req.headers['x-correlation-id'] as string || 
                       req.headers['x-request-id'] as string || 
                       uuidv4();

  req.requestId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-request-id', correlationId);

  next();
};

// Request timeout logging
export const timeoutLoggingMiddleware = (timeoutMs: number = 30000) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          clientIp: req.clientIp,
          timeout: timeoutMs
        });

        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout'
          },
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

export default {
  loggingMiddleware,
  errorLoggingMiddleware,
  logSecurityEvent,
  logAuditEvent,
  logPerformanceMetric,
  correlationMiddleware,
  timeoutLoggingMiddleware
};

