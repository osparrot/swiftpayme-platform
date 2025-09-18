import mongoose, { Schema, Document, Model } from 'mongoose';
import { Decimal } from 'decimal.js';
import {
  EntryType,
  JournalEntryStatus,
  DebitCredit,
  ApprovalStatus,
  LedgerErrorCode
} from '../enums/ledgerEnums';
import { IJournalEntry, IJournalLine } from '../types';

// Custom Decimal Schema
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

// Journal Line Schema
const JournalLineSchema = new Schema<IJournalLine>({
  lineId: {
    type: String,
    required: true,
    unique: true
  },
  accountId: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: async function(v: string) {
        // Validate account exists
        const Account = mongoose.model('Account');
        const account = await Account.findOne({ accountId: v });
        return !!account;
      },
      message: 'Account does not exist'
    }
  },
  debitCredit: {
    type: String,
    enum: Object.values(DebitCredit),
    required: true
  },
  amount: {
    type: DecimalSchema,
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.value || v);
        return decimal.greaterThan(0);
      },
      message: 'Journal line amount must be positive'
    }
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  description: {
    type: String,
    maxlength: 255,
    trim: true
  },
  reference: {
    type: String,
    maxlength: 100,
    trim: true
  },
  
  // Dimensions for reporting and analytics
  costCenter: {
    type: String,
    maxlength: 50,
    trim: true
  },
  department: {
    type: String,
    maxlength: 50,
    trim: true
  },
  project: {
    type: String,
    maxlength: 50,
    trim: true
  },
  
  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Approval History Schema
const ApprovalHistorySchema = new Schema({
  approver: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['approved', 'rejected', 'requested_changes'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  comments: {
    type: String,
    maxlength: 500
  },
  level: {
    type: Number,
    required: true
  }
}, { _id: false });

// Journal Entry Schema
const JournalEntrySchema = new Schema<IJournalEntry>({
  // Primary Identifiers
  journalEntryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  entryNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Entry Classification
  entryType: {
    type: String,
    enum: Object.values(EntryType),
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(JournalEntryStatus),
    default: JournalEntryStatus.DRAFT,
    required: true,
    index: true
  },
  
  // Entry Details
  description: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  reference: {
    type: String,
    maxlength: 100,
    trim: true,
    index: true
  },
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  
  // Timing Information
  entryDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  postingDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  period: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        // Format: YYYY-MM for monthly periods
        return /^\d{4}-\d{2}$/.test(v);
      },
      message: 'Period must be in YYYY-MM format'
    }
  },
  
  // Business Context (Integration with SwiftPayMe services)
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
  
  // Journal Lines (Double-entry bookkeeping)
  journalLines: {
    type: [JournalLineSchema],
    required: true,
    validate: {
      validator: function(lines: IJournalLine[]) {
        return lines && lines.length >= 2;
      },
      message: 'Journal entry must have at least 2 lines'
    }
  },
  
  // Totals for validation (calculated automatically)
  totalDebits: {
    type: DecimalSchema,
    required: true,
    default: () => ({ value: '0' })
  },
  totalCredits: {
    type: DecimalSchema,
    required: true,
    default: () => ({ value: '0' })
  },
  
  // Approval Workflow
  approvalStatus: {
    type: String,
    enum: Object.values(ApprovalStatus),
    default: ApprovalStatus.PENDING,
    required: true,
    index: true
  },
  approvedBy: {
    type: String,
    required: false
  },
  approvedAt: {
    type: Date,
    required: false
  },
  approvalHistory: [ApprovalHistorySchema],
  
  // Audit Information
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    required: true
  },
  postedAt: {
    type: Date,
    required: false,
    index: true
  },
  reversedAt: {
    type: Date,
    required: false
  },
  
  // Metadata and Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Integration with SwiftPayMe Services
  integrationData: {
    // Asset Service Integration
    assetDepositId: String,
    assetWithdrawalId: String,
    assetValuationId: String,
    
    // Tokenization Service Integration
    tokenMintRequestId: String,
    tokenBurnRequestId: String,
    tokenTransferId: String,
    
    // Crypto Service Integration
    bitcoinTransactionId: String,
    walletTransactionId: String,
    
    // Payment Service Integration
    paymentWorkflowId: String,
    paymentStepId: String,
    
    // Currency Service Integration
    exchangeRateId: String,
    conversionId: String,
    
    // User Service Integration
    kycVerificationId: String,
    complianceCheckId: String
  },
  
  // Reversal Information
  reversalEntryId: {
    type: String,
    required: false,
    index: true
  },
  originalEntryId: {
    type: String,
    required: false,
    index: true
  },
  reversalReason: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'journal_entries',
  versionKey: false
});

// Indexes for performance
JournalEntrySchema.index({ entryDate: -1 });
JournalEntrySchema.index({ postingDate: -1 });
JournalEntrySchema.index({ period: 1, entryDate: -1 });
JournalEntrySchema.index({ businessTransactionId: 1 });
JournalEntrySchema.index({ userId: 1, entryDate: -1 });
JournalEntrySchema.index({ status: 1, approvalStatus: 1 });
JournalEntrySchema.index({ entryType: 1, period: 1 });

