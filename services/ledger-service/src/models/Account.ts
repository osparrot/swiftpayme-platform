import mongoose, { Schema, Document, Model } from 'mongoose';
import { Decimal } from 'decimal.js';
import {
  AccountType,
  AccountCategory,
  AccountStatus,
  BalanceType,
  CurrencyType,
  LedgerErrorCode
} from '../enums/ledgerEnums';
import { IAccount } from '../types';

// Custom Decimal type for Mongoose
const DecimalSchema = new Schema({
  value: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        try {
          new Decimal(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid decimal value'
    }
  }
}, { _id: false });

// Transform function for Decimal fields
const decimalTransform = (doc: any, ret: any) => {
  if (ret.value) {
    return new Decimal(ret.value);
  }
  return new Decimal(0);
};

DecimalSchema.set('toJSON', { transform: decimalTransform });
DecimalSchema.set('toObject', { transform: decimalTransform });

// Balance History Schema for audit trail
const BalanceHistorySchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  balanceType: {
    type: String,
    enum: Object.values(BalanceType),
    required: true
  },
  previousBalance: DecimalSchema,
  newBalance: DecimalSchema,
  changeAmount: DecimalSchema,
  operation: {
    type: String,
    enum: ['add', 'subtract'],
    required: true
  },
  transactionId: {
    type: String,
    required: false
  },
  journalEntryId: {
    type: String,
    required: false
  },
  reason: {
    type: String,
    required: true
  },
  performedBy: {
    type: String,
    required: true
  }
}, { _id: false });

// Account Schema
const AccountSchema = new Schema<IAccount>({
  // Primary Identifiers
  accountId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        // SwiftPayMe account number format: SP-[TYPE]-[CURRENCY]-[SEQUENCE]
        return /^SP-[A-Z]{2,4}-[A-Z]{3}-\d{8}$/.test(v);
      },
      message: 'Invalid account number format'
    }
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  
  // Account Classification
  accountType: {
    type: String,
    enum: Object.values(AccountType),
    required: true,
    index: true
  },
  accountCategory: {
    type: String,
    enum: Object.values(AccountCategory),
    required: true,
    index: true
  },
  
  // Hierarchy
  parentAccountId: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: async function(this: IAccount, v: string) {
        if (!v) return true;
        // Prevent circular references
        if (v === this.accountId) return false;
        // Check if parent exists
        const parent = await mongoose.model('Account').findOne({ accountId: v });
        return !!parent;
      },
      message: 'Invalid parent account'
    }
  },
  
  // Entity Associations (Integration with other services)
  userId: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: function(v: string) {
        // Validate UUID format for user ID
        return !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      },
      message: 'Invalid user ID format'
    }
  },
  entityId: {
    type: String,
    required: false,
    index: true
  },
  
  // Currency Information
  currency: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
    validate: {
      validator: function(v: string) {
        // Support fiat currencies (ISO 4217), crypto currencies, and tokens
        return /^[A-Z]{3,10}$/.test(v);
      },
      message: 'Invalid currency code'
    }
  },
  currencyType: {
    type: String,
    enum: Object.values(CurrencyType),
    required: true,
    index: true
  },
  
  // Account Status
  status: {
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.ACTIVE,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
    index: true
  },
  
  // Balance Information (using Decimal for precision)
  currentBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  availableBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  pendingBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  reservedBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  frozenBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  escrowBalance: {
    type: DecimalSchema,
    default: () => ({ value: '0' }),
    required: true
  },
  
  // Account Configuration
  allowNegativeBalance: {
    type: Boolean,
    default: false,
    required: true
  },
  creditLimit: {
    type: DecimalSchema,
    required: false
  },
  minimumBalance: {
    type: DecimalSchema,
    required: false
  },
  maximumBalance: {
    type: DecimalSchema,
    required: false
  },
  
  // Metadata and Configuration
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Balance History for Audit Trail
  balanceHistory: [BalanceHistorySchema],
  
  // Audit Information
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    required: true
  },
  closedAt: {
    type: Date,
    required: false
  },
  
  // Integration with SwiftPayMe Services
  integrationData: {
    // Asset Service Integration
    assetDepositIds: [{
      type: String
    }],
    // Tokenization Service Integration
    tokenIds: [{
      type: String
    }],
    // Crypto Service Integration
    walletAddresses: [{
      currency: String,
      address: String,
      type: {
        type: String,
        enum: ['internal', 'external']
      }
    }],
    // Payment Service Integration
    paymentWorkflowIds: [{
      type: String
    }]
  }
}, {
  timestamps: true,
  collection: 'accounts',
  versionKey: false
});

