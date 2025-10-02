import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('LedgerValidationMiddleware');

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

// Account creation schema
export const createAccountSchema = Joi.object({
  accountNumber: Joi.string()
    .required()
    .pattern(/^[A-Z0-9]{10,20}$/)
    .messages({
      'any.required': 'Account number is required',
      'string.pattern.base': 'Account number must be 10-20 alphanumeric characters'
    }),
  
  accountName: Joi.string()
    .required()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'any.required': 'Account name is required',
      'string.min': 'Account name must be at least 1 character long',
      'string.max': 'Account name must not exceed 100 characters'
    }),
  
  accountType: Joi.string()
    .valid('asset', 'liability', 'equity', 'revenue', 'expense')
    .required()
    .messages({
      'any.required': 'Account type is required',
      'any.only': 'Account type must be one of: asset, liability, equity, revenue, expense'
    }),
  
  subType: Joi.string()
    .valid(
      'current_asset', 'fixed_asset', 'intangible_asset',
      'current_liability', 'long_term_liability',
      'owner_equity', 'retained_earnings',
      'operating_revenue', 'other_revenue',
      'operating_expense', 'other_expense'
    )
    .required()
    .messages({
      'any.required': 'Account sub-type is required',
      'any.only': 'Account sub-type must be a valid sub-type'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  parentAccountId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Parent account ID must be a valid MongoDB ObjectId'
    }),
  
  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  metadata: Joi.object()
    .optional()
});

// Transaction creation schema
export const createTransactionSchema = Joi.object({
  reference: Joi.string()
    .required()
    .min(1)
    .max(50)
    .trim()
    .messages({
      'any.required': 'Transaction reference is required',
      'string.min': 'Reference must be at least 1 character long',
      'string.max': 'Reference must not exceed 50 characters'
    }),
  
  description: Joi.string()
    .required()
    .min(1)
    .max(500)
    .trim()
    .messages({
      'any.required': 'Transaction description is required',
      'string.min': 'Description must be at least 1 character long',
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  amount: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount precision cannot exceed 8 decimal places'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  debitAccountId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'Debit account ID is required',
      'string.pattern.base': 'Debit account ID must be a valid MongoDB ObjectId'
    }),
  
  creditAccountId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'Credit account ID is required',
      'string.pattern.base': 'Credit account ID must be a valid MongoDB ObjectId'
    }),
  
  transactionDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .default('now')
    .messages({
      'date.format': 'Transaction date must be in ISO format',
      'date.max': 'Transaction date cannot be in the future'
    }),
  
  externalReference: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.max': 'External reference must not exceed 100 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  metadata: Joi.object()
    .optional()
});

// Journal entry creation schema
export const createJournalEntrySchema = Joi.object({
  reference: Joi.string()
    .required()
    .min(1)
    .max(50)
    .trim()
    .messages({
      'any.required': 'Journal entry reference is required',
      'string.min': 'Reference must be at least 1 character long',
      'string.max': 'Reference must not exceed 50 characters'
    }),
  
  description: Joi.string()
    .required()
    .min(1)
    .max(500)
    .trim()
    .messages({
      'any.required': 'Journal entry description is required',
      'string.min': 'Description must be at least 1 character long',
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  entries: Joi.array()
    .items(Joi.object({
      accountId: Joi.string()
        .required()
        .pattern(/^[a-fA-F0-9]{24}$/)
        .messages({
          'any.required': 'Account ID is required',
          'string.pattern.base': 'Account ID must be a valid MongoDB ObjectId'
        }),
      
      debitAmount: Joi.number()
        .min(0)
        .precision(8)
        .optional()
        .messages({
          'number.min': 'Debit amount must be non-negative',
          'number.precision': 'Debit amount precision cannot exceed 8 decimal places'
        }),
      
      creditAmount: Joi.number()
        .min(0)
        .precision(8)
        .optional()
        .messages({
          'number.min': 'Credit amount must be non-negative',
          'number.precision': 'Credit amount precision cannot exceed 8 decimal places'
        }),
      
      description: Joi.string()
        .max(200)
        .trim()
        .optional()
        .messages({
          'string.max': 'Entry description must not exceed 200 characters'
        })
    }))
    .min(2)
    .required()
    .messages({
      'any.required': 'Journal entries are required',
      'array.min': 'At least 2 journal entries are required'
    }),
  
  entryDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .default('now')
    .messages({
      'date.format': 'Entry date must be in ISO format',
      'date.max': 'Entry date cannot be in the future'
    }),
  
  externalReference: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.max': 'External reference must not exceed 100 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  metadata: Joi.object()
    .optional()
});

// Balance query schema
export const balanceQuerySchema = Joi.object({
  accountId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Account ID must be a valid MongoDB ObjectId'
    }),
  
  accountType: Joi.string()
    .valid('asset', 'liability', 'equity', 'revenue', 'expense')
    .optional()
    .messages({
      'any.only': 'Account type must be one of: asset, liability, equity, revenue, expense'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .optional()
    .messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  asOfDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.format': 'As of date must be in ISO format',
      'date.max': 'As of date cannot be in the future'
    }),
  
  includeInactive: Joi.boolean()
    .default(false)
});

