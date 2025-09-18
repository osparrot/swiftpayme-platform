import mongoose, { Schema, Document, Model } from 'mongoose';
import { Decimal } from 'decimal.js';
import {
  TransactionType,
  TransactionStatus,
  CurrencyType,
  ReconciliationStatus,
  RiskLevel,
  ComplianceStatus
} from '../enums/ledgerEnums';
import { ITransaction } from '../types';

// Custom Decimal Schema (reuse from Account model)
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

const decimalTransform = (doc: any, ret: any) => {
  if (ret.value) {
    return new Decimal(ret.value);
  }
  return new Decimal(0);
};

DecimalSchema.set('toJSON', { transform: decimalTransform });
DecimalSchema.set('toObject', { transform: decimalTransform });

// Transaction Fees Schema
const TransactionFeesSchema = new Schema({
  processingFee: DecimalSchema,
  networkFee: DecimalSchema,
  conversionFee: DecimalSchema,
  totalFee: DecimalSchema,
  currency: {
    type: String,
    required: true
  }
}, { _id: false });

// Risk Assessment Schema
const RiskAssessmentSchema = new Schema({
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskFactors: [{
    factor: String,
    weight: Number,
    description: String
  }],
  assessedAt: {
    type: Date,
    default: Date.now
  },
  assessedBy: String
}, { _id: false });

// Compliance Check Schema
const ComplianceCheckSchema = new Schema({
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'expired']
  },
  amlStatus: {
    type: String,
    enum: ['clear', 'flagged', 'under_review', 'blocked']
  },
  sanctionsCheck: {
    type: Boolean,
    default: false
  },
  pepCheck: {
    type: Boolean,
    default: false
  },
  checkedAt: {
    type: Date,
    default: Date.now
  },
  checkedBy: String,
  notes: String
}, { _id: false });

// Transaction Schema
const TransactionSchema = new Schema<ITransaction>({
  // Primary Identifiers
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  referenceNumber: {
    type: String,
    required: false,
    index: true,
    sparse: true
  },
  
  // Transaction Classification
  transactionType: {
    type: String,
    enum: Object.values(TransactionType),
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    required: true,
    index: true
  },
  
  // Financial Information
  amount: {
    type: DecimalSchema,
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.value || v);
        return decimal.greaterThan(0);
      },
      message: 'Transaction amount must be positive'
    }
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  currencyType: {
    type: String,
    enum: Object.values(CurrencyType),
    required: true,
    index: true
  },
  
  // Exchange Rate Information (for multi-currency transactions)
  exchangeRate: {
    type: DecimalSchema,
    required: false
  },
  baseCurrencyAmount: {
    type: DecimalSchema,
    required: false
  },
  
  // Account Information
  fromAccountId: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: async function(this: ITransaction, v: string) {
        if (!v) return true;
        // Validate account exists
        const Account = mongoose.model('Account');
        const account = await Account.findOne({ accountId: v });
        return !!account;
      },
      message: 'From account does not exist'
    }
  },
  toAccountId: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: async function(this: ITransaction, v: string) {
        if (!v) return true;
        // Validate account exists
        const Account = mongoose.model('Account');
        const account = await Account.findOne({ accountId: v });
        return !!account;
      },
      message: 'To account does not exist'
    }
  },
  
  // Business Context (Integration with other SwiftPayMe services)
  businessTransactionId: {
    type: String,
    required: false,
    index: true
  },
  userId: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: function(v: string) {
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
  
  // Transaction Details
  description: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  notes: {
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
  
  // Timing Information
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  valueDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    required: false,
    index: true
  },
  settledAt: {
    type: Date,
    required: false,
    index: true
  },
  
  // Reconciliation Information
  reconciliationStatus: {
    type: String,
    enum: Object.values(ReconciliationStatus),
    default: ReconciliationStatus.UNRECONCILED,
    required: true,
    index: true
  },
  reconciledAt: {
    type: Date,
    required: false
  },
  reconciledBy: {
    type: String,
    required: false
  },
  
  // Audit Information
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    required: true
  },
  
  // Transaction Relationships
  parentTransactionId: {
    type: String,
    required: false,
    index: true
  },
  reversalTransactionId: {
    type: String,
    required: false,
    index: true
  },
  
  // Risk and Compliance
  riskLevel: {
    type: String,
    enum: Object.values(RiskLevel),
    default: RiskLevel.LOW,
    required: true,
    index: true
  },
  complianceStatus: {
    type: String,
    enum: Object.values(ComplianceStatus),
    default: ComplianceStatus.COMPLIANT,
    required: true,
    index: true
  },
  complianceNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Detailed Risk and Compliance Information
  riskAssessment: RiskAssessmentSchema,
  complianceCheck: ComplianceCheckSchema,
  
  // Transaction Fees
  fees: TransactionFeesSchema,
  
  // Integration with SwiftPayMe Services
  integrationData: {
    // Asset Service Integration
    assetDepositId: String,
    assetWithdrawalId: String,
    
    // Tokenization Service Integration
    tokenMintRequestId: String,
    tokenBurnRequestId: String,
    tokenTransferId: String,
    
    // Crypto Service Integration
    bitcoinTransactionHash: String,
    bitcoinBlockHeight: Number,
    bitcoinConfirmations: Number,
    walletAddress: String,
    
    // Payment Service Integration
    paymentWorkflowId: String,
    paymentStepId: String,
    
    // Currency Service Integration
    exchangeRateId: String,
    priceQuoteId: String,
    
    // External System Integration
    externalTransactionId: String,
    externalSystemName: String,
    externalReference: String
  }
}, {
  timestamps: true,
  collection: 'transactions',
  versionKey: false
});

