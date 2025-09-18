import mongoose, { Schema, Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import { IMintingRequest, IComplianceCheck } from '../types';
import { MintingStatus, ComplianceStatus } from '../enums/tokenizationEnums';

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

const MintingRequestSchema = new Schema<IMintingRequest & Document>({
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
  depositId: { 
    type: String, 
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: Object.values(MintingStatus), 
    required: true, 
    default: MintingStatus.PENDING,
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
MintingRequestSchema.index({ requestId: 1 });
MintingRequestSchema.index({ tokenId: 1, status: 1 });
MintingRequestSchema.index({ userId: 1, createdAt: -1 });
MintingRequestSchema.index({ depositId: 1 });
MintingRequestSchema.index({ status: 1, createdAt: -1 });
MintingRequestSchema.index({ 'compliance.status': 1 });
MintingRequestSchema.index({ transactionHash: 1 });

// Compound indexes
MintingRequestSchema.index({ tokenId: 1, userId: 1, status: 1 });
MintingRequestSchema.index({ status: 1, 'compliance.status': 1 });

// Virtual for processing time
MintingRequestSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.createdAt) {
    return this.processedAt.getTime() - this.createdAt.getTime();
  }
  return null;
});

// Virtual for is pending
MintingRequestSchema.virtual('isPending').get(function() {
  return [MintingStatus.PENDING, MintingStatus.PROCESSING].includes(this.status);
});

// Virtual for is completed
MintingRequestSchema.virtual('isCompleted').get(function() {
  return this.status === MintingStatus.COMPLETED;
});

// Virtual for is failed
MintingRequestSchema.virtual('isFailed').get(function() {
  return [MintingStatus.FAILED, MintingStatus.CANCELLED, MintingStatus.REJECTED].includes(this.status);
});

// Pre-save middleware
MintingRequestSchema.pre('save', function(next) {
  // Set processedAt when status changes to completed or failed
  if (this.isModified('status')) {
    if ([MintingStatus.COMPLETED, MintingStatus.FAILED, MintingStatus.CANCELLED, MintingStatus.REJECTED].includes(this.status)) {
      this.processedAt = new Date();
    }
  }
  
  // Validate compliance status for processing
  if (this.status === MintingStatus.PROCESSING && this.compliance.status !== ComplianceStatus.COMPLIANT) {
    return next(new Error('Cannot process minting request without compliant status'));
  }
  
  next();
});

// Static methods
MintingRequestSchema.statics.findPendingRequests = function() {
  return this.find({ 
    status: { $in: [MintingStatus.PENDING, MintingStatus.PROCESSING] }
  }).sort({ createdAt: 1 });
};

MintingRequestSchema.statics.findByTokenId = function(tokenId: string) {
  return this.find({ tokenId }).sort({ createdAt: -1 });
};

MintingRequestSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

MintingRequestSchema.statics.findCompletedRequests = function(startDate?: Date, endDate?: Date) {
  const query: any = { status: MintingStatus.COMPLETED };
  
  if (startDate || endDate) {
    query.processedAt = {};
    if (startDate) query.processedAt.$gte = startDate;
    if (endDate) query.processedAt.$lte = endDate;
  }
  
  return this.find(query).sort({ processedAt: -1 });
};

MintingRequestSchema.statics.getStatistics = function() {
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
MintingRequestSchema.methods.updateStatus = function(status: MintingStatus, reason?: string) {
  this.status = status;
  if (reason) this.reason = reason;
  
  if ([MintingStatus.COMPLETED, MintingStatus.FAILED, MintingStatus.CANCELLED, MintingStatus.REJECTED].includes(status)) {
    this.processedAt = new Date();
  }
  
  return this.save();
};

MintingRequestSchema.methods.updateCompliance = function(complianceData: Partial<IComplianceCheck>) {
  Object.assign(this.compliance, complianceData);
  this.compliance.checkedAt = new Date();
  return this.save();
};

MintingRequestSchema.methods.setTransactionDetails = function(transactionHash: string, gasUsed?: Decimal, gasFee?: Decimal) {
  this.transactionHash = transactionHash;
  if (gasUsed) this.gasUsed = gasUsed;
  if (gasFee) this.gasFee = gasFee;
  return this.save();
};

MintingRequestSchema.methods.canProcess = function(): boolean {
  return this.status === MintingStatus.PENDING && 
         this.compliance.status === ComplianceStatus.COMPLIANT;
};

MintingRequestSchema.methods.canCancel = function(): boolean {
  return [MintingStatus.PENDING, MintingStatus.PROCESSING].includes(this.status);
};

export const MintingRequest = mongoose.model<IMintingRequest & Document>('MintingRequest', MintingRequestSchema);
export default MintingRequest;

