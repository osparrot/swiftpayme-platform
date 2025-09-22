/**
 * SwiftPayMe Admin Service - AssetApproval Model
 * Comprehensive model for asset verification and approval workflow
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ==================== ENUMS ====================
export enum AssetType {
  GOLD = 'gold',
  SILVER = 'silver',
  PLATINUM = 'platinum',
  PALLADIUM = 'palladium',
  DIAMOND = 'diamond',
  PRECIOUS_STONE = 'precious_stone'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_ADDITIONAL_INFO = 'requires_additional_info',
  ESCALATED = 'escalated'
}

export enum VerificationMethod {
  VISUAL_INSPECTION = 'visual_inspection',
  XRF_ANALYSIS = 'xrf_analysis',
  ACID_TEST = 'acid_test',
  ELECTRONIC_TESTING = 'electronic_testing',
  PROFESSIONAL_APPRAISAL = 'professional_appraisal',
  THIRD_PARTY_CERTIFICATION = 'third_party_certification',
  GEMOLOGICAL_ANALYSIS = 'gemological_analysis'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ==================== INTERFACES ====================
export interface IVerificationResult {
  method: VerificationMethod;
  result: 'pass' | 'fail' | 'inconclusive';
  confidence: number; // 0-100
  notes: string;
  verifiedBy: string;
  verifiedAt: Date;
  images?: string[];
  certificateUrl?: string;
}

export interface IValuationDetails {
  estimatedValue: number;
  currency: string;
  valuationMethod: string;
  marketPrice: number;
  premium: number;
  discount: number;
  confidence: number;
  valuedBy: string;
  valuedAt: Date;
  validUntil: Date;
  notes?: string;
}

export interface IAssetApproval extends Document {
  approvalId: string;
  assetDepositId: string;
  userId: string;
  
  // Asset Details
  assetType: AssetType;
  weight: number;
  purity?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  description: string;
  serialNumber?: string;
  certificateNumber?: string;
  
  // Approval Workflow
  status: ApprovalStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  reviewedBy?: string[];
  
  // Verification
  verificationResults: IVerificationResult[];
  overallVerificationScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  
  // Valuation
  valuationDetails?: IValuationDetails;
  finalApprovedValue?: number;
  
  // Documentation
  submittedDocuments: string[];
  additionalDocumentsRequired: string[];
  images: string[];
  certificates: string[];
  
  // Timeline
  submittedAt: Date;
  reviewStartedAt?: Date;
  reviewCompletedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  
  // Comments and Notes
  adminNotes: Array<{
    adminId: string;
    adminName: string;
    note: string;
    timestamp: Date;
    isInternal: boolean;
  }>;
  rejectionReason?: string;
  additionalInfoRequested?: string;
  
  // Compliance
  complianceChecks: Array<{
    checkType: string;
    status: 'pass' | 'fail' | 'pending';
    details: string;
    checkedBy: string;
    checkedAt: Date;
  }>;
  
  // Audit Trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details: any;
    ipAddress?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SCHEMA ====================
const AssetApprovalSchema = new Schema<IAssetApproval>({
  approvalId: {
    type: String,
    required: true,
    unique: true,
    default: () => `approval_${uuidv4()}`,
    index: true
  },
  assetDepositId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Asset Details
  assetType: {
    type: String,
    required: true,
    enum: Object.values(AssetType),
    index: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  purity: {
    type: Number,
    min: 0,
    max: 100
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String, enum: ['mm', 'cm', 'inch'], default: 'mm' }
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  serialNumber: {
    type: String,
    trim: true
  },
  certificateNumber: {
    type: String,
    trim: true
  },
  
  // Approval Workflow
  status: {
    type: String,
    required: true,
    enum: Object.values(ApprovalStatus),
    default: ApprovalStatus.PENDING,
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  assignedTo: {
    type: String,
    index: true
  },
  reviewedBy: [{
    type: String
  }],
  
  // Verification
  verificationResults: [{
    method: {
      type: String,
      required: true,
      enum: Object.values(VerificationMethod)
    },
    result: {
      type: String,
      required: true,
      enum: ['pass', 'fail', 'inconclusive']
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    notes: {
      type: String,
      required: true
    },
    verifiedBy: {
      type: String,
      required: true
    },
    verifiedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    images: [String],
    certificateUrl: String
  }],
  overallVerificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: Object.values(RiskLevel),
    default: RiskLevel.MEDIUM,
    index: true
  },
  riskFactors: [String],
  
  // Valuation
  valuationDetails: {
    estimatedValue: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    valuationMethod: String,
    marketPrice: { type: Number, min: 0 },
    premium: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    confidence: { type: Number, min: 0, max: 100 },
    valuedBy: String,
    valuedAt: Date,
    validUntil: Date,
    notes: String
  },
  finalApprovedValue: {
    type: Number,
    min: 0
  },
  
  // Documentation
  submittedDocuments: [String],
  additionalDocumentsRequired: [String],
  images: [String],
  certificates: [String],
  
  // Timeline
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  reviewStartedAt: Date,
  reviewCompletedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  
  // Comments and Notes
  adminNotes: [{
    adminId: { type: String, required: true },
    adminName: { type: String, required: true },
    note: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    isInternal: { type: Boolean, default: false }
  }],
  rejectionReason: String,
  additionalInfoRequested: String,
  
  // Compliance
  complianceChecks: [{
    checkType: { type: String, required: true },
    status: { 
      type: String, 
      required: true, 
      enum: ['pass', 'fail', 'pending'] 
    },
    details: { type: String, required: true },
    checkedBy: { type: String, required: true },
    checkedAt: { type: Date, required: true, default: Date.now }
  }],
  
  // Audit Trail
  auditTrail: [{
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    performedAt: { type: Date, required: true, default: Date.now },
    details: Schema.Types.Mixed,
    ipAddress: String
  }]
}, {
  timestamps: true,
  collection: 'asset_approvals'
});

// ==================== INDEXES ====================
AssetApprovalSchema.index({ status: 1, priority: -1, submittedAt: -1 });
AssetApprovalSchema.index({ assignedTo: 1, status: 1 });
AssetApprovalSchema.index({ assetType: 1, status: 1 });
AssetApprovalSchema.index({ riskLevel: 1, status: 1 });
AssetApprovalSchema.index({ submittedAt: -1 });
AssetApprovalSchema.index({ userId: 1, status: 1 });

// ==================== VIRTUALS ====================
AssetApprovalSchema.virtual('processingTime').get(function() {
  if (this.reviewCompletedAt && this.reviewStartedAt) {
    return this.reviewCompletedAt.getTime() - this.reviewStartedAt.getTime();
  }
  return null;
});

AssetApprovalSchema.virtual('totalProcessingTime').get(function() {
  const endTime = this.reviewCompletedAt || new Date();
  return endTime.getTime() - this.submittedAt.getTime();
});

AssetApprovalSchema.virtual('isOverdue').get(function() {
  const now = new Date();
  const submittedHoursAgo = (now.getTime() - this.submittedAt.getTime()) / (1000 * 60 * 60);
  
  switch (this.priority) {
    case 'urgent': return submittedHoursAgo > 4;
    case 'high': return submittedHoursAgo > 24;
    case 'medium': return submittedHoursAgo > 72;
    case 'low': return submittedHoursAgo > 168; // 1 week
    default: return false;
  }
});

// ==================== MIDDLEWARE ====================
AssetApprovalSchema.pre('save', function(next) {
  // Update status timestamps
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case ApprovalStatus.UNDER_REVIEW:
        if (!this.reviewStartedAt) {
          this.reviewStartedAt = now;
        }
        break;
      case ApprovalStatus.APPROVED:
        this.approvedAt = now;
        this.reviewCompletedAt = now;
        break;
      case ApprovalStatus.REJECTED:
        this.rejectedAt = now;
        this.reviewCompletedAt = now;
        break;
    }
  }
  
  // Calculate overall verification score
  if (this.verificationResults.length > 0) {
    const totalScore = this.verificationResults.reduce((sum, result) => {
      const weight = result.result === 'pass' ? 1 : result.result === 'inconclusive' ? 0.5 : 0;
      return sum + (result.confidence * weight);
    }, 0);
    this.overallVerificationScore = totalScore / this.verificationResults.length;
  }
  
  next();
});

// Add audit trail entry on save
AssetApprovalSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    const modifiedPaths = this.modifiedPaths();
    this.auditTrail.push({
      action: 'update',
      performedBy: 'system', // This should be set by the calling code
      performedAt: new Date(),
      details: { modifiedFields: modifiedPaths }
    });
  }
  next();
});

// ==================== METHODS ====================
AssetApprovalSchema.methods.addVerificationResult = function(result: IVerificationResult) {
  this.verificationResults.push(result);
  
  // Recalculate overall score and risk level
  this.calculateOverallScore();
  this.assessRiskLevel();
  
  return this.save();
};

AssetApprovalSchema.methods.calculateOverallScore = function() {
  if (this.verificationResults.length === 0) {
    this.overallVerificationScore = 0;
    return;
  }
  
  const totalScore = this.verificationResults.reduce((sum, result) => {
    const weight = result.result === 'pass' ? 1 : result.result === 'inconclusive' ? 0.5 : 0;
    return sum + (result.confidence * weight);
  }, 0);
  
  this.overallVerificationScore = totalScore / this.verificationResults.length;
};

AssetApprovalSchema.methods.assessRiskLevel = function() {
  const score = this.overallVerificationScore;
  const failedTests = this.verificationResults.filter(r => r.result === 'fail').length;
  
  if (score >= 90 && failedTests === 0) {
    this.riskLevel = RiskLevel.LOW;
  } else if (score >= 70 && failedTests <= 1) {
    this.riskLevel = RiskLevel.MEDIUM;
  } else if (score >= 50 || failedTests <= 2) {
    this.riskLevel = RiskLevel.HIGH;
  } else {
    this.riskLevel = RiskLevel.CRITICAL;
  }
};

AssetApprovalSchema.methods.addAdminNote = function(adminId: string, adminName: string, note: string, isInternal: boolean = false) {
  this.adminNotes.push({
    adminId,
    adminName,
    note,
    timestamp: new Date(),
    isInternal
  });
  
  return this.save();
};

AssetApprovalSchema.methods.approve = function(adminId: string, finalValue?: number) {
  this.status = ApprovalStatus.APPROVED;
  this.reviewedBy.push(adminId);
  if (finalValue) {
    this.finalApprovedValue = finalValue;
  }
  
  this.auditTrail.push({
    action: 'approve',
    performedBy: adminId,
    performedAt: new Date(),
    details: { finalValue }
  });
  
  return this.save();
};

AssetApprovalSchema.methods.reject = function(adminId: string, reason: string) {
  this.status = ApprovalStatus.REJECTED;
  this.rejectionReason = reason;
  this.reviewedBy.push(adminId);
  
  this.auditTrail.push({
    action: 'reject',
    performedBy: adminId,
    performedAt: new Date(),
    details: { reason }
  });
  
  return this.save();
};

// ==================== STATIC METHODS ====================
AssetApprovalSchema.statics.findPendingApprovals = function() {
  return this.find({ 
    status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] } 
  }).sort({ priority: -1, submittedAt: 1 });
};

AssetApprovalSchema.statics.findByAssignee = function(adminId: string) {
  return this.find({ 
    assignedTo: adminId, 
    status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] } 
  }).sort({ priority: -1, submittedAt: 1 });
};

AssetApprovalSchema.statics.findOverdueApprovals = function() {
  const now = new Date();
  const urgentCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours
  const highCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  const mediumCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours
  const lowCutoff = new Date(now.getTime() - 168 * 60 * 60 * 1000); // 1 week
  
  return this.find({
    status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] },
    $or: [
      { priority: 'urgent', submittedAt: { $lt: urgentCutoff } },
      { priority: 'high', submittedAt: { $lt: highCutoff } },
      { priority: 'medium', submittedAt: { $lt: mediumCutoff } },
      { priority: 'low', submittedAt: { $lt: lowCutoff } }
    ]
  });
};

// ==================== MODEL ====================
const AssetApproval: Model<IAssetApproval> = mongoose.model<IAssetApproval>('AssetApproval', AssetApprovalSchema);

export default AssetApproval;

