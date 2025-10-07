export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class InsufficientFundsError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'INSUFFICIENT_FUNDS');
  }
}

export class NetworkError extends BaseError {
  constructor(message: string) {
    super(message, 503, 'NETWORK_ERROR');
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string) {
    super(message, 408, 'TIMEOUT');
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}
