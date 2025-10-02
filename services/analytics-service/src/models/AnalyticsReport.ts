import mongoose, { Schema, Document } from 'mongoose';
import { AnalyticsReportType } from '../types/analytics';

export interface IAnalyticsReport extends Document {
  id: string;
  type: AnalyticsReportType;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    users?: any;
    transactions?: any;
    assets?: any;
    revenue?: any;
    performance?: any;
    security?: any;
  };
  insights: string[];
  recommendations: string[];
  charts?: any[];
  generatedBy?: string;
  isPublic: boolean;
  tags: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsReportSchema: Schema = new Schema({
  type: {
    type: String,
    enum: Object.values(AnalyticsReportType),
    required: true,
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  period: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    }
  },
  metrics: {
    users: {
      totalUsers: { type: Number, default: 0 },
      newUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      verifiedUsers: { type: Number, default: 0 },
      userGrowthRate: { type: Number, default: 0 },
      averageSessionDuration: { type: Number, default: 0 },
      userRetentionRate: { type: Number, default: 0 },
      topCountries: [{
        country: String,
        countryCode: String,
        userCount: Number,
        percentage: Number
      }],
      userSegments: { type: Map, of: Number }
    },
    transactions: {
      totalTransactions: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      averageTransactionValue: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
      failureRate: { type: Number, default: 0 },
      transactionGrowthRate: { type: Number, default: 0 },
      topCurrencies: [{
        currency: String,
        transactionCount: Number,
        totalVolume: Number,
        percentage: Number
      }],
      transactionsByType: { type: Map, of: Number },
      hourlyDistribution: [{
        hour: Number,
        transactionCount: Number,
        totalVolume: Number
      }]
    },
    assets: {
      totalAssets: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      averageAssetValue: { type: Number, default: 0 },
      approvalRate: { type: Number, default: 0 },
      rejectionRate: { type: Number, default: 0 },
      assetGrowthRate: { type: Number, default: 0 },
      topAssetTypes: [{
        assetType: String,
        assetCount: Number,
        totalValue: Number,
        percentage: Number
      }],
      assetsByStatus: { type: Map, of: Number },
      averageProcessingTime: { type: Number, default: 0 }
    },
    revenue: {
      totalRevenue: { type: Number, default: 0 },
      revenueGrowthRate: { type: Number, default: 0 },
      averageRevenuePerUser: { type: Number, default: 0 },
      revenueBySource: { type: Map, of: Number },
      revenueByCurrency: { type: Map, of: Number },
      monthlyRecurringRevenue: { type: Number, default: 0 },
      customerLifetimeValue: { type: Number, default: 0 },
      churnRate: { type: Number, default: 0 }
    },
    performance: {
      averageResponseTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
      uptime: { type: Number, default: 0 },
      throughput: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
      cpuUsage: { type: Number, default: 0 }
    },
    security: {
      loginAttempts: { type: Number, default: 0 },
      failedLogins: { type: Number, default: 0 },
      suspiciousActivities: { type: Number, default: 0 },
      blockedIPs: { type: Number, default: 0 },
      securityAlerts: { type: Number, default: 0 },
      twoFactorAdoption: { type: Number, default: 0 }
    }
  },
  insights: [{
    type: String,
    trim: true
  }],
  recommendations: [{
    type: String,
    trim: true
  }],
  charts: [{
    type: {
      type: String,
      enum: ['line', 'bar', 'pie', 'area', 'scatter']
    },
    title: String,
    data: [Schema.Types.Mixed],
    xAxis: String,
    yAxis: String,
    categories: [String]
  }],
  generatedBy: {
    type: String,
    default: 'system'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'analytics_reports'
});

// Indexes for better query performance
AnalyticsReportSchema.index({ type: 1, 'period.startDate': -1 });
AnalyticsReportSchema.index({ generatedAt: -1 });
AnalyticsReportSchema.index({ tags: 1 });
AnalyticsReportSchema.index({ isPublic: 1 });

// Virtual for report ID
AnalyticsReportSchema.virtual('reportId').get(function() {
  return `${this.type}_${this.period.startDate.toISOString().split('T')[0]}_${this._id}`;
});

// Methods
AnalyticsReportSchema.methods.toSummary = function() {
  return {
    id: this._id,
    type: this.type,
    generatedAt: this.generatedAt,
    period: this.period,
    insightCount: this.insights.length,
    recommendationCount: this.recommendations.length,
    tags: this.tags
  };
};

AnalyticsReportSchema.methods.getKPIs = function() {
  const kpis = [];
  
  if (this.metrics.users) {
    kpis.push({
      name: 'Total Users',
      value: this.metrics.users.totalUsers,
      unit: 'users',
      change: this.metrics.users.userGrowthRate,
      changeType: this.metrics.users.userGrowthRate > 0 ? 'increase' : 'decrease'
    });
  }
  
  if (this.metrics.transactions) {
    kpis.push({
      name: 'Transaction Volume',
      value: this.metrics.transactions.totalVolume,
      unit: 'USD',
      change: this.metrics.transactions.transactionGrowthRate,
      changeType: this.metrics.transactions.transactionGrowthRate > 0 ? 'increase' : 'decrease'
    });
  }
  
  if (this.metrics.revenue) {
    kpis.push({
      name: 'Total Revenue',
      value: this.metrics.revenue.totalRevenue,
      unit: 'USD',
      change: this.metrics.revenue.revenueGrowthRate,
      changeType: this.metrics.revenue.revenueGrowthRate > 0 ? 'increase' : 'decrease'
    });
  }
  
  return kpis;
};

// Static methods
AnalyticsReportSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate }
  }).sort({ generatedAt: -1 });
};

AnalyticsReportSchema.statics.findByType = function(type: AnalyticsReportType) {
  return this.find({ type }).sort({ generatedAt: -1 });
};

AnalyticsReportSchema.statics.getLatestByType = function(type: AnalyticsReportType) {
  return this.findOne({ type }).sort({ generatedAt: -1 });
};

export const AnalyticsReport = mongoose.model<IAnalyticsReport>('AnalyticsReport', AnalyticsReportSchema);
