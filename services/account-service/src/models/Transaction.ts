/**
 * SwiftPayMe Account Service - Transaction Model
 * Comprehensive Mongoose model for account transaction management
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

// Import types
import {
  SupportedCurrency,
  TransactionType,
  TransactionStatus,
  ConversionType,
  ITransactionDocument
} from '../types/account';

// ==================== CONVERSION DETAILS SCHEMA ====================

const ConversionDetailsSchema = new Schema({
  fromCurrency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true
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
    enum: Object.values(ConversionType)
  }
}, { _id: false });

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
  tokenValue: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  assetId: {
    type: String,
    required: true
  }
}, { _id: false });

// ==================== TRANSACTION SCHEMA ====================

const TransactionSchema = new Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `TXN_${uuidv4()}`
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(TransactionType),
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  currency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true,
    index: true
  },
  balanceAfter: {
    type: Number,
    required: true,
    default: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  reference: {
    type: String,
    required: false,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Related transaction for conversions and transfers
  relatedTransactionId: {
    type: String,
    required: false,
    index: true
  },
  
  // Conversion specific fields
  conversionDetails: {
    type: ConversionDetailsSchema,
    required: false
  },
  
  // Asset token conversion fields
  assetTokenDetails: {
    type: AssetTokenDetailsSchema,
    required: false
  },
  
  // External references
  externalTransactionId: {
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
  
  // Processing timestamps
  processedAt: {
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
  reversedTransactionId: {
    type: String,
    required: false
  },
  
  // Fee information
  fees: {
    processingFee: {
      type: Number,
      default: 0,
      min: 0,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    },
    conversionFee: {
      type: Number,
      default: 0,
      min: 0,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    },
    networkFee: {
      type: Number,
      default: 0,
      min: 0,
      get: (v: number) => new Decimal(v).toNumber(),
      set: (v: number) => new Decimal(v).toNumber()
    }
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

TransactionSchema.index({ accountId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ currency: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ reference: 1 });
TransactionSchema.index({ externalTransactionId: 1 });
TransactionSchema.index({ paymentId: 1 });
TransactionSchema.index({ workflowId: 1 });
TransactionSchema.index({ relatedTransactionId: 1 });

// Compound indexes for analytics
TransactionSchema.index({ 
  accountId: 1, 
  type: 1, 
  status: 1, 
  createdAt: -1 
});

TransactionSchema.index({ 
  userId: 1, 
  currency: 1, 
  createdAt: -1 
});

TransactionSchema.index({ 
  type: 1, 
  currency: 1, 
  amount: 1, 
  createdAt: -1 
});

// ==================== VIRTUALS ====================

TransactionSchema.virtual('isCompleted').get(function() {
  return this.status === TransactionStatus.COMPLETED;
});

TransactionSchema.virtual('isFailed').get(function() {
  return this.status === TransactionStatus.FAILED;
});

TransactionSchema.virtual('isPending').get(function() {
  return this.status === TransactionStatus.PENDING;
});

TransactionSchema.virtual('isProcessing').get(function() {
  return this.status === TransactionStatus.PROCESSING;
});

TransactionSchema.virtual('totalFees').get(function() {
  const fees = this.fees || {};
  return (fees.processingFee || 0) + (fees.conversionFee || 0) + (fees.networkFee || 0);
});

TransactionSchema.virtual('netAmount').get(function() {
  const totalFees = this.totalFees;
  return this.amount - totalFees;
});

TransactionSchema.virtual('isDebit').get(function() {
  return [
    TransactionType.WITHDRAWAL,
    TransactionType.TRANSFER_OUT,
    TransactionType.CRYPTO_PURCHASE,
    TransactionType.FEE_DEDUCTION
  ].includes(this.type);
});

TransactionSchema.virtual('isCredit').get(function() {
  return [
    TransactionType.DEPOSIT,
    TransactionType.TRANSFER_IN,
    TransactionType.REFUND,
    TransactionType.ADJUSTMENT
  ].includes(this.type);
});

TransactionSchema.virtual('isConversion').get(function() {
  return [
    TransactionType.CURRENCY_CONVERSION,
    TransactionType.ASSET_TOKEN_CONVERSION
  ].includes(this.type);
});

// ==================== METHODS ====================

TransactionSchema.methods.complete = async function(): Promise<void> {
  if (this.status !== TransactionStatus.PROCESSING) {
    throw new Error(`Cannot complete transaction with status: ${this.status}`);
  }
  
  this.status = TransactionStatus.COMPLETED;
  this.processedAt = new Date();
  
  await this.save();
};

TransactionSchema.methods.fail = async function(reason: string): Promise<void> {
  if (this.status === TransactionStatus.COMPLETED) {
    throw new Error('Cannot fail a completed transaction');
  }
  
  this.status = TransactionStatus.FAILED;
  this.failureReason = reason;
  this.processedAt = new Date();
  
  await this.save();
};

TransactionSchema.methods.cancel = async function(reason: string): Promise<void> {
  if (this.status === TransactionStatus.COMPLETED) {
    throw new Error('Cannot cancel a completed transaction');
  }
  
  this.status = TransactionStatus.CANCELLED;
  this.cancellationReason = reason;
  this.processedAt = new Date();
  
  await this.save();
};

TransactionSchema.methods.reverse = async function(reason: string): Promise<ITransactionDocument> {
  if (this.status !== TransactionStatus.COMPLETED) {
    throw new Error('Can only reverse completed transactions');
  }
  
  // Create reversal transaction
  const reversalTransaction = new Transaction({
    accountId: this.accountId,
    userId: this.userId,
    type: this.isDebit ? TransactionType.REFUND : TransactionType.ADJUSTMENT,
    amount: this.amount,
    currency: this.currency,
    description: `Reversal of transaction ${this.transactionId}: ${reason}`,
    reference: `REV_${this.transactionId}`,
    relatedTransactionId: this.transactionId,
    metadata: {
      originalTransactionId: this.transactionId,
      reversalReason: reason,
      isReversal: true
    }
  });
  
  await reversalTransaction.save();
  
  // Update original transaction
  this.status = TransactionStatus.REVERSED;
  this.reversalReason = reason;
  this.reversedTransactionId = reversalTransaction.transactionId;
  
  await this.save();
  
  return reversalTransaction;
};

TransactionSchema.methods.updateStatus = async function(
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
  
  if ([TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.CANCELLED].includes(status)) {
    this.processedAt = new Date();
  }
  
  await this.save();
};

TransactionSchema.methods.addFee = async function(
  feeType: 'processingFee' | 'conversionFee' | 'networkFee',
  amount: number
): Promise<void> {
  if (!this.fees) {
    this.fees = {};
  }
  
  this.fees[feeType] = (this.fees[feeType] || 0) + amount;
  await this.save();
};

TransactionSchema.methods.setBalanceAfter = async function(balance: number): Promise<void> {
  this.balanceAfter = balance;
  await this.save();
};

// ==================== STATIC METHODS ====================

TransactionSchema.statics.findByAccountId = function(
  accountId: string,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ accountId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

TransactionSchema.statics.findByUserId = function(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

TransactionSchema.statics.findByType = function(
  type: TransactionType,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

TransactionSchema.statics.findByStatus = function(
  status: TransactionStatus,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

TransactionSchema.statics.findByReference = function(reference: string) {
  return this.find({ reference });
};

TransactionSchema.statics.findByPaymentId = function(paymentId: string) {
  return this.find({ paymentId });
};

TransactionSchema.statics.findByWorkflowId = function(workflowId: string) {
  return this.find({ workflowId });
};

TransactionSchema.statics.getTransactionAnalytics = async function(
  startDate?: Date,
  endDate?: Date,
  accountId?: string,
  userId?: string
) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  if (accountId) matchStage.accountId = accountId;
  if (userId) matchStage.userId = userId;
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status',
          currency: '$currency'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        totalFees: { $sum: '$totalFees' }
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: '$count' },
        totalVolume: { $sum: '$totalAmount' },
        totalFees: { $sum: '$totalFees' },
        transactionsByType: {
          $push: {
            type: '$_id.type',
            status: '$_id.status',
            currency: '$_id.currency',
            count: '$count',
            totalAmount: '$totalAmount',
            avgAmount: '$avgAmount',
            totalFees: '$totalFees'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

TransactionSchema.statics.getVolumeByPeriod = async function(
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
          currency: '$currency'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' }
      }
    },
    { $sort: { '_id.period': 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// ==================== MIDDLEWARE ====================

TransactionSchema.pre('save', function(next) {
  // Set processing status if moving from pending
  if (this.isModified('status') && this.status === TransactionStatus.PROCESSING) {
    if (!this.processedAt) {
      this.processedAt = new Date();
    }
  }
  
  next();
});

TransactionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== EXPORT ====================

export interface ITransaction extends ITransactionDocument {}

export const Transaction: Model<ITransaction> = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;

