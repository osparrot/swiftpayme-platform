import mongoose, { Schema, Document } from 'mongoose';

export interface IRevenueMetrics extends Document {
  date: string;
  totalRevenue: number;
  revenueGrowthRate: number;
  averageRevenuePerUser: number;
  revenueBySource: Map<string, number>;
  revenueByCurrency: Map<string, number>;
  monthlyRecurringRevenue: number;
  customerLifetimeValue: number;
  churnRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const RevenueMetricsSchema: Schema = new Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  revenueGrowthRate: {
    type: Number,
    default: 0
  },
  averageRevenuePerUser: {
    type: Number,
    default: 0,
    min: 0
  },
  revenueBySource: {
    type: Map,
    of: Number,
    default: new Map()
  },
  revenueByCurrency: {
    type: Map,
    of: Number,
    default: new Map()
  },
  monthlyRecurringRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  customerLifetimeValue: {
    type: Number,
    default: 0,
    min: 0
  },
  churnRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  collection: 'revenue_metrics'
});

// Indexes
RevenueMetricsSchema.index({ date: -1 });
RevenueMetricsSchema.index({ createdAt: -1 });
RevenueMetricsSchema.index({ totalRevenue: -1 });

export const RevenueMetrics = mongoose.model<IRevenueMetrics>('RevenueMetrics', RevenueMetricsSchema);
