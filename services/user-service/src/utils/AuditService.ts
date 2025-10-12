import mongoose, { Schema, Document } from 'mongoose';
import { Logger } from './Logger';
import { AuditEventType } from '../enums/userEnums';

/**
 * Interface for audit log entries
 */
export interface IAuditLog extends Document {
  userId?: string;
  sessionId?: string;
  eventType: AuditEventType;
  action: string;
  resource: string;
  resourceId?: string;
  
  // Request details
  ipAddress: string;
  userAgent: string;
  requestId: string;
  
  // Event details
  details: Record<string, any>;
  metadata: Record<string, any>;
  
  // Security context
  riskScore?: number;
  securityFlags?: string[];
  
  // Timestamps
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit log schema
 */
const auditLogSchema = new Schema<IAuditLog>({
  userId: { 
    type: String, 
    index: true,
    sparse: true 
  },
  sessionId: { 
    type: String, 
    index: true,
    sparse: true 
  },
  eventType: { 
    type: String, 
    enum: Object.values(AuditEventType),
    required: true,
    index: true
  },
  action: { 
    type: String, 
    required: true,
    index: true
  },
  resource: { 
    type: String, 
    required: true,
    index: true
  },
  resourceId: { 
    type: String,
    index: true,
    sparse: true
  },
  
  // Request details
  ipAddress: { 
    type: String, 
    required: true,
    index: true
  },
  userAgent: { 
    type: String, 
    required: true 
  },
  requestId: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  
  // Event details
  details: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
  // Security context
  riskScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    index: true,
    sparse: true
  },
  securityFlags: [{ 
    type: String 
  }],
  
  // Timestamps
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ riskScore: -1, timestamp: -1 });

// TTL index for automatic cleanup (keep logs for 2 years)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

/**
 * Audit service for comprehensive logging and compliance
 */
export class AuditService {
  private static instance: AuditService;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('AuditService');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  async logEvent(params: {
    userId?: string;
    sessionId?: string;
    eventType: AuditEventType;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress: string;
    userAgent: string;
    requestId: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
    riskScore?: number;
    securityFlags?: string[];
  }): Promise<IAuditLog> {
    try {
      const auditLog = new AuditLog({
        ...params,
        details: params.details || {},
        metadata: params.metadata || {},
        timestamp: new Date()
      });

      await auditLog.save();

      // Log high-risk events immediately
      if (params.riskScore && params.riskScore > 70) {
        this.logger.warn('High-risk audit event', {
          userId: params.userId,
          eventType: params.eventType,
          action: params.action,
          riskScore: params.riskScore,
          securityFlags: params.securityFlags
        });
      }

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to log audit event', {
        error: error.message,
        params
      });
      throw error;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(params: {
    userId?: string;
    sessionId?: string;
    action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'account_locked';
    ipAddress: string;
    userAgent: string;
    requestId: string;
    details?: Record<string, any>;
    success: boolean;
    failureReason?: string;
  }): Promise<IAuditLog> {
    const riskScore = this.calculateAuthRiskScore(params);
    const securityFlags = this.getAuthSecurityFlags(params);

    return this.logEvent({
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: AuditEventType.AUTHENTICATION,
      action: params.action,
      resource: 'user_session',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      details: {
        success: params.success,
        failureReason: params.failureReason,
        ...params.details
      },
      riskScore,
      securityFlags
    });
  }

