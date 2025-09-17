import mongoose, { Schema } from 'mongoose';
import Decimal from 'decimal.js';
import { IAssetWallet } from '../types';
import { WalletType, WalletStatus } from '../enums/assetEnums';

// Custom Decimal type for Mongoose
const DecimalType = {
  type: Schema.Types.Mixed,
  get: (value: any) => value ? new Decimal(value.toString()) : new Decimal(0),
  set: (value: any) => value ? new Decimal(value.toString()).toString() : '0'
};

const AssetWalletSchema = new Schema<IAssetWallet>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  assetId: {
    type: String,
    required: true,
    index: true
  },
  
  walletType: {
    type: String,
    enum: Object.values(WalletType),
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: Object.values(WalletStatus),
    required: true,
    default: WalletStatus.ACTIVE,
    index: true
  },
  
  // Wallet details
  address: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  
  publicKey: {
    type: String,
    trim: true
  },
  
  encryptedPrivateKey: {
    type: String,
    trim: true,
    select: false // Don't include in queries by default
  },
  
  mnemonic: {
    type: String,
    trim: true,
    select: false // Don't include in queries by default
  },
  
  derivationPath: {
    type: String,
    trim: true
  },
  
  // Balance information
  balance: {
    available: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    locked: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    pending: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    total: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  
  // Security
  security: {
    isMultiSig: {
      type: Boolean,
      required: true,
      default: false
    },
    requiredSignatures: {
      type: Number,
      min: 1,
      max: 15
    },
    signatories: [{
      type: String,
      trim: true
    }],
    encryptionMethod: {
      type: String,
      required: true,
      default: 'AES-256-GCM'
    },
    backupExists: {
      type: Boolean,
      required: true,
      default: false
    },
    lastBackupAt: Date,
    twoFactorEnabled: {
      type: Boolean,
      required: true,
      default: false
    },
    whitelistedAddresses: [{
      type: String,
      trim: true
    }]
  },
  
  // Limits and restrictions
  limits: {
    dailyWithdrawal: {
      ...DecimalType,
      required: true,
      default: '10000'
    },
    monthlyWithdrawal: {
      ...DecimalType,
      required: true,
      default: '100000'
    },
    maxTransactionAmount: {
      ...DecimalType,
      required: true,
      default: '50000'
    },
    minTransactionAmount: {
      ...DecimalType,
      required: true,
      default: '0.01'
    },
    dailyTransactionCount: {
      type: Number,
      required: true,
      default: 100,
      min: 1
    }
  },
  
  // Usage statistics
  statistics: {
    totalDeposits: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    totalWithdrawals: {
      ...DecimalType,
      required: true,
      default: '0'
    },
    transactionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastTransactionAt: Date,
    averageTransactionAmount: {
      ...DecimalType,
      required: true,
      default: '0'
    }
  },
  
  // Metadata
  metadata: {
    label: {
      type: String,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    category: {
      type: String,
      trim: true,
      maxlength: 50
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false
    },
    isArchived: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  
  // Audit trail
  auditTrail: [{
    action: {
      type: String,
      required: true,
      trim: true
    },
    performedBy: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    details: Schema.Types.Mixed,
    ipAddress: {
      type: String,
      trim: true
    }
  }],
  
  // System fields
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  
  updatedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: function(doc, ret) {
      // Convert Decimal fields to numbers for JSON serialization
      if (ret.balance) {
        Object.keys(ret.balance).forEach(key => {
          if (ret.balance[key] && typeof ret.balance[key] === 'string' && !isNaN(Number(ret.balance[key]))) {
            ret.balance[key] = Number(ret.balance[key]);
          }
        });
      }
      
      if (ret.limits) {
        Object.keys(ret.limits).forEach(key => {
          if (ret.limits[key] && typeof ret.limits[key] === 'string' && !isNaN(Number(ret.limits[key]))) {
            ret.limits[key] = Number(ret.limits[key]);
          }
        });
      }
      
      if (ret.statistics) {
        Object.keys(ret.statistics).forEach(key => {
          if (ret.statistics[key] && typeof ret.statistics[key] === 'string' && !isNaN(Number(ret.statistics[key]))) {
            ret.statistics[key] = Number(ret.statistics[key]);
          }
        });
      }
      
      // Remove sensitive fields
      delete ret.encryptedPrivateKey;
      delete ret.mnemonic;
      
      return ret;
    }
  }
});

