import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { FluentClient } from '@fluent-org/logger';

export class Logger {
  private logger: winston.Logger;
  private fluentClient?: FluentClient;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.initializeLogger();
    this.initializeFluentd();
  }

  private initializeLogger(): void {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context: context || this.context,
          message,
          ...meta
        });
      })
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TO_CONSOLE === 'true') {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || this.context}] ${level}: ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // File transports
    if (process.env.LOG_TO_FILE !== 'false') {
      // General log file
      transports.push(
        new DailyRotateFile({
          filename: 'logs/user-service-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: logLevel,
          format: logFormat
        })
      );

      // Error log file
      transports.push(
        new DailyRotateFile({
          filename: 'logs/user-service-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: logFormat
        })
      );

      // Security log file
      transports.push(
        new DailyRotateFile({
          filename: 'logs/user-service-security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '90d',
          level: 'warn',
          format: logFormat,
          handleExceptions: false
        })
      );

      // Audit log file
      transports.push(
        new DailyRotateFile({
          filename: 'logs/user-service-audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '365d',
          level: 'info',
          format: logFormat,
          handleExceptions: false
        })
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    });
  }

  private initializeFluentd(): void {
    if (process.env.FLUENTD_ENABLED === 'true') {
      try {
        this.fluentClient = new FluentClient('user-service', {
          socket: {
            host: process.env.FLUENTD_HOST || 'localhost',
            port: parseInt(process.env.FLUENTD_PORT || '24224'),
            timeout: 3000,
            reconnectInterval: 600000 // 10 minutes
          }
        });

        this.fluentClient.on('error', (error) => {
          this.logger.error('Fluentd client error', { error: error.message });
        });

        this.fluentClient.on('connect', () => {
          this.logger.info('Connected to Fluentd');
        });

        this.fluentClient.on('disconnect', () => {
          this.logger.warn('Disconnected from Fluentd');
        });
      } catch (error) {
        this.logger.error('Failed to initialize Fluentd client', { error: error.message });
      }
    }
  }

  private sendToFluentd(level: string, message: string, meta: any = {}): void {
    if (this.fluentClient) {
      try {
        const logData = {
          timestamp: new Date().toISOString(),
          level,
          context: this.context,
          message,
          service: 'user-service',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0',
          ...meta
        };

        this.fluentClient.emit('log', logData);
      } catch (error) {
        this.logger.error('Failed to send log to Fluentd', { error: error.message });
      }
    }
  }

  public debug(message: string, meta: any = {}): void {
    this.logger.debug(message, { context: this.context, ...meta });
    this.sendToFluentd('debug', message, meta);
  }

  public info(message: string, meta: any = {}): void {
    this.logger.info(message, { context: this.context, ...meta });
    this.sendToFluentd('info', message, meta);
  }

  public warn(message: string, meta: any = {}): void {
    this.logger.warn(message, { context: this.context, ...meta });
    this.sendToFluentd('warn', message, meta);
  }

  public error(message: string, meta: any = {}): void {
    this.logger.error(message, { context: this.context, ...meta });
    this.sendToFluentd('error', message, meta);
  }

  public security(message: string, meta: any = {}): void {
    const securityMeta = {
      ...meta,
      security: true,
      severity: 'high'
    };
    this.logger.warn(message, { context: this.context, ...securityMeta });
    this.sendToFluentd('security', message, securityMeta);
  }

  public audit(message: string, meta: any = {}): void {
    const auditMeta = {
      ...meta,
      audit: true,
      compliance: true
    };
    this.logger.info(message, { context: this.context, ...auditMeta });
    this.sendToFluentd('audit', message, auditMeta);
  }

  public performance(message: string, meta: any = {}): void {
    const performanceMeta = {
      ...meta,
      performance: true
    };
    this.logger.debug(message, { context: this.context, ...performanceMeta });
    this.sendToFluentd('performance', message, performanceMeta);
  }

  public child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  public setContext(context: string): void {
    this.context = context;
  }

  public getContext(): string {
    return this.context;
  }

  public close(): void {
    if (this.fluentClient) {
      this.fluentClient.end();
    }
    this.logger.close();
  }
}

// Create default logger instance
export const logger = new Logger('UserService');

// Export logger factory
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

export default Logger;

