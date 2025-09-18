import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';

interface ILoggedRequest extends Request {
  startTime?: number;
  requestId?: string;
}

export class LoggingMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('LoggingMiddleware');
  }

  /**
   * Request/Response logging middleware
   */
  logRequests = (req: ILoggedRequest, res: Response, next: NextFunction): void => {
    // Generate request ID if not present
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();

    // Set request ID in response headers
    res.setHeader('X-Request-ID', req.requestId);

    // Log incoming request
    this.logIncomingRequest(req);

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseBody: any;
    let responseSent = false;

    // Override res.send
    res.send = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalSend.call(this, body);
    };

    // Override res.json
    res.json = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalJson.call(this, body);
    };

    // Override res.end
    res.end = function(chunk?: any, encoding?: any) {
      if (!responseSent && chunk) {
        responseBody = chunk;
        responseSent = true;
      }
      return originalEnd.call(this, chunk, encoding);
    };

    // Log response when finished
    res.on('finish', () => {
      this.logOutgoingResponse(req, res, responseBody);
    });

    // Log errors
    res.on('error', (error) => {
      this.logResponseError(req, res, error);
    });

    next();
  };

  /**
   * Log incoming request details
   */
  private logIncomingRequest(req: ILoggedRequest): void {
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: this.sanitizeQuery(req.query),
      headers: this.sanitizeHeaders(req.headers),
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
      body: this.sanitizeBody(req.body)
    };

    this.logger.info('Incoming request', logData);
  }

  /**
   * Log outgoing response details
   */
  private logOutgoingResponse(req: ILoggedRequest, res: Response, responseBody?: any): void {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type'),
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
      responseSize: this.getResponseSize(responseBody),
      success: res.statusCode < 400
    };

    // Include response body for errors or if explicitly enabled
    if (res.statusCode >= 400 || process.env.LOG_RESPONSE_BODY === 'true') {
      logData['responseBody'] = this.sanitizeResponseBody(responseBody);
    }

    const logLevel = this.getLogLevel(res.statusCode);
    this.logger[logLevel]('Outgoing response', logData);

    // Log performance metrics for slow requests
    if (duration > 5000) { // 5 seconds
      this.logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }
  }

  /**
   * Log response errors
   */
  private logResponseError(req: ILoggedRequest, res: Response, error: Error): void {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    this.logger.error('Response error', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token'
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize query parameters for logging
   */
  private sanitizeQuery(query: any): any {
    const sanitized = { ...query };
    
    // Remove sensitive query parameters
    const sensitiveParams = [
      'token',
      'apikey',
      'api_key',
      'password',
      'secret'
    ];

    sensitiveParams.forEach(param => {
      if (sanitized[param]) {
        sanitized[param] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'privateKey',
      'apiKey',
      'creditCard',
      'ssn',
      'socialSecurityNumber'
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Sanitize response body for logging
   */
  private sanitizeResponseBody(body: any): any {
    if (!body) {
      return body;
    }

    try {
      let parsed = body;
      if (typeof body === 'string') {
        parsed = JSON.parse(body);
      }

      // Limit response body size in logs
      const maxSize = 1000; // characters
      const stringified = JSON.stringify(parsed);
      
      if (stringified.length > maxSize) {
        return {
          truncated: true,
          size: stringified.length,
          preview: stringified.substring(0, maxSize) + '...'
        };
      }

      return parsed;
    } catch (error) {
      return {
        error: 'Failed to parse response body',
        type: typeof body,
        size: body?.length || 0
      };
    }
  }

  /**
   * Get response size
   */
  private getResponseSize(body: any): number {
    if (!body) return 0;
    
    if (typeof body === 'string') {
      return Buffer.byteLength(body, 'utf8');
    }
    
    try {
      return Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get appropriate log level based on status code
   */
  private getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
    if (statusCode >= 500) {
      return 'error';
    } else if (statusCode >= 400) {
      return 'warn';
    } else {
      return 'info';
    }
  }

  /**
   * Security event logging
   */
  logSecurityEvent = (req: Request, event: string, details?: any): void => {
    this.logger.warn('Security event', {
      event,
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
      details
    });
  };

  /**
   * Business event logging
   */
  logBusinessEvent = (req: Request, event: string, data?: any): void => {
    this.logger.info('Business event', {
      event,
      requestId: req.headers['x-request-id'],
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
      data
    });
  };

  /**
   * Audit logging for compliance
   */
  logAuditEvent = (req: Request, action: string, resource: string, details?: any): void => {
    this.logger.info('Audit event', {
      action,
      resource,
      requestId: req.headers['x-request-id'],
      userId: (req as any).user?.userId,
      ip: this.getClientIP(req),
      timestamp: new Date().toISOString(),
      details
    });
  };
}

// Create singleton instance
const loggingMiddleware = new LoggingMiddleware();

// Export middleware functions
export const logRequests = loggingMiddleware.logRequests;
export const logSecurityEvent = loggingMiddleware.logSecurityEvent;
export const logBusinessEvent = loggingMiddleware.logBusinessEvent;
export const logAuditEvent = loggingMiddleware.logAuditEvent;

// Export default as the main logging middleware
export default loggingMiddleware.logRequests;

// Export the class for testing
export { LoggingMiddleware };

