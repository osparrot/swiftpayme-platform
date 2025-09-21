import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '../utils/Logger';

const logger = new Logger('ValidationMiddleware');

export interface ValidationConfig {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
  headers?: Joi.Schema;
  response?: Joi.Schema;
  options?: Joi.ValidationOptions;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Default validation options
const defaultOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
  convert: true,
  presence: 'required'
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),

  // UUID
  uuid: Joi.string().uuid().message('Invalid UUID format'),

  // Email
  email: Joi.string().email().lowercase().trim(),

  // Password
  password: Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).message('Password must contain at least 8 characters with uppercase, lowercase, number and special character'),

  // Phone number
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).message('Invalid phone number format'),

  // Currency code
  currency: Joi.string().length(3).uppercase().valid(
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD'
  ),

  // Asset types
  assetType: Joi.string().valid('gold', 'silver', 'diamond'),

  // Bitcoin address
  bitcoinAddress: Joi.string().pattern(
    /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/
  ).message('Invalid Bitcoin address format'),

  // Amount (positive number with up to 8 decimal places)
  amount: Joi.number().positive().precision(8),

  // Status fields
  userStatus: Joi.string().valid('active', 'suspended', 'pending', 'blocked'),
  kycStatus: Joi.string().valid('pending', 'in_review', 'approved', 'rejected'),
  transactionStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
  assetStatus: Joi.string().valid('submitted', 'received', 'verifying', 'verified', 'rejected', 'credited')
};

