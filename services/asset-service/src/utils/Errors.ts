export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

// 400 Bad Request
export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

// 403 Forbidden
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

// 404 Not Found
export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', true, details);
  }
}

// 409 Conflict
export class ConflictError extends BaseError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

// 422 Unprocessable Entity
export class ValidationError extends BaseError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends BaseError {
  constructor(message: string = 'Too many requests', details?: any) {
    super(message, 429, 'TOO_MANY_REQUESTS', true, details);
  }
}

// 500 Internal Server Error
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false, details);
  }
}

// 502 Bad Gateway
export class BadGatewayError extends BaseError {
  constructor(message: string = 'Bad gateway', details?: any) {
    super(message, 502, 'BAD_GATEWAY', true, details);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}

// 504 Gateway Timeout
export class GatewayTimeoutError extends BaseError {
  constructor(message: string = 'Gateway timeout', details?: any) {
    super(message, 504, 'GATEWAY_TIMEOUT', true, details);
  }
}

// Business logic errors
export class AssetNotFoundError extends NotFoundError {
  constructor(assetId: string) {
    super(`Asset with ID ${assetId} not found`, { assetId });
    this.code = 'ASSET_NOT_FOUND';
  }
}

export class WalletNotFoundError extends NotFoundError {
  constructor(walletId: string) {
    super(`Wallet with ID ${walletId} not found`, { walletId });
    this.code = 'WALLET_NOT_FOUND';
  }
}

export class InsufficientBalanceError extends BadRequestError {
  constructor(available: string, required: string) {
    super('Insufficient balance for transaction', { available, required });
    this.code = 'INSUFFICIENT_BALANCE';
  }
}

export class AssetAlreadyExistsError extends ConflictError {
  constructor(symbol: string) {
    super(`Asset with symbol ${symbol} already exists`, { symbol });
    this.code = 'ASSET_ALREADY_EXISTS';
  }
}

export class WalletLimitExceededError extends BadRequestError {
  constructor(limit: number) {
    super(`Wallet limit of ${limit} exceeded`, { limit });
    this.code = 'WALLET_LIMIT_EXCEEDED';
  }
}

export class InvalidAssetTypeError extends BadRequestError {
  constructor(type: string) {
    super(`Invalid asset type: ${type}`, { type });
    this.code = 'INVALID_ASSET_TYPE';
  }
}

export class InvalidWalletTypeError extends BadRequestError {
  constructor(type: string) {
    super(`Invalid wallet type: ${type}`, { type });
    this.code = 'INVALID_WALLET_TYPE';
  }
}

export class AssetNotTradableError extends BadRequestError {
  constructor(assetId: string) {
    super(`Asset ${assetId} is not tradable`, { assetId });
    this.code = 'ASSET_NOT_TRADABLE';
  }
}

export class WalletFrozenError extends ForbiddenError {
  constructor(walletId: string) {
    super(`Wallet ${walletId} is frozen`, { walletId });
    this.code = 'WALLET_FROZEN';
  }
}

export class TransactionLimitExceededError extends BadRequestError {
  constructor(limit: string, attempted: string) {
    super('Transaction limit exceeded', { limit, attempted });
    this.code = 'TRANSACTION_LIMIT_EXCEEDED';
  }
}

export class PriceStaleError extends BadRequestError {
  constructor(assetId: string, lastUpdated: Date) {
    super(`Price for asset ${assetId} is stale`, { assetId, lastUpdated });
    this.code = 'PRICE_STALE';
  }
}

export class DatabaseConnectionError extends ServiceUnavailableError {
  constructor(details?: any) {
    super('Database connection failed', details);
    this.code = 'DATABASE_CONNECTION_ERROR';
  }
}

export class RedisConnectionError extends ServiceUnavailableError {
  constructor(details?: any) {
    super('Redis connection failed', details);
    this.code = 'REDIS_CONNECTION_ERROR';
  }
}

export class ExternalServiceError extends BadGatewayError {
  constructor(service: string, details?: any) {
    super(`External service ${service} error`, { service, ...details });
    this.code = 'EXTERNAL_SERVICE_ERROR';
  }
}

export class ConfigurationError extends InternalServerError {
  constructor(setting: string) {
    super(`Configuration error: ${setting}`, { setting });
    this.code = 'CONFIGURATION_ERROR';
  }
}

export class EncryptionError extends InternalServerError {
  constructor(operation: string) {
    super(`Encryption error during ${operation}`, { operation });
    this.code = 'ENCRYPTION_ERROR';
  }
}

export class DecryptionError extends InternalServerError {
  constructor(operation: string) {
    super(`Decryption error during ${operation}`, { operation });
    this.code = 'DECRYPTION_ERROR';
  }
}

export class AddressGenerationError extends InternalServerError {
  constructor(walletType: string) {
    super(`Failed to generate address for wallet type ${walletType}`, { walletType });
    this.code = 'ADDRESS_GENERATION_ERROR';
  }
}

export class InvalidAddressError extends BadRequestError {
  constructor(address: string) {
    super(`Invalid address: ${address}`, { address });
    this.code = 'INVALID_ADDRESS';
  }
}

export class NetworkError extends ServiceUnavailableError {
  constructor(network: string, details?: any) {
    super(`Network error on ${network}`, { network, ...details });
    this.code = 'NETWORK_ERROR';
  }
}

export class ComplianceError extends ForbiddenError {
  constructor(reason: string, details?: any) {
    super(`Compliance check failed: ${reason}`, details);
    this.code = 'COMPLIANCE_ERROR';
  }
}

export class AuditError extends InternalServerError {
  constructor(operation: string, details?: any) {
    super(`Audit error during ${operation}`, { operation, ...details });
    this.code = 'AUDIT_ERROR';
  }
}

// Error factory function
export function createError(
  type: string,
  message: string,
  statusCode: number = 500,
  details?: any
): BaseError {
  switch (type.toLowerCase()) {
    case 'badrequest':
      return new BadRequestError(message, details);
    case 'unauthorized':
      return new UnauthorizedError(message, details);
    case 'forbidden':
      return new ForbiddenError(message, details);
    case 'notfound':
      return new NotFoundError(message, details);
    case 'conflict':
      return new ConflictError(message, details);
    case 'validation':
      return new ValidationError(message, details);
    case 'toomanyreq':
      return new TooManyRequestsError(message, details);
    case 'internal':
      return new InternalServerError(message, details);
    case 'badgateway':
      return new BadGatewayError(message, details);
    case 'unavailable':
      return new ServiceUnavailableError(message, details);
    case 'timeout':
      return new GatewayTimeoutError(message, details);
    default:
      return new BaseError(message, statusCode, type.toUpperCase(), true, details);
  }
}

// Error handler utility
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

// Error serializer for logging
export function serializeError(error: Error): any {
  if (error instanceof BaseError) {
    return error.toJSON();
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
    isOperational: false
  };
}

// Error response formatter
export function formatErrorResponse(error: BaseError, includeStack: boolean = false): any {
  const response: any = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString()
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

// Async error wrapper
export function asyncErrorHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
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
  AssetNotFoundError,
  WalletNotFoundError,
  InsufficientBalanceError,
  AssetAlreadyExistsError,
  WalletLimitExceededError,
  InvalidAssetTypeError,
  InvalidWalletTypeError,
  AssetNotTradableError,
  WalletFrozenError,
  TransactionLimitExceededError,
  PriceStaleError,
  DatabaseConnectionError,
  RedisConnectionError,
  ExternalServiceError,
  ConfigurationError,
  EncryptionError,
  DecryptionError,
  AddressGenerationError,
  InvalidAddressError,
  NetworkError,
  ComplianceError,
  AuditError,
  createError,
  isOperationalError,
  serializeError,
  formatErrorResponse,
  asyncErrorHandler
};