// Indexes for performance
AccountSchema.index({ userId: 1, currency: 1 });
AccountSchema.index({ accountType: 1, status: 1 });
AccountSchema.index({ parentAccountId: 1 });
AccountSchema.index({ 'integrationData.assetDepositIds': 1 });
AccountSchema.index({ 'integrationData.tokenIds': 1 });
AccountSchema.index({ createdAt: -1 });
AccountSchema.index({ updatedAt: -1 });

// Compound indexes for common queries
AccountSchema.index({ 
  accountType: 1, 
  currency: 1, 
  status: 1 
});

// Text index for search
AccountSchema.index({
  accountName: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual for child accounts
AccountSchema.virtual('childAccounts', {
  ref: 'Account',
  localField: 'accountId',
  foreignField: 'parentAccountId'
});

// Virtual for total balance (current + pending)
AccountSchema.virtual('totalBalance').get(function(this: IAccount) {
  return this.currentBalance.add(this.pendingBalance);
});

// Virtual for effective available balance
AccountSchema.virtual('effectiveAvailableBalance').get(function(this: IAccount) {
  return this.availableBalance.minus(this.reservedBalance).minus(this.frozenBalance);
});

// Instance Methods
AccountSchema.methods.getBalance = function(this: IAccount, balanceType: BalanceType = BalanceType.CURRENT): Decimal {
  switch (balanceType) {
    case BalanceType.CURRENT:
      return this.currentBalance;
    case BalanceType.AVAILABLE:
      return this.availableBalance;
    case BalanceType.PENDING:
      return this.pendingBalance;
    case BalanceType.RESERVED:
      return this.reservedBalance;
    case BalanceType.FROZEN:
      return this.frozenBalance;
    case BalanceType.ESCROW:
      return this.escrowBalance;
    default:
      return this.currentBalance;
  }
};

AccountSchema.methods.updateBalance = async function(
  this: IAccount, 
  amount: Decimal, 
  balanceType: BalanceType, 
  operation: 'add' | 'subtract',
  transactionId?: string,
  journalEntryId?: string,
  reason?: string,
  performedBy?: string
): Promise<IAccount> {
  const previousBalance = this.getBalance(balanceType);
  let newBalance: Decimal;
  
  if (operation === 'add') {
    newBalance = previousBalance.add(amount);
  } else {
    newBalance = previousBalance.minus(amount);
    
    // Check for negative balance if not allowed
    if (!this.allowNegativeBalance && newBalance.isNegative()) {
      throw new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Insufficient balance for ${balanceType}`);
    }
  }
  
  // Update the appropriate balance
  switch (balanceType) {
    case BalanceType.CURRENT:
      this.currentBalance = newBalance;
      break;
    case BalanceType.AVAILABLE:
      this.availableBalance = newBalance;
      break;
    case BalanceType.PENDING:
      this.pendingBalance = newBalance;
      break;
    case BalanceType.RESERVED:
      this.reservedBalance = newBalance;
      break;
    case BalanceType.FROZEN:
      this.frozenBalance = newBalance;
      break;
    case BalanceType.ESCROW:
      this.escrowBalance = newBalance;
      break;
  }
  
  // Add to balance history
  this.balanceHistory.push({
    timestamp: new Date(),
    balanceType,
    previousBalance,
    newBalance,
    changeAmount: amount,
    operation,
    transactionId,
    journalEntryId,
    reason: reason || 'Balance update',
    performedBy: performedBy || 'system'
  });
  
  this.lastModifiedBy = performedBy || 'system';
  
  return await this.save();
};

AccountSchema.methods.freeze = async function(
  this: IAccount, 
  amount?: Decimal,
  reason?: string,
  performedBy?: string
): Promise<IAccount> {
  const freezeAmount = amount || this.availableBalance;
  
  if (this.availableBalance.lessThan(freezeAmount)) {
    throw new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Insufficient available balance to freeze`);
  }
  
  // Move from available to frozen
  await this.updateBalance(freezeAmount, BalanceType.AVAILABLE, 'subtract', undefined, undefined, reason, performedBy);
  await this.updateBalance(freezeAmount, BalanceType.FROZEN, 'add', undefined, undefined, reason, performedBy);
  
  return this;
};

AccountSchema.methods.unfreeze = async function(
  this: IAccount, 
  amount?: Decimal,
  reason?: string,
  performedBy?: string
): Promise<IAccount> {
  const unfreezeAmount = amount || this.frozenBalance;
  
  if (this.frozenBalance.lessThan(unfreezeAmount)) {
    throw new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Insufficient frozen balance to unfreeze`);
  }
  
  // Move from frozen to available
  await this.updateBalance(unfreezeAmount, BalanceType.FROZEN, 'subtract', undefined, undefined, reason, performedBy);
  await this.updateBalance(unfreezeAmount, BalanceType.AVAILABLE, 'add', undefined, undefined, reason, performedBy);
  
  return this;
};

AccountSchema.methods.reserve = async function(
  this: IAccount, 
  amount: Decimal,
  reason?: string,
  performedBy?: string
): Promise<IAccount> {
  if (this.availableBalance.lessThan(amount)) {
    throw new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Insufficient available balance to reserve`);
  }
  
  // Move from available to reserved
  await this.updateBalance(amount, BalanceType.AVAILABLE, 'subtract', undefined, undefined, reason, performedBy);
  await this.updateBalance(amount, BalanceType.RESERVED, 'add', undefined, undefined, reason, performedBy);
  
  return this;
};

AccountSchema.methods.releaseReserve = async function(
  this: IAccount, 
  amount: Decimal,
  reason?: string,
  performedBy?: string
): Promise<IAccount> {
  if (this.reservedBalance.lessThan(amount)) {
    throw new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Insufficient reserved balance to release`);
  }
  
  // Move from reserved to available
  await this.updateBalance(amount, BalanceType.RESERVED, 'subtract', undefined, undefined, reason, performedBy);
  await this.updateBalance(amount, BalanceType.AVAILABLE, 'add', undefined, undefined, reason, performedBy);
  
  return this;
};

AccountSchema.methods.isBalanceSufficient = function(
  this: IAccount, 
  amount: Decimal, 
  balanceType: BalanceType = BalanceType.AVAILABLE
): boolean {
  const balance = this.getBalance(balanceType);
  return balance.greaterThanOrEqualTo(amount);
};

// Static Methods
AccountSchema.statics.generateAccountNumber = function(
  accountType: AccountType, 
  currency: string
): string {
  // Generate SwiftPayMe account number format: SP-[TYPE]-[CURRENCY]-[SEQUENCE]
  const typeCode = accountType.substring(0, 4).toUpperCase();
  const sequence = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `SP-${typeCode}-${currency}-${sequence}`;
};

AccountSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId, isActive: true });
};

AccountSchema.statics.findByCurrency = function(currency: string) {
  return this.find({ currency, isActive: true });
};

AccountSchema.statics.findByType = function(accountType: AccountType) {
  return this.find({ accountType, isActive: true });
};

// Pre-save middleware
AccountSchema.pre('save', async function(this: IAccount, next) {
  // Generate account number if not provided
  if (!this.accountNumber) {
    this.accountNumber = (this.constructor as any).generateAccountNumber(this.accountType, this.currency);
  }
  
  // Validate balance constraints
  if (this.minimumBalance && this.currentBalance.lessThan(this.minimumBalance)) {
    if (!this.allowNegativeBalance) {
      return next(new Error(`${LedgerErrorCode.INSUFFICIENT_BALANCE}: Balance below minimum required`));
    }
  }
  
  if (this.maximumBalance && this.currentBalance.greaterThan(this.maximumBalance)) {
    return next(new Error(`Balance exceeds maximum allowed`));
  }
  
  next();
});

// Post-save middleware for events
AccountSchema.post('save', function(this: IAccount) {
  // Emit balance updated event for integration with other services
  if (this.isModified('currentBalance') || this.isModified('availableBalance')) {
    // This would integrate with the EventBus from shared utilities
    // EventBus.emit('balance.updated', {
    //   accountId: this.accountId,
    //   userId: this.userId,
    //   currency: this.currency,
    //   balances: {
    //     current: this.currentBalance.toString(),
    //     available: this.availableBalance.toString()
    //   }
    // });
  }
});

// Create and export the model
const Account: Model<IAccount> = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
export { AccountSchema };

