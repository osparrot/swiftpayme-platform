import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';
import { AuthenticationError, AuthorizationError } from '../utils/Errors';

interface IUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  accountType: string;
  isActive: boolean;
  lastLogin?: Date;
}

interface IAuthenticatedRequest extends Request {
  user?: IUser;
  token?: string;
}

export class AuthMiddleware {
  private logger: Logger;
  private jwtSecret: string;

  constructor() {
    this.logger = new Logger('AuthMiddleware');
    this.jwtSecret = process.env.JWT_SECRET || 'swiftpay-tokenization-secret';
  }

  /**
   * Verify JWT token and extract user information
   */
  authenticate = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        throw new AuthenticationError('No authentication token provided');
      }

      const decoded = this.verifyToken(token);
      const user = await this.getUserFromToken(decoded);

      if (!user.isActive) {
        throw new AuthenticationError('User account is inactive');
      }

      req.user = user;
      req.token = token;

      this.logger.info('User authenticated successfully', {
        userId: user.userId,
        role: user.role,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      this.logger.error('Authentication failed', {
        error: error.message,
        requestId: req.headers['x-request-id'],
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next(error);
    }
  };

  /**
   * Check if user has required role
   */
  requireRole = (requiredRole: string) => {
    return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }

        if (req.user.role !== requiredRole && req.user.role !== 'admin') {
          throw new AuthorizationError(`Required role: ${requiredRole}`);
        }

        next();
      } catch (error) {
        this.logger.error('Role authorization failed', {
          userId: req.user?.userId,
          userRole: req.user?.role,
          requiredRole,
          requestId: req.headers['x-request-id']
        });
        next(error);
      }
    };
  };

  /**
   * Check if user has required permission
   */
  requirePermission = (requiredPermission: string) => {
    return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }

        if (!req.user.permissions.includes(requiredPermission) && req.user.role !== 'admin') {
          throw new AuthorizationError(`Required permission: ${requiredPermission}`);
        }

        next();
      } catch (error) {
        this.logger.error('Permission authorization failed', {
          userId: req.user?.userId,
          userPermissions: req.user?.permissions,
          requiredPermission,
          requestId: req.headers['x-request-id']
        });
        next(error);
      }
    };
  };

  /**
   * Check if user has any of the required permissions
   */
  requireAnyPermission = (requiredPermissions: string[]) => {
    return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }

        const hasPermission = requiredPermissions.some(permission => 
          req.user!.permissions.includes(permission)
        );

        if (!hasPermission && req.user.role !== 'admin') {
          throw new AuthorizationError(`Required one of permissions: ${requiredPermissions.join(', ')}`);
        }

        next();
      } catch (error) {
        this.logger.error('Permission authorization failed', {
          userId: req.user?.userId,
          userPermissions: req.user?.permissions,
          requiredPermissions,
          requestId: req.headers['x-request-id']
        });
        next(error);
      }
    };
  };

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  optionalAuth = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = this.verifyToken(token);
        const user = await this.getUserFromToken(decoded);
        
        if (user.isActive) {
          req.user = user;
          req.token = token;
        }
      }

      next();
    } catch (error) {
      // Log but don't fail for optional auth
      this.logger.warn('Optional authentication failed', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });
      next();
    }
  };

  /**
   * Check if user can access resource (owns it or has admin role)
   */
  requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
    return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }

        const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
        
        if (req.user.role === 'admin' || req.user.userId === resourceUserId) {
          next();
        } else {
          throw new AuthorizationError('Access denied: insufficient permissions');
        }
      } catch (error) {
        this.logger.error('Ownership authorization failed', {
          userId: req.user?.userId,
          resourceUserId: req.params[userIdParam] || req.body[userIdParam],
          requestId: req.headers['x-request-id']
        });
        next(error);
      }
    };
  };

  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Check cookie
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  private verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  }

  private async getUserFromToken(decoded: any): Promise<IUser> {
    // In a real implementation, this would fetch user data from database
    // For now, we'll use the decoded token data
    return {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || [],
      accountType: decoded.accountType || 'individual',
      isActive: decoded.isActive !== false,
      lastLogin: decoded.lastLogin ? new Date(decoded.lastLogin) : undefined
    };
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: Partial<IUser>, expiresIn: string = '24h'): string {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      accountType: user.accountType,
      isActive: user.isActive,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  /**
   * Refresh token
   */
  refreshToken(token: string): string {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
      
      // Remove timing-related fields
      delete decoded.iat;
      delete decoded.exp;
      delete decoded.nbf;

      return jwt.sign(decoded, this.jwtSecret, { expiresIn: '24h' });
    } catch (error) {
      throw new AuthenticationError('Token refresh failed');
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
export const authenticate = authMiddleware.authenticate;
export const requireRole = authMiddleware.requireRole;
export const requirePermission = authMiddleware.requirePermission;
export const requireAnyPermission = authMiddleware.requireAnyPermission;
export const optionalAuth = authMiddleware.optionalAuth;
export const requireOwnershipOrAdmin = authMiddleware.requireOwnershipOrAdmin;

// Export default as the authenticate function
export default authenticate;

// Export the class for testing
export { AuthMiddleware };