// Compound indexes for common queries
JournalEntrySchema.index({
  status: 1,
  entryDate: -1
});

JournalEntrySchema.index({
  period: 1,
  entryType: 1,
  status: 1
});

// Integration-specific indexes
JournalEntrySchema.index({ 'integrationData.assetDepositId': 1 });
JournalEntrySchema.index({ 'integrationData.tokenMintRequestId': 1 });
JournalEntrySchema.index({ 'integrationData.bitcoinTransactionId': 1 });
JournalEntrySchema.index({ 'integrationData.paymentWorkflowId': 1 });

// Journal line account indexes
JournalEntrySchema.index({ 'journalLines.accountId': 1 });

// Text index for search
JournalEntrySchema.index({
  description: 'text',
  notes: 'text',
  reference: 'text'
});

// Virtual for balanced status
JournalEntrySchema.virtual('isBalanced').get(function(this: IJournalEntry) {
  return this.totalDebits.equals(this.totalCredits);
});

// Virtual for posting status
JournalEntrySchema.virtual('isPosted').get(function(this: IJournalEntry) {
  return this.status === JournalEntryStatus.POSTED;
});

// Virtual for approval required
JournalEntrySchema.virtual('requiresApproval').get(function(this: IJournalEntry) {
  // Business logic: entries above certain amount or specific types require approval
  const highValueThreshold = new Decimal('10000');
  const totalAmount = this.totalDebits;
  
  return totalAmount.greaterThan(highValueThreshold) || 
         this.entryType === EntryType.ADJUSTING ||
         this.entryType === EntryType.CORRECTING;
});

// Instance Methods
JournalEntrySchema.methods.isBalanced = function(this: IJournalEntry): boolean {
  return this.totalDebits.equals(this.totalCredits);
};

JournalEntrySchema.methods.calculateTotals = function(this: IJournalEntry): void {
  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);
  
  for (const line of this.journalLines) {
    if (line.debitCredit === DebitCredit.DEBIT) {
      totalDebits = totalDebits.add(line.amount);
    } else {
      totalCredits = totalCredits.add(line.amount);
    }
  }
  
  this.totalDebits = totalDebits;
  this.totalCredits = totalCredits;
};

JournalEntrySchema.methods.addLine = function(
  this: IJournalEntry, 
  line: Partial<IJournalLine>
): void {
  const lineId = `${this.journalEntryId}-${this.journalLines.length + 1}`;
  
  const journalLine: IJournalLine = {
    lineId,
    accountId: line.accountId!,
    debitCredit: line.debitCredit!,
    amount: line.amount!,
    currency: line.currency!,
    description: line.description,
    reference: line.reference,
    costCenter: line.costCenter,
    department: line.department,
    project: line.project,
    metadata: line.metadata || {}
  };
  
  this.journalLines.push(journalLine);
  this.calculateTotals();
};

JournalEntrySchema.methods.removeLine = function(
  this: IJournalEntry, 
  lineId: string
): void {
  this.journalLines = this.journalLines.filter(line => line.lineId !== lineId);
  this.calculateTotals();
};

JournalEntrySchema.methods.post = async function(
  this: IJournalEntry
): Promise<IJournalEntry> {
  // Validate entry is balanced
  if (!this.isBalanced()) {
    throw new Error(`${LedgerErrorCode.UNBALANCED_JOURNAL_ENTRY}: Journal entry is not balanced`);
  }
  
  // Check approval if required
  if (this.requiresApproval && this.approvalStatus !== ApprovalStatus.APPROVED) {
    throw new Error('Journal entry requires approval before posting');
  }
  
  // Update account balances
  const Account = mongoose.model('Account');
  
  for (const line of this.journalLines) {
    const account = await Account.findOne({ accountId: line.accountId });
    if (!account) {
      throw new Error(`Account ${line.accountId} not found`);
    }
    
    // Determine if this is a debit or credit to the account balance
    // Based on account type and normal balance
    const isDebitIncrease = this.isDebitIncreaseAccount(account.accountType);
    const operation = (line.debitCredit === DebitCredit.DEBIT) === isDebitIncrease ? 'add' : 'subtract';
    
    await account.updateBalance(
      line.amount,
      'CURRENT',
      operation,
      undefined,
      this.journalEntryId,
      `Journal entry: ${this.description}`,
      this.lastModifiedBy
    );
  }
  
  // Update journal entry status
  this.status = JournalEntryStatus.POSTED;
  this.postedAt = new Date();
  
  return await this.save();
};

