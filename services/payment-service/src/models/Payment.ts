/**
 * SwiftPayMe Payment Service - Payment Model
 * Comprehensive Mongoose model for payment processing and orchestration
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

// Import types
import {
  PaymentType,
  PaymentStatus,
  WorkflowStatus,
  PaymentPriority,
  CurrencyType,
  TransactionDirection,
  RiskLevel,
  ComplianceStatus,
  IPaymentDocument,
  IPaymentFee,
  IPaymentAuditEntry
} from '../types/payment';

// ==================== PAYMENT SCHEMA ====================

const PaymentFeeSchema = new Schema({
  feeId: { type: String, required: true, default: uuidv4 },
  type: { type: String, required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  percentage: { type: Number, min: 0, max: 100 },
  calculationMethod: { type: String, required: true },
  description: String,
  waived: { type: Boolean, default: false },
  waiverReason: String
}, { _id: false });

const PaymentAuditEntrySchema = new Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  action: { type: String, required: true },
  actor: { type: String, required: true },
  actorType: { 
    type: String, 
    required: true, 
    enum: ['user', 'system', 'admin', 'service'] 
  },
  previousStatus: { 
    type: String, 
    enum: Object.values(PaymentStatus) 
  },
  newStatus: { 
    type: String, 
    enum: Object.values(PaymentStatus) 
  },
  details: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  correlationId: String
}, { _id: false });

const PaymentSchema = new Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `PAY_${uuidv4()}`
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(PaymentType),
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: Object.values(PaymentPriority),
    default: PaymentPriority.NORMAL,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  currencyType: {
    type: String,
    required: true,
    enum: Object.values(CurrencyType),
    index: true
  },
  direction: {
    type: String,
    required: true,
    enum: Object.values(TransactionDirection),
    index: true
  },
  description: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Workflow and Parent/Child Relationships
  workflowId: {
    type: String,
    index: true
  },
  parentPaymentId: {
    type: String,
    index: true
  },
  childPaymentIds: [{
    type: String
  }],
  externalTransactionId: {
    type: String,
    index: true
  },
  
  // Risk and Compliance
  riskLevel: {
    type: String,
    required: true,
    enum: Object.values(RiskLevel),
    default: RiskLevel.LOW,
    index: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  complianceStatus: {
    type: String,
    required: true,
    enum: Object.values(ComplianceStatus),
    default: ComplianceStatus.PENDING,
    index: true
  },
  complianceNotes: String,
  
  // Fees and Charges
  fees: [PaymentFeeSchema],
  totalFees: {
    type: Number,
    default: 0,
    min: 0,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  netAmount: {
    type: Number,
    get: (v: number) => new Decimal(v).toNumber(),
    set: (v: number) => new Decimal(v).toNumber()
  },
  
  // Timing
  scheduledAt: Date,
  processedAt: Date,
  completedAt: Date,
  expiresAt: Date,
  
  // Error Handling
  errorCode: String,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0
  },
  
  // Audit Trail
  auditTrail: [PaymentAuditEntrySchema]
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

PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ userId: 1, type: 1 });
PaymentSchema.index({ userId: 1, currency: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ workflowId: 1 });
PaymentSchema.index({ parentPaymentId: 1 });
PaymentSchema.index({ externalTransactionId: 1 });
PaymentSchema.index({ status: 1, priority: 1, createdAt: 1 });
PaymentSchema.index({ riskLevel: 1, complianceStatus: 1 });
PaymentSchema.index({ scheduledAt: 1 }, { sparse: true });
PaymentSchema.index({ expiresAt: 1 }, { sparse: true });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ updatedAt: -1 });

// Compound indexes for analytics
PaymentSchema.index({ 
  userId: 1, 
  type: 1, 
  status: 1, 
  createdAt: -1 
});
PaymentSchema.index({ 
  currency: 1, 
  currencyType: 1, 
  status: 1, 
  createdAt: -1 
});

// ==================== VIRTUALS ====================

PaymentSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

PaymentSchema.virtual('canRetry').get(function() {
  return this.retryCount < this.maxRetries && 
         [PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(this.status);
});

PaymentSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.completedAt) {
    return this.completedAt.getTime() - this.processedAt.getTime();
  }
  return null;
});

PaymentSchema.virtual('totalTime').get(function() {
  if (this.completedAt) {
    return this.completedAt.getTime() - this.createdAt.getTime();
  }
  return null;
});

PaymentSchema.virtual('effectiveAmount').get(function() {
  const amount = new Decimal(this.amount);
  const fees = new Decimal(this.totalFees || 0);
  
  if (this.direction === TransactionDirection.OUTBOUND) {
    return amount.plus(fees).toNumber();
  }
  return amount.minus(fees).toNumber();
});

// ==================== METHODS ====================

PaymentSchema.methods.updateStatus = async function(
  status: PaymentStatus, 
  notes?: string,
  actor: string = 'system',
  actorType: 'user' | 'system' | 'admin' | 'service' = 'system'
): Promise<void> {
  const previousStatus = this.status;
  this.status = status;
  
  // Update timing fields
  if (status === PaymentStatus.PROCESSING && !this.processedAt) {
    this.processedAt = new Date();
  }
  if ([PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(status) && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Add audit entry
  await this.addAuditEntry('status_update', {
    previousStatus,
    newStatus: status,
    notes
  }, actor, actorType);
  
  await this.save();
};

PaymentSchema.methods.addAuditEntry = async function(
  action: string,
  details?: any,
  actor: string = 'system',
  actorType: 'user' | 'system' | 'admin' | 'service' = 'system',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const auditEntry: IPaymentAuditEntry = {
    timestamp: new Date(),
    action,
    actor,
    actorType,
    details,
    ipAddress,
    userAgent,
    correlationId: uuidv4()
  };
  
  this.auditTrail.push(auditEntry);
  await this.save();
};

PaymentSchema.methods.calculateFees = async function(): Promise<number> {
  let totalFees = new Decimal(0);
  
  for (const fee of this.fees) {
    if (fee.waived) continue;
    
    let feeAmount = new Decimal(0);
    
    if (fee.calculationMethod === 'fixed') {
      feeAmount = new Decimal(fee.amount);
    } else if (fee.calculationMethod === 'percentage' && fee.percentage) {
      feeAmount = new Decimal(this.amount).mul(fee.percentage).div(100);
    }
    
    totalFees = totalFees.plus(feeAmount);
  }
  
  this.totalFees = totalFees.toNumber();
  this.netAmount = new Decimal(this.amount).minus(totalFees).toNumber();
  
  return this.totalFees;
};

PaymentSchema.methods.addFee = function(
  type: string,
  name: string,
  amount: number,
  currency: string,
  calculationMethod: string = 'fixed',
  percentage?: number,
  description?: string
): void {
  const fee: IPaymentFee = {
    feeId: uuidv4(),
    type,
    name,
    amount,
    currency,
    calculationMethod,
    percentage,
    description,
    waived: false
  };
  
  this.fees.push(fee);
};

PaymentSchema.methods.waiveFee = function(feeId: string, reason: string): boolean {
  const fee = this.fees.find((f: IPaymentFee) => f.feeId === feeId);
  if (fee) {
    fee.waived = true;
    fee.waiverReason = reason;
    return true;
  }
  return false;
};

PaymentSchema.methods.canRetry = function(): boolean {
  return this.retryCount < this.maxRetries && 
         [PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(this.status) &&
         !this.isExpired;
};

PaymentSchema.methods.incrementRetry = async function(): Promise<void> {
  this.retryCount += 1;
  await this.addAuditEntry('retry_attempt', {
    retryCount: this.retryCount,
    maxRetries: this.maxRetries
  });
  await this.save();
};

PaymentSchema.methods.isExpired = function(): boolean {
  return this.expiresAt && new Date() > this.expiresAt;
};

PaymentSchema.methods.expire = async function(): Promise<void> {
  if (!this.isExpired()) return;
  
  await this.updateStatus(PaymentStatus.EXPIRED, 'Payment expired due to timeout');
};

PaymentSchema.methods.cancel = async function(reason?: string, actor: string = 'system'): Promise<void> {
  if ([PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.EXPIRED].includes(this.status)) {
    throw new Error(`Cannot cancel payment in ${this.status} status`);
  }
  
  await this.updateStatus(PaymentStatus.CANCELLED, reason, actor);
};

PaymentSchema.methods.freeze = async function(reason: string, actor: string = 'system'): Promise<void> {
  await this.updateStatus(PaymentStatus.FROZEN, reason, actor);
};

PaymentSchema.methods.unfreeze = async function(reason: string, actor: string = 'system'): Promise<void> {
  if (this.status !== PaymentStatus.FROZEN) {
    throw new Error('Payment is not frozen');
  }
  
  await this.updateStatus(PaymentStatus.PENDING, reason, actor);
};

// ==================== STATIC METHODS ====================

PaymentSchema.statics.findByUserId = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.status) query.where('status', options.status);
  if (options.type) query.where('type', options.type);
  if (options.currency) query.where('currency', options.currency);
  if (options.startDate) query.where('createdAt').gte(options.startDate);
  if (options.endDate) query.where('createdAt').lte(options.endDate);
  
  if (options.sort) query.sort(options.sort);
  else query.sort({ createdAt: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

PaymentSchema.statics.findByWorkflowId = function(workflowId: string) {
  return this.find({ workflowId }).sort({ createdAt: 1 });
};

PaymentSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    status: { $nin: [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.EXPIRED, PaymentStatus.CANCELLED] }
  });
};

PaymentSchema.statics.findPendingRetries = function() {
  return this.find({
    status: PaymentStatus.FAILED,
    retryCount: { $lt: this.maxRetries },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

PaymentSchema.statics.getAnalytics = async function(userId?: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (userId) matchStage.userId = userId;
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalVolume: { $sum: '$amount' },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', PaymentStatus.COMPLETED] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', PaymentStatus.FAILED] }, 1, 0] }
        },
        averageAmount: { $avg: '$amount' },
        totalFees: { $sum: '$totalFees' },
        byType: {
          $push: {
            type: '$type',
            amount: '$amount',
            status: '$status'
          }
        },
        byCurrency: {
          $push: {
            currency: '$currency',
            amount: '$amount',
            status: '$status'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

// ==================== MIDDLEWARE ====================

PaymentSchema.pre('save', async function(next) {
  // Calculate net amount if not set
  if (this.isModified('amount') || this.isModified('totalFees')) {
    if (!this.netAmount) {
      this.netAmount = new Decimal(this.amount).minus(this.totalFees || 0).toNumber();
    }
  }
  
  // Set expiration if not set
  if (this.isNew && !this.expiresAt) {
    const expirationHours = this.priority === PaymentPriority.URGENT ? 1 : 
                           this.priority === PaymentPriority.HIGH ? 6 : 24;
    this.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }
  
  next();
});

PaymentSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== EXPORT ====================

export interface IPayment extends IPaymentDocument {}

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;