// Indexes for performance
TransactionSchema.index({ userId: 1, transactionDate: -1 });
TransactionSchema.index({ fromAccountId: 1, transactionDate: -1 });
TransactionSchema.index({ toAccountId: 1, transactionDate: -1 });
TransactionSchema.index({ businessTransactionId: 1 });
TransactionSchema.index({ status: 1, transactionDate: -1 });
TransactionSchema.index({ transactionType: 1, currency: 1 });
TransactionSchema.index({ reconciliationStatus: 1 });
TransactionSchema.index({ riskLevel: 1, complianceStatus: 1 });

// Compound indexes for common queries
TransactionSchema.index({
  userId: 1,
  currency: 1,
  transactionDate: -1
});

TransactionSchema.index({
  transactionType: 1,
  status: 1,
  transactionDate: -1
});

// Integration-specific indexes
TransactionSchema.index({ 'integrationData.assetDepositId': 1 });
TransactionSchema.index({ 'integrationData.tokenMintRequestId': 1 });
TransactionSchema.index({ 'integrationData.bitcoinTransactionHash': 1 });
TransactionSchema.index({ 'integrationData.paymentWorkflowId': 1 });

// Text index for search
TransactionSchema.index({
  description: 'text',
  notes: 'text',
  tags: 'text'
});

