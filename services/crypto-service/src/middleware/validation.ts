import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('CryptoValidationMiddleware');

/**
 * Generic validation middleware factory
 * @param schema Joi validation schema
 * @param property Request property to validate (body, query, params)
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

      // Replace the request property with the validated and sanitized value
      req[property] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate wallet ID parameter
 */
export const validateWalletId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    walletId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .message('Wallet ID must be a valid MongoDB ObjectId')
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
      .message('Transaction ID must be a valid MongoDB ObjectId')
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
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
      .valid('createdAt', '-createdAt', 'amount', '-amount', 'status', '-status')
      .default('-createdAt')
      .messages({
        'any.only': 'Sort must be one of: createdAt, -createdAt, amount, -amount, status, -status'
      })
  });

  validationMiddleware(schema, 'query')(req, res, next);
};

/**
 * Validate Bitcoin address format
 */
export const validateBitcoinAddress = (address: string, network: 'mainnet' | 'testnet' = 'mainnet'): boolean => {
  try {
    // Basic Bitcoin address validation patterns
    const patterns = {
      mainnet: {
        p2pkh: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        p2sh: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        bech32: /^bc1[a-z0-9]{39,59}$/,
        bech32m: /^bc1p[a-z0-9]{58}$/
      },
      testnet: {
        p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        p2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        bech32: /^tb1[a-z0-9]{39,59}$/,
        bech32m: /^tb1p[a-z0-9]{58}$/
      }
    };

    const networkPatterns = patterns[network];
    
    return Object.values(networkPatterns).some(pattern => pattern.test(address));
  } catch (error) {
    logger.error('Bitcoin address validation error', { address, network, error });
    return false;
  }
};

/**
 * Validate cryptocurrency amount
 */
export const validateCryptoAmount = (amount: number, currency: string): boolean => {
  try {
    // Check for positive amount
    if (amount <= 0) {
      return false;
    }

    // Check precision based on currency
    const maxDecimals = {
      BTC: 8,
      ETH: 18,
      LTC: 8,
      BCH: 8,
      DOGE: 8
    };

    const decimals = maxDecimals[currency as keyof typeof maxDecimals] || 8;
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    
    return decimalPlaces <= decimals;
  } catch (error) {
    logger.error('Crypto amount validation error', { amount, currency, error });
    return false;
  }
};

/**
 * Validate Lightning Network invoice
 */
export const validateLightningInvoice = (invoice: string): boolean => {
  try {
    // Basic Lightning invoice validation (starts with ln)
    const lightningPattern = /^ln(bc|tb)[a-z0-9]+$/i;
    return lightningPattern.test(invoice);
  } catch (error) {
    logger.error('Lightning invoice validation error', { invoice, error });
    return false;
  }
};

/**
 * Sanitize and validate memo/description fields
 */
export const sanitizeMemo = (memo: string): string => {
  if (!memo) return '';
  
  // Remove potentially dangerous characters and limit length
  return memo
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
    .trim()
    .substring(0, 500); // Limit to 500 characters
};

/**
 * Validate fee rate
 */
export const validateFeeRate = (feeRate: number, currency: string): boolean => {
  try {
    if (feeRate <= 0) {
      return false;
    }

    // Fee rate limits by currency (satoshis per byte for Bitcoin)
    const limits = {
      BTC: { min: 1, max: 1000 },
      ETH: { min: 1, max: 500 }, // Gwei
      LTC: { min: 1, max: 1000 },
      BCH: { min: 1, max: 1000 },
      DOGE: { min: 1, max: 1000 }
    };

    const limit = limits[currency as keyof typeof limits];
    if (!limit) {
      return true; // Allow if currency not in limits
    }

    return feeRate >= limit.min && feeRate <= limit.max;
  } catch (error) {
    logger.error('Fee rate validation error', { feeRate, currency, error });
    return false;
  }
};

/**
 * Validate wallet label
 */
export const validateWalletLabel = (label: string): boolean => {
  if (!label) return true; // Optional field
  
  // Check length and allowed characters
  const labelPattern = /^[a-zA-Z0-9\s\-_]{1,100}$/;
  return labelPattern.test(label.trim());
};

/**
 * Rate limiting validation for high-value transactions
 */
export const validateHighValueTransaction = (amount: number, currency: string): boolean => {
  try {
    // High-value thresholds by currency
    const thresholds = {
      BTC: 1.0,
      ETH: 10.0,
      LTC: 100.0,
      BCH: 10.0,
      DOGE: 100000.0
    };

    const threshold = thresholds[currency as keyof typeof thresholds];
    if (!threshold) {
      return false; // Require additional validation for unknown currencies
    }

    return amount < threshold;
  } catch (error) {
    logger.error('High-value transaction validation error', { amount, currency, error });
    return false;
  }
};

/**
 * Validate transaction priority
 */
export const validateTransactionPriority = (priority: string): boolean => {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(priority.toLowerCase());
};

/**
 * Custom validation for crypto-specific business rules
 */
export const cryptoBusinessRuleValidation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { body } = req;

    // Validate Bitcoin addresses if present
    if (body.toAddress && body.currency === 'BTC') {
      const network = process.env.BITCOIN_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
      if (!validateBitcoinAddress(body.toAddress, network)) {
        throw new ValidationError('Invalid Bitcoin address format');
      }
    }

    // Validate crypto amounts
    if (body.amount && body.currency) {
      if (!validateCryptoAmount(body.amount, body.currency)) {
        throw new ValidationError('Invalid amount precision for the specified currency');
      }
    }

    // Validate fee rates
    if (body.feeRate && body.currency) {
      if (!validateFeeRate(body.feeRate, body.currency)) {
        throw new ValidationError('Fee rate is outside acceptable range');
      }
    }

    // Validate Lightning invoices
    if (body.paymentRequest) {
      if (!validateLightningInvoice(body.paymentRequest)) {
        throw new ValidationError('Invalid Lightning Network invoice format');
      }
    }

    // Sanitize memo fields
    if (body.memo) {
      body.memo = sanitizeMemo(body.memo);
    }

    // Validate wallet labels
    if (body.label) {
      if (!validateWalletLabel(body.label)) {
        throw new ValidationError('Wallet label contains invalid characters or exceeds length limit');
      }
    }

    // Validate transaction priority
    if (body.priority) {
      if (!validateTransactionPriority(body.priority)) {
        throw new ValidationError('Invalid transaction priority');
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default {
  validationMiddleware,
  validateWalletId,
  validateTransactionId,
  validatePagination,
  cryptoBusinessRuleValidation,
  validateBitcoinAddress,
  validateCryptoAmount,
  validateLightningInvoice,
  sanitizeMemo,
  validateFeeRate,
  validateWalletLabel,
  validateHighValueTransaction,
  validateTransactionPriority
};
