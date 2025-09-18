import mongoose, { Schema, Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import { IBurningRequest, IComplianceCheck } from '../types';
import { BurningStatus, ComplianceStatus } from '../enums/tokenizationEnums';

// Custom Decimal type for Mongoose
const DecimalType = {
  type: Schema.Types.Mixed,
  get: (value: any) => value ? new Decimal(value.toString()) : value,
  set: (value: any) => value ? new Decimal(value.toString()).toString() : value
};

const ComplianceCheckSchema = new Schema<IComplianceCheck>({
  status: { 
    type: String, 
    enum: Object.values(ComplianceStatus), 
    required: true,
    default: ComplianceStatus.UNDER_REVIEW
  },
  kycStatus: { type: String, required: true },
  amlStatus: { type: String, required: true },
  sanctionsCheck: { type: Boolean, required: true, default: false },
  riskScore: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 0
  },
  flags: [{ type: String }],
  checkedAt: { type: Date, required: true, default: Date.now },
  checkedBy: { type: String },
  notes: { type: String }
}, { _id: false });

const BurningRequestSchema = new Schema<IBurningRequest & Document>({
  requestId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  tokenId: { 
    type: String, 
    required: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  amount: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gt(0);
      },
      message: 'Amount must be greater than 0'
    }
  },
  withdrawalId: { 
    type: String,
    index: true
  },
  status: { 
    type: String, 
    enum: Object.values(BurningStatus), 
    required: true, 
    default: BurningStatus.PENDING,
    index: true
  },
  reason: { type: String },
  transactionHash: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  gasUsed: DecimalType,
  gasFee: DecimalType,
  compliance: { 
    type: ComplianceCheckSchema, 
    required: true 
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  processedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Convert Decimal fields to strings for JSON serialization
      if (ret.amount) ret.amount = ret.amount.toString();
      if (ret.gasUsed) ret.gasUsed = ret.gasUsed.toString();
      if (ret.gasFee) ret.gasFee = ret.gasFee.toString();
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
BurningRequestSchema.index({ requestId: 1 });
BurningRequestSchema.index({ tokenId: 1, status: 1 });
BurningRequestSchema.index({ userId: 1, createdAt: -1 });
BurningRequestSchema.index({ withdrawalId: 1 });
BurningRequestSchema.index({ status: 1, createdAt: -1 });
BurningRequestSchema.index({ 'compliance.status': 1 });
BurningRequestSchema.index({ transactionHash: 1 });

// Compound indexes
BurningRequestSchema.index({ tokenId: 1, userId: 1, status: 1 });
BurningRequestSchema.index({ status: 1, 'compliance.status': 1 });

// Virtual for processing time
BurningRequestSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.createdAt) {
    return this.processedAt.getTime() - this.createdAt.getTime();
  }
  return null;
});

// Virtual for is pending
BurningRequestSchema.virtual('isPending').get(function() {
  return [BurningStatus.PENDING, BurningStatus.PROCESSING].includes(this.status);
});

// Virtual for is completed
BurningRequestSchema.virtual('isCompleted').get(function() {
  return this.status === BurningStatus.COMPLETED;
});

// Virtual for is failed
BurningRequestSchema.virtual('isFailed').get(function() {
  return [BurningStatus.FAILED, BurningStatus.CANCELLED, BurningStatus.REJECTED].includes(this.status);
});

// Pre-save middleware
BurningRequestSchema.pre('save', function(next) {
  // Set processedAt when status changes to completed or failed
  if (this.isModified('status')) {
    if ([BurningStatus.COMPLETED, BurningStatus.FAILED, BurningStatus.CANCELLED, BurningStatus.REJECTED].includes(this.status)) {
      this.processedAt = new Date();
    }
  }
  
  // Validate compliance status for processing
  if (this.status === BurningStatus.PROCESSING && this.compliance.status !== ComplianceStatus.COMPLIANT) {
    return next(new Error('Cannot process burning request without compliant status'));
  }
  
  next();
});

// Static methods
BurningRequestSchema.statics.findPendingRequests = function() {
  return this.find({ 
    status: { $in: [BurningStatus.PENDING, BurningStatus.PROCESSING] }
  }).sort({ createdAt: 1 });
};

BurningRequestSchema.statics.findByTokenId = function(tokenId: string) {
  return this.find({ tokenId }).sort({ createdAt: -1 });
};

BurningRequestSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

BurningRequestSchema.statics.findCompletedRequests = function(startDate?: Date, endDate?: Date) {
  const query: any = { status: BurningStatus.COMPLETED };
  
  if (startDate || endDate) {
    query.processedAt = {};
    if (startDate) query.processedAt.$gte = startDate;
    if (endDate) query.processedAt.$lte = endDate;
  }
  
  return this.find(query).sort({ processedAt: -1 });
};

BurningRequestSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        avgAmount: { $avg: { $toDouble: '$amount' } }
      }
    }
  ]);
};

// Instance methods
BurningRequestSchema.methods.updateStatus = function(status: BurningStatus, reason?: string) {
  this.status = status;
  if (reason) this.reason = reason;
  
  if ([BurningStatus.COMPLETED, BurningStatus.FAILED, BurningStatus.CANCELLED, BurningStatus.REJECTED].includes(status)) {
    this.processedAt = new Date();
  }
  
  return this.save();
};

BurningRequestSchema.methods.updateCompliance = function(complianceData: Partial<IComplianceCheck>) {
  Object.assign(this.compliance, complianceData);
  this.compliance.checkedAt = new Date();
  return this.save();
};

BurningRequestSchema.methods.setTransactionDetails = function(transactionHash: string, gasUsed?: Decimal, gasFee?: Decimal) {
  this.transactionHash = transactionHash;
  if (gasUsed) this.gasUsed = gasUsed;
  if (gasFee) this.gasFee = gasFee;
  return this.save();
};

BurningRequestSchema.methods.linkWithdrawal = function(withdrawalId: string) {
  this.withdrawalId = withdrawalId;
  return this.save();
};

BurningRequestSchema.methods.canProcess = function(): boolean {
  return this.status === BurningStatus.PENDING && 
         this.compliance.status === ComplianceStatus.COMPLIANT;
};

BurningRequestSchema.methods.canCancel = function(): boolean {
  return [BurningStatus.PENDING, BurningStatus.PROCESSING].includes(this.status);
};

export const BurningRequest = mongoose.model<IBurningRequest & Document>('BurningRequest', BurningRequestSchema);
export default BurningRequest;

