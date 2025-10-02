import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('CurrencyValidationMiddleware');

// Supported currencies
const SUPPORTED_FIAT_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'ZAR', 'BRL', 'INR', 'KRW', 'PLN'
];

const SUPPORTED_CRYPTO_CURRENCIES = [
  'BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'ADA', 'DOT', 'LINK', 'BNB', 'DOGE'
];

const SUPPORTED_METALS = [
  'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'COPPER', 'ALUMINUM'
];

const ALL_SUPPORTED_CURRENCIES = [
  ...SUPPORTED_FIAT_CURRENCIES,
  ...SUPPORTED_CRYPTO_CURRENCIES,
  ...SUPPORTED_METALS
];

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

// Currency conversion validation schema
export const currencyConversionSchema = Joi.object({
  fromCurrency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .required()
    .messages({
      'any.required': 'From currency is required',
      'any.only': `From currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  toCurrency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .required()
    .messages({
      'any.required': 'To currency is required',
      'any.only': `To currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
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
  
  date: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format',
      'date.max': 'Date cannot be in the future'
    })
});

// Exchange rate query schema
export const exchangeRateQuerySchema = Joi.object({
  base: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .optional()
    .messages({
      'any.only': `Base currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  target: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .optional()
    .messages({
      'any.only': `Target currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  date: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format',
      'date.max': 'Date cannot be in the future'
    }),
  
  historical: Joi.boolean()
    .optional()
    .default(false)
});

