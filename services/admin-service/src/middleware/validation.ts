import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('AdminValidationMiddleware');

/**
 * Generic validation middleware factory
 */
export const validationMiddleware = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessage = error.details
          .map(detail => detail.message)
          .join(', ');
        
        logger.warn('Validation failed', {
          property,
          errors: error.details,
          requestId: req.headers['x-request-id']
        });

        throw new ValidationError(errorMessage);
      }

      req[property] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Admin user creation schema
export const createAdminUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .max(255)
    .messages({
      'any.required': 'Email is required',
      'string.email': 'Email must be valid',
      'string.max': 'Email must not exceed 255 characters'
    }),
  
  password: Joi.string()
    .min(12)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 12 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  
  firstName: Joi.string()
    .required()
    .min(1)
    .max(50)
    .trim()
    .messages({
      'any.required': 'First name is required',
      'string.min': 'First name must be at least 1 character long',
      'string.max': 'First name must not exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .required()
    .min(1)
    .max(50)
    .trim()
    .messages({
      'any.required': 'Last name is required',
      'string.min': 'Last name must be at least 1 character long',
      'string.max': 'Last name must not exceed 50 characters'
    }),
  
  role: Joi.string()
    .valid('super_admin', 'admin', 'moderator', 'support', 'analyst', 'compliance_officer')
    .required()
    .messages({
      'any.required': 'Role is required',
      'any.only': 'Role must be one of: super_admin, admin, moderator, support, analyst, compliance_officer'
    }),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'user_management', 'asset_management', 'transaction_monitoring', 
      'system_configuration', 'audit_logs', 'compliance_management',
      'financial_reporting', 'security_management', 'api_management',
      'notification_management', 'backup_management', 'analytics_access'
    ))
    .unique()
    .optional()
    .messages({
      'array.unique': 'Permissions must be unique'
    }),
  
  department: Joi.string()
    .valid('operations', 'compliance', 'security', 'finance', 'customer_support', 'technology')
    .optional()
    .messages({
      'any.only': 'Department must be one of: operations, compliance, security, finance, customer_support, technology'
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  requirePasswordChange: Joi.boolean()
    .default(true),
  
  twoFactorEnabled: Joi.boolean()
    .default(true)
});

// Asset approval schema
export const assetApprovalSchema = Joi.object({
  assetId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'Asset ID is required',
      'string.pattern.base': 'Asset ID must be a valid MongoDB ObjectId'
    }),
  
  action: Joi.string()
    .valid('approve', 'reject', 'request_more_info', 'escalate')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be one of: approve, reject, request_more_info, escalate'
    }),
  
  reason: Joi.string()
    .max(1000)
    .trim()
    .when('action', {
      is: Joi.valid('reject', 'request_more_info'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Reason is required for rejection or information requests',
      'string.max': 'Reason must not exceed 1000 characters'
    }),
  
  appraisedValue: Joi.number()
    .positive()
    .precision(2)
    .when('action', {
      is: 'approve',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Appraised value is required for approval',
      'number.positive': 'Appraised value must be positive',
      'number.precision': 'Appraised value precision cannot exceed 2 decimal places'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP')
    .when('action', {
      is: 'approve',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Currency is required for approval',
      'any.only': 'Currency must be one of: USD, EUR, GBP'
    }),
  
  notes: Joi.string()
    .max(2000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    }),
  
  escalateTo: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .when('action', {
      is: 'escalate',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Escalation target is required when escalating',
      'string.pattern.base': 'Escalation target must be a valid MongoDB ObjectId'
    })
});

// User management schema
export const userManagementSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'User ID is required',
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  action: Joi.string()
    .valid('activate', 'deactivate', 'suspend', 'verify', 'flag', 'unflag', 'reset_password')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be one of: activate, deactivate, suspend, verify, flag, unflag, reset_password'
    }),
  
  reason: Joi.string()
    .max(1000)
    .trim()
    .when('action', {
      is: Joi.valid('deactivate', 'suspend', 'flag'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Reason is required for deactivation, suspension, or flagging',
      'string.max': 'Reason must not exceed 1000 characters'
    }),
  
  duration: Joi.number()
    .integer()
    .positive()
    .when('action', {
      is: 'suspend',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.integer': 'Duration must be an integer',
      'number.positive': 'Duration must be positive',
      'any.unknown': 'Duration is only allowed for suspension actions'
    }),
  
  notifyUser: Joi.boolean()
    .default(true)
});

