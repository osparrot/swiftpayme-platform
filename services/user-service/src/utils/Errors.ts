export class BaseError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
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
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// 400 Bad Request
export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

// 403 Forbidden
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

// 404 Not Found
export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

// 409 Conflict
export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

// 422 Unprocessable Entity
export class ValidationError extends BaseError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends BaseError {
  constructor(message: string = 'Too many requests', details?: any) {
    super(message, 429, 'TOO_MANY_REQUESTS', details);
  }
}

// 500 Internal Server Error
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

// 502 Bad Gateway
export class BadGatewayError extends BaseError {
  constructor(message: string = 'Bad gateway', details?: any) {
    super(message, 502, 'BAD_GATEWAY', details);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

// 504 Gateway Timeout
export class GatewayTimeoutError extends BaseError {
  constructor(message: string = 'Gateway timeout', details?: any) {
    super(message, 504, 'GATEWAY_TIMEOUT', details);
  }
}

// User-specific errors
export class UserNotFoundError extends NotFoundError {
  constructor(userId?: string) {
    const message = userId ? `User with ID ${userId} not found` : 'User not found';
    super(message, { userId });
  }
}

export class UserAlreadyExistsError extends ConflictError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, { email });
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password');
  }
}

export class AccountNotVerifiedError extends ForbiddenError {
  constructor() {
    super('Account email not verified');
  }
}

export class AccountSuspendedError extends ForbiddenError {
  constructor(reason?: string) {
    super('Account has been suspended', { reason });
  }
}

export class AccountBlockedError extends ForbiddenError {
  constructor(reason?: string) {
    super('Account has been blocked', { reason });
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(tokenType: string = 'token') {
    super(`Invalid ${tokenType}`, { tokenType });
  }
}

export class TokenExpiredError extends UnauthorizedError {
  constructor(tokenType: string = 'token') {
    super(`${tokenType} has expired`, { tokenType });
  }
}

export class TwoFactorRequiredError extends ForbiddenError {
  constructor() {
    super('Two-factor authentication required');
  }
}

export class InvalidTwoFactorCodeError extends BadRequestError {
  constructor() {
    super('Invalid two-factor authentication code');
  }
}

export class PasswordTooWeakError extends ValidationError {
  constructor(requirements: string[]) {
    super('Password does not meet security requirements', { requirements });
  }
}

export class PasswordReuseError extends ValidationError {
  constructor() {
    super('Cannot reuse a recent password');
  }
}

export class PhoneAlreadyVerifiedError extends ConflictError {
  constructor() {
    super('Phone number is already verified');
  }
}

export class PhoneNotVerifiedError extends BadRequestError {
  constructor() {
    super('Phone number is not verified');
  }
}

export class InvalidPhoneCodeError extends BadRequestError {
  constructor() {
    super('Invalid phone verification code');
  }
}

export class EmailAlreadyVerifiedError extends ConflictError {
  constructor() {
    super('Email is already verified');
  }
}

export class InvalidEmailTokenError extends BadRequestError {
  constructor() {
    super('Invalid email verification token');
  }
}

export class DocumentUploadError extends BadRequestError {
  constructor(message: string = 'Document upload failed', details?: any) {
    super(message, details);
  }
}

export class DocumentNotFoundError extends NotFoundError {
  constructor(documentId: string) {
    super(`Document with ID ${documentId} not found`, { documentId });
  }
}

export class InvalidDocumentTypeError extends ValidationError {
  constructor(allowedTypes: string[]) {
    super('Invalid document type', { allowedTypes });
  }
}

export class FileTooLargeError extends BadRequestError {
  constructor(maxSize: number) {
    super(`File size exceeds maximum allowed size of ${maxSize} bytes`, { maxSize });
  }
}

export class SessionNotFoundError extends NotFoundError {
  constructor(sessionId: string) {
    super(`Session with ID ${sessionId} not found`, { sessionId });
  }
}

export class SessionExpiredError extends UnauthorizedError {
  constructor() {
    super('Session has expired');
  }
}

export class InvalidSessionError extends UnauthorizedError {
  constructor() {
    super('Invalid session');
  }
}

export class ApiKeyNotFoundError extends NotFoundError {
  constructor(apiKeyId: string) {
    super(`API key with ID ${apiKeyId} not found`, { apiKeyId });
  }
}

export class ApiKeyExpiredError extends UnauthorizedError {
  constructor() {
    super('API key has expired');
  }
}

export class ApiKeyInactiveError extends UnauthorizedError {
  constructor() {
    super('API key is inactive');
  }
}

export class InsufficientPermissionsError extends ForbiddenError {
  constructor(requiredPermissions: string[]) {
    super('Insufficient permissions', { requiredPermissions });
  }
}

export class RateLimitExceededError extends TooManyRequestsError {
  constructor(limit: number, windowMs: number) {
    super(`Rate limit exceeded: ${limit} requests per ${windowMs}ms`, { limit, windowMs });
  }
}

export class DatabaseError extends InternalServerError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, details);
    this.code = 'DATABASE_ERROR';
  }
}

