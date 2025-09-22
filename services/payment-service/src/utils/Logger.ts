/**
 * SwiftPayMe Payment Service - Logger Utility
 * Comprehensive logging utility with structured logging
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'PaymentService') {
    this.context = context;
    
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, correlationId, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context: context || this.context,
          message,
          correlationId,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { 
        service: 'payment-service',
        context: this.context 
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: '/var/log/payment-service/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: '/var/log/payment-service/combined.log' 
        })
      ]
    });

    // Handle uncaught exceptions and rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: '/var/log/payment-service/exceptions.log' })
    );

    this.logger.rejections.handle(
      new winston.transports.File({ filename: '/var/log/payment-service/rejections.log' })
    );
  }

  private formatMessage(message: string, meta?: any, correlationId?: string) {
    return {
      message,
      correlationId: correlationId || uuidv4(),
      context: this.context,
      ...meta
    };
  }

  info(message: string, meta?: any, correlationId?: string) {
    this.logger.info(this.formatMessage(message, meta, correlationId));
  }

  error(message: string, error?: Error | any, correlationId?: string) {
    const errorMeta = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : { error };

    this.logger.error(this.formatMessage(message, errorMeta, correlationId));
  }

  warn(message: string, meta?: any, correlationId?: string) {
    this.logger.warn(this.formatMessage(message, meta, correlationId));
  }

  debug(message: string, meta?: any, correlationId?: string) {
    this.logger.debug(this.formatMessage(message, meta, correlationId));
  }

  verbose(message: string, meta?: any, correlationId?: string) {
    this.logger.verbose(this.formatMessage(message, meta, correlationId));
  }

  // Payment-specific logging methods
  logPaymentCreated(paymentId: string, userId: string, amount: number, currency: string, correlationId?: string) {
    this.info('Payment created', {
      paymentId,
      userId,
      amount,
      currency,
      event: 'payment_created'
    }, correlationId);
  }

  logPaymentStatusChanged(paymentId: string, oldStatus: string, newStatus: string, correlationId?: string) {
    this.info('Payment status changed', {
      paymentId,
      oldStatus,
      newStatus,
      event: 'payment_status_changed'
    }, correlationId);
  }

  logWorkflowStarted(workflowId: string, type: string, userId: string, correlationId?: string) {
    this.info('Workflow started', {
      workflowId,
      type,
      userId,
      event: 'workflow_started'
    }, correlationId);
  }

  logWorkflowCompleted(workflowId: string, executionTime: number, correlationId?: string) {
    this.info('Workflow completed', {
      workflowId,
      executionTime,
      event: 'workflow_completed'
    }, correlationId);
  }

  logWorkflowFailed(workflowId: string, error: string, correlationId?: string) {
    this.error('Workflow failed', {
      workflowId,
      error,
      event: 'workflow_failed'
    }, correlationId);
  }

  logServiceCall(service: string, action: string, duration: number, success: boolean, correlationId?: string) {
    this.info('Service call', {
      service,
      action,
      duration,
      success,
      event: 'service_call'
    }, correlationId);
  }

  logSecurityEvent(event: string, userId?: string, ipAddress?: string, correlationId?: string) {
    this.warn('Security event', {
      event,
      userId,
      ipAddress,
      category: 'security'
    }, correlationId);
  }

  logPerformanceMetric(metric: string, value: number, unit: string, correlationId?: string) {
    this.info('Performance metric', {
      metric,
      value,
      unit,
      category: 'performance'
    }, correlationId);
  }

  // Create child logger with additional context
  child(additionalContext: Record<string, any>) {
    const childLogger = new Logger(`${this.context}:${additionalContext.component || 'child'}`);
    childLogger.logger = this.logger.child(additionalContext);
    return childLogger;
  }

  // Get the underlying Winston logger for advanced usage
  getWinstonLogger() {
    return this.logger;
  }
}

export default Logger;