// Historical rates query schema
export const historicalRatesSchema = Joi.object({
  currency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': `Currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  baseCurrency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .default('USD')
    .messages({
      'any.only': `Base currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
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
  
  interval: Joi.string()
    .valid('1h', '4h', '1d', '1w', '1M')
    .default('1d')
    .messages({
      'any.only': 'Interval must be one of: 1h, 4h, 1d, 1w, 1M'
    })
});

// Metal prices query schema
export const metalPricesSchema = Joi.object({
  metal: Joi.string()
    .uppercase()
    .valid(...SUPPORTED_METALS)
    .optional()
    .messages({
      'any.only': `Metal must be one of: ${SUPPORTED_METALS.join(', ')}`
    }),
  
  unit: Joi.string()
    .valid('oz', 'gram', 'kg', 'pound')
    .default('oz')
    .messages({
      'any.only': 'Unit must be one of: oz, gram, kg, pound'
    }),
  
  currency: Joi.string()
    .uppercase()
    .valid(...SUPPORTED_FIAT_CURRENCIES)
    .default('USD')
    .messages({
      'any.only': `Currency must be one of: ${SUPPORTED_FIAT_CURRENCIES.join(', ')}`
    }),
  
  purity: Joi.number()
    .min(0.1)
    .max(1.0)
    .precision(3)
    .optional()
    .messages({
      'number.min': 'Purity must be at least 0.1 (10%)',
      'number.max': 'Purity cannot exceed 1.0 (100%)',
      'number.precision': 'Purity precision cannot exceed 3 decimal places'
    })
});

// Crypto prices query schema
export const cryptoPricesSchema = Joi.object({
  symbol: Joi.string()
    .uppercase()
    .valid(...SUPPORTED_CRYPTO_CURRENCIES)
    .optional()
    .messages({
      'any.only': `Symbol must be one of: ${SUPPORTED_CRYPTO_CURRENCIES.join(', ')}`
    }),
  
  currency: Joi.string()
    .uppercase()
    .valid(...SUPPORTED_FIAT_CURRENCIES)
    .default('USD')
    .messages({
      'any.only': `Currency must be one of: ${SUPPORTED_FIAT_CURRENCIES.join(', ')}`
    }),
  
  includeMarketCap: Joi.boolean()
    .default(false),
  
  includeVolume: Joi.boolean()
    .default(false),
  
  include24hChange: Joi.boolean()
    .default(true)
});

// Rate alert schema
export const rateAlertSchema = Joi.object({
  fromCurrency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .required()
    .messages({
      'any.required': 'From currency is required',
      'any.only': `From currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  toCurrency: Joi.string()
    .uppercase()
    .valid(...ALL_SUPPORTED_CURRENCIES)
    .required()
    .messages({
      'any.required': 'To currency is required',
      'any.only': `To currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
    }),
  
  targetRate: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      'any.required': 'Target rate is required',
      'number.positive': 'Target rate must be positive',
      'number.precision': 'Target rate precision cannot exceed 8 decimal places'
    }),
  
  condition: Joi.string()
    .valid('above', 'below', 'equal')
    .required()
    .messages({
      'any.required': 'Condition is required',
      'any.only': 'Condition must be one of: above, below, equal'
    }),
  
  tolerance: Joi.number()
    .min(0)
    .max(0.1)
    .precision(4)
    .default(0.001)
    .messages({
      'number.min': 'Tolerance must be non-negative',
      'number.max': 'Tolerance cannot exceed 10%',
      'number.precision': 'Tolerance precision cannot exceed 4 decimal places'
    }),
  
  expiresAt: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.format': 'Expiration date must be in ISO format',
      'date.min': 'Expiration date must be in the future'
    })
});

// Pagination validation
export const paginationSchema = Joi.object({
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
    .valid('rate', '-rate', 'timestamp', '-timestamp', 'currency', '-currency')
    .default('-timestamp')
    .messages({
      'any.only': 'Sort must be one of: rate, -rate, timestamp, -timestamp, currency, -currency'
    })
});

/**
 * Validate currency pair parameters
 */
export const validateCurrencyPair = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    fromCurrency: Joi.string()
      .uppercase()
      .valid(...ALL_SUPPORTED_CURRENCIES)
      .required()
      .messages({
        'any.required': 'From currency is required',
        'any.only': `From currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
      }),
    
    toCurrency: Joi.string()
      .uppercase()
      .valid(...ALL_SUPPORTED_CURRENCIES)
      .required()
      .messages({
        'any.required': 'To currency is required',
        'any.only': `To currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Validate single currency parameter
 */
export const validateCurrency = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    currency: Joi.string()
      .uppercase()
      .valid(...ALL_SUPPORTED_CURRENCIES)
      .required()
      .messages({
        'any.required': 'Currency is required',
        'any.only': `Currency must be one of: ${ALL_SUPPORTED_CURRENCIES.join(', ')}`
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Business rule validation for currency conversion
 */
export const currencyBusinessRuleValidation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body || req.query;

    // Prevent same currency conversion
    if (fromCurrency === toCurrency) {
      throw new ValidationError('From currency and to currency cannot be the same');
    }

    // Validate minimum conversion amounts
    const minimumAmounts: { [key: string]: number } = {
      BTC: 0.00001,
      ETH: 0.001,
      USD: 0.01,
      EUR: 0.01,
      GBP: 0.01,
      GOLD: 0.001,
      SILVER: 0.01
    };

    if (amount && fromCurrency) {
      const minAmount = minimumAmounts[fromCurrency] || 0.01;
      if (amount < minAmount) {
        throw new ValidationError(`Minimum conversion amount for ${fromCurrency} is ${minAmount}`);
      }
    }

    // Validate maximum conversion amounts for risk management
    const maximumAmounts: { [key: string]: number } = {
      BTC: 100,
      ETH: 1000,
      USD: 1000000,
      EUR: 1000000,
      GBP: 1000000,
      GOLD: 1000,
      SILVER: 10000
    };

    if (amount && fromCurrency) {
      const maxAmount = maximumAmounts[fromCurrency] || 1000000;
      if (amount > maxAmount) {
        throw new ValidationError(`Maximum conversion amount for ${fromCurrency} is ${maxAmount}`);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validate rate alert conditions
 */
export const validateRateAlert = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { fromCurrency, toCurrency, targetRate, condition } = req.body;

    // Validate that target rate makes sense for the currency pair
    if (targetRate <= 0) {
      throw new ValidationError('Target rate must be positive');
    }

    // Validate reasonable rate ranges
    const rateRanges: { [key: string]: { min: number; max: number } } = {
      'USD-EUR': { min: 0.5, max: 2.0 },
      'USD-GBP': { min: 0.5, max: 2.0 },
      'BTC-USD': { min: 1000, max: 1000000 },
      'ETH-USD': { min: 10, max: 100000 },
      'GOLD-USD': { min: 1000, max: 5000 }
    };

    const pairKey = `${fromCurrency}-${toCurrency}`;
    const reversePairKey = `${toCurrency}-${fromCurrency}`;
    
    let range = rateRanges[pairKey];
    if (!range && rateRanges[reversePairKey]) {
      // Use inverse range if reverse pair exists
      const reverseRange = rateRanges[reversePairKey];
      range = { min: 1 / reverseRange.max, max: 1 / reverseRange.min };
    }

    if (range && (targetRate < range.min || targetRate > range.max)) {
      throw new ValidationError(
        `Target rate for ${fromCurrency}/${toCurrency} should be between ${range.min} and ${range.max}`
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default {
  validationMiddleware,
  validateCurrencyPair,
  validateCurrency,
  currencyBusinessRuleValidation,
  validateRateAlert,
  currencyConversionSchema,
  exchangeRateQuerySchema,
  historicalRatesSchema,
  metalPricesSchema,
  cryptoPricesSchema,
  rateAlertSchema,
  paginationSchema
};