// Virtual for transaction age
TransactionSchema.virtual('ageInDays').get(function(this: ITransaction) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.transactionDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for settlement status
TransactionSchema.virtual('isSettled').get(function(this: ITransaction) {
  return !!this.settledAt;
});

// Virtual for processing time
TransactionSchema.virtual('processingTimeMinutes').get(function(this: ITransaction) {
  if (!this.processedAt) return null;
  const diffTime = this.processedAt.getTime() - this.createdAt.getTime();
  return Math.round(diffTime / (1000 * 60));
});

// Instance Methods
TransactionSchema.methods.markAsProcessed = async function(
  this: ITransaction,
  processedBy: string
): Promise<ITransaction> {
  this.status = TransactionStatus.COMPLETED;
  this.processedAt = new Date();
  this.lastModifiedBy = processedBy;
  return await this.save();
};

TransactionSchema.methods.markAsSettled = async function(
  this: ITransaction,
  settledBy: string
): Promise<ITransaction> {
  this.settledAt = new Date();
  this.lastModifiedBy = settledBy;
  return await this.save();
};

TransactionSchema.methods.markAsReconciled = async function(
  this: ITransaction,
  reconciledBy: string
): Promise<ITransaction> {
  this.reconciliationStatus = ReconciliationStatus.RECONCILED;
  this.reconciledAt = new Date();
  this.reconciledBy = reconciledBy;
  this.lastModifiedBy = reconciledBy;
  return await this.save();
};

TransactionSchema.methods.reverse = async function(
  this: ITransaction,
  reason: string,
  reversedBy: string
): Promise<ITransaction> {
  // Create reversal transaction
  const Transaction = mongoose.model('Transaction');
  const reversalTransaction = new Transaction({
    transactionId: `REV-${this.transactionId}`,
    transactionType: TransactionType.REVERSAL,
    amount: this.amount,
    currency: this.currency,
    currencyType: this.currencyType,
    fromAccountId: this.toAccountId, // Reverse the accounts
    toAccountId: this.fromAccountId,
    description: `Reversal of transaction ${this.transactionId}: ${reason}`,
    businessTransactionId: this.businessTransactionId,
    userId: this.userId,
    entityId: this.entityId,
    parentTransactionId: this.transactionId,
    createdBy: reversedBy,
    lastModifiedBy: reversedBy,
    riskLevel: this.riskLevel,
    complianceStatus: this.complianceStatus
  });
  
  const savedReversal = await reversalTransaction.save();
  
  // Update original transaction
  this.status = TransactionStatus.REVERSED;
  this.reversalTransactionId = savedReversal.transactionId;
  this.lastModifiedBy = reversedBy;
  
  return await this.save();
};

// Static Methods
TransactionSchema.statics.generateTransactionId = function(
  transactionType: TransactionType,
  currency: string
): string {
  const typePrefix = transactionType.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${typePrefix}-${currency}-${timestamp}-${random}`;
};

TransactionSchema.statics.findByUserId = function(
  userId: string,
  options: any = {}
) {
  const query = { userId };
  return this.find(query)
    .sort({ transactionDate: -1 })
    .limit(options.limit || 100);
};

TransactionSchema.statics.findByAccountId = function(
  accountId: string,
  options: any = {}
) {
  const query = {
    $or: [
      { fromAccountId: accountId },
      { toAccountId: accountId }
    ]
  };
  return this.find(query)
    .sort({ transactionDate: -1 })
    .limit(options.limit || 100);
};

TransactionSchema.statics.findByDateRange = function(
  startDate: Date,
  endDate: Date,
  options: any = {}
) {
  const query = {
    transactionDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (options.userId) query.userId = options.userId;
  if (options.currency) query.currency = options.currency;
  if (options.transactionType) query.transactionType = options.transactionType;
  if (options.status) query.status = options.status;
  
  return this.find(query).sort({ transactionDate: -1 });
};

// Pre-save middleware
TransactionSchema.pre('save', async function(this: ITransaction, next) {
  // Generate transaction ID if not provided
  if (!this.transactionId) {
    this.transactionId = (this.constructor as any).generateTransactionId(
      this.transactionType,
      this.currency
    );
  }
  
  // Set value date if not provided
  if (!this.valueDate) {
    this.valueDate = this.transactionDate;
  }
  
  // Validate account relationships
  if (this.transactionType === TransactionType.TRANSFER) {
    if (!this.fromAccountId || !this.toAccountId) {
      return next(new Error('Transfer transactions require both from and to accounts'));
    }
    if (this.fromAccountId === this.toAccountId) {
      return next(new Error('Transfer transactions cannot have the same from and to account'));
    }
  }
  
  next();
});

// Post-save middleware for events and integrations
TransactionSchema.post('save', function(this: ITransaction) {
  // Emit transaction events for integration with other services
  // This would integrate with the EventBus from shared utilities
  
  if (this.isNew) {
    // EventBus.emit('transaction.created', {
    //   transactionId: this.transactionId,
    //   transactionType: this.transactionType,
    //   amount: this.amount.toString(),
    //   currency: this.currency,
    //   userId: this.userId,
    //   status: this.status
    // });
  }
  
  if (this.isModified('status') && this.status === TransactionStatus.COMPLETED) {
    // EventBus.emit('transaction.completed', {
    //   transactionId: this.transactionId,
    //   transactionType: this.transactionType,
    //   amount: this.amount.toString(),
    //   currency: this.currency,
    //   userId: this.userId,
    //   processedAt: this.processedAt
    // });
  }
});

// Create and export the model
const Transaction: Model<ITransaction> = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
export { TransactionSchema };

