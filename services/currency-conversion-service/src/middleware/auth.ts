import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';
import { ValidationError, UnauthorizedError } from '../utils/Errors';
import { AuthenticatedRequest } from '../types';

const logger = new Logger('AuthMiddleware');

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss?: string;
}

class AuthMiddleware {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_ISSUER = process.env.JWT_ISSUER || 'swiftpay-auth-service';

  /**
   * Required authentication middleware
   */
  required = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        throw new UnauthorizedError('Authentication token required');
      }

      const decoded = this.verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
      req.tokenInfo = {
        iat: decoded.iat,
        exp: decoded.exp,
        iss: decoded.iss
      };

      logger.debug('User authenticated', {
        userId: req.user.id,
        role: req.user.role,
        requestId: req.requestId
      });

      next();
    } catch (error: any) {
      logger.warn('Authentication failed', {
        error: error.message,
        requestId: req.requestId,
        ip: req.ip
      });
      next(error);
    }
  };

  /**
   * Optional authentication middleware
   */
  optional = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        try {
          const decoded = this.verifyToken(token);
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            permissions: decoded.permissions || []
          };
          req.tokenInfo = {
            iat: decoded.iat,
            exp: decoded.exp,
            iss: decoded.iss
          };

          logger.debug('User authenticated (optional)', {
            userId: req.user.id,
            role: req.user.role,
            requestId: req.requestId
          });
        } catch (error: any) {
          // Log but don't fail for optional auth
          logger.debug('Optional authentication failed', {
            error: error.message,
            requestId: req.requestId
          });
        }
      }

      next();
    } catch (error: any) {
      // For optional auth, we don't fail the request
      logger.debug('Optional authentication error', {
        error: error.message,
        requestId: req.requestId
      });
      next();
    }
  };

  /**
   * Role-based authorization middleware
   */
  requireRole = (requiredRole: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedError('Authentication required');
        }

        if (req.user.role !== requiredRole && req.user.role !== 'admin') {
          throw new ValidationError(`Role '${requiredRole}' required`);
        }

        logger.debug('Role authorization successful', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRole,
          requestId: req.requestId
        });

        next();
      } catch (error: any) {
        logger.warn('Role authorization failed', {
          error: error.message,
          userId: req.user?.id,
          userRole: req.user?.role,
          requiredRole,
          requestId: req.requestId
        });
        next(error);
      }
    };
  };

  /**
   * Permission-based authorization middleware
   */
  requirePermission = (requiredPermission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedError('Authentication required');
        }

        if (!req.user.permissions.includes(requiredPermission) && !req.user.permissions.includes('admin')) {
          throw new ValidationError(`Permission '${requiredPermission}' required`);
        }

        logger.debug('Permission authorization successful', {
          userId: req.user.id,
          userPermissions: req.user.permissions,
          requiredPermission,
          requestId: req.requestId
        });

        next();
      } catch (error: any) {
        logger.warn('Permission authorization failed', {
          error: error.message,
          userId: req.user?.id,
          userPermissions: req.user?.permissions,
          requiredPermission,
          requestId: req.requestId
        });
        next(error);
      }
    };
  };

  /**
   * Service-to-service authentication middleware
   */
  serviceAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const serviceKey = req.headers['x-service-key'] as string;
      const expectedKey = process.env.SERVICE_API_KEY;

      if (!serviceKey || !expectedKey) {
        throw new UnauthorizedError('Service authentication required');
      }

      if (serviceKey !== expectedKey) {
        throw new UnauthorizedError('Invalid service key');
      }

      logger.debug('Service authentication successful', {
        requestId: req.requestId,
        ip: req.ip
      });

      next();
    } catch (error: any) {
      logger.warn('Service authentication failed', {
        error: error.message,
        requestId: req.requestId,
        ip: req.ip
      });
      next(error);
    }
  };

  /**
   * Extract JWT token from request
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check for token in cookies
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      return cookieToken;
    }

    // Check for token in query parameter (less secure, for specific use cases)
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  /**
   * Verify and decode JWT token
   */
  private verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      
      // Validate token structure
      if (!decoded.id || !decoded.email || !decoded.role) {
        throw new ValidationError('Invalid token structure');
      }

      // Check issuer if configured
      if (this.JWT_ISSUER && decoded.iss !== this.JWT_ISSUER) {
        throw new ValidationError('Invalid token issuer');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new ValidationError('Token expired');
      }

      return decoded;
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw new ValidationError('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new ValidationError('Token expired');
      }
      if (error.name === 'NotBeforeError') {
        throw new ValidationError('Token not active');
      }
      throw error;
    }
  }

  /**
   * Generate a new JWT token (utility method)
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN || '86400', 10); // 24 hours default

    const tokenPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
      iss: this.JWT_ISSUER
    };

    return jwt.sign(tokenPayload, this.JWT_SECRET);
  }

  /**
   * Refresh token middleware
   */
  refreshToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.tokenInfo) {
        throw new UnauthorizedError('Authentication required for token refresh');
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = req.tokenInfo.exp - now;
      const refreshThreshold = parseInt(process.env.JWT_REFRESH_THRESHOLD || '3600', 10); // 1 hour

      // Only refresh if token expires within threshold
      if (timeUntilExpiry <= refreshThreshold) {
        const newToken = this.generateToken({
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          permissions: req.user.permissions
        });

        res.setHeader('X-New-Token', newToken);
        
        logger.info('Token refreshed', {
          userId: req.user.id,
          timeUntilExpiry,
          requestId: req.requestId
        });
      }

      next();
    } catch (error: any) {
      logger.error('Token refresh failed', {
        error: error.message,
        userId: req.user?.id,
        requestId: req.requestId
      });
      next(error);
    }
  };
}

export const authMiddleware = new AuthMiddleware();

