import winston from 'winston';
import { format } from 'winston';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'CryptoService') {
    this.context = context;
    
    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.json(),
      format.printf(({ timestamp, level, message, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level: level.toUpperCase(),
          context: context || this.context,
          message,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'crypto-service', context: this.context },
      transports: [
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'development' 
            ? format.combine(
                format.colorize(),
                format.simple(),
                format.printf(({ timestamp, level, message, context }) => {
                  return `${timestamp} [${level}] [${context || this.context}]: ${message}`;
                })
              )
            : logFormat
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  setContext(context: string): void {
    this.context = context;
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export default Logger;
