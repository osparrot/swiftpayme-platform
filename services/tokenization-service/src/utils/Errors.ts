/**
 * Base error class for all tokenization service errors
 */
export class TokenizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'TOKENIZATION_ERROR',
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends TokenizationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Authentication error for unauthorized access
 */
export class AuthenticationError extends TokenizationError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends TokenizationError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends TokenizationError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND_ERROR', 404, { resource, identifier });
  }
}

/**
 * Conflict error for duplicate resources or conflicting operations
 */
export class ConflictError extends TokenizationError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

/**
 * Compliance error for failed compliance checks
 */
export class ComplianceError extends TokenizationError {
  constructor(message: string, details?: any) {
    super(message, 'COMPLIANCE_ERROR', 422, details);
  }
}

/**
 * Insufficient reserves error for operations requiring more reserves than available
 */
export class InsufficientReservesError extends TokenizationError {
  constructor(message: string = 'Insufficient reserves for operation', details?: any) {
    super(message, 'INSUFFICIENT_RESERVES_ERROR', 422, details);
  }
}

/**
 * Token operation error for failed token operations
 */
export class TokenOperationError extends TokenizationError {
  constructor(operation: string, tokenId: string, reason?: string) {
    const message = `Token operation '${operation}' failed for token '${tokenId}'${reason ? `: ${reason}` : ''}`;
    super(message, 'TOKEN_OPERATION_ERROR', 422, { operation, tokenId, reason });
  }
}

/**
 * Deposit error for deposit-related failures
 */
export class DepositError extends TokenizationError {
  constructor(message: string, depositId?: string, details?: any) {
    super(message, 'DEPOSIT_ERROR', 422, { depositId, ...details });
  }
}

/**
 * Withdrawal error for withdrawal-related failures
 */
export class WithdrawalError extends TokenizationError {
  constructor(message: string, withdrawalId?: string, details?: any) {
    super(message, 'WITHDRAWAL_ERROR', 422, { withdrawalId, ...details });
  }
}

/**
 * Minting error for token minting failures
 */
export class MintingError extends TokenizationError {
  constructor(message: string, requestId?: string, details?: any) {
    super(message, 'MINTING_ERROR', 422, { requestId, ...details });
  }
}

/**
 * Burning error for token burning failures
 */
export class BurningError extends TokenizationError {
  constructor(message: string, requestId?: string, details?: any) {
    super(message, 'BURNING_ERROR', 422, { requestId, ...details });
  }
}

/**
 * Audit error for audit-related failures
 */
export class AuditError extends TokenizationError {
  constructor(message: string, auditId?: string, details?: any) {
    super(message, 'AUDIT_ERROR', 422, { auditId, ...details });
  }
}

/**
 * External service error for failures in external service calls
 */
export class ExternalServiceError extends TokenizationError {
  constructor(service: string, operation: string, originalError?: Error) {
    const message = `External service '${service}' failed during '${operation}'`;
    super(message, 'EXTERNAL_SERVICE_ERROR', 503, {
      service,
      operation,
      originalError: originalError?.message
    });
  }
}

/**
 * Rate limit error for too many requests
 */
export class RateLimitError extends TokenizationError {
  constructor(limit: number, windowMs: number, details?: any) {
    const message = `Rate limit exceeded: ${limit} requests per ${windowMs}ms`;
    super(message, 'RATE_LIMIT_ERROR', 429, { limit, windowMs, ...details });
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends TokenizationError {
  constructor(operation: string, originalError?: Error) {
    const message = `Database operation '${operation}' failed`;
    super(message, 'DATABASE_ERROR', 500, {
      operation,
      originalError: originalError?.message
    });
  }
}

/**
 * Configuration error for invalid or missing configuration
 */
export class ConfigurationError extends TokenizationError {
  constructor(configKey: string, details?: any) {
    const message = `Configuration error for '${configKey}'`;
    super(message, 'CONFIGURATION_ERROR', 500, { configKey, ...details });
  }
}

/**
 * Network error for network-related failures
 */
export class NetworkError extends TokenizationError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
  }
}

/**
 * Timeout error for operations that exceed time limits
 */
export class TimeoutError extends TokenizationError {
  constructor(operation: string, timeoutMs: number) {
    const message = `Operation '${operation}' timed out after ${timeoutMs}ms`;
    super(message, 'TIMEOUT_ERROR', 408, { operation, timeoutMs });
  }
}

/**
 * Business rule error for violations of business logic
 */
export class BusinessRuleError extends TokenizationError {
  constructor(rule: string, details?: any) {
    const message = `Business rule violation: ${rule}`;
    super(message, 'BUSINESS_RULE_ERROR', 422, { rule, ...details });
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Check if error is a TokenizationError
   */
  static isTokenizationError(error: any): error is TokenizationError {
    return error instanceof TokenizationError;
  }

  /**
   * Get error response object for API responses
   */
  static getErrorResponse(error: any): {
    success: boolean;
    error: {
      name: string;
      message: string;
      code: string;
      statusCode: number;
      details?: any;
      timestamp: Date;
    };
  } {
    if (ErrorHandler.isTokenizationError(error)) {
      return {
        success: false,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
          timestamp: error.timestamp
        }
      };
    }

    // Handle generic errors
    return {
      success: false,
      error: {
        name: 'InternalServerError',
        message: error.message || 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date()
      }
    };
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: any, logger: any, context?: any): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      stack: error.stack,
      context
    };

    if (ErrorHandler.isTokenizationError(error)) {
      if (error.statusCode >= 500) {
        logger.error('Server error occurred', errorInfo);
      } else if (error.statusCode >= 400) {
        logger.warn('Client error occurred', errorInfo);
      } else {
        logger.info('Error occurred', errorInfo);
      }
    } else {
      logger.error('Unexpected error occurred', errorInfo);
    }
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        if (ErrorHandler.isTokenizationError(error)) {
          throw error;
        }
        throw new TokenizationError(
          error.message || 'An unexpected error occurred',
          'WRAPPED_ERROR',
          500,
          { originalError: error.name }
        );
      }
    };
  }

  /**
   * Create error from HTTP response
   */
  static fromHttpError(error: any): TokenizationError {
    if (error.response) {
      const { status, statusText, data } = error.response;
      return new TokenizationError(
        data?.message || statusText || 'HTTP request failed',
        'HTTP_ERROR',
        status,
        { httpStatus: status, httpStatusText: statusText, responseData: data }
      );
    }

    if (error.request) {
      return new NetworkError('Network request failed', {
        request: error.request
      });
    }

    return new TokenizationError(
      error.message || 'Request setup failed',
      'REQUEST_ERROR',
      500
    );
  }
}

