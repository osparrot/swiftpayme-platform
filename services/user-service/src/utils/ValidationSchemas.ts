import Joi from 'joi';
import { 
  UserRole, 
  UserStatus, 
  VerificationStatus, 
  NotificationPreference,
  TwoFactorMethod,
  AddressType,
  PhoneType,
  DocumentType,
  Gender,
  MaritalStatus,
  EmploymentStatus,
  IncomeRange
} from '../enums/userEnums';

/**
 * Comprehensive validation schemas for the User Service
 * Provides robust input validation for all user-related operations
 */
export class ValidationSchemas {
  
  // Common validation patterns
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  private static readonly PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;
  private static readonly NAME_PATTERN = /^[a-zA-Z\s'-]{2,50}$/;
  private static readonly POSTAL_CODE_PATTERN = /^[A-Z0-9\s-]{3,10}$/i;

  /**
   * User registration validation schema
   */
  static readonly userRegistration = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil', 'int'] } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .pattern(this.PASSWORD_PATTERN)
      .required()
      .messages({
        'string.pattern.base': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'any.required': 'Password is required'
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      }),

    firstName: Joi.string()
      .pattern(this.NAME_PATTERN)
      .required()
      .messages({
        'string.pattern.base': 'First name must be 2-50 characters, letters only',
        'any.required': 'First name is required'
      }),

    lastName: Joi.string()
      .pattern(this.NAME_PATTERN)
      .required()
      .messages({
        'string.pattern.base': 'Last name must be 2-50 characters, letters only',
        'any.required': 'Last name is required'
      }),

    dateOfBirth: Joi.date()
      .max('now')
      .min('1900-01-01')
      .required()
      .messages({
        'date.max': 'Date of birth cannot be in the future',
        'date.min': 'Please provide a valid date of birth',
        'any.required': 'Date of birth is required'
      }),

    phoneNumber: Joi.string()
      .pattern(this.PHONE_PATTERN)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number with country code',
        'any.required': 'Phone number is required'
      }),

    acceptTerms: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the terms and conditions',
        'any.required': 'Terms acceptance is required'
      }),

    acceptPrivacy: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the privacy policy',
        'any.required': 'Privacy policy acceptance is required'
      }),

    marketingConsent: Joi.boolean().default(false),
    referralCode: Joi.string().alphanum().length(8).optional()
  });

  /**
   * User login validation schema
   */
  static readonly userLogin = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .min(1)
      .required()
      .messages({
        'any.required': 'Password is required'
      }),

    rememberMe: Joi.boolean().default(false),
    deviceId: Joi.string().uuid().optional(),
    deviceName: Joi.string().max(100).optional()
  });

  /**
   * Profile update validation schema
   */
  static readonly profileUpdate = Joi.object({
    firstName: Joi.string().pattern(this.NAME_PATTERN).optional(),
    lastName: Joi.string().pattern(this.NAME_PATTERN).optional(),
    middleName: Joi.string().pattern(this.NAME_PATTERN).optional(),
    displayName: Joi.string().min(2).max(50).optional(),
    
    dateOfBirth: Joi.date()
      .max('now')
      .min('1900-01-01')
      .optional(),

    gender: Joi.string()
      .valid(...Object.values(Gender))
      .optional(),

    maritalStatus: Joi.string()
      .valid(...Object.values(MaritalStatus))
      .optional(),

    nationality: Joi.string().length(2).uppercase().optional(),
    countryOfResidence: Joi.string().length(2).uppercase().optional(),
    
    employmentStatus: Joi.string()
      .valid(...Object.values(EmploymentStatus))
      .optional(),

    occupation: Joi.string().max(100).optional(),
    employer: Joi.string().max(100).optional(),
    
    incomeRange: Joi.string()
      .valid(...Object.values(IncomeRange))
      .optional(),

    bio: Joi.string().max(500).optional(),
    website: Joi.string().uri().optional(),
    
    profilePicture: Joi.string().uri().optional(),
    timezone: Joi.string().max(50).optional(),
    language: Joi.string().length(2).lowercase().optional(),
    currency: Joi.string().length(3).uppercase().optional()
  });

  /**
   * Address validation schema
   */
  static readonly address = Joi.object({
    type: Joi.string()
      .valid(...Object.values(AddressType))
      .required(),

    street1: Joi.string().min(5).max(100).required(),
    street2: Joi.string().max(100).optional(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().min(2).max(50).required(),
    postalCode: Joi.string().pattern(this.POSTAL_CODE_PATTERN).required(),
    country: Joi.string().length(2).uppercase().required(),
    
    isDefault: Joi.boolean().default(false),
    isVerified: Joi.boolean().default(false)
  });

  /**
   * Phone number validation schema
   */
  static readonly phoneNumber = Joi.object({
    type: Joi.string()
      .valid(...Object.values(PhoneType))
      .required(),

    number: Joi.string()
      .pattern(this.PHONE_PATTERN)
      .required(),

    countryCode: Joi.string().min(1).max(4).required(),
    isDefault: Joi.boolean().default(false),
    isVerified: Joi.boolean().default(false)
  });

  /**
   * Document upload validation schema
   */
  static readonly document = Joi.object({
    type: Joi.string()
      .valid(...Object.values(DocumentType))
      .required(),

    documentNumber: Joi.string().min(5).max(50).required(),
    issuingCountry: Joi.string().length(2).uppercase().required(),
    issuingAuthority: Joi.string().max(100).optional(),
    
    issueDate: Joi.date().max('now').required(),
    expiryDate: Joi.date().greater('now').required(),
    
    frontImageUrl: Joi.string().uri().required(),
    backImageUrl: Joi.string().uri().optional(),
    
    metadata: Joi.object().optional()
  });

  /**
   * Password change validation schema
   */
  static readonly passwordChange = Joi.object({
    currentPassword: Joi.string().required(),
    
    newPassword: Joi.string()
      .pattern(this.PASSWORD_PATTERN)
      .invalid(Joi.ref('currentPassword'))
      .required()
      .messages({
        'string.pattern.base': 'New password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'any.invalid': 'New password must be different from current password'
      }),

    confirmNewPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match'
      })
  });

  /**
   * Two-factor authentication setup validation schema
   */
  static readonly twoFactorSetup = Joi.object({
    method: Joi.string()
      .valid(...Object.values(TwoFactorMethod))
      .required(),

    phoneNumber: Joi.when('method', {
      is: TwoFactorMethod.SMS,
      then: Joi.string().pattern(this.PHONE_PATTERN).required(),
      otherwise: Joi.forbidden()
    }),

    backupCodes: Joi.array().items(Joi.string().length(8)).optional()
  });

  /**
   * Two-factor authentication verification schema
   */
  static readonly twoFactorVerification = Joi.object({
    code: Joi.string().length(6).pattern(/^\d{6}$/).required(),
    method: Joi.string().valid(...Object.values(TwoFactorMethod)).required(),
    rememberDevice: Joi.boolean().default(false)
  });

  /**
   * Notification preferences validation schema
   */
  static readonly notificationPreferences = Joi.object({
    email: Joi.object({
      marketing: Joi.boolean().default(false),
      security: Joi.boolean().default(true),
      transactions: Joi.boolean().default(true),
      updates: Joi.boolean().default(true)
    }).optional(),

    sms: Joi.object({
      security: Joi.boolean().default(true),
      transactions: Joi.boolean().default(false),
      alerts: Joi.boolean().default(false)
    }).optional(),

    push: Joi.object({
      security: Joi.boolean().default(true),
      transactions: Joi.boolean().default(true),
      marketing: Joi.boolean().default(false),
      updates: Joi.boolean().default(true)
    }).optional(),

    frequency: Joi.string()
      .valid('immediate', 'daily', 'weekly', 'monthly')
      .default('immediate'),

    timezone: Joi.string().optional()
  });

  /**
   * Account settings validation schema
   */
  static readonly accountSettings = Joi.object({
    currency: Joi.string().length(3).uppercase().optional(),
    language: Joi.string().length(2).lowercase().optional(),
    timezone: Joi.string().optional(),
    
    privacy: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private', 'friends').default('private'),
      showEmail: Joi.boolean().default(false),
      showPhone: Joi.boolean().default(false),
      allowSearch: Joi.boolean().default(true)
    }).optional(),

    security: Joi.object({
      sessionTimeout: Joi.number().min(5).max(1440).default(30), // minutes
      requireTwoFactor: Joi.boolean().default(false),
      allowMultipleSessions: Joi.boolean().default(true),
      logSecurityEvents: Joi.boolean().default(true)
    }).optional()
  });

  /**
   * Search and pagination validation schema
   */
  static readonly searchQuery = Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'firstName', 'lastName').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    
    status: Joi.string().valid(...Object.values(UserStatus)).optional(),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    verificationStatus: Joi.string().valid(...Object.values(VerificationStatus)).optional(),
    
    createdAfter: Joi.date().optional(),
    createdBefore: Joi.date().optional(),
    lastLoginAfter: Joi.date().optional(),
    lastLoginBefore: Joi.date().optional()
  });

  /**
   * Validate data against a schema
   */
  static validate<T>(schema: Joi.ObjectSchema, data: any): { value: T; error?: Joi.ValidationError } {
    const result = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    return {
      value: result.value,
      error: result.error
    };
  }

  /**
   * Validate and throw error if validation fails
   */
  static validateOrThrow<T>(schema: Joi.ObjectSchema, data: any): T {
    const { value, error } = this.validate<T>(schema, data);
    
    if (error) {
      const validationError = new Error('Validation failed');
      (validationError as any).code = 'VALIDATION_ERROR';
      (validationError as any).details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      throw validationError;
    }

    return value;
  }
}

export default ValidationSchemas;