// Service-specific validation schemas
export const serviceSchemas = {
  // User Service
  userService: {
    createUser: {
      body: Joi.object({
        email: commonSchemas.email.required(),
        password: commonSchemas.password.required(),
        firstName: Joi.string().trim().min(1).max(50).required(),
        lastName: Joi.string().trim().min(1).max(50).required(),
        phone: commonSchemas.phone.optional()
      })
    },
    
    updateUser: {
      params: Joi.object({
        userId: commonSchemas.objectId.required()
      }),
      body: Joi.object({
        firstName: Joi.string().trim().min(1).max(50).optional(),
        lastName: Joi.string().trim().min(1).max(50).optional(),
        phone: commonSchemas.phone.optional()
      })
    },

    login: {
      body: Joi.object({
        email: commonSchemas.email.required(),
        password: Joi.string().required()
      })
    },

    kycVerification: {
      params: Joi.object({
        userId: commonSchemas.objectId.required()
      }),
      body: Joi.object({
        documentType: Joi.string().valid('passport', 'drivers_license', 'national_id').required(),
        documentNumber: Joi.string().trim().min(1).max(50).required(),
        documentImages: Joi.array().items(Joi.string().uri()).min(1).max(5).required(),
        selfieImage: Joi.string().uri().required(),
        address: Joi.object({
          street: Joi.string().trim().min(1).max(100).required(),
          city: Joi.string().trim().min(1).max(50).required(),
          state: Joi.string().trim().min(1).max(50).required(),
          country: Joi.string().length(2).uppercase().required(),
          postalCode: Joi.string().trim().min(1).max(20).required()
        }).required()
      })
    }
  },

  // Asset Service
  assetService: {
    createAssetDeposit: {
      body: Joi.object({
        assetType: commonSchemas.assetType.required(),
        weight: Joi.number().positive().precision(3).required(),
        purity: Joi.number().min(0).max(100).precision(2).required(),
        dimensions: Joi.object({
          length: Joi.number().positive().precision(2).required(),
          width: Joi.number().positive().precision(2).required(),
          height: Joi.number().positive().precision(2).required()
        }).optional(),
        condition: Joi.string().valid('excellent', 'good', 'fair', 'poor').required(),
        images: Joi.array().items(Joi.string().uri()).min(1).max(10).required(),
        certificates: Joi.array().items(Joi.string().uri()).max(5).optional(),
        estimatedValue: commonSchemas.amount.required(),
        currency: commonSchemas.currency.required()
      })
    },

    verifyAsset: {
      params: Joi.object({
        assetId: commonSchemas.objectId.required()
      }),
      body: Joi.object({
        verificationMethod: Joi.string().trim().min(1).max(50).required(),
        result: Joi.string().valid('pass', 'fail', 'inconclusive').required(),
        confidence: Joi.number().min(0).max(100).required(),
        details: Joi.object().optional()
      })
    },

    approveAsset: {
      params: Joi.object({
        assetId: commonSchemas.objectId.required()
      }),
      body: Joi.object({
        finalValue: commonSchemas.amount.required(),
        notes: Joi.string().max(500).optional()
      })
    }
  },

  // Currency Service
  currencyService: {
    convertCurrency: {
      body: Joi.object({
        from: commonSchemas.currency.required(),
        to: commonSchemas.currency.required(),
        amount: commonSchemas.amount.required()
      })
    },

    getPrices: {
      query: Joi.object({
        assets: Joi.string().required(), // Comma-separated list
        currency: commonSchemas.currency.optional()
      })
    }
  },

  // Crypto Service
  cryptoService: {
    createWallet: {
      body: Joi.object({
        userId: commonSchemas.objectId.required(),
        type: Joi.string().valid('internal', 'external').required(),
        label: Joi.string().trim().max(50).optional()
      })
    },

    sendBitcoin: {
      body: Joi.object({
        fromWalletId: commonSchemas.objectId.required(),
        toAddress: commonSchemas.bitcoinAddress.required(),
        amount: commonSchemas.amount.required(),
        feeRate: Joi.number().positive().optional(),
        memo: Joi.string().max(200).optional()
      })
    },

    getBalance: {
      params: Joi.object({
        walletId: commonSchemas.objectId.required()
      })
    }
  },

  // Payment Service
  paymentService: {
    processAssetDeposit: {
      body: Joi.object({
        assetDepositId: commonSchemas.objectId.required(),
        userId: commonSchemas.objectId.required(),
        finalValue: commonSchemas.amount.required(),
        currency: commonSchemas.currency.required()
      })
    },

    processBitcoinPurchase: {
      body: Joi.object({
        userId: commonSchemas.objectId.required(),
        amount: commonSchemas.amount.required(),
        currency: commonSchemas.currency.required(),
        walletId: commonSchemas.objectId.optional()
      })
    },

    processFiatTransfer: {
      body: Joi.object({
        fromUserId: commonSchemas.objectId.required(),
        toUserId: commonSchemas.objectId.required(),
        amount: commonSchemas.amount.required(),
        currency: commonSchemas.currency.required(),
        memo: Joi.string().max(200).optional()
      })
    },

    getTransactions: {
      query: Joi.object({
        userId: commonSchemas.objectId.optional(),
        type: Joi.string().valid('asset_deposit', 'fiat_transfer', 'bitcoin_purchase', 'bitcoin_transfer').optional(),
        status: commonSchemas.transactionStatus.optional(),
        ...commonSchemas.dateRange.extract(['startDate', 'endDate']),
        ...commonSchemas.pagination.extract(['page', 'limit', 'sort', 'order'])
      })
    }
  },

  // Admin Service
  adminService: {
    userManagement: {
      body: Joi.object({
        action: Joi.string().valid('suspend', 'activate', 'block', 'verify_kyc', 'reject_kyc').required(),
        userId: commonSchemas.objectId.required(),
        reason: Joi.string().max(200).optional(),
        notes: Joi.string().max(500).optional()
      })
    },

    assetVerification: {
      body: Joi.object({
        assetDepositId: commonSchemas.objectId.required(),
        action: Joi.string().valid('approve', 'reject').required(),
        finalValue: commonSchemas.amount.when('action', {
          is: 'approve',
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        notes: Joi.string().max(500).optional()
      })
    },

    generateReport: {
      body: Joi.object({
        type: Joi.string().valid('users', 'assets', 'transactions', 'financial', 'compliance').required(),
        period: Joi.object({
          start: Joi.date().iso().required(),
          end: Joi.date().iso().min(Joi.ref('start')).required()
        }).required(),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').required(),
        filters: Joi.object().optional()
      })
    }
  },

  // Notification Service
  notificationService: {
    sendNotification: {
      body: Joi.object({
        userId: commonSchemas.objectId.optional(),
        type: Joi.string().valid('info', 'success', 'warning', 'error', 'security', 'transaction').required(),
        category: Joi.string().trim().min(1).max(50).required(),
        title: Joi.string().trim().min(1).max(200).required(),
        message: Joi.string().trim().min(1).max(1000).required(),
        data: Joi.object().optional(),
        channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'webhook')).optional(),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
        scheduledAt: Joi.date().iso().optional()
      })
    },

    sendTemplateNotification: {
      body: Joi.object({
        templateId: commonSchemas.objectId.required(),
        userId: commonSchemas.objectId.required(),
        variables: Joi.object().required(),
        channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'webhook')).optional(),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional()
      })
    },

    updatePreferences: {
      params: Joi.object({
        userId: commonSchemas.objectId.required()
      }),
      body: Joi.object({
        channels: Joi.object().pattern(
          Joi.string(),
          Joi.boolean()
        ).optional(),
        categories: Joi.object().pattern(
          Joi.string(),
          Joi.boolean()
        ).optional(),
        quietHours: Joi.object({
          enabled: Joi.boolean().required(),
          start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          timezone: Joi.string().required()
        }).optional()
      })
    }
  }
};