// System configuration schema
export const systemConfigSchema = Joi.object({
  category: Joi.string()
    .valid('security', 'limits', 'fees', 'notifications', 'integrations', 'compliance')
    .required()
    .messages({
      'any.required': 'Configuration category is required',
      'any.only': 'Category must be one of: security, limits, fees, notifications, integrations, compliance'
    }),
  
  key: Joi.string()
    .required()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_.-]+$/)
    .messages({
      'any.required': 'Configuration key is required',
      'string.min': 'Key must be at least 1 character long',
      'string.max': 'Key must not exceed 100 characters',
      'string.pattern.base': 'Key can only contain letters, numbers, underscores, dots, and hyphens'
    }),
  
  value: Joi.alternatives()
    .try(
      Joi.string().max(10000),
      Joi.number(),
      Joi.boolean(),
      Joi.object(),
      Joi.array()
    )
    .required()
    .messages({
      'any.required': 'Configuration value is required'
    }),
  
  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  isPublic: Joi.boolean()
    .default(false),
  
  requiresRestart: Joi.boolean()
    .default(false)
});

// Transaction monitoring schema
export const transactionMonitoringSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'Transaction ID is required',
      'string.pattern.base': 'Transaction ID must be a valid MongoDB ObjectId'
    }),
  
  action: Joi.string()
    .valid('flag', 'unflag', 'investigate', 'approve', 'block', 'reverse')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be one of: flag, unflag, investigate, approve, block, reverse'
    }),
  
  flagType: Joi.string()
    .valid('suspicious', 'high_value', 'unusual_pattern', 'compliance_check', 'fraud_alert')
    .when('action', {
      is: 'flag',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Flag type is required when flagging',
      'any.only': 'Flag type must be one of: suspicious, high_value, unusual_pattern, compliance_check, fraud_alert'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, critical'
    }),
  
  notes: Joi.string()
    .max(2000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    }),
  
  assignTo: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Assign to must be a valid MongoDB ObjectId'
    })
});

// Audit log query schema
export const auditLogQuerySchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
  
  userId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  adminId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Admin ID must be a valid MongoDB ObjectId'
    }),
  
  action: Joi.string()
    .optional(),
  
  category: Joi.string()
    .valid('user_management', 'asset_management', 'transaction_monitoring', 'system_configuration')
    .optional()
    .messages({
      'any.only': 'Category must be one of: user_management, asset_management, transaction_monitoring, system_configuration'
    }),
  
  severity: Joi.string()
    .valid('info', 'warning', 'error', 'critical')
    .optional()
    .messages({
      'any.only': 'Severity must be one of: info, warning, error, critical'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    })
});

// Report generation schema
export const reportGenerationSchema = Joi.object({
  type: Joi.string()
    .valid('user_activity', 'transaction_summary', 'asset_valuation', 'compliance_report', 'financial_summary')
    .required()
    .messages({
      'any.required': 'Report type is required',
      'any.only': 'Report type must be one of: user_activity, transaction_summary, asset_valuation, compliance_report, financial_summary'
    }),
  
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start date is required',
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .max('now')
    .required()
    .messages({
      'any.required': 'End date is required',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
      'date.max': 'End date cannot be in the future'
    }),
  
  format: Joi.string()
    .valid('pdf', 'csv', 'xlsx', 'json')
    .default('pdf')
    .messages({
      'any.only': 'Format must be one of: pdf, csv, xlsx, json'
    }),
  
  filters: Joi.object({
    userIds: Joi.array().items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/)).optional(),
    transactionTypes: Joi.array().items(Joi.string()).optional(),
    assetTypes: Joi.array().items(Joi.string()).optional(),
    currencies: Joi.array().items(Joi.string()).optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional()
  }).optional(),
  
  includeCharts: Joi.boolean()
    .default(true),
  
  includeDetails: Joi.boolean()
    .default(true)
});

/**
 * Validate admin permissions
 */
export const validateAdminPermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const adminUser = req.user;
      
      if (!adminUser) {
        throw new ValidationError('Admin authentication required');
      }

      if (!adminUser.permissions || !Array.isArray(adminUser.permissions)) {
        throw new ValidationError('Admin permissions not found');
      }

      const hasPermission = requiredPermissions.every(permission => 
        adminUser.permissions.includes(permission) || adminUser.role === 'super_admin'
      );

      if (!hasPermission) {
        throw new ValidationError(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate admin role hierarchy
 */
export const validateRoleHierarchy = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const adminUser = req.user;
    const { role: targetRole } = req.body;

    if (!adminUser || !targetRole) {
      return next();
    }

    const roleHierarchy = {
      'super_admin': 6,
      'admin': 5,
      'moderator': 4,
      'compliance_officer': 3,
      'analyst': 2,
      'support': 1
    };

    const adminLevel = roleHierarchy[adminUser.role as keyof typeof roleHierarchy] || 0;
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0;

    if (adminLevel <= targetLevel && adminUser.role !== 'super_admin') {
      throw new ValidationError('Cannot assign a role equal to or higher than your own');
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default {
  validationMiddleware,
  validateAdminPermissions,
  validateRoleHierarchy,
  createAdminUserSchema,
  assetApprovalSchema,
  userManagementSchema,
  systemConfigSchema,
  transactionMonitoringSchema,
  auditLogQuerySchema,
  reportGenerationSchema
};
