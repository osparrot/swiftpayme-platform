/**
 * SwiftPayMe Admin Service - AdminUser Model
 * Comprehensive Mongoose model for administrative user management
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ==================== ENUMS ====================
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ASSET_VERIFIER = 'asset_verifier',
  COMPLIANCE_OFFICER = 'compliance_officer',
  CUSTOMER_SUPPORT = 'customer_support',
  FINANCIAL_ANALYST = 'financial_analyst',
  SYSTEM_MONITOR = 'system_monitor'
}

export enum AdminStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked'
}

export enum Permission {
  // User Management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_SUSPEND = 'user:suspend',
  
  // Asset Management
  ASSET_VIEW = 'asset:view',
  ASSET_VERIFY = 'asset:verify',
  ASSET_APPROVE = 'asset:approve',
  ASSET_REJECT = 'asset:reject',
  ASSET_VALUE = 'asset:value',
  
  // Financial Operations
  TRANSACTION_VIEW = 'transaction:view',
  TRANSACTION_REVERSE = 'transaction:reverse',
  BALANCE_ADJUST = 'balance:adjust',
  WITHDRAWAL_APPROVE = 'withdrawal:approve',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_MAINTENANCE = 'system:maintenance',
  
  // Compliance & Reporting
  COMPLIANCE_VIEW = 'compliance:view',
  COMPLIANCE_MANAGE = 'compliance:manage',
  REPORT_GENERATE = 'report:generate',
  AUDIT_VIEW = 'audit:view',
  
  // Admin Management
  ADMIN_CREATE = 'admin:create',
  ADMIN_UPDATE = 'admin:update',
  ADMIN_DELETE = 'admin:delete',
  ADMIN_PERMISSIONS = 'admin:permissions'
}

// ==================== INTERFACES ====================
export interface IAdminUser extends Document {
  adminId: string;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  permissions: Permission[];
  status: AdminStatus;
  department: string;
  employeeId?: string;
  phoneNumber?: string;
  
  // Security
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  
  // Session Management
  activeSessions: string[];
  maxSessions: number;
  
  // Audit Trail
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  addSession(sessionId: string): Promise<void>;
  removeSession(sessionId: string): Promise<void>;
  clearAllSessions(): Promise<void>;
}

// ==================== SCHEMA ====================
const AdminUserSchema = new Schema<IAdminUser>({
  adminId: {
    type: String,
    required: true,
    unique: true,
    default: () => `admin_${uuidv4()}`,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  role: {
    type: String,
    required: true,
    enum: Object.values(AdminRole),
    default: AdminRole.CUSTOMER_SUPPORT,
    index: true
  },
  permissions: [{
    type: String,
    enum: Object.values(Permission)
  }],
  status: {
    type: String,
    required: true,
    enum: Object.values(AdminStatus),
    default: AdminStatus.ACTIVE,
    index: true
  },
  department: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  
  // Security fields
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false
  },
  
  // Session Management
  activeSessions: [{
    type: String
  }],
  maxSessions: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  
  // Audit Trail
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'admin_users'
});

// ==================== INDEXES ====================
AdminUserSchema.index({ email: 1, status: 1 });
AdminUserSchema.index({ role: 1, status: 1 });
AdminUserSchema.index({ department: 1, status: 1 });
AdminUserSchema.index({ createdAt: -1 });
AdminUserSchema.index({ lastLogin: -1 });

// ==================== VIRTUALS ====================
AdminUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

AdminUserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// ==================== MIDDLEWARE ====================
// Hash password before saving
AdminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Set default permissions based on role
AdminUserSchema.pre('save', function(next) {
  if (!this.isModified('role')) return next();
  
  // Set default permissions based on role
  switch (this.role) {
    case AdminRole.SUPER_ADMIN:
      this.permissions = Object.values(Permission);
      break;
    case AdminRole.ADMIN:
      this.permissions = [
        Permission.USER_VIEW, Permission.USER_UPDATE, Permission.USER_SUSPEND,
        Permission.ASSET_VIEW, Permission.ASSET_VERIFY, Permission.ASSET_APPROVE,
        Permission.TRANSACTION_VIEW, Permission.SYSTEM_MONITOR,
        Permission.COMPLIANCE_VIEW, Permission.REPORT_GENERATE
      ];
      break;
    case AdminRole.ASSET_VERIFIER:
      this.permissions = [
        Permission.ASSET_VIEW, Permission.ASSET_VERIFY, Permission.ASSET_APPROVE,
        Permission.ASSET_REJECT, Permission.ASSET_VALUE
      ];
      break;
    case AdminRole.COMPLIANCE_OFFICER:
      this.permissions = [
        Permission.COMPLIANCE_VIEW, Permission.COMPLIANCE_MANAGE,
        Permission.AUDIT_VIEW, Permission.REPORT_GENERATE,
        Permission.USER_VIEW, Permission.TRANSACTION_VIEW
      ];
      break;
    case AdminRole.CUSTOMER_SUPPORT:
      this.permissions = [
        Permission.USER_VIEW, Permission.USER_UPDATE,
        Permission.TRANSACTION_VIEW, Permission.ASSET_VIEW
      ];
      break;
    case AdminRole.FINANCIAL_ANALYST:
      this.permissions = [
        Permission.TRANSACTION_VIEW, Permission.REPORT_GENERATE,
        Permission.ASSET_VIEW, Permission.USER_VIEW
      ];
      break;
    case AdminRole.SYSTEM_MONITOR:
      this.permissions = [
        Permission.SYSTEM_MONITOR, Permission.SYSTEM_CONFIG,
        Permission.REPORT_GENERATE, Permission.AUDIT_VIEW
      ];
      break;
  }
  
  next();
});

// ==================== METHODS ====================
AdminUserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

AdminUserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

AdminUserSchema.methods.incLoginAttempts = async function(): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

AdminUserSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

AdminUserSchema.methods.hasPermission = function(permission: Permission): boolean {
  return this.permissions.includes(permission);
};

AdminUserSchema.methods.hasAnyPermission = function(permissions: Permission[]): boolean {
  return permissions.some(permission => this.permissions.includes(permission));
};

AdminUserSchema.methods.addSession = async function(sessionId: string): Promise<void> {
  // Remove oldest session if at max capacity
  if (this.activeSessions.length >= this.maxSessions) {
    this.activeSessions.shift();
  }
  
  this.activeSessions.push(sessionId);
  return this.save();
};

AdminUserSchema.methods.removeSession = async function(sessionId: string): Promise<void> {
  this.activeSessions = this.activeSessions.filter(id => id !== sessionId);
  return this.save();
};

AdminUserSchema.methods.clearAllSessions = async function(): Promise<void> {
  this.activeSessions = [];
  return this.save();
};

// ==================== STATIC METHODS ====================
AdminUserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), status: { $ne: AdminStatus.INACTIVE } });
};

AdminUserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username, status: { $ne: AdminStatus.INACTIVE } });
};

AdminUserSchema.statics.findActiveAdmins = function() {
  return this.find({ status: AdminStatus.ACTIVE });
};

AdminUserSchema.statics.findByRole = function(role: AdminRole) {
  return this.find({ role, status: { $ne: AdminStatus.INACTIVE } });
};

// ==================== MODEL ====================
const AdminUser: Model<IAdminUser> = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

export default AdminUser;

