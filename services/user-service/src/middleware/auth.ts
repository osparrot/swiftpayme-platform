import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { UserRequest } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/Errors';
import { Logger } from '../utils/Logger';
import { UserRole } from '../enums/userEnums';

const logger = new Logger('AuthMiddleware');

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Find user and validate session
    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user can login
    if (!user.canLogin()) {
      throw new ForbiddenError('Account is not active');
    }

    // Find and validate session
    const session = user.sessions.find(s => 
      s.sessionToken === token && 
      s.isActive && 
      s.expiresAt > new Date()
    );

    if (!session) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    // Update session last accessed time
    session.lastAccessedAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: getUserPermissions(user.role),
      sessionId: session.id,
      tokenId: decoded.sessionId
    };

    logger.debug('User authenticated', { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      sessionId: session.id
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { 
      error: error.message,
      ip: req.clientIp,
      userAgent: req.userAgent
    });

    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Authentication token expired'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      next();
      return;
    }

    // Try to authenticate, but don't fail if token is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const user = await User.findOne({ id: decoded.userId });
    
    if (user && user.canLogin()) {
      const session = user.sessions.find(s => 
        s.sessionToken === token && 
        s.isActive && 
        s.expiresAt > new Date()
      );

      if (session) {
        session.lastAccessedAt = new Date();
        user.lastActiveAt = new Date();
        await user.save();

        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: getUserPermissions(user.role),
          sessionId: session.id,
          tokenId: decoded.sessionId
        };
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRole = req.user.role as UserRole;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!requiredRoles.includes(userRole)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles,
        endpoint: req.path
      });
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn('Access denied - missing permission', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        endpoint: req.path
      });
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const requireVerification = (req: UserRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  // This would require fetching the full user object to check verification status
  // For now, we'll assume verification is checked at the controller level
  next();
};

export const requireTwoFactor = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) {
      next(new UnauthorizedError('User not found'));
      return;
    }

    if (user.twoFactorEnabled) {
      const session = user.sessions.find(s => s.id === req.user!.sessionId);
      if (!session || !session.twoFactorVerified) {
        next(new ForbiddenError('Two-factor authentication required'));
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const apiKeyAuth = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      next(new UnauthorizedError('API key required'));
      return;
    }

    // Find user with this API key
    const user = await User.findOne({
      'apiKeys.key': apiKey,
      'apiKeys.isActive': true,
      'apiKeys.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      next(new UnauthorizedError('Invalid API key'));
      return;
    }

    const apiKeyObj = user.apiKeys.find(key => 
      key.key === apiKey && 
      key.isActive && 
      (!key.expiresAt || key.expiresAt > new Date())
    );

    if (!apiKeyObj) {
      next(new UnauthorizedError('Invalid or expired API key'));
      return;
    }

    // Check IP whitelist if configured
    if (apiKeyObj.ipWhitelist && apiKeyObj.ipWhitelist.length > 0) {
      const clientIp = req.clientIp || req.ip;
      if (!apiKeyObj.ipWhitelist.includes(clientIp)) {
        logger.warn('API key access denied - IP not whitelisted', {
          userId: user.id,
          apiKeyId: apiKeyObj.id,
          clientIp,
          whitelist: apiKeyObj.ipWhitelist
        });
        next(new ForbiddenError('IP address not authorized'));
        return;
      }
    }

    // Update API key usage
    apiKeyObj.lastUsedAt = new Date();
    apiKeyObj.usageCount += 1;
    await user.save();

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: apiKeyObj.permissions,
      sessionId: `apikey_${apiKeyObj.id}`
    };

    logger.debug('API key authenticated', { 
      userId: user.id,
      apiKeyId: apiKeyObj.id,
      permissions: apiKeyObj.permissions
    });

    next();
  } catch (error) {
    logger.warn('API key authentication failed', { 
      error: error.message,
      ip: req.clientIp,
      userAgent: req.userAgent
    });
    next(error);
  }
};

export const extractToken = (req: UserRequest): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const token = req.cookies?.token;
  if (token) {
    return token;
  }

  // Check query parameter (not recommended for production)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }

  return null;
};

export const getUserPermissions = (role: string): string[] => {
  const permissions: Record<string, string[]> = {
    [UserRole.USER]: [
      'user:read:own',
      'user:update:own',
      'user:delete:own',
      'session:read:own',
      'session:delete:own',
      'activity:read:own',
      'notification:read:own',
      'notification:update:own',
      'preference:read:own',
      'preference:update:own',
      'document:upload:own',
      'document:read:own',
      'apikey:create:own',
      'apikey:read:own',
      'apikey:delete:own'
    ],
    [UserRole.ADMIN]: [
      'user:read:all',
      'user:update:all',
      'user:delete:all',
      'user:suspend:all',
      'user:activate:all',
      'session:read:all',
      'session:delete:all',
      'activity:read:all',
      'notification:read:all',
      'notification:send:all',
      'document:read:all',
      'document:verify:all',
      'analytics:read:all',
      'audit:read:all',
      'system:manage:all'
    ],
    [UserRole.MODERATOR]: [
      'user:read:all',
      'user:update:limited',
      'user:suspend:all',
      'session:read:all',
      'session:delete:all',
      'activity:read:all',
      'document:read:all',
      'document:verify:all',
      'audit:read:limited'
    ],
    [UserRole.SUPPORT]: [
      'user:read:all',
      'user:update:limited',
      'session:read:all',
      'activity:read:all',
      'notification:send:all',
      'document:read:all'
    ],
    [UserRole.COMPLIANCE_OFFICER]: [
      'user:read:all',
      'document:read:all',
      'document:verify:all',
      'activity:read:all',
      'audit:read:all',
      'compliance:manage:all'
    ],
    [UserRole.FINANCIAL_ANALYST]: [
      'user:read:all',
      'activity:read:all',
      'analytics:read:all',
      'audit:read:limited'
    ],
    [UserRole.SYSTEM]: [
      'system:manage:all',
      'user:read:all',
      'user:update:all',
      'user:delete:all',
      'session:read:all',
      'session:delete:all',
      'activity:read:all',
      'notification:send:all',
      'audit:read:all'
    ]
  };

  return permissions[role] || permissions[UserRole.USER];
};

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  // Check for exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions
  const parts = requiredPermission.split(':');
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPermission = parts.slice(0, i).join(':') + ':*';
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requirePermission,
  requireVerification,
  requireTwoFactor,
  apiKeyAuth,
  extractToken,
  getUserPermissions,
  hasPermission
};

