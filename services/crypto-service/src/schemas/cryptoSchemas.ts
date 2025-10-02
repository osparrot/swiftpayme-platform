import Joi from 'joi';
import { CryptoCurrency, WalletType, TransactionType, NetworkType } from '../enums/cryptoEnums';

// Create wallet schema
export const createWalletSchema = Joi.object({
  currency: Joi.string()
    .valid(...Object.values(CryptoCurrency))
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: ' + Object.values(CryptoCurrency).join(', ')
    }),
  
  type: Joi.string()
    .valid(...Object.values(WalletType))
    .default(WalletType.HOT)
    .messages({
      'any.only': 'Wallet type must be one of: ' + Object.values(WalletType).join(', ')
    }),
  
  label: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Label must be at least 1 character long',
      'string.max': 'Label must not exceed 100 characters'
    }),
  
  network: Joi.string()
    .valid(...Object.values(NetworkType))
    .default(NetworkType.MAINNET)
    .messages({
      'any.only': 'Network must be one of: ' + Object.values(NetworkType).join(', ')
    })
});

// Send transaction schema
export const sendTransactionSchema = Joi.object({
  fromWalletId: Joi.string()
    .required()
    .messages({
      'any.required': 'From wallet ID is required'
    }),
  
  toAddress: Joi.string()
    .required()
    .messages({
      'any.required': 'Destination address is required'
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
    .valid(...Object.values(CryptoCurrency))
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: ' + Object.values(CryptoCurrency).join(', ')
    }),
  
  feeRate: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.positive': 'Fee rate must be positive'
    }),
  
  memo: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Memo must not exceed 500 characters'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high'
    })
});

// Create Lightning invoice schema
export const createLightningInvoiceSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount precision cannot exceed 8 decimal places'
    }),
  
  description: Joi.string()
    .max(639)
    .trim()
    .required()
    .messages({
      'any.required': 'Description is required',
      'string.max': 'Description must not exceed 639 characters'
    }),
  
  expiry: Joi.number()
    .integer()
    .min(60)
    .max(86400)
    .default(3600)
    .messages({
      'number.integer': 'Expiry must be an integer',
      'number.min': 'Expiry must be at least 60 seconds',
      'number.max': 'Expiry must not exceed 24 hours (86400 seconds)'
    }),
  
  private: Joi.boolean()
    .default(false)
});

// Pay Lightning invoice schema
export const payLightningInvoiceSchema = Joi.object({
  paymentRequest: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment request (invoice) is required'
    }),
  
  maxFee: Joi.number()
    .positive()
    .precision(8)
    .optional()
    .messages({
      'number.positive': 'Max fee must be positive',
      'number.precision': 'Max fee precision cannot exceed 8 decimal places'
    }),
  
  timeoutSeconds: Joi.number()
    .integer()
    .min(10)
    .max(300)
    .default(60)
    .messages({
      'number.integer': 'Timeout must be an integer',
      'number.min': 'Timeout must be at least 10 seconds',
      'number.max': 'Timeout must not exceed 300 seconds'
    })
});

// Validate address schema
export const validateAddressSchema = Joi.object({
  address: Joi.string()
    .required()
    .messages({
      'any.required': 'Address is required'
    }),
  
  currency: Joi.string()
    .valid(...Object.values(CryptoCurrency))
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: ' + Object.values(CryptoCurrency).join(', ')
    }),
  
  network: Joi.string()
    .valid(...Object.values(NetworkType))
    .default(NetworkType.MAINNET)
    .messages({
      'any.only': 'Network must be one of: ' + Object.values(NetworkType).join(', ')
    })
});

// Estimate fee schema
export const estimateFeeSchema = Joi.object({
  fromAddress: Joi.string()
    .required()
    .messages({
      'any.required': 'From address is required'
    }),
  
  toAddress: Joi.string()
    .required()
    .messages({
      'any.required': 'To address is required'
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
    .valid(...Object.values(CryptoCurrency))
    .required()
    .messages({
      'any.required': 'Currency is required',
      'any.only': 'Currency must be one of: ' + Object.values(CryptoCurrency).join(', ')
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high'
    })
});

// Update wallet schema
export const updateWalletSchema = Joi.object({
  label: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Label must be at least 1 character long',
      'string.max': 'Label must not exceed 100 characters'
    }),
  
  isActive: Joi.boolean()
    .optional(),
  
  settings: Joi.object({
    autoBackup: Joi.boolean().optional(),
    notificationPreferences: Joi.object({
      transactionConfirmations: Joi.boolean().default(true),
      balanceUpdates: Joi.boolean().default(true),
      securityAlerts: Joi.boolean().default(true)
    }).optional(),
    securityLevel: Joi.string()
      .valid('standard', 'high', 'maximum')
      .default('standard')
      .optional()
  }).optional()
});

// Backup wallet schema
export const backupWalletSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'any.required': 'Backup password is required',
      'string.min': 'Backup password must be at least 8 characters long'
    }),
  
  includePrivateKeys: Joi.boolean()
    .default(true),
  
  format: Joi.string()
    .valid('json', 'encrypted')
    .default('encrypted')
    .messages({
      'any.only': 'Backup format must be either json or encrypted'
    })
});

// Restore wallet schema
export const restoreWalletSchema = Joi.object({
  backupData: Joi.string()
    .required()
    .messages({
      'any.required': 'Backup data is required'
    }),
  
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'any.required': 'Backup password is required',
      'string.min': 'Backup password must be at least 8 characters long'
    }),
  
  newLabel: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Label must be at least 1 character long',
      'string.max': 'Label must not exceed 100 characters'
    })
});

// Webhook schema
export const webhookSchema = Joi.object({
  event: Joi.string()
    .required()
    .messages({
      'any.required': 'Event type is required'
    }),
  
  data: Joi.object()
    .required()
    .messages({
      'any.required': 'Event data is required'
    }),
  
  timestamp: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Timestamp is required',
      'date.format': 'Timestamp must be in ISO format'
    }),
  
  signature: Joi.string()
    .optional()
});

// Query parameters schemas
export const transactionQuerySchema = Joi.object({
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
  
  status: Joi.string()
    .valid('pending', 'confirmed', 'failed', 'cancelled')
    .optional(),
  
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .optional(),
  
  currency: Joi.string()
    .valid(...Object.values(CryptoCurrency))
    .optional(),
  
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format'
    })
});

export const walletQuerySchema = Joi.object({
  currency: Joi.string()
    .valid(...Object.values(CryptoCurrency))
    .optional(),
  
  type: Joi.string()
    .valid(...Object.values(WalletType))
    .optional(),
  
  isActive: Joi.boolean()
    .optional()
});
