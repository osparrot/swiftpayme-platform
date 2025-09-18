import winston from 'winston';
import FluentTransport from 'fluent-logger/lib/winston';

export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string = 'TokenizationService') {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${this.serviceName}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          })
        )
      })
    ];

    // Add Fluentd transport if configured
    if (process.env.FLUENTD_HOST && process.env.FLUENTD_PORT) {
      transports.push(
        new FluentTransport('swiftpay.tokenization', {
          host: process.env.FLUENTD_HOST,
          port: parseInt(process.env.FLUENTD_PORT),
          timeout: 3.0,
          reconnectInterval: 600000
        })
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0'
      },
      transports
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  // Structured logging methods
  logRequest(requestId: string, method: string, url: string, userId?: string): void {
    this.info('Request received', {
      requestId,
      method,
      url,
      userId,
      type: 'request'
    });
  }

  logResponse(requestId: string, statusCode: number, duration: number): void {
    this.info('Request completed', {
      requestId,
      statusCode,
      duration,
      type: 'response'
    });
  }

  logTransaction(transactionId: string, type: string, amount: string, status: string): void {
    this.info('Transaction processed', {
      transactionId,
      type,
      amount,
      status,
      type: 'transaction'
    });
  }

  logCompliance(entityId: string, entityType: string, status: string, riskScore: number): void {
    this.info('Compliance check completed', {
      entityId,
      entityType,
      status,
      riskScore,
      type: 'compliance'
    });
  }

  logAudit(auditId: string, tokenId: string, findings: string[], status: string): void {
    this.info('Audit completed', {
      auditId,
      tokenId,
      findings,
      status,
      type: 'audit'
    });
  }

  logSecurity(event: string, userId?: string, ipAddress?: string, details?: any): void {
    this.warn('Security event', {
      event,
      userId,
      ipAddress,
      details,
      type: 'security'
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any): void {
    this.info('Performance metric', {
      operation,
      duration,
      metadata,
      type: 'performance'
    });
  }

  logError(error: Error, context?: any): void {
    this.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      context,
      type: 'error'
    });
  }
}

