import { Logger } from '../utils/Logger';
import { RedisClient } from '../utils/RedisClient';
import { ServiceClient } from '../utils/ServiceClient';
import { AdminUser, AdminSession, AdminAuditLog, AdminPermission, AdminRole } from '../types/admin';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

export class AdminService {
  private logger: Logger;
  private redisClient: RedisClient;
  private serviceClient: ServiceClient;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('AdminService');
    this.redisClient = RedisClient.getInstance();
    this.serviceClient = new ServiceClient();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Admin Service');
      
      // Initialize default admin roles and permissions
      await this.initializeDefaultRoles();
      
      // Create default admin user if none exists
      await this.createDefaultAdminUser();
      
      this.isInitialized = true;
      this.logger.info('Admin Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Admin Service', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Admin Service');
    this.isInitialized = false;
    this.logger.info('Admin Service stopped');
  }

  public isInitialized(): boolean {
    return this.isInitialized;
  }

  // Admin Authentication
  public async authenticateAdmin(email: string, password: string, totpCode?: string): Promise<{ 
    success: boolean; 
    token?: string; 
    user?: AdminUser; 
    requiresMfa?: boolean;
    error?: string;
  }> {
    try {
      // Find admin user
      const adminUser = await this.findAdminByEmail(email);
      if (!adminUser) {
        await this.logAuditEvent('AUTH_FAILED', null, { email, reason: 'user_not_found' });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is active
      if (!adminUser.isActive) {
        await this.logAuditEvent('AUTH_FAILED', adminUser.id, { email, reason: 'account_inactive' });
        return { success: false, error: 'Account is inactive' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isPasswordValid) {
        await this.logAuditEvent('AUTH_FAILED', adminUser.id, { email, reason: 'invalid_password' });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check MFA if enabled
      if (adminUser.mfaEnabled) {
        if (!totpCode) {
          return { success: false, requiresMfa: true };
        }

        const isMfaValid = speakeasy.totp.verify({
          secret: adminUser.mfaSecret!,
          encoding: 'base32',
          token: totpCode,
          window: 2
        });

        if (!isMfaValid) {
          await this.logAuditEvent('AUTH_FAILED', adminUser.id, { email, reason: 'invalid_mfa' });
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Generate JWT token
      const token = this.generateAdminToken(adminUser);

      // Create session
      await this.createAdminSession(adminUser.id, token);

      // Update last login
      await this.updateLastLogin(adminUser.id);

      // Log successful authentication
      await this.logAuditEvent('AUTH_SUCCESS', adminUser.id, { email });

      this.logger.info('Admin authenticated successfully', { adminId: adminUser.id, email });

      return {
        success: true,
        token,
        user: this.sanitizeAdminUser(adminUser)
      };
    } catch (error) {
      this.logger.error('Admin authentication failed', { error, email });
      return { success: false, error: 'Authentication failed' };
    }
  }

  public async verifyAdminToken(token: string): Promise<AdminUser | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Check if session exists
      const session = await this.getAdminSession(decoded.sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      // Get admin user
      const adminUser = await this.findAdminById(decoded.adminId);
      if (!adminUser || !adminUser.isActive) {
        return null;
      }

      return this.sanitizeAdminUser(adminUser);
    } catch (error) {
      this.logger.error('Token verification failed', { error });
      return null;
    }
  }

  public async logoutAdmin(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Deactivate session
      await this.deactivateAdminSession(decoded.sessionId);
      
      // Log logout event
      await this.logAuditEvent('LOGOUT', decoded.adminId, {});

      this.logger.info('Admin logged out', { adminId: decoded.adminId });
      return true;
    } catch (error) {
      this.logger.error('Logout failed', { error });
      return false;
    }
  }

  // Admin User Management
  public async createAdminUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions?: string[];
  }): Promise<AdminUser> {
    try {
      // Check if admin already exists
      const existingAdmin = await this.findAdminByEmail(userData.email);
      if (existingAdmin) {
        throw new Error('Admin user already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create admin user
      const adminUser: AdminUser = {
        id: uuidv4(),
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        permissions: userData.permissions || [],
        isActive: true,
        mfaEnabled: false,
        mfaSecret: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database (this would be implemented with actual database operations)
      await this.saveAdminUser(adminUser);

      // Log creation event
      await this.logAuditEvent('ADMIN_CREATED', adminUser.id, { 
        email: userData.email, 
        role: userData.role 
      });

      this.logger.info('Admin user created', { adminId: adminUser.id, email: userData.email });

      return this.sanitizeAdminUser(adminUser);
    } catch (error) {
      this.logger.error('Failed to create admin user', { error, email: userData.email });
      throw error;
    }
  }

  public async updateAdminUser(adminId: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    try {
      const adminUser = await this.findAdminById(adminId);
      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // Apply updates
      const updatedAdmin = { ...adminUser, ...updates, updatedAt: new Date() };

      // Save to database
      await this.saveAdminUser(updatedAdmin);

      // Log update event
      await this.logAuditEvent('ADMIN_UPDATED', adminId, { updates });

      this.logger.info('Admin user updated', { adminId, updates });

      return this.sanitizeAdminUser(updatedAdmin);
    } catch (error) {
      this.logger.error('Failed to update admin user', { error, adminId });
      throw error;
    }
  }

  public async deleteAdminUser(adminId: string): Promise<boolean> {
    try {
      const adminUser = await this.findAdminById(adminId);
      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // Soft delete by deactivating
      await this.updateAdminUser(adminId, { isActive: false });

      // Deactivate all sessions
      await this.deactivateAllAdminSessions(adminId);

      // Log deletion event
      await this.logAuditEvent('ADMIN_DELETED', adminId, {});

      this.logger.info('Admin user deleted', { adminId });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete admin user', { error, adminId });
      throw error;
    }
  }

  // MFA Management
  public async enableMfa(adminId: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const adminUser = await this.findAdminById(adminId);
      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `SwiftPayMe Admin (${adminUser.email})`,
        issuer: 'SwiftPayMe'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Save secret (temporarily, until verified)
      await this.redisClient.setex(`mfa_setup:${adminId}`, 300, secret.base32); // 5 minutes

      this.logger.info('MFA setup initiated', { adminId });

      return {
        secret: secret.base32,
        qrCode
      };
    } catch (error) {
      this.logger.error('Failed to enable MFA', { error, adminId });
      throw error;
    }
  }

  public async verifyAndEnableMfa(adminId: string, totpCode: string): Promise<boolean> {
    try {
      // Get temporary secret
      const secret = await this.redisClient.get(`mfa_setup:${adminId}`);
      if (!secret) {
        throw new Error('MFA setup session expired');
      }

      // Verify TOTP code
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: totpCode,
        window: 2
      });

      if (!isValid) {
        throw new Error('Invalid MFA code');
      }

      // Enable MFA for user
      await this.updateAdminUser(adminId, {
        mfaEnabled: true,
        mfaSecret: secret
      });

      // Clean up temporary secret
      await this.redisClient.del(`mfa_setup:${adminId}`);

      // Log MFA enabled event
      await this.logAuditEvent('MFA_ENABLED', adminId, {});

      this.logger.info('MFA enabled for admin', { adminId });

      return true;
    } catch (error) {
      this.logger.error('Failed to verify and enable MFA', { error, adminId });
      throw error;
    }
  }

  public async disableMfa(adminId: string): Promise<boolean> {
    try {
      await this.updateAdminUser(adminId, {
        mfaEnabled: false,
        mfaSecret: null
      });

      // Log MFA disabled event
      await this.logAuditEvent('MFA_DISABLED', adminId, {});

      this.logger.info('MFA disabled for admin', { adminId });

      return true;
    } catch (error) {
      this.logger.error('Failed to disable MFA', { error, adminId });
      throw error;
    }
  }

  // Audit Logging
  public async logAuditEvent(
    action: string,
    adminId: string | null,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const auditLog: AdminAuditLog = {
        id: uuidv4(),
        adminId,
        action,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

      // Save to database
      await this.saveAuditLog(auditLog);

      // Cache recent audit logs
      await this.cacheAuditLog(auditLog);
    } catch (error) {
      this.logger.error('Failed to log audit event', { error, action, adminId });
    }
  }

  public async getAuditLogs(filters: {
    adminId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    try {
      // This would be implemented with actual database queries
      const logs = await this.queryAuditLogs(filters);
      const total = await this.countAuditLogs(filters);

      return { logs, total };
    } catch (error) {
      this.logger.error('Failed to get audit logs', { error, filters });
      throw error;
    }
  }

  public async cleanupOldAuditLogs(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90');
      const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

      // Delete old audit logs
      const deletedCount = await this.deleteOldAuditLogs(cutoffDate);

      this.logger.info('Old audit logs cleaned up', { deletedCount, cutoffDate });
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', { error });
    }
  }

  // Permission Management
  public async checkPermission(adminId: string, permission: string): Promise<boolean> {
    try {
      const adminUser = await this.findAdminById(adminId);
      if (!adminUser || !adminUser.isActive) {
        return false;
      }

      // Check if admin has the specific permission
      if (adminUser.permissions.includes(permission)) {
        return true;
      }

      // Check role-based permissions
      const role = await this.getAdminRole(adminUser.role);
      if (role && role.permissions.includes(permission)) {
        return true;
      }

      // Super admin has all permissions
      if (adminUser.role === 'super_admin') {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check permission', { error, adminId, permission });
      return false;
    }
  }

  public async getAdminPermissions(adminId: string): Promise<string[]> {
    try {
      const adminUser = await this.findAdminById(adminId);
      if (!adminUser || !adminUser.isActive) {
        return [];
      }

      let permissions = [...adminUser.permissions];

      // Add role-based permissions
      const role = await this.getAdminRole(adminUser.role);
      if (role) {
        permissions = [...permissions, ...role.permissions];
      }

      // Super admin has all permissions
      if (adminUser.role === 'super_admin') {
        permissions = await this.getAllPermissions();
      }

      // Remove duplicates
      return [...new Set(permissions)];
    } catch (error) {
      this.logger.error('Failed to get admin permissions', { error, adminId });
      return [];
    }
  }

  // Private helper methods
  private generateAdminToken(adminUser: AdminUser): string {
    const sessionId = uuidv4();
    
    return jwt.sign(
      {
        adminId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        sessionId
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        issuer: 'swiftpayme-admin',
        audience: 'swiftpayme-admin'
      }
    );
  }

  private sanitizeAdminUser(adminUser: AdminUser): AdminUser {
    const { passwordHash, mfaSecret, ...sanitized } = adminUser;
    return sanitized as AdminUser;
  }

  private async initializeDefaultRoles(): Promise<void> {
    // This would create default admin roles if they don't exist
    const defaultRoles = [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access',
        permissions: ['*']
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'General administrative access',
        permissions: [
          'users.read', 'users.write', 'users.delete',
          'assets.read', 'assets.verify', 'assets.approve',
          'transactions.read', 'transactions.manage',
          'reports.read', 'reports.generate',
          'system.monitor'
        ]
      },
      {
        id: 'asset_verifier',
        name: 'Asset Verifier',
        description: 'Asset verification specialist',
        permissions: [
          'assets.read', 'assets.verify', 'assets.approve',
          'users.read',
          'reports.read'
        ]
      },
      {
        id: 'compliance_officer',
        name: 'Compliance Officer',
        description: 'Compliance and risk management',
        permissions: [
          'users.read', 'users.kyc', 'users.suspend',
          'transactions.read', 'transactions.flag',
          'compliance.read', 'compliance.manage',
          'reports.read', 'reports.generate'
        ]
      },
      {
        id: 'support_agent',
        name: 'Support Agent',
        description: 'Customer support access',
        permissions: [
          'users.read', 'users.support',
          'transactions.read',
          'tickets.read', 'tickets.manage'
        ]
      }
    ];

    // Save default roles (implementation would depend on database)
    for (const role of defaultRoles) {
      await this.saveAdminRole(role);
    }
  }

  private async createDefaultAdminUser(): Promise<void> {
    // Check if any admin users exist
    const adminCount = await this.getAdminUserCount();
    
    if (adminCount === 0) {
      // Create default super admin
      const defaultAdmin = {
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@swiftpayme.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'SwiftPay2024!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin'
      };

      await this.createAdminUser(defaultAdmin);
      this.logger.info('Default admin user created', { email: defaultAdmin.email });
    }
  }

  // Database operation placeholders (would be implemented with actual database)
  private async findAdminByEmail(email: string): Promise<AdminUser | null> {
    // Implementation would query the database
    return null;
  }

  private async findAdminById(id: string): Promise<AdminUser | null> {
    // Implementation would query the database
    return null;
  }

  private async saveAdminUser(adminUser: AdminUser): Promise<void> {
    // Implementation would save to database
  }

  private async createAdminSession(adminId: string, token: string): Promise<void> {
    const session: AdminSession = {
      id: uuidv4(),
      adminId,
      token,
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    };

    // Cache session in Redis
    await this.redisClient.setex(`admin_session:${session.id}`, 28800, JSON.stringify(session));
  }

  private async getAdminSession(sessionId: string): Promise<AdminSession | null> {
    try {
      const sessionData = await this.redisClient.get(`admin_session:${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      return null;
    }
  }

  private async deactivateAdminSession(sessionId: string): Promise<void> {
    await this.redisClient.del(`admin_session:${sessionId}`);
  }

  private async deactivateAllAdminSessions(adminId: string): Promise<void> {
    // Implementation would find and deactivate all sessions for the admin
  }

  private async updateLastLogin(adminId: string): Promise<void> {
    await this.updateAdminUser(adminId, { lastLoginAt: new Date() });
  }

  private async saveAuditLog(auditLog: AdminAuditLog): Promise<void> {
    // Implementation would save to database
  }

  private async cacheAuditLog(auditLog: AdminAuditLog): Promise<void> {
    // Cache recent audit logs for quick access
    await this.redisClient.lpush('recent_audit_logs', JSON.stringify(auditLog));
    await this.redisClient.ltrim('recent_audit_logs', 0, 999); // Keep last 1000 logs
  }

  private async queryAuditLogs(filters: any): Promise<AdminAuditLog[]> {
    // Implementation would query the database with filters
    return [];
  }

  private async countAuditLogs(filters: any): Promise<number> {
    // Implementation would count matching audit logs
    return 0;
  }

  private async deleteOldAuditLogs(cutoffDate: Date): Promise<number> {
    // Implementation would delete old audit logs
    return 0;
  }

  private async getAdminRole(roleId: string): Promise<AdminRole | null> {
    // Implementation would get role from database
    return null;
  }

  private async saveAdminRole(role: AdminRole): Promise<void> {
    // Implementation would save role to database
  }

  private async getAllPermissions(): Promise<string[]> {
    // Implementation would return all available permissions
    return [];
  }

  private async getAdminUserCount(): Promise<number> {
    // Implementation would count admin users
    return 0;
  }
}

