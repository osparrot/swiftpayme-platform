import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';
import { ApiGatewayContracts } from '../../shared/contracts/service-contracts';

const logger = new Logger('AuthMiddleware');

// Redis client for token blacklist and session management
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_AUTH_DB || '1')
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'swiftpayme-api-gateway';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'swiftpayme-services';

// API Key configuration
const API_KEY_PREFIX = 'sp_';
const API_KEY_LENGTH = 32;

export interface AuthenticatedRequest extends Request {
  user?: ApiGatewayContracts.AuthContext;
  requestId: string;
  correlationId?: string;
}

export interface TokenPayload {
  userId?: string;
  adminId?: string;
  email: string;
  role?: string;
  permissions?: string[];
  type: 'user' | 'admin';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string; // JWT ID for token tracking
}

export interface ApiKeyData {
  id: string;
  name: string;
  permissions: string[];
  rateLimits?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

// Authentication utilities
export class AuthUtils {
  // Generate JWT token
  static generateToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): string {
    const jti = `${payload.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tokenPayload: TokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiration(JWT_EXPIRES_IN),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      jti
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: 'HS256'
    });
  }

  // Generate refresh token
  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): string {
    const jti = `refresh_${payload.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tokenPayload: TokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiration(JWT_REFRESH_EXPIRES_IN),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      jti
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: 'HS256'
    });
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithms: ['HS256']
      }) as TokenPayload;

      // Update last used timestamp for tracking
      await redis.setex(`token:${decoded.jti}`, 3600, JSON.stringify({
        lastUsed: new Date().toISOString(),
        userId: decoded.userId,
        adminId: decoded.adminId,
        type: decoded.type
      }));

      return decoded;
    } catch (error) {
      logger.warn('Token verification failed', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  // Blacklist token (for logout)
  static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.setex(`blacklist:${token}`, ttl, 'true');
        }
      }
    } catch (error) {
      logger.error('Failed to blacklist token', { error });
    }
  }

  // Generate API key
  static generateApiKey(): string {
    const randomBytes = Array.from({ length: API_KEY_LENGTH }, () => 
      Math.floor(Math.random() * 36).toString(36)
    ).join('');
    
    return `${API_KEY_PREFIX}${randomBytes}`;
  }

  // Hash API key for storage
  static async hashApiKey(apiKey: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(apiKey, salt);
  }

  // Verify API key
  static async verifyApiKey(apiKey: string, hashedKey: string): Promise<boolean> {
    return bcrypt.compare(apiKey, hashedKey);
  }

  // Store API key data
  static async storeApiKeyData(apiKey: string, data: ApiKeyData): Promise<void> {
    const hashedKey = await this.hashApiKey(apiKey);
    
    await redis.hset('api_keys', hashedKey, JSON.stringify({
      ...data,
      hashedKey
    }));
  }

  // Get API key data
  static async getApiKeyData(apiKey: string): Promise<ApiKeyData | null> {
    try {
      const allKeys = await redis.hgetall('api_keys');
      
      for (const [hashedKey, dataStr] of Object.entries(allKeys)) {
        const isValid = await this.verifyApiKey(apiKey, hashedKey);
        if (isValid) {
          const data = JSON.parse(dataStr) as ApiKeyData;
          
          // Check if key is active and not expired
          if (!data.isActive) {
            return null;
          }
          
          if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return null;
          }

          // Update last used timestamp
          data.lastUsedAt = new Date();
          await redis.hset('api_keys', hashedKey, JSON.stringify(data));
          
          return data;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get API key data', { error });
      return null;
    }
  }

  // Parse expiration string to seconds
  private static parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error('Invalid expiration unit');
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate secure random string
  static generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// JWT Authentication middleware
export function jwtAuthMiddleware(requiredRoles?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        const decoded = await AuthUtils.verifyToken(token);
        
        // Create auth context
        req.user = {
          userId: decoded.userId,
          adminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          type: decoded.type
        };

        // Check role requirements
        if (requiredRoles && requiredRoles.length > 0) {
          if (!decoded.role || !requiredRoles.includes(decoded.role)) {
            logger.warn('Insufficient permissions', {
              requestId: req.requestId,
              userId: decoded.userId,
              adminId: decoded.adminId,
              userRole: decoded.role,
              requiredRoles
            });

            return res.status(403).json({
              success: false,
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Insufficient permissions to access this resource'
              },
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            });
          }
        }

        logger.debug('JWT authentication successful', {
          requestId: req.requestId,
          userId: decoded.userId,
          adminId: decoded.adminId,
          type: decoded.type,
          role: decoded.role
        });

        next();

      } catch (tokenError) {
        logger.warn('JWT token verification failed', {
          requestId: req.requestId,
          error: tokenError.message
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('JWT authentication middleware error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_MIDDLEWARE_ERROR',
          message: 'Authentication error'
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// API Key authentication middleware
export function apiKeyAuthMiddleware(requiredPermissions?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      const apiKeyData = await AuthUtils.getApiKeyData(apiKey);
      
      if (!apiKeyData) {
        logger.warn('Invalid API key used', {
          requestId: req.requestId,
          apiKeyPrefix: apiKey.substring(0, 8) + '...'
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Check permission requirements
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(permission => 
          apiKeyData.permissions.includes(permission) || 
          apiKeyData.permissions.includes('*')
        );

        if (!hasPermission) {
          logger.warn('API key insufficient permissions', {
            requestId: req.requestId,
            apiKeyId: apiKeyData.id,
            apiKeyPermissions: apiKeyData.permissions,
            requiredPermissions
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_API_PERMISSIONS',
              message: 'API key does not have required permissions'
            },
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Create auth context for API key
      req.user = {
        email: `api-key-${apiKeyData.id}`,
        permissions: apiKeyData.permissions,
        type: 'admin' // API keys are considered admin-level access
      };

      // Store API key info for rate limiting
      (req as any).apiKey = {
        id: apiKeyData.id,
        name: apiKeyData.name,
        rateLimits: apiKeyData.rateLimits
      };

      logger.debug('API key authentication successful', {
        requestId: req.requestId,
        apiKeyId: apiKeyData.id,
        apiKeyName: apiKeyData.name,
        permissions: apiKeyData.permissions
      });

      next();

    } catch (error) {
      logger.error('API key authentication middleware error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'API_AUTH_MIDDLEWARE_ERROR',
          message: 'API authentication error'
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Combined authentication middleware (JWT or API Key)
export function authMiddleware(requiredRoles?: string[], requiredPermissions?: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    // Try JWT authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return jwtAuthMiddleware(requiredRoles)(req, res, next);
    }

    // Try API key authentication
    if (apiKey) {
      return apiKeyAuthMiddleware(requiredPermissions)(req, res, next);
    }

    // No authentication provided
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required. Provide either Bearer token or API key.'
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  };
}

// Optional authentication middleware (for public endpoints that can benefit from auth)
export function optionalAuthMiddleware() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    // If no auth provided, continue without user context
    if (!authHeader && !apiKey) {
      return next();
    }

    // Try to authenticate but don't fail if invalid
    try {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = await AuthUtils.verifyToken(token);
        
        req.user = {
          userId: decoded.userId,
          adminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          type: decoded.type
        };
      } else if (apiKey) {
        const apiKeyData = await AuthUtils.getApiKeyData(apiKey);
        
        if (apiKeyData) {
          req.user = {
            email: `api-key-${apiKeyData.id}`,
            permissions: apiKeyData.permissions,
            type: 'admin'
          };
        }
      }
    } catch (error) {
      // Log but don't fail - this is optional auth
      logger.debug('Optional authentication failed', {
        requestId: req.requestId,
        error: error.message
      });
    }

    next();
  };
}

// Permission checking utility
export function hasPermission(user: ApiGatewayContracts.AuthContext, permission: string): boolean {
  if (!user.permissions) {
    return false;
  }

  return user.permissions.includes(permission) || user.permissions.includes('*');
}

// Role checking utility
export function hasRole(user: ApiGatewayContracts.AuthContext, role: string): boolean {
  return user.role === role;
}

// Admin role checking utility
export function isAdmin(user: ApiGatewayContracts.AuthContext): boolean {
  return user.type === 'admin' && user.role && ['admin', 'super_admin'].includes(user.role);
}

// Super admin checking utility
export function isSuperAdmin(user: ApiGatewayContracts.AuthContext): boolean {
  return user.type === 'admin' && user.role === 'super_admin';
}

// Export authentication utilities and middleware
export {
  AuthUtils,
  TokenPayload,
  ApiKeyData,
  AuthenticatedRequest
};

