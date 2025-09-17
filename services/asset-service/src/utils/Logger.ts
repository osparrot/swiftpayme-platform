import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import FluentLogger from 'fluent-logger';

interface LoggerConfig {
  level: string;
  service: string;
  environment: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableFluentd: boolean;
  fluentdHost?: string;
  fluentdPort?: number;
  logDirectory: string;
}

interface LogMetadata {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export class Logger {
  private winston: winston.Logger;
  private fluentLogger?: any;
  private config: LoggerConfig;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.config = this.getConfig();
    this.winston = this.createWinstonLogger();
    
    if (this.config.enableFluentd) {
      this.initializeFluentd();
    }
  }

  private getConfig(): LoggerConfig {
    return {
      level: process.env.LOG_LEVEL || 'info',
      service: 'asset-service',
      environment: process.env.NODE_ENV || 'development',
      enableConsole: process.env.LOG_TO_CONSOLE !== 'false',
      enableFile: process.env.LOG_TO_FILE !== 'false',
      enableFluentd: process.env.FLUENTD_ENABLED === 'true',
      fluentdHost: process.env.FLUENTD_HOST || 'localhost',
      fluentdPort: parseInt(process.env.FLUENTD_PORT || '24224'),
      logDirectory: process.env.LOG_DIRECTORY || './logs'
    };
  }

