/**
 * SwiftPayMe Account Service - Account Model
 * Comprehensive Mongoose model for multi-currency account management
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

// Import types
import {
  SupportedCurrency,
  AccountStatus,
  BalanceType,
  IAccountDocument,
  ICurrencyBalance
} from '../types/account';

// ==================== CURRENCY BALANCE SCHEMA ====================

const CurrencyBalanceSchema = new Schema({
  currency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    uppercase: true
  },
  available: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  pending: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  reserved: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  frozen: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

// ==================== ACCOUNT SCHEMA ====================

const AccountSchema = new Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ACC_${uuidv4()}`
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(AccountStatus),
    default: AccountStatus.ACTIVE,
    index: true
  },
  balances: {
    type: [CurrencyBalanceSchema],
    required: true,
    default: () => [
      {
        currency: SupportedCurrency.USD,
        available: 0,
        pending: 0,
        reserved: 0,
        frozen: 0,
        lastUpdated: new Date()
      }
    ]
  },
  defaultCurrency: {
    type: String,
    required: true,
    enum: Object.values(SupportedCurrency),
    default: SupportedCurrency.USD,
    uppercase: true
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

AccountSchema.index({ userId: 1 }, { unique: true });
AccountSchema.index({ userId: 1, status: 1 });
AccountSchema.index({ status: 1 });
AccountSchema.index({ defaultCurrency: 1 });
AccountSchema.index({ createdAt: -1 });
AccountSchema.index({ updatedAt: -1 });

// Compound indexes for analytics
AccountSchema.index({ 
  status: 1, 
  defaultCurrency: 1, 
  createdAt: -1 
});

// ==================== VIRTUALS ====================

AccountSchema.virtual('totalBalance').get(function() {
  // Calculate total balance in USD equivalent
  // This would require exchange rates in a real implementation
  return this.balances.reduce((total: number, balance: ICurrencyBalance) => {
    return total + balance.available + balance.pending;
  }, 0);
});

AccountSchema.virtual('isActive').get(function() {
  return this.status === AccountStatus.ACTIVE;
});

AccountSchema.virtual('totalAvailableBalance').get(function() {
  return this.balances.reduce((total: number, balance: ICurrencyBalance) => {
    return total + balance.available;
  }, 0);
});

AccountSchema.virtual('totalReservedBalance').get(function() {
  return this.balances.reduce((total: number, balance: ICurrencyBalance) => {
    return total + balance.reserved;
  }, 0);
});

AccountSchema.virtual('totalFrozenBalance').get(function() {
  return this.balances.reduce((total: number, balance: ICurrencyBalance) => {
    return total + balance.frozen;
  }, 0);
});

// ==================== METHODS ====================

AccountSchema.methods.getBalance = function(
  currency: SupportedCurrency, 
  type: BalanceType = BalanceType.AVAILABLE
): number {
  const currencyBalance = this.balances.find((b: ICurrencyBalance) => b.currency === currency);
  if (!currencyBalance) return 0;
  
  switch (type) {
    case BalanceType.AVAILABLE:
      return currencyBalance.available;
    case BalanceType.PENDING:
      return currencyBalance.pending;
    case BalanceType.RESERVED:
      return currencyBalance.reserved;
    case BalanceType.FROZEN:
      return currencyBalance.frozen;
    default:
      return currencyBalance.available;
  }
};

AccountSchema.methods.updateBalance = async function(
  currency: SupportedCurrency,
  amount: number,
  type: BalanceType = BalanceType.AVAILABLE
): Promise<void> {
  let currencyBalance = this.balances.find((b: ICurrencyBalance) => b.currency === currency);
  
  if (!currencyBalance) {
    // Add new currency balance
    currencyBalance = {
      currency,
      available: 0,
      pending: 0,
      reserved: 0,
      frozen: 0,
      lastUpdated: new Date()
    };
    this.balances.push(currencyBalance);
  }
  
  const currentAmount = new Decimal(currencyBalance[type] || 0);
  const newAmount = currentAmount.plus(amount);
  
  if (newAmount.isNegative()) {
    throw new Error(`Insufficient ${type} balance for ${currency}`);
  }
  
  currencyBalance[type] = newAmount.toNumber();
  currencyBalance.lastUpdated = new Date();
  
  await this.save();
};

AccountSchema.methods.reserveBalance = async function(
  currency: SupportedCurrency,
  amount: number
): Promise<boolean> {
  const availableBalance = this.getBalance(currency, BalanceType.AVAILABLE);
  
  if (availableBalance < amount) {
    return false;
  }
  
  await this.updateBalance(currency, -amount, BalanceType.AVAILABLE);
  await this.updateBalance(currency, amount, BalanceType.RESERVED);
  
  return true;
};

AccountSchema.methods.releaseReservedBalance = async function(
  currency: SupportedCurrency,
  amount: number
): Promise<void> {
  const reservedBalance = this.getBalance(currency, BalanceType.RESERVED);
  
  if (reservedBalance < amount) {
    throw new Error(`Insufficient reserved balance for ${currency}`);
  }
  
  await this.updateBalance(currency, -amount, BalanceType.RESERVED);
  await this.updateBalance(currency, amount, BalanceType.AVAILABLE);
};

AccountSchema.methods.freezeBalance = async function(
  currency: SupportedCurrency,
  amount: number
): Promise<boolean> {
  const availableBalance = this.getBalance(currency, BalanceType.AVAILABLE);
  
  if (availableBalance < amount) {
    return false;
  }
  
  await this.updateBalance(currency, -amount, BalanceType.AVAILABLE);
  await this.updateBalance(currency, amount, BalanceType.FROZEN);
  
  return true;
};

AccountSchema.methods.unfreezeBalance = async function(
  currency: SupportedCurrency,
  amount: number
): Promise<void> {
  const frozenBalance = this.getBalance(currency, BalanceType.FROZEN);
  
  if (frozenBalance < amount) {
    throw new Error(`Insufficient frozen balance for ${currency}`);
  }
  
  await this.updateBalance(currency, -amount, BalanceType.FROZEN);
  await this.updateBalance(currency, amount, BalanceType.AVAILABLE);
};

AccountSchema.methods.hasBalance = function(
  currency: SupportedCurrency,
  amount: number,
  type: BalanceType = BalanceType.AVAILABLE
): boolean {
  const balance = this.getBalance(currency, type);
  return balance >= amount;
};

AccountSchema.methods.addCurrency = async function(currency: SupportedCurrency): Promise<void> {
  const existingBalance = this.balances.find((b: ICurrencyBalance) => b.currency === currency);
  
  if (existingBalance) {
    return; // Currency already exists
  }
  
  this.balances.push({
    currency,
    available: 0,
    pending: 0,
    reserved: 0,
    frozen: 0,
    lastUpdated: new Date()
  });
  
  await this.save();
};

AccountSchema.methods.removeCurrency = async function(currency: SupportedCurrency): Promise<void> {
  const balanceIndex = this.balances.findIndex((b: ICurrencyBalance) => b.currency === currency);
  
  if (balanceIndex === -1) {
    return; // Currency doesn't exist
  }
  
  const balance = this.balances[balanceIndex];
  const totalBalance = balance.available + balance.pending + balance.reserved + balance.frozen;
  
  if (totalBalance > 0) {
    throw new Error(`Cannot remove currency ${currency} with non-zero balance`);
  }
  
  this.balances.splice(balanceIndex, 1);
  await this.save();
};

AccountSchema.methods.getTotalBalanceInCurrency = function(
  targetCurrency: SupportedCurrency,
  exchangeRates: { [key: string]: number }
): number {
  return this.balances.reduce((total: number, balance: ICurrencyBalance) => {
    const rate = exchangeRates[`${balance.currency}_${targetCurrency}`] || 1;
    const balanceTotal = balance.available + balance.pending;
    return total + (balanceTotal * rate);
  }, 0);
};

AccountSchema.methods.suspend = async function(reason?: string): Promise<void> {
  this.status = AccountStatus.SUSPENDED;
  if (reason) {
    this.metadata.suspensionReason = reason;
    this.metadata.suspendedAt = new Date();
  }
  await this.save();
};

AccountSchema.methods.activate = async function(): Promise<void> {
  this.status = AccountStatus.ACTIVE;
  if (this.metadata.suspensionReason) {
    delete this.metadata.suspensionReason;
    delete this.metadata.suspendedAt;
    this.metadata.reactivatedAt = new Date();
  }
  await this.save();
};

AccountSchema.methods.freeze = async function(reason?: string): Promise<void> {
  this.status = AccountStatus.FROZEN;
  if (reason) {
    this.metadata.freezeReason = reason;
    this.metadata.frozenAt = new Date();
  }
  await this.save();
};

AccountSchema.methods.unfreeze = async function(): Promise<void> {
  this.status = AccountStatus.ACTIVE;
  if (this.metadata.freezeReason) {
    delete this.metadata.freezeReason;
    delete this.metadata.frozenAt;
    this.metadata.unfrozenAt = new Date();
  }
  await this.save();
};

AccountSchema.methods.close = async function(reason?: string): Promise<void> {
  // Check if all balances are zero
  const hasBalance = this.balances.some((balance: ICurrencyBalance) => {
    return balance.available > 0 || balance.pending > 0 || balance.reserved > 0 || balance.frozen > 0;
  });
  
  if (hasBalance) {
    throw new Error('Cannot close account with non-zero balances');
  }
  
  this.status = AccountStatus.CLOSED;
  if (reason) {
    this.metadata.closureReason = reason;
    this.metadata.closedAt = new Date();
  }
  await this.save();
};

// ==================== STATIC METHODS ====================

AccountSchema.statics.findByUserId = function(userId: string) {
  return this.findOne({ userId });
};

AccountSchema.statics.findActiveAccounts = function() {
  return this.find({ status: AccountStatus.ACTIVE });
};

AccountSchema.statics.findAccountsWithBalance = function(currency: SupportedCurrency, minAmount: number = 0) {
  return this.find({
    'balances.currency': currency,
    'balances.available': { $gte: minAmount }
  });
};

AccountSchema.statics.getAccountAnalytics = async function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const pipeline = [
    { $match: matchStage },
    { $unwind: '$balances' },
    {
      $group: {
        _id: {
          status: '$status',
          currency: '$balances.currency'
        },
        totalAccounts: { $sum: 1 },
        totalBalance: { $sum: '$balances.available' },
        totalPending: { $sum: '$balances.pending' },
        totalReserved: { $sum: '$balances.reserved' },
        totalFrozen: { $sum: '$balances.frozen' }
      }
    },
    {
      $group: {
        _id: null,
        totalAccounts: { $sum: '$totalAccounts' },
        activeAccounts: {
          $sum: { $cond: [{ $eq: ['$_id.status', AccountStatus.ACTIVE] }, '$totalAccounts', 0] }
        },
        balancesByCurrency: {
          $push: {
            currency: '$_id.currency',
            totalBalance: '$totalBalance',
            accountCount: '$totalAccounts',
            totalPending: '$totalPending',
            totalReserved: '$totalReserved',
            totalFrozen: '$totalFrozen'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

AccountSchema.statics.getTotalBalancesByCurrency = async function() {
  const pipeline = [
    { $match: { status: AccountStatus.ACTIVE } },
    { $unwind: '$balances' },
    {
      $group: {
        _id: '$balances.currency',
        totalAvailable: { $sum: '$balances.available' },
        totalPending: { $sum: '$balances.pending' },
        totalReserved: { $sum: '$balances.reserved' },
        totalFrozen: { $sum: '$balances.frozen' },
        accountCount: { $sum: 1 }
      }
    },
    {
      $project: {
        currency: '$_id',
        totalAvailable: 1,
        totalPending: 1,
        totalReserved: 1,
        totalFrozen: 1,
        totalBalance: { $add: ['$totalAvailable', '$totalPending', '$totalReserved', '$totalFrozen'] },
        accountCount: 1
      }
    },
    { $sort: { totalBalance: -1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// ==================== MIDDLEWARE ====================

AccountSchema.pre('save', function(next) {
  // Ensure all supported currencies are present
  const supportedCurrencies = Object.values(SupportedCurrency);
  
  for (const currency of supportedCurrencies) {
    const existingBalance = this.balances.find((b: ICurrencyBalance) => b.currency === currency);
    if (!existingBalance) {
      this.balances.push({
        currency,
        available: 0,
        pending: 0,
        reserved: 0,
        frozen: 0,
        lastUpdated: new Date()
      });
    }
  }
  
  next();
});

AccountSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== EXPORT ====================

export interface IAccount extends IAccountDocument {}

export const Account: Model<IAccount> = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;

