import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { UserRequest } from '../types';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('ValidationMiddleware');

// Validation schemas
const validationSchemas = {
  userRegistration: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    firstName: Joi.string().required().min(1).max(50).trim(),
    lastName: Joi.string().required().min(1).max(50).trim(),
    phone: Joi.string().optional().pattern(/^\+?[1-9]\d{1,14}$/).message('Invalid phone number format'),
    dateOfBirth: Joi.date().optional().max('now').min('1900-01-01'),
    accountType: Joi.string().optional().valid('personal', 'business', 'premium', 'enterprise'),
    referralCode: Joi.string().optional().alphanum().min(6).max(12),
    termsAccepted: Joi.boolean().required().valid(true),
    privacyPolicyAccepted: Joi.boolean().required().valid(true),
    marketingOptIn: Joi.boolean().optional(),
    dataProcessingConsent: Joi.boolean().required().valid(true),
    metadata: Joi.object().optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().required().max(128),
    twoFactorCode: Joi.string().optional().length(6).pattern(/^\d{6}$/),
    rememberDevice: Joi.boolean().optional(),
    deviceInfo: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  userUpdate: Joi.object({
    firstName: Joi.string().optional().min(1).max(50).trim(),
    lastName: Joi.string().optional().min(1).max(50).trim(),
    middleName: Joi.string().optional().allow('').max(50).trim(),
    displayName: Joi.string().optional().allow('').max(100).trim(),
    phone: Joi.string().optional().pattern(/^\+?[1-9]\d{1,14}$/).message('Invalid phone number format'),
    dateOfBirth: Joi.date().optional().max('now').min('1900-01-01'),
    gender: Joi.string().optional().valid('male', 'female', 'other', 'prefer_not_to_say'),
    nationality: Joi.string().optional().max(100).trim(),
    maritalStatus: Joi.string().optional().valid('single', 'married', 'divorced', 'widowed', 'separated', 'domestic_partnership', 'prefer_not_to_say'),
    employmentStatus: Joi.string().optional().valid('employed', 'unemployed', 'self_employed', 'student', 'retired', 'disabled', 'homemaker', 'other'),
    incomeRange: Joi.string().optional().valid('under_25k', '25k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k', 'prefer_not_to_say'),
    occupation: Joi.string().optional().allow('').max(100).trim(),
    employer: Joi.string().optional().allow('').max(100).trim(),
    bio: Joi.string().optional().allow('').max(500).trim(),
    website: Joi.string().optional().allow('').uri().max(255),
    socialLinks: Joi.object({
      facebook: Joi.string().optional().allow('').uri(),
      twitter: Joi.string().optional().allow('').uri(),
      linkedin: Joi.string().optional().allow('').uri(),
      instagram: Joi.string().optional().allow('').uri(),
      github: Joi.string().optional().allow('').uri(),
      youtube: Joi.string().optional().allow('').uri(),
      tiktok: Joi.string().optional().allow('').uri(),
      discord: Joi.string().optional().allow('').max(100),
      telegram: Joi.string().optional().allow('').max(100),
      whatsapp: Joi.string().optional().allow('').pattern(/^\+?[1-9]\d{1,14}$/)
    }).optional(),
    emergencyContact: Joi.object({
      firstName: Joi.string().required().min(1).max(50).trim(),
      lastName: Joi.string().required().min(1).max(50).trim(),
      relationship: Joi.string().required().min(1).max(50).trim(),
      phone: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/),
      email: Joi.string().optional().email().max(255),
      address: Joi.string().optional().allow('').max(500).trim()
    }).optional(),
    metadata: Joi.object().optional()
  }),

  passwordChange: Joi.object({
    currentPassword: Joi.string().required().max(128),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
      'any.only': 'Passwords do not match'
    }),
    logoutAllSessions: Joi.boolean().optional()
  }),

  passwordResetRequest: Joi.object({
    email: Joi.string().email().required().max(255),
    resetUrl: Joi.string().optional().uri()
  }),

  passwordResetConfirm: Joi.object({
    token: Joi.string().required().guid({ version: 'uuidv4' }),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
      'any.only': 'Passwords do not match'
    })
  }),

  emailVerification: Joi.object({
    token: Joi.string().required().guid({ version: 'uuidv4' })
  }),

  phoneVerification: Joi.object({
    phone: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/),
    code: Joi.string().required().length(6).pattern(/^\d{6}$/)
  }),

  twoFactorSetup: Joi.object({
    method: Joi.string().required().valid('sms', 'email', 'totp'),
    phone: Joi.string().optional().pattern(/^\+?[1-9]\d{1,14}$/),
    email: Joi.string().optional().email().max(255)
  }),

  twoFactorVerify: Joi.object({
    code: Joi.string().required().length(6).pattern(/^\d{6}$/),
    backupCode: Joi.string().optional().alphanum().length(8)
  }),

  addressRequest: Joi.object({
    type: Joi.string().required().valid('home', 'work', 'billing', 'shipping', 'other'),
    label: Joi.string().optional().allow('').max(50).trim(),
    street: Joi.string().required().min(1).max(255).trim(),
    street2: Joi.string().optional().allow('').max(255).trim(),
    city: Joi.string().required().min(1).max(100).trim(),
    state: Joi.string().optional().allow('').max(100).trim(),
    postalCode: Joi.string().required().min(1).max(20).trim(),
    country: Joi.string().required().length(2).uppercase(),
    isDefault: Joi.boolean().optional()
  }),

  phoneRequest: Joi.object({
    type: Joi.string().required().valid('mobile', 'home', 'work', 'fax', 'other'),
    label: Joi.string().optional().allow('').max(50).trim(),
    number: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/),
    countryCode: Joi.string().required().pattern(/^\+\d{1,4}$/),
    extension: Joi.string().optional().allow('').pattern(/^\d{1,10}$/),
    isDefault: Joi.boolean().optional()
  }),

  documentUpload: Joi.object({
    type: Joi.string().required().valid(
      'passport', 'drivers_license', 'national_id', 'utility_bill', 
      'bank_statement', 'proof_of_address', 'proof_of_income', 
      'business_registration', 'tax_document', 'other'
    ),
    description: Joi.string().optional().allow('').max(500).trim(),
    expiresAt: Joi.date().optional().min('now')
  }),

  preferencesUpdate: Joi.object({
    category: Joi.string().required().valid(
      'notifications', 'security', 'privacy', 'communication', 
      'marketing', 'display', 'language', 'timezone', 'currency', 'theme'
    ),
    preferences: Joi.object().required()
  }),

  apiKeyCreate: Joi.object({
    name: Joi.string().required().min(1).max(100).trim(),
    description: Joi.string().optional().allow('').max(500).trim(),
    permissions: Joi.array().items(Joi.string()).min(1).required(),
    scopes: Joi.array().items(Joi.string()).min(1).required(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional(),
    rateLimit: Joi.object({
      requestsPerMinute: Joi.number().integer().min(1).max(1000),
      requestsPerHour: Joi.number().integer().min(1).max(10000),
      requestsPerDay: Joi.number().integer().min(1).max(100000)
    }).optional(),
    expiresAt: Joi.date().optional().min('now')
  }),

  userSearch: Joi.object({
    query: Joi.string().optional().allow('').max(255).trim(),
    status: Joi.string().optional().valid('active', 'inactive', 'suspended', 'pending_verification', 'blocked', 'deleted'),
    role: Joi.string().optional().valid('user', 'admin', 'moderator', 'support', 'compliance_officer', 'financial_analyst', 'system'),
    accountType: Joi.string().optional().valid('personal', 'business', 'premium', 'enterprise'),
    verificationStatus: Joi.string().optional().valid('unverified', 'pending', 'verified', 'rejected', 'expired'),
    createdAfter: Joi.date().optional(),
    createdBefore: Joi.date().optional(),
    lastLoginAfter: Joi.date().optional(),
    lastLoginBefore: Joi.date().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional().valid('createdAt', 'updatedAt', 'lastLoginAt', 'email', 'firstName', 'lastName'),
    sortOrder: Joi.string().optional().valid('asc', 'desc')
  }),

  userBulkAction: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
    action: Joi.string().required().valid('suspend', 'activate', 'delete', 'verify', 'unverify'),
    reason: Joi.string().optional().allow('').max(500).trim(),
    notifyUsers: Joi.boolean().optional()
  }),

  userAudit: Joi.object({
    userId: Joi.string().optional(),
    eventType: Joi.string().optional().valid(
      'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_logout',
      'password_changed', 'email_changed', 'phone_changed', 'profile_updated',
      'document_uploaded', 'document_verified', 'verification_status_changed',
      'account_status_changed', 'security_settings_changed', 'privacy_settings_changed',
      'notification_settings_changed', 'two_factor_enabled', 'two_factor_disabled',
      'session_created', 'session_terminated', 'failed_login_attempt',
      'suspicious_activity_detected', 'api_key_generated', 'api_key_revoked',
      'admin_action', 'system_event'
    ),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional().min(Joi.ref('startDate')),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
  })
};