export class ExternalServiceError extends BadGatewayError {
  constructor(service: string, message: string = 'External service error', details?: any) {
    super(`${service}: ${message}`, { service, ...details });
    this.code = 'EXTERNAL_SERVICE_ERROR';
  }
}

export class ConfigurationError extends InternalServerError {
  constructor(message: string = 'Configuration error', details?: any) {
    super(message, details);
    this.code = 'CONFIGURATION_ERROR';
  }
}

export class NetworkError extends ServiceUnavailableError {
  constructor(message: string = 'Network error', details?: any) {
    super(message, details);
    this.code = 'NETWORK_ERROR';
  }
}

export class TimeoutError extends GatewayTimeoutError {
  constructor(operation: string, timeout: number) {
    super(`Operation ${operation} timed out after ${timeout}ms`, { operation, timeout });
    this.code = 'TIMEOUT_ERROR';
  }
}

// Error factory for creating errors from HTTP status codes
export class ErrorFactory {
  static createFromStatusCode(statusCode: number, message?: string, details?: any): BaseError {
    switch (statusCode) {
      case 400:
        return new BadRequestError(message, details);
      case 401:
        return new UnauthorizedError(message, details);
      case 403:
        return new ForbiddenError(message, details);
      case 404:
        return new NotFoundError(message, details);
      case 409:
        return new ConflictError(message, details);
      case 422:
        return new ValidationError(message, details);
      case 429:
        return new TooManyRequestsError(message, details);
      case 500:
        return new InternalServerError(message, details);
      case 502:
        return new BadGatewayError(message, details);
      case 503:
        return new ServiceUnavailableError(message, details);
      case 504:
        return new GatewayTimeoutError(message, details);
      default:
        return new BaseError(message || 'Unknown error', statusCode, 'UNKNOWN_ERROR', details);
    }
  }

  static createFromCode(code: string, message?: string, details?: any): BaseError {
    const errorMap: Record<string, typeof BaseError> = {
      'BAD_REQUEST': BadRequestError,
      'UNAUTHORIZED': UnauthorizedError,
      'FORBIDDEN': ForbiddenError,
      'NOT_FOUND': NotFoundError,
      'CONFLICT': ConflictError,
      'VALIDATION_ERROR': ValidationError,
      'TOO_MANY_REQUESTS': TooManyRequestsError,
      'INTERNAL_SERVER_ERROR': InternalServerError,
      'BAD_GATEWAY': BadGatewayError,
      'SERVICE_UNAVAILABLE': ServiceUnavailableError,
      'GATEWAY_TIMEOUT': GatewayTimeoutError
    };

    const ErrorClass = errorMap[code] || BaseError;
    return new ErrorClass(message || 'Error', details);
  }
}

// Error handler utility
export class ErrorHandler {
  static isOperationalError(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  static handleError(error: Error): void {
    if (!ErrorHandler.isOperationalError(error)) {
      // Log non-operational errors (programming errors)
      console.error('Non-operational error:', error);
      
      // In production, you might want to restart the process
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  static formatErrorResponse(error: BaseError | Error): any {
    if (error instanceof BaseError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  BaseError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  UserNotFoundError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  AccountNotVerifiedError,
  AccountSuspendedError,
  AccountBlockedError,
  InvalidTokenError,
  TokenExpiredError,
  TwoFactorRequiredError,
  InvalidTwoFactorCodeError,
  PasswordTooWeakError,
  PasswordReuseError,
  PhoneAlreadyVerifiedError,
  PhoneNotVerifiedError,
  InvalidPhoneCodeError,
  EmailAlreadyVerifiedError,
  InvalidEmailTokenError,
  DocumentUploadError,
  DocumentNotFoundError,
  InvalidDocumentTypeError,
  FileTooLargeError,
  SessionNotFoundError,
  SessionExpiredError,
  InvalidSessionError,
  ApiKeyNotFoundError,
  ApiKeyExpiredError,
  ApiKeyInactiveError,
  InsufficientPermissionsError,
  RateLimitExceededError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  NetworkError,
  TimeoutError,
  ErrorFactory,
  ErrorHandler
};

