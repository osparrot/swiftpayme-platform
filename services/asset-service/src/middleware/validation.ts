import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { AssetRequest } from '../types';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';
import {
  AssetType,
  AssetSymbol,
  AssetStatus,
  AssetClass,
  WalletType,
  WalletStatus,
  PriceSource,
  AssetGrade,
  AssetUnit,
  StorageType,
  CustodyType
} from '../enums/assetEnums';

const logger = new Logger('ValidationMiddleware');

// Common validation schemas
const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });
const decimalSchema = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().pattern(/^\d+(\.\d+)?$/)
);
const positiveDecimalSchema = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().pattern(/^\d+(\.\d+)?$/)
);

// Asset validation schemas
export const createAssetSchema = Joi.object({
  symbol: Joi.string().valid(...Object.values(AssetSymbol)).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(1000).optional(),
  type: Joi.string().valid(...Object.values(AssetType)).required(),
  class: Joi.string().valid(...Object.values(AssetClass)).required(),
  
  metadata: Joi.object({
    grade: Joi.string().valid(...Object.values(AssetGrade)).optional(),
    purity: Joi.number().min(0).max(1000).optional(),
    weight: decimalSchema.optional(),
    unit: Joi.string().valid(...Object.values(AssetUnit)).required(),
    origin: Joi.string().trim().max(100).optional(),
    manufacturer: Joi.string().trim().max(100).optional(),
    serialNumber: Joi.string().trim().max(100).optional(),
    batchNumber: Joi.string().trim().max(100).optional(),
    mintYear: Joi.number().integer().min(1800).max(new Date().getFullYear() + 1).optional(),
    country: Joi.string().trim().max(100).optional(),
    region: Joi.string().trim().max(100).optional()
  }).required(),
  
  pricing: Joi.object({
    currentPrice: positiveDecimalSchema.required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    priceSource: Joi.string().valid(...Object.values(PriceSource)).required(),
    bid: decimalSchema.optional(),
    ask: decimalSchema.optional(),
    spread: decimalSchema.optional(),
    volume24h: decimalSchema.optional(),
    marketCap: decimalSchema.optional(),
    priceChange24h: decimalSchema.optional(),
    priceChangePercent24h: Joi.number().optional()
  }).required(),
  
  trading: Joi.object({
    isActive: Joi.boolean().default(true),
    minOrderSize: positiveDecimalSchema.required(),
    maxOrderSize: positiveDecimalSchema.required(),
    tickSize: positiveDecimalSchema.required(),
    lotSize: positiveDecimalSchema.required(),
    fees: Joi.object({
      maker: decimalSchema.required(),
      taker: decimalSchema.required(),
      withdrawal: decimalSchema.required(),
      deposit: decimalSchema.required()
    }).required(),
    marketHours: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      timezone: Joi.string().default('UTC'),
      holidays: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).required(),
  
  storage: Joi.object({
    type: Joi.string().valid(...Object.values(StorageType)).required(),
    custody: Joi.string().valid(...Object.values(CustodyType)).required(),
    location: Joi.string().trim().max(200).optional(),
    facility: Joi.string().trim().max(100).optional(),
    vault: Joi.string().trim().max(100).optional(),
    insurance: Joi.object({
      provider: Joi.string().trim().max(100).optional(),
      policyNumber: Joi.string().trim().max(100).optional(),
      coverage: decimalSchema.optional(),
      expiresAt: Joi.date().optional()
    }).optional()
  }).required()
});

export const updateAssetSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(1000).allow('').optional(),
  status: Joi.string().valid(...Object.values(AssetStatus)).optional(),
  
  metadata: Joi.object({
    grade: Joi.string().valid(...Object.values(AssetGrade)).optional(),
    purity: Joi.number().min(0).max(1000).optional(),
    weight: decimalSchema.optional(),
    unit: Joi.string().valid(...Object.values(AssetUnit)).optional(),
    origin: Joi.string().trim().max(100).optional(),
    manufacturer: Joi.string().trim().max(100).optional(),
    serialNumber: Joi.string().trim().max(100).optional(),
    batchNumber: Joi.string().trim().max(100).optional(),
    mintYear: Joi.number().integer().min(1800).max(new Date().getFullYear() + 1).optional(),
    country: Joi.string().trim().max(100).optional(),
    region: Joi.string().trim().max(100).optional()
  }).optional(),
  
  pricing: Joi.object({
    currentPrice: positiveDecimalSchema.optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    priceSource: Joi.string().valid(...Object.values(PriceSource)).optional(),
    bid: decimalSchema.optional(),
    ask: decimalSchema.optional(),
    spread: decimalSchema.optional(),
    volume24h: decimalSchema.optional(),
    marketCap: decimalSchema.optional(),
    priceChange24h: decimalSchema.optional(),
    priceChangePercent24h: Joi.number().optional()
  }).optional(),
  
  trading: Joi.object({
    isActive: Joi.boolean().optional(),
    minOrderSize: positiveDecimalSchema.optional(),
    maxOrderSize: positiveDecimalSchema.optional(),
    tickSize: positiveDecimalSchema.optional(),
    lotSize: positiveDecimalSchema.optional(),
    fees: Joi.object({
      maker: decimalSchema.optional(),
      taker: decimalSchema.optional(),
      withdrawal: decimalSchema.optional(),
      deposit: decimalSchema.optional()
    }).optional(),
    marketHours: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      timezone: Joi.string().optional(),
      holidays: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).optional(),
  
  storage: Joi.object({
    type: Joi.string().valid(...Object.values(StorageType)).optional(),
    custody: Joi.string().valid(...Object.values(CustodyType)).optional(),
    location: Joi.string().trim().max(200).optional(),
    facility: Joi.string().trim().max(100).optional(),
    vault: Joi.string().trim().max(100).optional(),
    insurance: Joi.object({
      provider: Joi.string().trim().max(100).optional(),
      policyNumber: Joi.string().trim().max(100).optional(),
      coverage: decimalSchema.optional(),
      expiresAt: Joi.date().optional()
    }).optional()
  }).optional()
}).min(1);