// Validation middleware factory
export const validationMiddleware = (schemaName: keyof typeof validationSchemas) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    const schema = validationSchemas[schemaName];
    
    if (!schema) {
      logger.error('Invalid validation schema', { schemaName });
      return next(new ValidationError('Invalid validation schema'));
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        schemaName,
        errors: errorMessages,
        userId: req.user?.id,
        ip: req.clientIp
      });

      const validationError = new ValidationError('Validation failed', errorMessages);
      return next(validationError);
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    
    logger.debug('Validation passed', {
      schemaName,
      userId: req.user?.id,
      fieldsValidated: Object.keys(value)
    });

    next();
  };
};

// Query parameter validation
export const validateQueryParams = (schema: Joi.ObjectSchema) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Query parameter validation failed', {
        errors: errorMessages,
        userId: req.user?.id,
        ip: req.clientIp
      });

      const validationError = new ValidationError('Query parameter validation failed', errorMessages);
      return next(validationError);
    }

    req.query = value;
    next();
  };
};

// Path parameter validation
export const validatePathParams = (schema: Joi.ObjectSchema) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Path parameter validation failed', {
        errors: errorMessages,
        userId: req.user?.id,
        ip: req.clientIp
      });

      const validationError = new ValidationError('Path parameter validation failed', errorMessages);
      return next(validationError);
    }

    req.params = value;
    next();
  };
};

