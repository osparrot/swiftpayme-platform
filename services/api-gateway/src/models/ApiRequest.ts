/**
 * SwiftPayMe API Gateway - Request Models
 * Comprehensive request tracking and management
 */

import { Schema, model, Document } from 'mongoose';

// ==================== INTERFACES ====================
export interface IApiRequest extends Document {
  requestId: string;
  correlationId: string;
  method: string;
  path: string;
  query: any;
  headers: any;
  body: any;
  userAgent: string;
  ipAddress: string;
  userId?: string;
  serviceTarget?: string;
  timestamp: Date;
  responseTime?: number;
  statusCode?: number;
  responseSize?: number;
  errorMessage?: string;
  metadata: {
    userRole?: string;
    apiKey?: string;
    rateLimitInfo?: {
      limit: number;
      remaining: number;
      resetTime: Date;
    };
    geoLocation?: {
      country: string;
      region: string;
      city: string;
    };
    deviceInfo?: {
      type: string;
      os: string;
      browser: string;
    };
  };
}

export interface IApiMetrics extends Document {
  date: Date;
  hour: number;
  service: string;
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  totalDataTransferred: number;
  uniqueUsers: number;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  topIpAddresses: Array<{ ip: string; count: number }>;
  errorBreakdown: Array<{ statusCode: number; count: number }>;
}

export interface IRateLimitEntry extends Document {
  identifier: string; // IP address or user ID
  identifierType: 'ip' | 'user' | 'apiKey';
  windowStart: Date;
  requestCount: number;
  lastRequest: Date;
  isBlocked: boolean;
  blockExpiry?: Date;
  metadata: {
    userAgent?: string;
    geoLocation?: string;
    suspiciousActivity?: boolean;
  };
}

// ==================== SCHEMAS ====================
const ApiRequestSchema = new Schema<IApiRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  correlationId: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: Schema.Types.Mixed,
    default: {}
  },
  headers: {
    type: Schema.Types.Mixed,
    required: true
  },
  body: {
    type: Schema.Types.Mixed,
    default: null
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true,
    sparse: true
  },
  serviceTarget: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  responseTime: {
    type: Number,
    min: 0
  },
  statusCode: {
    type: Number,
    min: 100,
    max: 599
  },
  responseSize: {
    type: Number,
    min: 0,
    default: 0
  },
  errorMessage: {
    type: String
  },
  metadata: {
    userRole: {
      type: String,
      enum: ['user', 'admin', 'super_admin', 'api_client']
    },
    apiKey: {
      type: String
    },
    rateLimitInfo: {
      limit: Number,
      remaining: Number,
      resetTime: Date
    },
    geoLocation: {
      country: String,
      region: String,
      city: String
    },
    deviceInfo: {
      type: String,
      os: String,
      browser: String
    }
  }
}, {
  timestamps: true,
  collection: 'api_requests'
});

const ApiMetricsSchema = new Schema<IApiMetrics>({
  date: {
    type: Date,
    required: true,
    index: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  service: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  totalRequests: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  successfulRequests: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  failedRequests: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  p95ResponseTime: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  p99ResponseTime: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalDataTransferred: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  uniqueUsers: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  topUserAgents: [{
    userAgent: String,
    count: Number
  }],
  topIpAddresses: [{
    ip: String,
    count: Number
  }],
  errorBreakdown: [{
    statusCode: Number,
    count: Number
  }]
}, {
  timestamps: true,
  collection: 'api_metrics'
});

const RateLimitEntrySchema = new Schema<IRateLimitEntry>({
  identifier: {
    type: String,
    required: true,
    index: true
  },
  identifierType: {
    type: String,
    required: true,
    enum: ['ip', 'user', 'apiKey']
  },
  windowStart: {
    type: Date,
    required: true,
    index: true
  },
  requestCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lastRequest: {
    type: Date,
    required: true,
    default: Date.now
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockExpiry: {
    type: Date,
    index: true
  },
  metadata: {
    userAgent: String,
    geoLocation: String,
    suspiciousActivity: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'rate_limit_entries'
});

// ==================== INDEXES ====================
ApiRequestSchema.index({ timestamp: -1, serviceTarget: 1 });
ApiRequestSchema.index({ userId: 1, timestamp: -1 });
ApiRequestSchema.index({ ipAddress: 1, timestamp: -1 });
ApiRequestSchema.index({ path: 1, method: 1, timestamp: -1 });
ApiRequestSchema.index({ statusCode: 1, timestamp: -1 });

ApiMetricsSchema.index({ date: -1, service: 1, endpoint: 1 });
ApiMetricsSchema.index({ service: 1, date: -1 });

RateLimitEntrySchema.index({ identifier: 1, windowStart: -1 });
RateLimitEntrySchema.index({ isBlocked: 1, blockExpiry: 1 });

// ==================== METHODS ====================
ApiRequestSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Remove sensitive information
  if (obj.headers) {
    delete obj.headers.authorization;
    delete obj.headers['x-api-key'];
    delete obj.headers.cookie;
  }
  
  if (obj.body && typeof obj.body === 'object') {
    const safebody = { ...obj.body };
    delete safebody.password;
    delete safebody.token;
    delete safebody.secret;
    obj.body = safebody;
  }
  
  return obj;
};

ApiRequestSchema.methods.calculateResponseTime = function(startTime: number): void {
  this.responseTime = Date.now() - startTime;
};

ApiRequestSchema.methods.setError = function(error: Error, statusCode: number): void {
  this.statusCode = statusCode;
  this.errorMessage = error.message;
};

// ==================== STATICS ====================
ApiRequestSchema.statics.getMetricsByService = async function(
  service: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        serviceTarget: service,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          hour: { $hour: "$timestamp" }
        },
        totalRequests: { $sum: 1 },
        successfulRequests: {
          $sum: { $cond: [{ $lt: ["$statusCode", 400] }, 1, 0] }
        },
        failedRequests: {
          $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
        },
        averageResponseTime: { $avg: "$responseTime" },
        totalDataTransferred: { $sum: "$responseSize" }
      }
    },
    { $sort: { "_id.date": -1, "_id.hour": -1 } }
  ]);
};

ApiRequestSchema.statics.getTopEndpoints = async function(
  startDate: Date, 
  endDate: Date, 
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { path: "$path", method: "$method" },
        count: { $sum: 1 },
        averageResponseTime: { $avg: "$responseTime" },
        errorRate: {
          $avg: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

RateLimitEntrySchema.statics.cleanupExpired = async function() {
  const now = new Date();
  return this.deleteMany({
    $or: [
      { blockExpiry: { $lt: now } },
      { windowStart: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
    ]
  });
};

// ==================== EXPORTS ====================
export const ApiRequest = model<IApiRequest>('ApiRequest', ApiRequestSchema);
export const ApiMetrics = model<IApiMetrics>('ApiMetrics', ApiMetricsSchema);
export const RateLimitEntry = model<IRateLimitEntry>('RateLimitEntry', RateLimitEntrySchema);

export default {
  ApiRequest,
  ApiMetrics,
  RateLimitEntry
};