// Indexes
AssetWalletSchema.index({ userId: 1, assetId: 1 });
AssetWalletSchema.index({ userId: 1, status: 1 });
AssetWalletSchema.index({ assetId: 1, status: 1 });
AssetWalletSchema.index({ walletType: 1 });
AssetWalletSchema.index({ address: 1 }, { sparse: true });
AssetWalletSchema.index({ 'metadata.isDefault': 1 });
AssetWalletSchema.index({ createdAt: -1 });
AssetWalletSchema.index({ updatedAt: -1 });

// Compound indexes for efficient queries
AssetWalletSchema.index({ userId: 1, 'metadata.isDefault': 1 });
AssetWalletSchema.index({ userId: 1, walletType: 1, status: 1 });

// Methods
AssetWalletSchema.methods.updateBalance = async function(amount: Decimal, type: 'credit' | 'debit'): Promise<void> {
  const amountDecimal = new Decimal(amount.toString());
  
  if (type === 'credit') {
    this.balance.available = new Decimal(this.balance.available.toString()).add(amountDecimal).toString();
    this.statistics.totalDeposits = new Decimal(this.statistics.totalDeposits.toString()).add(amountDecimal).toString();
  } else {
    const availableBalance = new Decimal(this.balance.available.toString());
    if (availableBalance.lt(amountDecimal)) {
      throw new Error('Insufficient balance');
    }
    this.balance.available = availableBalance.sub(amountDecimal).toString();
    this.statistics.totalWithdrawals = new Decimal(this.statistics.totalWithdrawals.toString()).add(amountDecimal).toString();
  }
  
  // Update total balance
  const available = new Decimal(this.balance.available.toString());
  const locked = new Decimal(this.balance.locked.toString());
  const pending = new Decimal(this.balance.pending.toString());
  this.balance.total = available.add(locked).add(pending).toString();
  
  // Update statistics
  this.statistics.transactionCount += 1;
  this.statistics.lastTransactionAt = new Date();
  
  // Calculate average transaction amount
  const totalTransactions = this.statistics.transactionCount;
  const totalDeposits = new Decimal(this.statistics.totalDeposits.toString());
  const totalWithdrawals = new Decimal(this.statistics.totalWithdrawals.toString());
  const totalVolume = totalDeposits.add(totalWithdrawals);
  
  if (totalTransactions > 0) {
    this.statistics.averageTransactionAmount = totalVolume.div(totalTransactions).toString();
  }
  
  this.balance.lastUpdated = new Date();
  this.updatedAt = new Date();
  
  await this.audit('balance_updated', 'system', {
    type,
    amount: amountDecimal.toString(),
    newBalance: this.balance.available
  });
  
  await this.save();
};

AssetWalletSchema.methods.lockFunds = async function(amount: Decimal, reason?: string): Promise<void> {
  const amountDecimal = new Decimal(amount.toString());
  const availableBalance = new Decimal(this.balance.available.toString());
  
  if (availableBalance.lt(amountDecimal)) {
    throw new Error('Insufficient available balance to lock');
  }
  
  this.balance.available = availableBalance.sub(amountDecimal).toString();
  this.balance.locked = new Decimal(this.balance.locked.toString()).add(amountDecimal).toString();
  this.balance.lastUpdated = new Date();
  this.updatedAt = new Date();
  
  await this.audit('funds_locked', 'system', {
    amount: amountDecimal.toString(),
    reason,
    newAvailableBalance: this.balance.available,
    newLockedBalance: this.balance.locked
  });
  
  await this.save();
};

AssetWalletSchema.methods.unlockFunds = async function(amount: Decimal): Promise<void> {
  const amountDecimal = new Decimal(amount.toString());
  const lockedBalance = new Decimal(this.balance.locked.toString());
  
  if (lockedBalance.lt(amountDecimal)) {
    throw new Error('Insufficient locked balance to unlock');
  }
  
  this.balance.locked = lockedBalance.sub(amountDecimal).toString();
  this.balance.available = new Decimal(this.balance.available.toString()).add(amountDecimal).toString();
  this.balance.lastUpdated = new Date();
  this.updatedAt = new Date();
  
  await this.audit('funds_unlocked', 'system', {
    amount: amountDecimal.toString(),
    newAvailableBalance: this.balance.available,
    newLockedBalance: this.balance.locked
  });
  
  await this.save();
};

AssetWalletSchema.methods.canWithdraw = function(amount: Decimal): boolean {
  const amountDecimal = new Decimal(amount.toString());
  const availableBalance = new Decimal(this.balance.available.toString());
  const dailyLimit = new Decimal(this.limits.dailyWithdrawal.toString());
  const maxTransactionAmount = new Decimal(this.limits.maxTransactionAmount.toString());
  const minTransactionAmount = new Decimal(this.limits.minTransactionAmount.toString());
  
  // Check basic conditions
  if (this.status !== WalletStatus.ACTIVE) return false;
  if (availableBalance.lt(amountDecimal)) return false;
  if (amountDecimal.lt(minTransactionAmount)) return false;
  if (amountDecimal.gt(maxTransactionAmount)) return false;
  if (amountDecimal.gt(dailyLimit)) return false;
  
  return true;
};

