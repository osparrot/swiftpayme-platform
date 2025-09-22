/**
 * SwiftPayMe Payment Service - Authentication Middleware
 * JWT-based authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

const logger = new Logger('AuthMiddleware');

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      correlationId?: string;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = decoded;

    // Generate correlation ID for request tracking
    req.correlationId = req.headers['x-correlation-id'] as string || 
                       `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      logger.logSecurityEvent('permission_denied', req.user.userId, req.ip, req.correlationId);
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      logger.logSecurityEvent('role_access_denied', req.user.userId, req.ip, req.correlationId);
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient role privileges'
      });
    }

    next();
  };
};

export default authMiddleware;

