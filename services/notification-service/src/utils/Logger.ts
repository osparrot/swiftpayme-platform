/**
 * SwiftPayMe Notification Service - Logger Utility
 * Comprehensive logging system with structured logging and multiple transports
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// ==================== LOG LEVELS ====================

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'white',
  silly: 'rainbow'
};

// ==================== CONFIGURATION ====================

const LOG_DIR = process.env.LOG_DIR || '/var/log/swiftpayme/notification-service';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'notification-service';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ==================== FORMATTERS ====================

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, correlationId, userId, notificationId, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: service || SERVICE_NAME,
      message,
      ...(correlationId && { correlationId }),
      ...(userId && { userId }),
      ...(notificationId && { notificationId }),
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, correlationId, userId, notificationId, ...meta }) => {
    let logMessage = `${timestamp} [${service || SERVICE_NAME}] ${level}: ${message}`;
    
    if (correlationId) logMessage += ` [correlationId: ${correlationId}]`;
    if (userId) logMessage += ` [userId: ${userId}]`;
    if (notificationId) logMessage += ` [notificationId: ${notificationId}]`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// ==================== TRANSPORTS ====================

const transports: winston.transport[] = [];

// Console transport for development
if (NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: consoleFormat
    })
  );
}

// File transports for production
transports.push(
  // Combined log file
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    level: LOG_LEVEL,
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    tailable: true
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Notification-specific log file
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'notifications.log'),
    level: 'info',
    format: logFormat,
    maxsize: 100 * 1024 * 1024, // 100MB
    maxFiles: 20,
    tailable: true
  })
);

// ==================== LOGGER CREATION ====================

winston.addColors(LOG_COLORS);

const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: SERVICE_NAME,
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// ==================== LOGGER INTERFACE ====================

export interface LogContext {
  correlationId?: string;
  userId?: string;
  notificationId?: string;
  channel?: string;
  provider?: string;
  templateId?: string;
  batchId?: string;
  eventType?: string;
  [key: string]: any;
}

// ==================== ENHANCED LOGGER CLASS ====================

class NotificationLogger {
  private winston: winston.Logger;
  
  constructor() {
    this.winston = logger;
  }
  
  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.winston.error(message, {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    });
  }
  
  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, context);
  }
  
  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.winston.info(message, context);
  }
  
  /**
   * Log HTTP request/response
   */
  http(message: string, context?: LogContext): void {
    this.winston.http(message, context);
  }
  
  /**
   * Log verbose message
   */
  verbose(message: string, context?: LogContext): void {
    this.winston.verbose(message, context);
  }
  
  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, context);
  }
  
  // ==================== NOTIFICATION-SPECIFIC METHODS ====================
  
  /**
   * Log notification creation
   */
  notificationCreated(notificationId: string, type: string, recipientId: string, context?: LogContext): void {
    this.info('Notification created', {
      notificationId,
      type,
      recipientId,
      action: 'notification_created',
      ...context
    });
  }
  
  /**
   * Log notification sent
   */
  notificationSent(notificationId: string, channel: string, provider: string, context?: LogContext): void {
    this.info('Notification sent', {
      notificationId,
      channel,
      provider,
      action: 'notification_sent',
      ...context
    });
  }
  
  /**
   * Log notification delivered
   */
  notificationDelivered(notificationId: string, channel: string, context?: LogContext): void {
    this.info('Notification delivered', {
      notificationId,
      channel,
      action: 'notification_delivered',
      ...context
    });
  }
  
  /**
   * Log notification failed
   */
  notificationFailed(notificationId: string, channel: string, error: string, context?: LogContext): void {
    this.error('Notification failed', {
      notificationId,
      channel,
      error,
      action: 'notification_failed',
      ...context
    });
  }
  
  /**
   * Log notification read
   */
  notificationRead(notificationId: string, userId: string, context?: LogContext): void {
    this.info('Notification read', {
      notificationId,
      userId,
      action: 'notification_read',
      ...context
    });
  }
  
  /**
   * Log template rendered
   */
  templateRendered(templateId: string, notificationId: string, context?: LogContext): void {
    this.debug('Template rendered', {
      templateId,
      notificationId,
      action: 'template_rendered',
      ...context
    });
  }
  
  /**
   * Log template render error
   */
  templateRenderError(templateId: string, error: string, context?: LogContext): void {
    this.error('Template render error', {
      templateId,
      error,
      action: 'template_render_error',
      ...context
    });
  }
  
  /**
   * Log batch notification started
   */
  batchStarted(batchId: string, totalRecipients: number, context?: LogContext): void {
    this.info('Batch notification started', {
      batchId,
      totalRecipients,
      action: 'batch_started',
      ...context
    });
  }
  
  /**
   * Log batch notification completed
   */
  batchCompleted(batchId: string, successful: number, failed: number, context?: LogContext): void {
    this.info('Batch notification completed', {
      batchId,
      successful,
      failed,
      action: 'batch_completed',
      ...context
    });
  }
  
  /**
   * Log provider health check
   */
  providerHealthCheck(provider: string, channel: string, isHealthy: boolean, context?: LogContext): void {
    this.info('Provider health check', {
      provider,
      channel,
      isHealthy,
      action: 'provider_health_check',
      ...context
    });
  }
  
  /**
   * Log rate limit hit
   */
  rateLimitHit(provider: string, channel: string, context?: LogContext): void {
    this.warn('Rate limit hit', {
      provider,
      channel,
      action: 'rate_limit_hit',
      ...context
    });
  }
  