AssetWalletSchema.methods.getAvailableBalance = function(): Decimal {
  return new Decimal(this.balance.available.toString());
};

AssetWalletSchema.methods.generateAddress = async function(): Promise<string> {
  // This would integrate with blockchain/crypto libraries
  // For now, return a mock address
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const address = `${this.assetId}_${timestamp}_${random}`;
  
  this.address = address;
  this.updatedAt = new Date();
  
  await this.audit('address_generated', 'system', {
    address,
    walletType: this.walletType
  });
  
  await this.save();
  return address;
};

AssetWalletSchema.methods.backup = async function(): Promise<void> {
  // This would implement wallet backup functionality
  this.security.backupExists = true;
  this.security.lastBackupAt = new Date();
  this.updatedAt = new Date();
  
  await this.audit('wallet_backed_up', 'system', {
    backupTimestamp: this.security.lastBackupAt
  });
  
  await this.save();
};

AssetWalletSchema.methods.audit = async function(action: string, performedBy: string, details?: any): Promise<void> {
  this.auditTrail.push({
    action,
    performedBy,
    timestamp: new Date(),
    details,
    ipAddress: details?.ipAddress
  });
};

// Static methods
AssetWalletSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId, isActive: true });
};

AssetWalletSchema.statics.findByAsset = function(assetId: string) {
  return this.find({ assetId, isActive: true });
};

AssetWalletSchema.statics.findByUserAndAsset = function(userId: string, assetId: string) {
  return this.find({ userId, assetId, isActive: true });
};

AssetWalletSchema.statics.findDefaultWallet = function(userId: string, assetId: string) {
  return this.findOne({
    userId,
    assetId,
    'metadata.isDefault': true,
    isActive: true
  });
};

AssetWalletSchema.statics.findByAddress = function(address: string) {
  return this.findOne({ address, isActive: true });
};

AssetWalletSchema.statics.searchWallets = function(query: any) {
  const filter: any = { isActive: true };
  
  if (query.userId) filter.userId = query.userId;
  if (query.assetId) filter.assetId = query.assetId;
  if (query.walletType) filter.walletType = query.walletType;
  if (query.status) filter.status = query.status;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

AssetWalletSchema.statics.getUserPortfolio = function(userId: string) {
  return this.aggregate([
    {
      $match: {
        userId,
        isActive: true,
        status: WalletStatus.ACTIVE
      }
    },
    {
      $lookup: {
        from: 'assets',
        localField: 'assetId',
        foreignField: 'id',
        as: 'asset'
      }
    },
    {
      $unwind: '$asset'
    },
    {
      $project: {
        assetId: 1,
        assetSymbol: '$asset.symbol',
        assetName: '$asset.name',
        balance: 1,
        currentPrice: '$asset.pricing.currentPrice',
        currency: '$asset.pricing.currency',
        value: {
          $multiply: [
            { $toDouble: '$balance.total' },
            { $toDouble: '$asset.pricing.currentPrice' }
          ]
        }
      }
    }
  ]);
};

// Pre-save middleware
AssetWalletSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  
  // Ensure only one default wallet per user per asset
  if (this.metadata.isDefault && this.isModified('metadata.isDefault')) {
    this.constructor.updateMany(
      {
        userId: this.userId,
        assetId: this.assetId,
        id: { $ne: this.id }
      },
      { 'metadata.isDefault': false }
    ).exec();
  }
  
  next();
});

// Pre-update middleware
AssetWalletSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Virtual for total balance in base currency
AssetWalletSchema.virtual('totalValue').get(function() {
  // This would require asset price lookup
  return null; // Placeholder
});

// Virtual for balance percentage breakdown
AssetWalletSchema.virtual('balanceBreakdown').get(function() {
  const total = new Decimal(this.balance.total.toString());
  if (total.eq(0)) return null;
  
  const available = new Decimal(this.balance.available.toString());
  const locked = new Decimal(this.balance.locked.toString());
  const pending = new Decimal(this.balance.pending.toString());
  
  return {
    available: available.div(total).mul(100).toNumber(),
    locked: locked.div(total).mul(100).toNumber(),
    pending: pending.div(total).mul(100).toNumber()
  };
});

export const AssetWallet = mongoose.model<IAssetWallet>('AssetWallet', AssetWalletSchema);
export default AssetWallet;