export const updateAssetPriceSchema = Joi.object({
  price: positiveDecimalSchema.required(),
  source: Joi.string().valid(...Object.values(PriceSource)).optional(),
  currency: Joi.string().length(3).uppercase().optional()
});

// Wallet validation schemas
export const createWalletSchema = Joi.object({
  assetId: Joi.string().required(),
  walletType: Joi.string().valid(...Object.values(WalletType)).default(WalletType.CUSTODIAL),
  
  metadata: Joi.object({
    label: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    category: Joi.string().trim().max(50).optional(),
    isDefault: Joi.boolean().default(false)
  }).optional(),
  
  security: Joi.object({
    isMultiSig: Joi.boolean().default(false),
    requiredSignatures: Joi.number().integer().min(1).max(15).optional(),
    signatories: Joi.array().items(Joi.string()).optional(),
    encryptionMethod: Joi.string().default('AES-256-GCM'),
    twoFactorEnabled: Joi.boolean().default(false),
    whitelistedAddresses: Joi.array().items(Joi.string()).optional()
  }).optional(),
  
  limits: Joi.object({
    dailyWithdrawal: positiveDecimalSchema.default(10000),
    monthlyWithdrawal: positiveDecimalSchema.default(100000),
    maxTransactionAmount: positiveDecimalSchema.default(50000),
    minTransactionAmount: positiveDecimalSchema.default(0.01),
    dailyTransactionCount: Joi.number().integer().min(1).default(100)
  }).optional()
});

export const updateWalletSchema = Joi.object({
  status: Joi.string().valid(...Object.values(WalletStatus)).optional(),
  
  metadata: Joi.object({
    label: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    category: Joi.string().trim().max(50).optional(),
    isDefault: Joi.boolean().optional(),
    isArchived: Joi.boolean().optional()
  }).optional(),
  
  security: Joi.object({
    isMultiSig: Joi.boolean().optional(),
    requiredSignatures: Joi.number().integer().min(1).max(15).optional(),
    signatories: Joi.array().items(Joi.string()).optional(),
    twoFactorEnabled: Joi.boolean().optional(),
    whitelistedAddresses: Joi.array().items(Joi.string()).optional()
  }).optional(),
  
  limits: Joi.object({
    dailyWithdrawal: positiveDecimalSchema.optional(),
    monthlyWithdrawal: positiveDecimalSchema.optional(),
    maxTransactionAmount: positiveDecimalSchema.optional(),
    minTransactionAmount: positiveDecimalSchema.optional(),
    dailyTransactionCount: Joi.number().integer().min(1).optional()
  }).optional()
}).min(1);

// Query validation schemas
export const assetQuerySchema = Joi.object({
  symbol: Joi.string().valid(...Object.values(AssetSymbol)).optional(),
  type: Joi.string().valid(...Object.values(AssetType)).optional(),
  class: Joi.string().valid(...Object.values(AssetClass)).optional(),
  status: Joi.string().valid(...Object.values(AssetStatus)).optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'symbol', 'currentPrice').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const walletQuerySchema = Joi.object({
  assetId: Joi.string().optional(),
  walletType: Joi.string().valid(...Object.values(WalletType)).optional(),
  status: Joi.string().valid(...Object.values(WalletStatus)).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'balance.total').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Validation middleware function
export const validationMiddleware = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: AssetRequest, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[source];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation failed', {
          source,
          errors: errorDetails,
          requestId: req.requestId,
          userId: req.user?.id
        });

        throw new ValidationError('Validation failed', errorDetails);
      }

      // Replace the original data with validated and sanitized data
      req[source] = value;

      logger.debug('Validation passed', {
        source,
        requestId: req.requestId,
        userId: req.user?.id
      });

      next();
    } catch (validationError) {
      next(validationError);
    }
  };
};

// Custom validation functions
export const validateAssetExists = async (assetId: string): Promise<boolean> => {
  // This would check if asset exists in database
  // For now, return true as placeholder
  return true;
};

export const validateWalletOwnership = async (walletId: string, userId: string): Promise<boolean> => {
  // This would check if user owns the wallet
  // For now, return true as placeholder
  return true;
};

export const validateUniqueAssetSymbol = async (symbol: AssetSymbol, excludeId?: string): Promise<boolean> => {
  // This would check if asset symbol is unique
  // For now, return true as placeholder
  return true;
};

// Sanitization functions
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeDecimal = (value: any): string => {
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value.replace(/[^0-9.]/g, '');
  }
  return '0';
};

// Parameter validation middleware
export const validateParams = (paramSchema: Joi.ObjectSchema) => {
  return validationMiddleware(paramSchema, 'params');
};

// Common parameter schemas
export const assetIdParamSchema = Joi.object({
  assetId: Joi.string().required()
});

export const walletIdParamSchema = Joi.object({
  walletId: Joi.string().required()
});

export default {
  validationMiddleware,
  createAssetSchema,
  updateAssetSchema,
  updateAssetPriceSchema,
  createWalletSchema,
  updateWalletSchema,
  assetQuerySchema,
  walletQuerySchema,
  assetIdParamSchema,
  walletIdParamSchema,
  validateParams,
  validateAssetExists,
  validateWalletOwnership,
  validateUniqueAssetSymbol,
  sanitizeString,
  sanitizeDecimal
};

