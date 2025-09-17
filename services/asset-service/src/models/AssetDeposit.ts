import mongoose, { Schema, Document } from 'mongoose';
import { IAssetDeposit, AssetType, DepositStatus, VerificationStatus } from '../types';

// Asset Image Schema
const AssetImageSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  imageType: {
    type: String,
    enum: ['front', 'back', 'side', 'detail', 'certificate', 'packaging'],
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
    colorSpace: String,
    hasAlpha: Boolean,
    orientation: Number
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    required: true
  }
}, { _id: false });

// Asset Certificate Schema
const AssetCertificateSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['authenticity', 'purity', 'weight', 'grading', 'appraisal', 'insurance'],
    required: true
  },
  issuer: {
    type: String,
    required: true,
    trim: true
  },
  issuerLicense: {
    type: String,
    trim: true
  },
  certificateNumber: {
    type: String,
    required: true,
    trim: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  verificationUrl: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: String
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Asset Valuation Schema
const AssetValuationSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  valuationType: {
    type: String,
    enum: ['estimated', 'preliminary', 'professional', 'final'],
    required: true
  },
  valuedBy: {
    type: String,
    required: true // user ID or appraiser ID
  },
  valuedAt: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  marketPrice: {
    type: Number,
    required: true,
    min: 0
  },
  premiumPercentage: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  methodology: {
    type: String,
    enum: ['spot_price', 'market_comparison', 'professional_appraisal', 'auction_data'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  notes: {
    type: String,
    trim: true
  },
  sources: [{
    name: String,
    url: String,
    accessedAt: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Asset Verification Schema
const AssetVerificationSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: String // admin or appraiser user ID
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  verificationMethod: {
    type: String,
    enum: ['visual_inspection', 'xrf_analysis', 'acid_test', 'electronic_testing', 'professional_appraisal'],
    required: true
  },
  results: {
    purityConfirmed: { type: Boolean },
    weightConfirmed: { type: Boolean },
    authenticityConfirmed: { type: Boolean },
    conditionAssessment: {
      type: String,
      enum: ['excellent', 'very_good', 'good', 'fair', 'poor']
    },
    defects: [String],
    notes: String
  },
  equipment: {
    type: String,
    trim: true
  },
  calibrationDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  reportUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Main Asset Deposit Schema
const AssetDepositSchema = new Schema({
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
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  assetType: {
    type: String,
    enum: Object.values(AssetType),
    required: true,
    index: true
  },
  subType: {
    type: String,
    trim: true // e.g., "coin", "bar", "jewelry", "rough", "cut"
  },
  brand: {
    type: String,
    trim: true // e.g., "PAMP Suisse", "Royal Canadian Mint"
  },
  series: {
    type: String,
    trim: true // e.g., "Maple Leaf", "Eagle"
  },
  year: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear() + 1
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['grams', 'ounces', 'troy_ounces', 'kilograms', 'carats', 'pieces'],
    index: true
  },
  weight: {
    gross: { type: Number, min: 0 },
    net: { type: Number, min: 0 },
    unit: { type: String, enum: ['grams', 'ounces', 'troy_ounces', 'kilograms'] }
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    diameter: { type: Number, min: 0 },
    unit: { type: String, enum: ['mm', 'cm', 'inches'], default: 'mm' }
  },
  purity: {
    declared: { type: Number, min: 0, max: 100 },
    verified: { type: Number, min: 0, max: 100 },
    unit: { type: String, enum: ['percentage', 'karat', 'fineness'], default: 'percentage' }
  },
  condition: {
    type: String,
    enum: ['mint', 'excellent', 'very_good', 'good', 'fair', 'poor', 'damaged'],
    default: 'good'
  },
  status: {
    type: String,
    enum: Object.values(DepositStatus),
    default: DepositStatus.PENDING_VERIFICATION,
    index: true
  },
  verificationStatus: {
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.NOT_STARTED,
    index: true
  },
  
  // Timestamps
  depositedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  receivedAt: {
    type: Date
  },
  verificationStartedAt: {
    type: Date
  },
  verificationCompletedAt: {
    type: Date
  },
  creditedAt: {
    type: Date
  },
  
  // Location and shipping
  depositLocation: {
    facility: String,
    address: String,
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  shippingInfo: {
    carrier: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    signedBy: String,
    insuranceValue: Number,
    insuranceCurrency: String
  },
  
  // Asset data
  images: [AssetImageSchema],
  certificates: [AssetCertificateSchema],
  valuations: [AssetValuationSchema],
  verifications: [AssetVerificationSchema],
  
  // Current values
  currentValuation: {
    amount: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    valuationId: String,
    lastUpdated: Date
  },
  
  // Processing information
  assignedTo: {
    type: String // admin/appraiser user ID
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  processingNotes: [{
    id: String,
    note: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: true }
  }],
  
  // Compliance and audit
  complianceChecks: {
    amlScreening: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      checkedAt: Date,
      reference: String
    },
    sanctionsScreening: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      checkedAt: Date,
      reference: String
    },
    originVerification: {
      status: { type: String, enum: ['pending', 'verified', 'suspicious'], default: 'pending' },
      checkedAt: Date,
      notes: String
    }
  },
  
  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  riskFactors: [{
    factor: String,
    score: Number,
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] }
  }],
  
  // Integration data
  externalReferences: {
    userServiceRef: String,
    paymentServiceRef: String,
    complianceServiceRef: String
  },
  
  // Metadata and tags
  tags: [String],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  
  // Audit trail
  auditTrail: [{
    action: String,
    performedBy: String,
    performedAt: { type: Date, default: Date.now },
    details: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true,
  collection: 'asset_deposits'
});

// Indexes for performance
AssetDepositSchema.index({ userId: 1, status: 1 });
AssetDepositSchema.index({ assetType: 1, status: 1 });
AssetDepositSchema.index({ trackingNumber: 1 });
AssetDepositSchema.index({ depositedAt: -1 });
AssetDepositSchema.index({ verificationStatus: 1, assignedTo: 1 });
AssetDepositSchema.index({ 'currentValuation.amount': -1 });
AssetDepositSchema.index({ riskScore: -1 });
AssetDepositSchema.index({ priority: 1, status: 1 });

// Virtual properties
AssetDepositSchema.virtual('totalValue').get(function() {
  return this.currentValuation?.amount || 0;
});

AssetDepositSchema.virtual('isVerified').get(function() {
  return this.verificationStatus === VerificationStatus.VERIFIED;
});

AssetDepositSchema.virtual('isPending').get(function() {
  return this.status === DepositStatus.PENDING_VERIFICATION;
});

AssetDepositSchema.virtual('isProcessing').get(function() {
  return this.status === DepositStatus.UNDER_VERIFICATION;
});

AssetDepositSchema.virtual('isCompleted').get(function() {
  return this.status === DepositStatus.CREDITED;
});

AssetDepositSchema.virtual('processingTime').get(function() {
  if (this.verificationStartedAt && this.verificationCompletedAt) {
    return this.verificationCompletedAt.getTime() - this.verificationStartedAt.getTime();
  }
  return null;
});

// Instance methods
AssetDepositSchema.methods.addImage = function(imageData: any): string {
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.images.push({
    id: imageId,
    ...imageData
  });
  return imageId;
};

AssetDepositSchema.methods.addCertificate = function(certificateData: any): string {
  const certId = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.certificates.push({
    id: certId,
    ...certificateData
  });
  return certId;
};

AssetDepositSchema.methods.addValuation = function(valuationData: any): string {
  const valuationId = `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Deactivate previous valuations
  this.valuations.forEach(val => val.isActive = false);
  
  // Add new valuation
  this.valuations.push({
    id: valuationId,
    ...valuationData,
    isActive: true
  });
  
  // Update current valuation
  this.currentValuation = {
    amount: valuationData.amount,
    currency: valuationData.currency,
    valuationId: valuationId,
    lastUpdated: new Date()
  };
  
  return valuationId;
};

AssetDepositSchema.methods.addVerification = function(verificationData: any): string {
  const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.verifications.push({
    id: verificationId,
    ...verificationData
  });
  return verificationId;
};

AssetDepositSchema.methods.updateStatus = function(newStatus: DepositStatus, userId: string, notes?: string): void {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add audit trail entry
  this.auditTrail.push({
    action: 'status_change',
    performedBy: userId,
    performedAt: new Date(),
    details: {
      oldStatus,
      newStatus,
      notes
    }
  });
  
  // Update timestamps based on status
  switch (newStatus) {
    case DepositStatus.UNDER_VERIFICATION:
      this.verificationStartedAt = new Date();
      this.verificationStatus = VerificationStatus.IN_PROGRESS;
      break;
    case DepositStatus.VERIFIED:
      this.verificationCompletedAt = new Date();
      this.verificationStatus = VerificationStatus.VERIFIED;
      break;
    case DepositStatus.CREDITED:
      this.creditedAt = new Date();
      break;
    case DepositStatus.REJECTED:
      this.verificationStatus = VerificationStatus.REJECTED;
      break;
  }
};

AssetDepositSchema.methods.addProcessingNote = function(note: string, userId: string, isInternal: boolean = true): string {
  const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.processingNotes.push({
    id: noteId,
    note,
    addedBy: userId,
    addedAt: new Date(),
    isInternal
  });
  return noteId;
};

AssetDepositSchema.methods.calculateRiskScore = function(): number {
  let score = 0;
  let factors = 0;
  
  // Asset type risk
  const assetRisk = {
    [AssetType.GOLD]: 10,
    [AssetType.SILVER]: 15,
    [AssetType.DIAMOND]: 30
  };
  score += assetRisk[this.assetType] || 20;
  factors++;
  
  // Value risk
  const value = this.currentValuation?.amount || 0;
  if (value > 100000) score += 30;
  else if (value > 50000) score += 20;
  else if (value > 10000) score += 10;
  else score += 5;
  factors++;
  
  // Certificate risk
  if (this.certificates.length === 0) score += 25;
  else if (this.certificates.some(cert => cert.isVerified)) score += 5;
  else score += 15;
  factors++;
  
  // User risk (would be calculated based on user history)
  score += 10; // Default user risk
  factors++;
  
  this.riskScore = Math.min(100, Math.round(score / factors));
  return this.riskScore;
};

AssetDepositSchema.methods.toSafeObject = function(): any {
  const obj = this.toObject();
  
  // Remove sensitive internal data
  if (obj.processingNotes) {
    obj.processingNotes = obj.processingNotes.filter((note: any) => !note.isInternal);
  }
  
  // Remove internal audit trail details
  if (obj.auditTrail) {
    obj.auditTrail = obj.auditTrail.map((entry: any) => ({
      action: entry.action,
      performedAt: entry.performedAt,
      details: entry.details?.notes || null
    }));
  }
  
  delete obj.__v;
  return obj;
};

// Static methods
AssetDepositSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ depositedAt: -1 });
};

AssetDepositSchema.statics.findByTrackingNumber = function(trackingNumber: string) {
  return this.findOne({ trackingNumber });
};

AssetDepositSchema.statics.findPendingVerification = function() {
  return this.find({ 
    status: DepositStatus.PENDING_VERIFICATION 
  }).sort({ priority: -1, depositedAt: 1 });
};

AssetDepositSchema.statics.findByAssignee = function(assignedTo: string) {
  return this.find({ assignedTo }).sort({ priority: -1, depositedAt: 1 });
};

AssetDepositSchema.statics.getAssetSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$assetType',
        count: { $sum: 1 },
        totalValue: { $sum: '$currentValuation.amount' },
        avgValue: { $avg: '$currentValuation.amount' }
      }
    }
  ]);
};

// Pre-save middleware
AssetDepositSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  if (!this.trackingNumber) {
    const prefix = this.assetType.substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.trackingNumber = `${prefix}${timestamp}${random}`;
  }
  
  // Calculate risk score if not set
  if (this.riskScore === undefined || this.riskScore === 50) {
    this.calculateRiskScore();
  }
  
  next();
});

// Transform output
AssetDepositSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export interface IAssetDepositModel extends mongoose.Model<IAssetDeposit> {
  findByUserId(userId: string): Promise<IAssetDeposit[]>;
  findByTrackingNumber(trackingNumber: string): Promise<IAssetDeposit | null>;
  findPendingVerification(): Promise<IAssetDeposit[]>;
  findByAssignee(assignedTo: string): Promise<IAssetDeposit[]>;
  getAssetSummary(): Promise<any[]>;
}

export const AssetDeposit = mongoose.model<IAssetDeposit, IAssetDepositModel>('AssetDeposit', AssetDepositSchema);
export default AssetDeposit;

