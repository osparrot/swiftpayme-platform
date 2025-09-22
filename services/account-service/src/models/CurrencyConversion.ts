/**
 * SwiftPayMe Account Service - Currency Conversion Model
 * Comprehensive Mongoose model for currency conversion management
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

// Import types
import {
  SupportedCurrency,
  TransactionStatus,
  ConversionType,
  ICurrencyConversionDocument
} from '../types/account';

// ==================== ASSET TOKEN DETAILS SCHEMA ====================

const AssetTokenDetailsSchema = new Schema({
  tokenType: {
    type: String,
    required: true
  },
  tokenAmount: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  assetId: {
    type: String,
    required: true
  },
  tokenValue: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  }
}, { _id: false });

// ==================== CURRENCY CONVERSION SCHEMA ====================

const CurrencyConversionSchema = new Schema({
  conversionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `CONV_${uuidv4()}`
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  fromCurrency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true,
    index: true
  },
  toCurrency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true,
    index: true
  },
  fromAmount: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  toAmount: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  exchangeRate: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  conversionFee: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  conversionType: {
    type: String,
    required: true,
    enum: Object.values(ConversionType),
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true
  },
  
  // Related transactions
  debitTransactionId: {
    type: String,
    required: true,
    index: true
  },
  creditTransactionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Asset token details if applicable
  assetTokenDetails: {
    type: AssetTokenDetailsSchema,
    required: false
  },
  
  // External references
  externalConversionId: {
    type: String,
    required: false,
    index: true
  },
  paymentId: {
    type: String,
    required: false,
    index: true
  },
  workflowId: {
    type: String,
    required: false,
    index: true
  },
  
  // Processing details
  processedAt: {
    type: Date,
    required: false
  },
  completedAt: {
    type: Date,
    required: false
  },
  
  // Failure details
  failureReason: {
    type: String,
    required: false
  },
  
  // Cancellation details
  cancellationReason: {
    type: String,
    required: false
  },
  
  // Reversal details
  reversalReason: {
    type: String,
    required: false
  },
  reversedConversionId: {
    type: String,
    required: false
  },
  
  // Market data at time of conversion
  marketData: {
    spotRate: {
      type: Number,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    },
    spread: {
      type: Number,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    },
    volatility: {
      type: Number,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    },
    source: String,
    timestamp: Date
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    getters: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    getters: true 
  }
});

// ==================== INDEXES ====================

CurrencyConversionSchema.index({ userId: 1, createdAt: -1 });
CurrencyConversionSchema.index({ accountId: 1, createdAt: -1 });
CurrencyConversionSchema.index({ fromCurrency: 1, toCurrency: 1 });
CurrencyConversionSchema.index({ conversionType: 1, status: 1 });
CurrencyConversionSchema.index({ status: 1, createdAt: -1 });
CurrencyConversionSchema.index({ debitTransactionId: 1 });
CurrencyConversionSchema.index({ creditTransactionId: 1 });
CurrencyConversionSchema.index({ externalConversionId: 1 });
CurrencyConversionSchema.index({ paymentId: 1 });
CurrencyConversionSchema.index({ workflowId: 1 });

// Compound indexes for analytics
CurrencyConversionSchema.index({ 
  fromCurrency: 1, 
  toCurrency: 1, 
  status: 1, 
  createdAt: -1 
});

CurrencyConversionSchema.index({ 
  conversionType: 1, 
  status: 1, 
  createdAt: -1 
});

CurrencyConversionSchema.index({ 
  userId: 1, 
  conversionType: 1, 
  createdAt: -1 
});

// ==================== VIRTUALS ====================

CurrencyConversionSchema.virtual('isCompleted').get(function() {
  return this.status === TransactionStatus.COMPLETED;
});

CurrencyConversionSchema.virtual('isFailed').get(function() {
  return this.status === TransactionStatus.FAILED;
});

CurrencyConversionSchema.virtual('isPending').get(function() {
  return this.status === TransactionStatus.PENDING;
});

CurrencyConversionSchema.virtual('isProcessing').get(function() {
  return this.status === TransactionStatus.PROCESSING;
});

CurrencyConversionSchema.virtual('effectiveRate').get(function() {
  // Rate including fees
  const feeRate = this.conversionFee / this.fromAmount;
  return this.exchangeRate * (1 - feeRate);
});

CurrencyConversionSchema.virtual('netToAmount').get(function() {
  // Amount after deducting fees
  return this.toAmount - this.conversionFee;
});

CurrencyConversionSchema.virtual('feePercentage').get(function() {
  return (this.conversionFee / this.fromAmount) * 100;
});

CurrencyConversionSchema.virtual('isAssetTokenConversion').get(function() {
  return this.conversionType === ConversionType.ASSET_TOKEN_TO_CURRENCY ||
         this.conversionType === ConversionType.CURRENCY_TO_ASSET_TOKEN;
});

CurrencyConversionSchema.virtual('isCurrencyConversion').get(function() {
  return this.conversionType === ConversionType.CURRENCY_TO_CURRENCY;
});

CurrencyConversionSchema.virtual('processingTime').get(function() {
  if (this.completedAt && this.createdAt) {
    return this.completedAt.getTime() - this.createdAt.getTime();
  }
  return null;
});

// ==================== METHODS ====================

CurrencyConversionSchema.methods.execute = async function(): Promise<void> {
  if (this.status !== TransactionStatus.PENDING) {
    throw new Error(`Cannot execute conversion with status: ${this.status}`);
  }
  
  this.status = TransactionStatus.PROCESSING;
  this.processedAt = new Date();
  
  await this.save();
  
  // Note: Actual execution logic would involve:
  // 1. Validating account balances
  // 2. Creating debit transaction
  // 3. Creating credit transaction
  // 4. Updating account balances
  // 5. Updating conversion status
  
  this.status = TransactionStatus.COMPLETED;
  this.completedAt = new Date();
  
  await this.save();
};

CurrencyConversionSchema.methods.cancel = async function(reason: string): Promise<void> {
  if (this.status === TransactionStatus.COMPLETED) {
    throw new Error('Cannot cancel a completed conversion');
  }
  
  this.status = TransactionStatus.CANCELLED;
  this.cancellationReason = reason;
  this.processedAt = new Date();
  
  await this.save();
};

CurrencyConversionSchema.methods.fail = async function(reason: string): Promise<void> {
  if (this.status === TransactionStatus.COMPLETED) {
    throw new Error('Cannot fail a completed conversion');
  }
  
  this.status = TransactionStatus.FAILED;
  this.failureReason = reason;
  this.processedAt = new Date();
  
  await this.save();
};

CurrencyConversionSchema.methods.reverse = async function(reason: string): Promise<ICurrencyConversionDocument> {
  if (this.status !== TransactionStatus.COMPLETED) {
    throw new Error('Can only reverse completed conversions');
  }
  
  // Create reversal conversion
  const reversalConversion = new CurrencyConversion({
    userId: this.userId,
    accountId: this.accountId,
    fromCurrency: this.toCurrency, // Swap currencies
    toCurrency: this.fromCurrency,
    fromAmount: this.toAmount,
    toAmount: this.fromAmount,
    exchangeRate: 1 / this.exchangeRate,
    conversionFee: 0, // No fee for reversals
    conversionType: this.conversionType,
    debitTransactionId: this.creditTransactionId, // Swap transaction IDs
    creditTransactionId: this.debitTransactionId,
    metadata: {
      originalConversionId: this.conversionId,
      reversalReason: reason,
      isReversal: true
    }
  });
  
  await reversalConversion.save();
  
  // Update original conversion
  this.status = TransactionStatus.REVERSED;
  this.reversalReason = reason;
  this.reversedConversionId = reversalConversion.conversionId;
  
  await this.save();
  
  return reversalConversion;
};

CurrencyConversionSchema.methods.updateStatus = async function(
  status: TransactionStatus,
  reason?: string
): Promise<void> {
  this.status = status;
  
  if (reason) {
    switch (status) {
      case TransactionStatus.FAILED:
        this.failureReason = reason;
        break;
      case TransactionStatus.CANCELLED:
        this.cancellationReason = reason;
        break;
      case TransactionStatus.REVERSED:
        this.reversalReason = reason;
        break;
    }
  }
  
  if (status === TransactionStatus.COMPLETED) {
    this.completedAt = new Date();
  }
  
  if ([TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.CANCELLED].includes(status)) {
    this.processedAt = new Date();
  }
  
  await this.save();
};

CurrencyConversionSchema.methods.setMarketData = async function(marketData: {
  spotRate: number;
  spread: number;
  volatility: number;
  source: string;
}): Promise<void> {
  this.marketData = {
    ...marketData,
    timestamp: new Date()
  };
  
  await this.save();
};

CurrencyConversionSchema.methods.calculateSlippage = function(): number {
  if (!this.marketData?.spotRate) return 0;
  
  const expectedAmount = this.fromAmount * this.marketData.spotRate;
  const actualAmount = this.toAmount;
  
  return ((expectedAmount - actualAmount) / expectedAmount) * 100;
};

// ==================== STATIC METHODS ====================

CurrencyConversionSchema.statics.findByUserId = function(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

CurrencyConversionSchema.statics.findByAccountId = function(
  accountId: string,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ accountId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

CurrencyConversionSchema.statics.findByCurrencyPair = function(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ fromCurrency, toCurrency })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

CurrencyConversionSchema.statics.findByType = function(
  conversionType: ConversionType,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ conversionType })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

CurrencyConversionSchema.statics.findByStatus = function(
  status: TransactionStatus,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

CurrencyConversionSchema.statics.getConversionAnalytics = async function(
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  accountId?: string
) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  if (userId) matchStage.userId = userId;
  if (accountId) matchStage.accountId = accountId;
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          fromCurrency: '$fromCurrency',
          toCurrency: '$toCurrency',
          conversionType: '$conversionType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalFromAmount: { $sum: '$fromAmount' },
        totalToAmount: { $sum: '$toAmount' },
        totalFees: { $sum: '$conversionFee' },
        avgExchangeRate: { $avg: '$exchangeRate' },
        avgProcessingTime: { $avg: '$processingTime' }
      }
    },
    {
      $group: {
        _id: null,
        totalConversions: { $sum: '$count' },
        totalVolume: { $sum: '$totalFromAmount' },
        totalFees: { $sum: '$totalFees' },
        conversionsByPair: {
          $push: {
            fromCurrency: '$_id.fromCurrency',
            toCurrency: '$_id.toCurrency',
            conversionType: '$_id.conversionType',
            status: '$_id.status',
            count: '$count',
            totalFromAmount: '$totalFromAmount',
            totalToAmount: '$totalToAmount',
            totalFees: '$totalFees',
            avgExchangeRate: '$avgExchangeRate',
            avgProcessingTime: '$avgProcessingTime'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

CurrencyConversionSchema.statics.getVolumeByPeriod = async function(
  period: 'daily' | 'weekly' | 'monthly',
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = { status: TransactionStatus.COMPLETED };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  let dateGrouping: any;
  switch (period) {
    case 'daily':
      dateGrouping = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'weekly':
      dateGrouping = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      break;
    case 'monthly':
      dateGrouping = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          period: dateGrouping,
          fromCurrency: '$fromCurrency',
          toCurrency: '$toCurrency'
        },
        count: { $sum: 1 },
        totalFromAmount: { $sum: '$fromAmount' },
        totalToAmount: { $sum: '$toAmount' },
        totalFees: { $sum: '$conversionFee' }
      }
    },
    { $sort: { '_id.period': 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

CurrencyConversionSchema.statics.getTopCurrencyPairs = async function(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = { status: TransactionStatus.COMPLETED };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          fromCurrency: '$fromCurrency',
          toCurrency: '$toCurrency'
        },
        count: { $sum: 1 },
        totalVolume: { $sum: '$fromAmount' },
        totalFees: { $sum: '$conversionFee' },
        avgExchangeRate: { $avg: '$exchangeRate' }
      }
    },
    { $sort: { totalVolume: -1 } },
    { $limit: limit }
  ];
  
  return await this.aggregate(pipeline);
};

// ==================== MIDDLEWARE ====================

CurrencyConversionSchema.pre('save', function(next) {
  // Set processing timestamp if moving to processing
  if (this.isModified('status') && this.status === TransactionStatus.PROCESSING) {
    if (!this.processedAt) {
      this.processedAt = new Date();
    }
  }
  
  // Set completion timestamp if moving to completed
  if (this.isModified('status') && this.status === TransactionStatus.COMPLETED) {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }
  
  next();
});

CurrencyConversionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== EXPORT ====================

export interface ICurrencyConversion extends ICurrencyConversionDocument {}

export const CurrencyConversion: Model<ICurrencyConversion> = mongoose.model<ICurrencyConversion>('CurrencyConversion', CurrencyConversionSchema);

export default CurrencyConversion;

