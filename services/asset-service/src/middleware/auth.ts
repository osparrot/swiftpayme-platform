import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AssetRequest } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('AuthMiddleware');

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId?: string;
  tokenId?: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = async (
  req: AssetRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check for JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          sessionId: decoded.sessionId,
          tokenId: decoded.tokenId
        };

        // Add request metadata
        req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        req.userAgent = req.headers['user-agent'] || 'unknown';
        req.requestId = req.headers['x-request-id'] as string || generateRequestId();
        req.startTime = Date.now();

        logger.debug('JWT authentication successful', {
          userId: req.user.id,
          role: req.user.role,
          requestId: req.requestId
        });

        return next();
      } catch (jwtError) {
        logger.warn('JWT verification failed', {
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
          token: token.substring(0, 20) + '...'
        });
        throw new UnauthorizedError('Invalid or expired token');
      }
    }

    // Check for API key
    if (apiKey) {
      try {
        // In a real implementation, this would validate against a database
        // For now, we'll use a simple validation
        if (!isValidApiKey(apiKey)) {
          throw new UnauthorizedError('Invalid API key');
        }

        // Extract user info from API key (simplified)
        const apiKeyInfo = parseApiKey(apiKey);
        
        req.user = {
          id: apiKeyInfo.userId,
          email: apiKeyInfo.email || 'api-user@swiftpay.com',
          role: apiKeyInfo.role || 'api_user',
          permissions: apiKeyInfo.permissions || ['asset:read', 'wallet:read']
        };

        // Add request metadata
        req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        req.userAgent = req.headers['user-agent'] || 'unknown';
        req.requestId = req.headers['x-request-id'] as string || generateRequestId();
        req.startTime = Date.now();

        logger.debug('API key authentication successful', {
          userId: req.user.id,
          role: req.user.role,
          requestId: req.requestId
        });

        return next();
      } catch (apiError) {
        logger.warn('API key validation failed', {
          error: apiError instanceof Error ? apiError.message : 'Unknown error',
          apiKey: apiKey.substring(0, 10) + '...'
        });
        throw new UnauthorizedError('Invalid API key');
      }
    }

    // No authentication provided
    throw new UnauthorizedError('Authentication required');
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permission: string) => {
  return (req: AssetRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('*')) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          requiredPermission: permission,
          userPermissions: req.user.permissions
        });
        throw new ForbiddenError(`Permission '${permission}' required`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireRole = (role: string) => {
  return (req: AssetRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (req.user.role !== role && req.user.role !== 'admin') {
        logger.warn('Role access denied', {
          userId: req.user.id,
          requiredRole: role,
          userRole: req.user.role
        });
        throw new ForbiddenError(`Role '${role}' required`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const optionalAuth = async (
  req: AssetRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader || apiKey) {
      // If auth is provided, validate it
      return authMiddleware(req, res, next);
    } else {
      // No auth provided, continue without user context
      req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      req.userAgent = req.headers['user-agent'] || 'unknown';
      req.requestId = req.headers['x-request-id'] as string || generateRequestId();
      req.startTime = Date.now();
      
      next();
    }
  } catch (error) {
    next(error);
  }
};

// Helper functions
function isValidApiKey(apiKey: string): boolean {
  // In a real implementation, this would check against a database
  // For now, we'll use a simple format validation
  const apiKeyPattern = /^sp_[a-zA-Z0-9]{32}$/;
  return apiKeyPattern.test(apiKey);
}

function parseApiKey(apiKey: string): any {
  // In a real implementation, this would decode the API key
  // For now, we'll return mock data
  return {
    userId: 'api-user-' + apiKey.substring(3, 13),
    email: 'api-user@swiftpay.com',
    role: 'api_user',
    permissions: ['asset:read', 'wallet:read', 'portfolio:read']
  };
}

function generateRequestId(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// Middleware for checking specific asset permissions
export const requireAssetPermission = (action: 'read' | 'write' | 'delete') => {
  return requirePermission(`asset:${action}`);
};

// Middleware for checking specific wallet permissions
export const requireWalletPermission = (action: 'read' | 'write' | 'delete') => {
  return requirePermission(`wallet:${action}`);
};

// Middleware for checking if user can access specific wallet
export const requireWalletOwnership = async (
  req: AssetRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { walletId } = req.params;
    if (!walletId) {
      return next();
    }

    // In a real implementation, this would check wallet ownership
    // For now, we'll assume the controller handles this check
    next();
  } catch (error) {
    next(error);
  }
};

export default {
  authMiddleware,
  requirePermission,
  requireRole,
  optionalAuth,
  requireAssetPermission,
  requireWalletPermission,
  requireWalletOwnership
};