  /**
   * Log user data access events
   */
  async logDataAccess(params: {
    userId: string;
    sessionId?: string;
    action: 'read' | 'create' | 'update' | 'delete';
    resource: string;
    resourceId?: string;
    ipAddress: string;
    userAgent: string;
    requestId: string;
    dataFields?: string[];
    sensitiveData?: boolean;
  }): Promise<IAuditLog> {
    const riskScore = params.sensitiveData ? 60 : 20;
    const securityFlags = params.sensitiveData ? ['sensitive_data'] : [];

    return this.logEvent({
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: AuditEventType.DATA_ACCESS,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      details: {
        dataFields: params.dataFields,
        sensitiveData: params.sensitiveData
      },
      riskScore,
      securityFlags
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(params: {
    userId?: string;
    sessionId?: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    requestId: string;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
  }): Promise<IAuditLog> {
    const riskScoreMap = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 95
    };

    const riskScore = riskScoreMap[params.threatLevel];
    const securityFlags = [`threat_${params.threatLevel}`, 'security_event'];

    return this.logEvent({
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: AuditEventType.SECURITY,
      action: params.action,
      resource: 'security_system',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      details: params.details,
      riskScore,
      securityFlags
    });
  }

  /**
   * Log compliance events
   */
  async logComplianceEvent(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress: string;
    userAgent: string;
    requestId: string;
    complianceType: 'kyc' | 'aml' | 'gdpr' | 'pci' | 'sox';
    details: Record<string, any>;
  }): Promise<IAuditLog> {
    return this.logEvent({
      userId: params.userId,
      eventType: AuditEventType.COMPLIANCE,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      details: {
        complianceType: params.complianceType,
        ...params.details
      },
      metadata: {
        complianceFramework: params.complianceType.toUpperCase(),
        auditRequired: true
      },
      securityFlags: ['compliance', params.complianceType]
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(params: {
    userId: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const query: any = { userId: params.userId };

    if (params.eventType) {
      query.eventType = params.eventType;
    }

    if (params.startDate || params.endDate) {
      query.timestamp = {};
      if (params.startDate) {
        query.timestamp.$gte = params.startDate;
      }
      if (params.endDate) {
        query.timestamp.$lte = params.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs: logs as IAuditLog[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get security summary for a user
   */
  async getUserSecuritySummary(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    highRiskEvents: number;
    authenticationEvents: number;
    dataAccessEvents: number;
    securityEvents: number;
    complianceEvents: number;
    uniqueIpAddresses: number;
    averageRiskScore: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          userId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          highRiskEvents: {
            $sum: {
              $cond: [{ $gte: ['$riskScore', 70] }, 1, 0]
            }
          },
          authenticationEvents: {
            $sum: {
              $cond: [{ $eq: ['$eventType', AuditEventType.AUTHENTICATION] }, 1, 0]
            }
          },
          dataAccessEvents: {
            $sum: {
              $cond: [{ $eq: ['$eventType', AuditEventType.DATA_ACCESS] }, 1, 0]
            }
          },
          securityEvents: {
            $sum: {
              $cond: [{ $eq: ['$eventType', AuditEventType.SECURITY] }, 1, 0]
            }
          },
          complianceEvents: {
            $sum: {
              $cond: [{ $eq: ['$eventType', AuditEventType.COMPLIANCE] }, 1, 0]
            }
          },
          uniqueIpAddresses: { $addToSet: '$ipAddress' },
          averageRiskScore: { $avg: '$riskScore' }
        }
      },
      {
        $project: {
          totalEvents: 1,
          highRiskEvents: 1,
          authenticationEvents: 1,
          dataAccessEvents: 1,
          securityEvents: 1,
          complianceEvents: 1,
          uniqueIpAddresses: { $size: '$uniqueIpAddresses' },
          averageRiskScore: { $round: ['$averageRiskScore', 2] }
        }
      }
    ];

    const result = await AuditLog.aggregate(pipeline);
    
    return result[0] || {
      totalEvents: 0,
      highRiskEvents: 0,
      authenticationEvents: 0,
      dataAccessEvents: 0,
      securityEvents: 0,
      complianceEvents: 0,
      uniqueIpAddresses: 0,
      averageRiskScore: 0
    };
  }

  /**
   * Calculate authentication risk score
   */
  private calculateAuthRiskScore(params: {
    action: string;
    success: boolean;
    failureReason?: string;
    ipAddress: string;
    userAgent: string;
  }): number {
    let score = 10; // Base score

    // Failed authentication increases risk
    if (!params.success) {
      score += 30;
      
      if (params.failureReason === 'invalid_credentials') {
        score += 20;
      } else if (params.failureReason === 'account_locked') {
        score += 40;
      }
    }

    // Account lockout is high risk
    if (params.action === 'account_locked') {
      score += 50;
    }

    // Password reset requests have medium risk
    if (params.action === 'password_reset') {
      score += 25;
    }

    return Math.min(score, 100);
  }

  /**
   * Get authentication security flags
   */
  private getAuthSecurityFlags(params: {
    action: string;
    success: boolean;
    failureReason?: string;
  }): string[] {
    const flags: string[] = [];

    if (!params.success) {
      flags.push('auth_failure');
    }

    if (params.action === 'account_locked') {
      flags.push('account_locked', 'security_alert');
    }

    if (params.action === 'password_reset') {
      flags.push('password_reset');
    }

    return flags;
  }

  /**
   * Clean up old audit logs (called by scheduled job)
   */
  async cleanupOldLogs(olderThanDays: number = 730): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    this.logger.info('Cleaned up old audit logs', {
      deletedCount: result.deletedCount,
      cutoffDate
    });

    return result.deletedCount;
  }
}

export default AuditService;
