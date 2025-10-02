import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

const logger = new Logger('AnalyticsAuthMiddleware');

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Authentication middleware for analytics service
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      // Log analytics access
      logger.info('Analytics access', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', {
        error: jwtError.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Admin role middleware
 */
export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      logger.warn('Unauthorized admin access attempt', {
        userId: req.user.id,
        role: req.user.role,
        endpoint: req.path,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization error'
    });
  }
};

/**
 * Permission-based middleware
 */
export const permissionMiddleware = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const hasPermission = req.user.permissions.includes(requiredPermission) ||
                           req.user.permissions.includes('analytics:all') ||
                           req.user.role === 'admin' ||
                           req.user.role === 'super_admin';

      if (!hasPermission) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          role: req.user.role,
          requiredPermission,
          userPermissions: req.user.permissions,
          endpoint: req.path,
          ip: req.ip
        });

        res.status(403).json({
          success: false,
          error: `Permission required: ${requiredPermission}`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error'
      });
    }
  };
};

/**
 * Rate limiting middleware for analytics endpoints
 */
export const analyticsRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const identifier = req.user?.id || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < windowStart) {
          requests.delete(key);
        }
      }

      const userRequests = requests.get(identifier);

      if (!userRequests) {
        requests.set(identifier, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (userRequests.resetTime < now) {
        // Reset window
        requests.set(identifier, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (userRequests.count >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          identifier,
          count: userRequests.count,
          maxRequests,
          endpoint: req.path,
          ip: req.ip
        });

        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
        });
        return;
      }

      userRequests.count++;
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
};

/**
 * Data access control middleware
 */
export const dataAccessMiddleware = (dataType: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Admin and super admin have access to all data
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        next();
        return;
      }

      // Check specific data access permissions
      const hasDataAccess = req.user.permissions.includes(`analytics:${dataType}`) ||
                           req.user.permissions.includes('analytics:all_data');

      if (!hasDataAccess) {
        logger.warn('Data access denied', {
          userId: req.user.id,
          role: req.user.role,
          dataType,
          endpoint: req.path,
          ip: req.ip
        });

        res.status(403).json({
          success: false,
          error: `Access denied to ${dataType} data`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Data access middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Data access control error'
      });
    }
  };
};

export default {
  authMiddleware,
  adminMiddleware,
  permissionMiddleware,
  analyticsRateLimit,
  dataAccessMiddleware
};
