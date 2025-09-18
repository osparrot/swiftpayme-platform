import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  AuditEventType,
  AuditSeverity
} from '../enums/ledgerEnums';
import { IAuditLog } from '../types';

// Change Details Schema for tracking field-level changes
const ChangeDetailsSchema = new Schema({
  field: {
    type: String,
    required: true
  },
  oldValue: {
    type: Schema.Types.Mixed,
    required: false
  },
  newValue: {
    type: Schema.Types.Mixed,
    required: false
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array', 'date'],
    required: true
  }
}, { _id: false });

// Security Context Schema
const SecurityContextSchema = new Schema({
  ipAddress: {
    type: String,
    required: false,
    validate: {
      validator: function(v: string) {
        // Validate IPv4 or IPv6 format
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return !v || ipv4Regex.test(v) || ipv6Regex.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  sessionId: {
    type: String,
    maxlength: 100
  },
  deviceId: {
    type: String,
    maxlength: 100
  },
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  authMethod: {
    type: String,
    enum: ['password', 'mfa', 'api_key', 'oauth', 'system']
  }
}, { _id: false });

// Performance Metrics Schema
const PerformanceMetricsSchema = new Schema({
  executionTimeMs: {
    type: Number,
    min: 0
  },
  memoryUsageMB: {
    type: Number,
    min: 0
  },
  cpuUsagePercent: {
    type: Number,
    min: 0,
    max: 100
  },
  databaseQueries: {
    type: Number,
    min: 0
  },
  apiCalls: {
    type: Number,
    min: 0
  }
}, { _id: false });

// Audit Log Schema
const AuditLogSchema = new Schema<IAuditLog>({
  // Primary Identifiers
  auditId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Event Classification
  eventType: {
    type: String,
    enum: Object.values(AuditEventType),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(AuditSeverity),
    required: true,
    index: true
  },
  
  // Event Details
  description: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  entityType: {
    type: String,
    required: true,
    maxlength: 100,
    index: true
  },
  entityId: {
    type: String,
    required: true,
    maxlength: 100,
    index: true
  },
  
  // Change Tracking
  oldValues: {
    type: Schema.Types.Mixed,
    required: false
  },
  newValues: {
    type: Schema.Types.Mixed,
    required: false
  },
  changedFields: [{
    type: String,
    maxlength: 100
  }],
  changeDetails: [ChangeDetailsSchema],
  
  // Context Information
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
  
  // Security Context
  securityContext: SecurityContextSchema,
  
  // Timing Information
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Additional Information
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Performance Metrics
  performanceMetrics: PerformanceMetricsSchema,
  
  // Integration with SwiftPayMe Services
  integrationData: {
    // Service Information
    serviceName: {
      type: String,
      enum: [
        'user-service',
        'asset-service',
        'currency-conversion-service',
        'crypto-service',
        'payment-service',
        'admin-service',
        'tokenization-service',
        'notification-service',
        'ledger-service'
      ]
    },
    serviceVersion: String,
    
    // Request Information
    requestId: String,
    correlationId: String,
    traceId: String,
    
    // Business Context
    businessTransactionId: String,
    workflowId: String,
    
    // Related Entities
    relatedAccountIds: [String],
    relatedTransactionIds: [String],
    relatedJournalEntryIds: [String],
    
    // External System Integration
    externalSystemName: String,
    externalTransactionId: String,
    externalReference: String
  },
  
  // Compliance and Regulatory
  complianceData: {
    regulatoryRequirement: String,
    retentionPeriodYears: {
      type: Number,
      default: 7,
      min: 1,
      max: 50
    },
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal'
    },
    gdprRelevant: {
      type: Boolean,
      default: false
    },
    pciRelevant: {
      type: Boolean,
      default: false
    },
    soxRelevant: {
      type: Boolean,
      default: false
    }
  },
  
  // Error Information (for failed operations)
  errorDetails: {
    errorCode: String,
    errorMessage: String,
    stackTrace: String,
    errorCategory: {
      type: String,
      enum: ['validation', 'business_logic', 'system', 'network', 'security', 'data']
    }
  },
  
  // Immutability Protection
  hash: {
    type: String,
    required: true,
    index: true
  },
  previousHash: {
    type: String,
    required: false
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'audit_logs',
  versionKey: false
});

// Indexes for performance and compliance queries
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });

// Compound indexes for common audit queries
AuditLogSchema.index({
  eventType: 1,
  severity: 1,
  timestamp: -1
});

AuditLogSchema.index({
  entityType: 1,
  eventType: 1,
  timestamp: -1
});

AuditLogSchema.index({
  userId: 1,
  eventType: 1,
  timestamp: -1
});

// Integration-specific indexes
AuditLogSchema.index({ 'integrationData.serviceName': 1, timestamp: -1 });
AuditLogSchema.index({ 'integrationData.requestId': 1 });
AuditLogSchema.index({ 'integrationData.correlationId': 1 });
AuditLogSchema.index({ 'integrationData.businessTransactionId': 1 });
AuditLogSchema.index({ 'integrationData.relatedAccountIds': 1 });
AuditLogSchema.index({ 'integrationData.relatedTransactionIds': 1 });

// Compliance indexes
AuditLogSchema.index({ 'complianceData.regulatoryRequirement': 1 });
AuditLogSchema.index({ 'complianceData.gdprRelevant': 1, timestamp: -1 });
AuditLogSchema.index({ 'complianceData.pciRelevant': 1, timestamp: -1 });
AuditLogSchema.index({ 'complianceData.soxRelevant': 1, timestamp: -1 });

// Security indexes
AuditLogSchema.index({ 'securityContext.ipAddress': 1, timestamp: -1 });
AuditLogSchema.index({ 'securityContext.sessionId': 1 });

// Text index for search
AuditLogSchema.index({
  description: 'text',
  'metadata': 'text',
  tags: 'text'
});

// Virtual for age in days
AuditLogSchema.virtual('ageInDays').get(function(this: IAuditLog) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.timestamp.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for retention status
AuditLogSchema.virtual('isRetentionExpired').get(function(this: IAuditLog) {
  const retentionPeriodDays = (this.complianceData?.retentionPeriodYears || 7) * 365;
  return this.ageInDays > retentionPeriodDays;
});

// Virtual for compliance flags
AuditLogSchema.virtual('complianceFlags').get(function(this: IAuditLog) {
  const flags = [];
  if (this.complianceData?.gdprRelevant) flags.push('GDPR');
  if (this.complianceData?.pciRelevant) flags.push('PCI-DSS');
  if (this.complianceData?.soxRelevant) flags.push('SOX');
  return flags;
});

// Instance Methods
AuditLogSchema.methods.generateHash = function(this: IAuditLog): string {
  const crypto = require('crypto');
  
  // Create hash input from critical fields
  const hashInput = JSON.stringify({
    auditId: this.auditId,
    eventType: this.eventType,
    entityType: this.entityType,
    entityId: this.entityId,
    timestamp: this.timestamp.toISOString(),
    userId: this.userId,
    description: this.description,
    oldValues: this.oldValues,
    newValues: this.newValues
  });
  
  return crypto.createHash('sha256').update(hashInput).digest('hex');
};

AuditLogSchema.methods.verifyIntegrity = function(this: IAuditLog): boolean {
  const expectedHash = this.generateHash();
  return this.hash === expectedHash;
};

AuditLogSchema.methods.addTag = function(this: IAuditLog, tag: string): void {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
};

AuditLogSchema.methods.removeTag = function(this: IAuditLog, tag: string): void {
  this.tags = this.tags.filter(t => t !== tag);
};

// Static Methods
AuditLogSchema.statics.generateAuditId = function(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AUDIT-${timestamp}-${random}`;
};

AuditLogSchema.statics.findByEntity = function(
  entityType: string,
  entityId: string,
  options: any = {}
) {
  const query = { entityType, entityId };
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

AuditLogSchema.statics.findByUser = function(
  userId: string,
  options: any = {}
) {
  const query = { userId };
  
  if (options.eventType) query.eventType = options.eventType;
  if (options.severity) query.severity = options.severity;
  if (options.dateFrom) {
    query.timestamp = { $gte: options.dateFrom };
  }
  if (options.dateTo) {
    query.timestamp = { ...query.timestamp, $lte: options.dateTo };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

AuditLogSchema.statics.findByDateRange = function(
  startDate: Date,
  endDate: Date,
  options: any = {}
) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (options.eventType) query.eventType = options.eventType;
  if (options.severity) query.severity = options.severity;
  if (options.entityType) query.entityType = options.entityType;
  if (options.userId) query.userId = options.userId;
  
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findSecurityEvents = function(options: any = {}) {
  const securityEventTypes = [
    AuditEventType.SECURITY_EVENT,
    AuditEventType.ACCOUNT_CREATED,
    AuditEventType.ACCOUNT_UPDATED,
    AuditEventType.ACCOUNT_CLOSED
  ];
  
  const query = {
    eventType: { $in: securityEventTypes }
  };
  
  if (options.severity) query.severity = options.severity;
  if (options.dateFrom) {
    query.timestamp = { $gte: options.dateFrom };
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findComplianceRelevant = function(
  complianceType: 'gdpr' | 'pci' | 'sox',
  options: any = {}
) {
  const query = {};
  query[`complianceData.${complianceType}Relevant`] = true;
  
  if (options.dateFrom) {
    query.timestamp = { $gte: options.dateFrom };
  }
  if (options.dateTo) {
    query.timestamp = { ...query.timestamp, $lte: options.dateTo };
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.getAuditStatistics = async function(
  startDate: Date,
  endDate: Date
) {
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          severity: '$severity'
        },
        count: { $sum: 1 },
        avgExecutionTime: { $avg: '$performanceMetrics.executionTimeMs' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Pre-save middleware
AuditLogSchema.pre('save', async function(this: IAuditLog, next) {
  // Generate audit ID if not provided
  if (!this.auditId) {
    this.auditId = (this.constructor as any).generateAuditId();
  }
  
  // Generate hash for integrity
  this.hash = this.generateHash();
  
  // Set previous hash for chain integrity
  if (!this.previousHash) {
    const lastAudit = await (this.constructor as any)
      .findOne({}, {}, { sort: { timestamp: -1 } });
    
    if (lastAudit) {
      this.previousHash = lastAudit.hash;
    }
  }
  
  // Set compliance flags based on event type and entity
  if (!this.complianceData) {
    this.complianceData = {};
  }
  
  // Auto-set compliance relevance based on business rules
  if (this.entityType === 'Account' || this.entityType === 'Transaction') {
    this.complianceData.soxRelevant = true;
  }
  
  if (this.userId) {
    this.complianceData.gdprRelevant = true;
  }
  
  if (this.eventType === AuditEventType.TRANSACTION_CREATED || 
      this.eventType === AuditEventType.TRANSACTION_UPDATED) {
    this.complianceData.pciRelevant = true;
  }
  
  next();
});

// Post-save middleware (audit logs are immutable, so no updates)
AuditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

// Create and export the model
const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
export { AuditLogSchema };