// Transaction query schema
export const transactionQuerySchema = Joi.object({
  accountId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Account ID must be a valid MongoDB ObjectId'
    }),
  
  reference: Joi.string()
    .optional(),
  
  externalReference: Joi.string()
    .optional(),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .optional()
    .messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  minAmount: Joi.number()
    .positive()
    .precision(8)
    .optional()
    .messages({
      'number.positive': 'Minimum amount must be positive',
      'number.precision': 'Minimum amount precision cannot exceed 8 decimal places'
    }),
  
  maxAmount: Joi.number()
    .positive()
    .precision(8)
    .optional()
    .messages({
      'number.positive': 'Maximum amount must be positive',
      'number.precision': 'Maximum amount precision cannot exceed 8 decimal places'
    }),
  
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
  
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
  
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
    }),
  
  sort: Joi.string()
    .valid('transactionDate', '-transactionDate', 'amount', '-amount', 'reference', '-reference')
    .default('-transactionDate')
    .messages({
      'any.only': 'Sort must be one of: transactionDate, -transactionDate, amount, -amount, reference, -reference'
    })
});

// Trial balance query schema
export const trialBalanceQuerySchema = Joi.object({
  asOfDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .default('now')
    .messages({
      'date.format': 'As of date must be in ISO format',
      'date.max': 'As of date cannot be in the future'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .optional()
    .messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  accountType: Joi.string()
    .valid('asset', 'liability', 'equity', 'revenue', 'expense')
    .optional()
    .messages({
      'any.only': 'Account type must be one of: asset, liability, equity, revenue, expense'
    }),
  
  includeZeroBalances: Joi.boolean()
    .default(false),
  
  includeInactive: Joi.boolean()
    .default(false)
});

// Audit log query schema
export const auditLogQuerySchema = Joi.object({
  entityType: Joi.string()
    .valid('account', 'transaction', 'journal_entry')
    .optional()
    .messages({
      'any.only': 'Entity type must be one of: account, transaction, journal_entry'
    }),
  
  entityId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Entity ID must be a valid MongoDB ObjectId'
    }),
  
  action: Joi.string()
    .valid('create', 'update', 'delete', 'approve', 'reject')
    .optional()
    .messages({
      'any.only': 'Action must be one of: create, update, delete, approve, reject'
    }),
  
  userId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
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

/**
 * Validate account ID parameter
 */
export const validateAccountId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    accountId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({
        'any.required': 'Account ID is required',
        'string.pattern.base': 'Account ID must be a valid MongoDB ObjectId'
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Validate transaction ID parameter
 */
export const validateTransactionId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    transactionId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({
        'any.required': 'Transaction ID is required',
        'string.pattern.base': 'Transaction ID must be a valid MongoDB ObjectId'
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Validate journal entry ID parameter
 */
export const validateJournalEntryId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    journalEntryId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({
        'any.required': 'Journal entry ID is required',
        'string.pattern.base': 'Journal entry ID must be a valid MongoDB ObjectId'
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Business rule validation for double-entry bookkeeping
 */
export const doubleEntryValidation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return next();
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      const { debitAmount = 0, creditAmount = 0 } = entry;

      // Ensure only one of debit or credit is specified per entry
      if (debitAmount > 0 && creditAmount > 0) {
        throw new ValidationError('Each journal entry must have either a debit or credit amount, not both');
      }

      if (debitAmount === 0 && creditAmount === 0) {
        throw new ValidationError('Each journal entry must have either a debit or credit amount');
      }

      totalDebits += debitAmount;
      totalCredits += creditAmount;
    }

    // Validate that debits equal credits (within a small tolerance for floating point precision)
    const tolerance = 0.01;
    if (Math.abs(totalDebits - totalCredits) > tolerance) {
      throw new ValidationError(`Total debits (${totalDebits}) must equal total credits (${totalCredits})`);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validate account hierarchy
 */
export const accountHierarchyValidation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { accountType, subType } = req.body;

    if (!accountType || !subType) {
      return next();
    }

    // Define valid sub-types for each account type
    const validSubTypes: { [key: string]: string[] } = {
      asset: ['current_asset', 'fixed_asset', 'intangible_asset'],
      liability: ['current_liability', 'long_term_liability'],
      equity: ['owner_equity', 'retained_earnings'],
      revenue: ['operating_revenue', 'other_revenue'],
      expense: ['operating_expense', 'other_expense']
    };

    if (!validSubTypes[accountType]?.includes(subType)) {
      throw new ValidationError(`Invalid sub-type '${subType}' for account type '${accountType}'`);
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default {
  validationMiddleware,
  validateAccountId,
  validateTransactionId,
  validateJournalEntryId,
  doubleEntryValidation,
  accountHierarchyValidation,
  createAccountSchema,
  createTransactionSchema,
  createJournalEntrySchema,
  balanceQuerySchema,
  transactionQuerySchema,
  trialBalanceQuerySchema,
  auditLogQuerySchema
};