JournalEntrySchema.methods.reverse = async function(
  this: IJournalEntry,
  reason: string,
  reversedBy: string
): Promise<IJournalEntry> {
  if (this.status !== JournalEntryStatus.POSTED) {
    throw new Error('Only posted journal entries can be reversed');
  }
  
  // Create reversal entry
  const JournalEntry = mongoose.model('JournalEntry');
  
  const reversalLines = this.journalLines.map(line => ({
    ...line,
    lineId: `REV-${line.lineId}`,
    debitCredit: line.debitCredit === DebitCredit.DEBIT ? DebitCredit.CREDIT : DebitCredit.DEBIT,
    description: `Reversal: ${line.description || ''}`
  }));
  
  const reversalEntry = new JournalEntry({
    journalEntryId: `REV-${this.journalEntryId}`,
    entryNumber: `REV-${this.entryNumber}`,
    entryType: EntryType.REVERSING,
    description: `Reversal of ${this.entryNumber}: ${reason}`,
    reference: this.reference,
    entryDate: new Date(),
    postingDate: new Date(),
    period: this.getCurrentPeriod(),
    businessTransactionId: this.businessTransactionId,
    userId: this.userId,
    entityId: this.entityId,
    journalLines: reversalLines,
    originalEntryId: this.journalEntryId,
    reversalReason: reason,
    createdBy: reversedBy,
    lastModifiedBy: reversedBy,
    integrationData: this.integrationData
  });
  
  reversalEntry.calculateTotals();
  const savedReversal = await reversalEntry.save();
  await savedReversal.post();
  
  // Update original entry
  this.status = JournalEntryStatus.REVERSED;
  this.reversedAt = new Date();
  this.reversalEntryId = savedReversal.journalEntryId;
  this.lastModifiedBy = reversedBy;
  
  return await this.save();
};

JournalEntrySchema.methods.isDebitIncreaseAccount = function(
  this: IJournalEntry,
  accountType: string
): boolean {
  // Assets and Expenses increase with debits
  // Liabilities, Equity, and Revenue increase with credits
  const debitIncreaseTypes = [
    'ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'INTANGIBLE_ASSET',
    'EXPENSE', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE',
    'USER_WALLET', 'RESERVE'
  ];
  
  return debitIncreaseTypes.includes(accountType);
};

JournalEntrySchema.methods.getCurrentPeriod = function(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

// Static Methods
JournalEntrySchema.statics.generateEntryNumber = function(
  entryType: EntryType,
  period: string
): string {
  const typePrefix = entryType.substring(0, 3).toUpperCase();
  const periodCode = period.replace('-', '');
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${typePrefix}-${periodCode}-${sequence}`;
};

JournalEntrySchema.statics.findByPeriod = function(period: string) {
  return this.find({ period }).sort({ entryDate: -1 });
};

JournalEntrySchema.statics.findByAccount = function(accountId: string) {
  return this.find({ 'journalLines.accountId': accountId }).sort({ entryDate: -1 });
};

JournalEntrySchema.statics.findPendingApproval = function() {
  return this.find({ 
    status: JournalEntryStatus.PENDING_APPROVAL,
    approvalStatus: ApprovalStatus.PENDING 
  }).sort({ createdAt: 1 });
};

// Pre-save middleware
JournalEntrySchema.pre('save', async function(this: IJournalEntry, next) {
  // Generate entry number if not provided
  if (!this.entryNumber) {
    this.entryNumber = (this.constructor as any).generateEntryNumber(
      this.entryType,
      this.period
    );
  }
  
  // Calculate totals
  this.calculateTotals();
  
  // Set period if not provided
  if (!this.period) {
    this.period = this.getCurrentPeriod();
  }
  
  // Generate line IDs if not provided
  this.journalLines.forEach((line, index) => {
    if (!line.lineId) {
      line.lineId = `${this.journalEntryId}-${index + 1}`;
    }
  });
  
  // Validate minimum lines
  if (this.journalLines.length < 2) {
    return next(new Error('Journal entry must have at least 2 lines'));
  }
  
  // Set approval status based on business rules
  if (this.requiresApproval && this.approvalStatus === ApprovalStatus.PENDING) {
    this.status = JournalEntryStatus.PENDING_APPROVAL;
  }
  
  next();
});

// Post-save middleware for events
JournalEntrySchema.post('save', function(this: IJournalEntry) {
  // Emit journal entry events for integration with other services
  if (this.isNew) {
    // EventBus.emit('journal_entry.created', {
    //   journalEntryId: this.journalEntryId,
    //   entryType: this.entryType,
    //   totalAmount: this.totalDebits.toString(),
    //   accountsAffected: this.journalLines.map(line => line.accountId),
    //   userId: this.userId
    // });
  }
  
  if (this.isModified('status') && this.status === JournalEntryStatus.POSTED) {
    // EventBus.emit('journal_entry.posted', {
    //   journalEntryId: this.journalEntryId,
    //   entryType: this.entryType,
    //   totalAmount: this.totalDebits.toString(),
    //   accountsAffected: this.journalLines.map(line => line.accountId),
    //   postedAt: this.postedAt
    // });
  }
});

// Create and export the model
const JournalEntry: Model<IJournalEntry> = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);

export default JournalEntry;
export { JournalEntrySchema, JournalLineSchema };