  private createWinstonLogger(): winston.Logger {
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    // Add colorization for console in development
    if (this.config.environment === 'development' && this.config.enableConsole) {
      formats.unshift(winston.format.colorize());
    }

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}] [${context || this.context}] ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // File transports
    if (this.config.enableFile) {
      // General log file
      transports.push(
        new DailyRotateFile({
          filename: `${this.config.logDirectory}/asset-service-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: this.config.level,
          format: winston.format.combine(...formats)
        })
      );

      // Error log file
      transports.push(
        new DailyRotateFile({
          filename: `${this.config.logDirectory}/asset-service-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(...formats)
        })
      );

      // Audit log file
      transports.push(
        new DailyRotateFile({
          filename: `${this.config.logDirectory}/asset-service-audit-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          level: 'info',
          format: winston.format.combine(...formats),
          // Only log audit events
          filter: (info) => info.audit === true
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      defaultMeta: {
        service: this.config.service,
        environment: this.config.environment,
        context: this.context
      },
      transports,
      exitOnError: false
    });
  }

  private initializeFluentd(): void {
    try {
      this.fluentLogger = FluentLogger.createFluentSender('swiftpay.asset', {
        host: this.config.fluentdHost,
        port: this.config.fluentdPort,
        timeout: 3.0,
        reconnectInterval: 600000 // 10 minutes
      });

      this.fluentLogger.on('error', (error: Error) => {
        this.winston.error('Fluentd connection error', { error: error.message });
      });

      this.winston.info('Fluentd logger initialized', {
        host: this.config.fluentdHost,
        port: this.config.fluentdPort
      });
    } catch (error) {
      this.winston.error('Failed to initialize Fluentd logger', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private formatMessage(level: string, message: string, meta: LogMetadata = {}): any {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      service: this.config.service,
      environment: this.config.environment,
      ...meta
    };

    // Add process information for error logs
    if (level === 'error') {
      logEntry.process = {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    }

    return logEntry;
  }

  private sendToFluentd(level: string, message: string, meta: LogMetadata = {}): void {
    if (!this.fluentLogger) return;

    try {
      const logEntry = this.formatMessage(level, message, meta);
      this.fluentLogger.emit(level, logEntry);
    } catch (error) {
      this.winston.error('Failed to send log to Fluentd', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public debug(message: string, meta: LogMetadata = {}): void {
    const logEntry = { ...meta, context: this.context };
    this.winston.debug(message, logEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('debug', message, meta);
    }
  }

  public info(message: string, meta: LogMetadata = {}): void {
    const logEntry = { ...meta, context: this.context };
    this.winston.info(message, logEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('info', message, meta);
    }
  }

  public warn(message: string, meta: LogMetadata = {}): void {
    const logEntry = { ...meta, context: this.context };
    this.winston.warn(message, logEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('warn', message, meta);
    }
  }

  public error(message: string, meta: LogMetadata = {}): void {
    const logEntry = { ...meta, context: this.context };
    this.winston.error(message, logEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('error', message, meta);
    }
  }

  public audit(message: string, meta: LogMetadata = {}): void {
    const auditEntry = { 
      ...meta, 
      context: this.context, 
      audit: true,
      timestamp: new Date().toISOString()
    };
    
    this.winston.info(message, auditEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('audit', message, meta);
    }
  }

  public security(message: string, meta: LogMetadata = {}): void {
    const securityEntry = { 
      ...meta, 
      context: this.context, 
      security: true,
      severity: 'high',
      timestamp: new Date().toISOString()
    };
    
    this.winston.warn(message, securityEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('security', message, meta);
    }
  }

  public performance(message: string, meta: LogMetadata = {}): void {
    const performanceEntry = { 
      ...meta, 
      context: this.context, 
      performance: true,
      timestamp: new Date().toISOString()
    };
    
    this.winston.info(message, performanceEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('performance', message, meta);
    }
  }

  public business(message: string, meta: LogMetadata = {}): void {
    const businessEntry = { 
      ...meta, 
      context: this.context, 
      business: true,
      timestamp: new Date().toISOString()
    };
    
    this.winston.info(message, businessEntry);
    
    if (this.config.enableFluentd) {
      this.sendToFluentd('business', message, meta);
    }
  }

  // Method to create child logger with additional context
  public child(additionalContext: string): Logger {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    return childLogger;
  }

  // Method to log with correlation ID
  public withCorrelation(correlationId: string) {
    return {
      debug: (message: string, meta: LogMetadata = {}) => 
        this.debug(message, { ...meta, correlationId }),
      info: (message: string, meta: LogMetadata = {}) => 
        this.info(message, { ...meta, correlationId }),
      warn: (message: string, meta: LogMetadata = {}) => 
        this.warn(message, { ...meta, correlationId }),
      error: (message: string, meta: LogMetadata = {}) => 
        this.error(message, { ...meta, correlationId }),
      audit: (message: string, meta: LogMetadata = {}) => 
        this.audit(message, { ...meta, correlationId })
    };
  }

  // Method to log HTTP requests
  public httpRequest(req: any, res: any, duration: number): void {
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      requestId: req.requestId
    };

    if (res.statusCode >= 500) {
      this.error('HTTP request failed', meta);
    } else if (res.statusCode >= 400) {
      this.warn('HTTP request error', meta);
    } else {
      this.info('HTTP request completed', meta);
    }
  }

  // Method to log database operations
  public dbOperation(operation: string, collection: string, duration: number, meta: LogMetadata = {}): void {
    this.info('Database operation', {
      ...meta,
      operation,
      collection,
      duration,
      database: true
    });
  }

  // Method to log external API calls
  public externalApi(service: string, endpoint: string, duration: number, statusCode: number, meta: LogMetadata = {}): void {
    const logMeta = {
      ...meta,
      service,
      endpoint,
      duration,
      statusCode,
      external: true
    };

    if (statusCode >= 500) {
      this.error('External API call failed', logMeta);
    } else if (statusCode >= 400) {
      this.warn('External API call error', logMeta);
    } else {
      this.info('External API call completed', logMeta);
    }
  }

  // Method to flush logs (useful for testing)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  // Method to get current log level
  public getLevel(): string {
    return this.config.level;
  }

  // Method to set log level dynamically
  public setLevel(level: string): void {
    this.config.level = level;
    this.winston.level = level;
  }
}

// Create default logger instance
export const logger = new Logger('AssetService');

// Export logger factory
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

export default Logger;

