import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

const logger = new Logger('Middleware');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  requestId?: string;
}

export const loggingMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type')
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.id,
      contentLength: JSON.stringify(body).length
    });

    return originalJson.call(this, body);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.id,
      contentLength: typeof body === 'string' ? body.length : JSON.stringify(body).length
    });

    return originalSend.call(this, body);
  };

  next();
};

export const errorLoggingMiddleware = (
  error: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.requestId || 'unknown';

  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });

  next(error);
};