// Main validation middleware factory
export function validationMiddleware(config: ValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = { ...defaultOptions, ...config.options };
      const errors: ValidationError[] = [];

      // Validate request body
      if (config.body && req.body) {
        const { error, value } = config.body.validate(req.body, options);
        if (error) {
          errors.push(...formatJoiErrors(error, 'body'));
        } else {
          req.body = value;
        }
      }

      // Validate query parameters
      if (config.query && req.query) {
        const { error, value } = config.query.validate(req.query, options);
        if (error) {
          errors.push(...formatJoiErrors(error, 'query'));
        } else {
          req.query = value;
        }
      }

      // Validate route parameters
      if (config.params && req.params) {
        const { error, value } = config.params.validate(req.params, options);
        if (error) {
          errors.push(...formatJoiErrors(error, 'params'));
        } else {
          req.params = value;
        }
      }

      // Validate headers
      if (config.headers && req.headers) {
        const { error, value } = config.headers.validate(req.headers, options);
        if (error) {
          errors.push(...formatJoiErrors(error, 'headers'));
        } else {
          // Don't override headers as they might be needed by other middleware
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        logger.warn('Request validation failed', {
          requestId: (req as any).requestId,
          path: req.path,
          method: req.method,
          errors
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors
          },
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Store validation config for response validation
      (req as any).validationConfig = config;

      next();

    } catch (error) {
      logger.error('Validation middleware error', {
        requestId: (req as any).requestId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error'
        },
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Response validation middleware
export function responseValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const validationConfig = (req as any).validationConfig;

    res.send = function(body: any) {
      // Only validate if response schema is provided
      if (validationConfig?.response && body) {
        try {
          let responseData = body;
          
          // Parse JSON if it's a string
          if (typeof body === 'string') {
            try {
              responseData = JSON.parse(body);
            } catch (parseError) {
              // If it's not JSON, skip validation
              return originalSend.call(this, body);
            }
          }

          const { error } = validationConfig.response.validate(responseData, {
            allowUnknown: true,
            stripUnknown: false
          });

          if (error) {
            logger.error('Response validation failed', {
              requestId: (req as any).requestId,
              path: req.path,
              method: req.method,
              statusCode: res.statusCode,
              errors: formatJoiErrors(error, 'response')
            });

            // In development, return validation error
            if (process.env.NODE_ENV === 'development') {
              return originalSend.call(this, JSON.stringify({
                success: false,
                error: {
                  code: 'RESPONSE_VALIDATION_ERROR',
                  message: 'Response validation failed',
                  details: formatJoiErrors(error, 'response')
                },
                requestId: (req as any).requestId,
                timestamp: new Date().toISOString()
              }));
            }
          }

        } catch (validationError) {
          logger.error('Response validation middleware error', {
            requestId: (req as any).requestId,
            error: validationError.message
          });
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

// Helper function to format Joi validation errors
function formatJoiErrors(joiError: Joi.ValidationError, source: string): ValidationError[] {
  return joiError.details.map(detail => ({
    field: `${source}.${detail.path.join('.')}`,
    message: detail.message,
    value: detail.context?.value
  }));
}

// Route-specific validation middleware factory
export function createRouteValidation(serviceName: string, operationName: string) {
  const schema = (serviceSchemas as any)[serviceName]?.[operationName];
  
  if (!schema) {
    logger.warn('No validation schema found', { serviceName, operationName });
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return validationMiddleware(schema);
}

// Bulk validation for multiple fields
export function bulkValidation(validations: { [field: string]: Joi.Schema }) {
  return validationMiddleware({
    body: Joi.object(validations)
  });
}

// File upload validation
export function fileValidationMiddleware(options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as any;
    
    if (!files || Object.keys(files).length === 0) {
      return next();
    }

    const errors: ValidationError[] = [];
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxFiles = options.maxFiles || 5;

    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();

    if (fileArray.length > maxFiles) {
      errors.push({
        field: 'files',
        message: `Maximum ${maxFiles} files allowed`
      });
    }

    fileArray.forEach((file: any, index: number) => {
      if (file.size > maxSize) {
        errors.push({
          field: `files[${index}]`,
          message: `File size exceeds ${maxSize} bytes`,
          value: file.size
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push({
          field: `files[${index}]`,
          message: `File type ${file.mimetype} not allowed`,
          value: file.mimetype
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_VALIDATION_ERROR',
          message: 'File validation failed',
          details: errors
        },
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Export validation utilities
export {
  Joi,
  defaultOptions,
  formatJoiErrors
};

