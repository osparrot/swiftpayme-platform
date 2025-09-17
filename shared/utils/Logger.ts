import winston from 'winston';
import path from 'path';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  adminId?: string;
  service?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  error?: any;
  metadata?: any;
  [key: string]: any;
}

export interface SecurityLogContext extends LogContext {
  securityEvent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked';
  riskScore?: number;
}

export interface AuditLogContext extends LogContext {
  auditEvent: string;
  resource: string;
  action: string;
  changes?: any;
  previousValues?: any;
  newValues?: any;
  reason?: string;
  compliance?: string[];
}

export class Logger {
  private winston: winston.Logger;
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string = 'SwiftPayMe') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';

    // Create Winston logger instance
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: this.createLogFormat(),
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
        version: process.env.SERVICE_VERSION || '1.0.0',
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid
      },
      transports: this.createTransports(),
      exitOnError: false
    });

    // Handle uncaught exceptions and unhandled rejections
    this.winston.exceptions.handle(
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', 'exceptions.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );

    this.winston.rejections.handle(
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', 'rejections.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  private createLogFormat(): winston.Logform.Format {
    const isDevelopment = this.environment === 'development';

    if (isDevelopment) {
      // Development format - human readable
      return winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? 
            `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      );
    } else {
      // Production format - structured JSON
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          // Ensure sensitive data is not logged
          const sanitized = this.sanitizeLogData(info);
          return JSON.stringify(sanitized);
        })
      );
    }
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];
    const logDir = process.env.LOG_DIR || './logs';

    // Console transport
    if (this.environment === 'development' || process.env.LOG_TO_CONSOLE === 'true') {
      transports.push(
        new winston.transports.Console({
          level: process.env.CONSOLE_LOG_LEVEL || 'debug'
        })
      );
    }

    // File transports for production
    if (this.environment === 'production' || process.env.LOG_TO_FILE === 'true') {
      // General application logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'application.log'),
          level: 'info',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Error logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Security logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'security.log'),
          level: 'warn',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 20,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf((info) => {
              // Only log security-related events to this file
              if (info.securityEvent || info.auditEvent) {
                return JSON.stringify(this.sanitizeLogData(info));
              }
              return '';
            })
          )
        })
      );

      // Audit logs (compliance)
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'audit.log'),
          level: 'info',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 50, // Keep more audit logs for compliance
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf((info) => {
              // Only log audit events to this file
              if (info.auditEvent) {
                return JSON.stringify(this.sanitizeLogData(info));
              }
              return '';
            })
          )
        })
      );
    }

    // External log aggregation (e.g., ELK, Splunk)
    if (process.env.LOG_AGGREGATION_URL) {
      // Add HTTP transport for log aggregation
      // This would be configured based on your log aggregation service
    }

    return transports;
  }

  private sanitizeLogData(data: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'ssn',
      'creditCard',
      'bankAccount',
      'privateKey',
      'apiKey',
      'accessToken',
      'refreshToken'
    ];

    const sanitized = { ...data };

    const sanitizeObject = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const lowerKey = key.toLowerCase();

        // Check if field should be sanitized
        const shouldSanitize = sensitiveFields.some(field => 
          lowerKey.includes(field.toLowerCase())
        );

        if (shouldSanitize) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value, currentPath);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  // Standard logging methods
  public debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.enrichContext(context));
  }

  public info(message: string, context?: LogContext): void {
    this.winston.info(message, this.enrichContext(context));
  }

  public warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.enrichContext(context));
  }

  public error(message: string, context?: LogContext): void {
    this.winston.error(message, this.enrichContext(context));
  }

  // Security logging
  public security(message: string, context: SecurityLogContext): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'security',
      securityEvent: context.securityEvent,
      severity: context.severity,
      sourceIp: context.sourceIp,
      userAgent: context.userAgent,
      resource: context.resource,
      action: context.action,
      result: context.result,
      riskScore: context.riskScore
    };

    // Log at appropriate level based on severity
    const level = this.getSecurityLogLevel(context.severity);
    this.winston.log(level, message, enrichedContext);

    // Send critical security events to monitoring system
    if (context.severity === 'critical') {
      this.sendSecurityAlert(message, enrichedContext);
    }
  }

  // Audit logging for compliance
  public audit(message: string, context: AuditLogContext): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'audit',
      auditEvent: context.auditEvent,
      resource: context.resource,
      action: context.action,
      changes: context.changes,
      previousValues: context.previousValues,
      newValues: context.newValues,
      reason: context.reason,
      compliance: context.compliance
    };

    this.winston.info(message, enrichedContext);
  }

  // Performance logging
  public performance(message: string, context: LogContext & { 
    operation: string; 
    duration: number; 
    threshold?: number 
  }): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'performance',
      operation: context.operation,
      duration: context.duration,
      threshold: context.threshold
    };

    // Log as warning if duration exceeds threshold
    const level = context.threshold && context.duration > context.threshold ? 'warn' : 'info';
    this.winston.log(level, message, enrichedContext);
  }

  // Business event logging
  public business(message: string, context: LogContext & { 
    event: string; 
    entity?: string; 
    entityId?: string 
  }): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'business',
      event: context.event,
      entity: context.entity,
      entityId: context.entityId
    };

    this.winston.info(message, enrichedContext);
  }

  // HTTP request/response logging
  public http(message: string, context: LogContext & {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    userAgent?: string;
    ip?: string;
  }): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'http',
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      duration: context.duration,
      userAgent: context.userAgent,
      ip: context.ip
    };

    // Log level based on status code
    let level = 'info';
    if (context.statusCode >= 400 && context.statusCode < 500) {
      level = 'warn';
    } else if (context.statusCode >= 500) {
      level = 'error';
    }

    this.winston.log(level, message, enrichedContext);
  }

  // Database operation logging
  public database(message: string, context: LogContext & {
    operation: string;
    collection?: string;
    query?: any;
    duration: number;
  }): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'database',
      operation: context.operation,
      collection: context.collection,
      query: context.query,
      duration: context.duration
    };

    this.winston.debug(message, enrichedContext);
  }

  // External service call logging
  public external(message: string, context: LogContext & {
    service: string;
    operation: string;
    url?: string;
    duration: number;
    statusCode?: number;
  }): void {
    const enrichedContext = {
      ...this.enrichContext(context),
      logType: 'external',
      externalService: context.service,
      operation: context.operation,
      url: context.url,
      duration: context.duration,
      statusCode: context.statusCode
    };

    const level = context.statusCode && context.statusCode >= 400 ? 'warn' : 'info';
    this.winston.log(level, message, enrichedContext);
  }

  private enrichContext(context?: LogContext): any {
    if (!context) {
      return {};
    }

    return {
      ...context,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment
    };
  }

  private getSecurityLogLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  private async sendSecurityAlert(message: string, context: any): Promise<void> {
    try {
      // Send to monitoring system (e.g., PagerDuty, Slack, etc.)
      // This would be implemented based on your monitoring setup
      
      if (process.env.SECURITY_WEBHOOK_URL) {
        // Example webhook notification
        const payload = {
          alert: 'Critical Security Event',
          message,
          context,
          timestamp: new Date().toISOString(),
          service: this.serviceName
        };

        // Send webhook (implementation would depend on your monitoring system)
        console.error('CRITICAL SECURITY ALERT:', payload);
      }
    } catch (error) {
      // Don't let monitoring failures affect the application
      console.error('Failed to send security alert:', error);
    }
  }

  // Create child logger with additional context
  public child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    
    // Override the enrichContext method to include additional context
    const originalEnrichContext = childLogger.enrichContext.bind(childLogger);
    childLogger.enrichContext = (context?: LogContext) => {
      return originalEnrichContext({
        ...additionalContext,
        ...context
      });
    };

    return childLogger;
  }

  // Get logger metrics
  public getMetrics(): any {
    return {
      service: this.serviceName,
      environment: this.environment,
      level: this.winston.level,
      transports: this.winston.transports.length,
      isLoggingToConsole: this.winston.transports.some(t => t instanceof winston.transports.Console),
      isLoggingToFile: this.winston.transports.some(t => t instanceof winston.transports.File)
    };
  }

  // Flush logs (useful for testing or shutdown)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  // Create request logger middleware
  public createRequestLogger() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Log request start
      this.http('Request started', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        statusCode: 0,
        duration: 0
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        this.http('Request completed', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.userId,
          adminId: req.user?.adminId
        });
      });

      next();
    };
  }

  // Static method to create logger instance
  public static create(serviceName: string): Logger {
    return new Logger(serviceName);
  }
}

