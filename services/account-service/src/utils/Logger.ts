/**
 * SwiftPayMe Account Service - Logger Utility
 * Structured logging for account operations
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'all.log'),
    }),
  ],
});

// Account-specific logging methods
export class Logger {
  static info(message: string, meta?: any): void {
    logger.info(message, meta);
  }

  static error(message: string, error?: Error | any): void {
    logger.error(message, { error: error?.message || error, stack: error?.stack });
  }

  static warn(message: string, meta?: any): void {
    logger.warn(message, meta);
  }

  static debug(message: string, meta?: any): void {
    logger.debug(message, meta);
  }

  static http(message: string, meta?: any): void {
    logger.http(message, meta);
  }

  // Account-specific logging methods
  static accountCreated(accountId: string, userId: string): void {
    logger.info(`Account created: ${accountId} for user: ${userId}`);
  }

  static accountUpdated(accountId: string, changes: any): void {
    logger.info(`Account updated: ${accountId}`, { changes });
  }

  static transactionProcessed(transactionId: string, type: string, amount: number, currency: string): void {
    logger.info(`Transaction processed: ${transactionId} - ${type} ${amount} ${currency}`);
  }

  static currencyConverted(accountId: string, fromCurrency: string, toCurrency: string, amount: number): void {
    logger.info(`Currency converted for account: ${accountId} - ${amount} ${fromCurrency} to ${toCurrency}`);
  }

  static assetTokenConverted(accountId: string, tokenType: string, tokenAmount: number, fiatAmount: number, currency: string): void {
    logger.info(`Asset token converted for account: ${accountId} - ${tokenAmount} ${tokenType} to ${fiatAmount} ${currency}`);
  }

  static cryptoCharged(accountId: string, fiatAmount: number, currency: string, cryptoAmount: number, cryptoCurrency: string): void {
    logger.info(`Crypto charged for account: ${accountId} - ${fiatAmount} ${currency} for ${cryptoAmount} ${cryptoCurrency}`);
  }

  static balanceUpdated(accountId: string, currency: string, oldBalance: number, newBalance: number): void {
    logger.info(`Balance updated for account: ${accountId} - ${currency}: ${oldBalance} -> ${newBalance}`);
  }

  static accountStatusChanged(accountId: string, oldStatus: string, newStatus: string): void {
    logger.info(`Account status changed: ${accountId} - ${oldStatus} -> ${newStatus}`);
  }

  static securityEvent(accountId: string, event: string, details?: any): void {
    logger.warn(`Security event for account: ${accountId} - ${event}`, details);
  }

  static complianceEvent(accountId: string, event: string, details?: any): void {
    logger.info(`Compliance event for account: ${accountId} - ${event}`, details);
  }
}

export default Logger;