// File upload validation
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  return (req: UserRequest, res: Response, next: NextFunction): void => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file as Express.Multer.File | undefined;
    
    const uploadedFiles = files || (file ? [file] : []);

    // Check if files are required
    if (options.required && uploadedFiles.length === 0) {
      return next(new ValidationError('File upload is required'));
    }

    // Check file count
    if (options.maxFiles && uploadedFiles.length > options.maxFiles) {
      return next(new ValidationError(`Maximum ${options.maxFiles} files allowed`));
    }

    // Validate each file
    for (const uploadedFile of uploadedFiles) {
      // Check file size
      if (options.maxSize && uploadedFile.size > options.maxSize) {
        return next(new ValidationError(`File size exceeds maximum allowed size of ${options.maxSize} bytes`));
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(uploadedFile.mimetype)) {
        return next(new ValidationError(`File type ${uploadedFile.mimetype} is not allowed`));
      }

      // Additional security checks
      if (uploadedFile.originalname.includes('..') || uploadedFile.originalname.includes('/')) {
        return next(new ValidationError('Invalid file name'));
      }
    }

    logger.debug('File upload validation passed', {
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })),
      userId: req.user?.id
    });

    next();
  };
};

// Custom validation for specific business rules
export const validateBusinessRules = {
  // Ensure user can only access their own data (unless admin)
  ownDataAccess: (req: UserRequest, res: Response, next: NextFunction): void => {
    const targetUserId = req.params.userId || req.body.userId;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    if (targetUserId && targetUserId !== currentUserId) {
      const adminRoles = ['admin', 'moderator', 'support'];
      if (!adminRoles.includes(userRole || '')) {
        return next(new ValidationError('Access denied: can only access own data'));
      }
    }

    next();
  },

  // Validate age requirements
  ageRequirement: (minAge: number = 18) => {
    return (req: UserRequest, res: Response, next: NextFunction): void => {
      const dateOfBirth = req.body.dateOfBirth;
      
      if (dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age < minAge) {
          return next(new ValidationError(`Must be at least ${minAge} years old`));
        }
      }

      next();
    };
  },

  // Validate phone number format for specific countries
  phoneNumberFormat: (countryCodes: string[]) => {
    return (req: UserRequest, res: Response, next: NextFunction): void => {
      const phone = req.body.phone;
      
      if (phone && countryCodes.length > 0) {
        const hasValidCountryCode = countryCodes.some(code => phone.startsWith(code));
        
        if (!hasValidCountryCode) {
          return next(new ValidationError(`Phone number must start with one of: ${countryCodes.join(', ')}`));
        }
      }

      next();
    };
  },

  // Validate password strength beyond basic requirements
  passwordStrength: (req: UserRequest, res: Response, next: NextFunction): void => {
    const password = req.body.password || req.body.newPassword;
    
    if (password) {
      // Check for common passwords
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
      if (commonPasswords.includes(password.toLowerCase())) {
        return next(new ValidationError('Password is too common'));
      }

      // Check for repeated characters
      if (/(.)\1{2,}/.test(password)) {
        return next(new ValidationError('Password cannot contain repeated characters'));
      }

      // Check for keyboard patterns
      const keyboardPatterns = ['qwerty', 'asdf', '1234', 'abcd'];
      if (keyboardPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
        return next(new ValidationError('Password cannot contain keyboard patterns'));
      }
    }

    next();
  },

  // Validate email domain restrictions
  emailDomainRestriction: (allowedDomains: string[], blockedDomains: string[] = []) => {
    return (req: UserRequest, res: Response, next: NextFunction): void => {
      const email = req.body.email;
      
      if (email) {
        const domain = email.split('@')[1]?.toLowerCase();
        
        if (blockedDomains.includes(domain)) {
          return next(new ValidationError('Email domain is not allowed'));
        }
        
        if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
          return next(new ValidationError('Email domain is not in the allowed list'));
        }
      }

      next();
    };
  }
};

// Sanitization helpers
export const sanitizeInput = {
  // Remove potentially dangerous characters
  cleanString: (str: string): string => {
    return str.replace(/[<>\"'%;()&+]/g, '');
  },

  // Normalize phone numbers
  normalizePhone: (phone: string): string => {
    return phone.replace(/\D/g, '');
  },

  // Normalize email
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  }
};

export default {
  validationMiddleware,
  validateQueryParams,
  validatePathParams,
  validateFileUpload,
  validateBusinessRules,
  sanitizeInput,
  validationSchemas
};

