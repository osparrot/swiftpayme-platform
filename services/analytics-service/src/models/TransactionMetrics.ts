import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionMetrics extends Document {
  date: string;
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  successRate: number;
  failureRate: number;
  transactionGrowthRate: number;
  topCurrencies: Array<{
    currency: string;
    transactionCount: number;
    totalVolume: number;
    percentage: number;
  }>;
  transactionsByType: Map<string, number>;
  hourlyDistribution: Array<{
    hour: number;
    transactionCount: number;
    totalVolume: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionMetricsSchema: Schema = new Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalTransactions: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVolume: {
    type: Number,
    default: 0,
    min: 0
  },
  averageTransactionValue: {
    type: Number,
    default: 0,
    min: 0
  },
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  failureRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  transactionGrowthRate: {
    type: Number,
    default: 0
  },
  topCurrencies: [{
    currency: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    transactionCount: {
      type: Number,
      required: true,
      min: 0
    },
    totalVolume: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }],
  transactionsByType: {
    type: Map,
    of: Number,
    default: new Map()
  },
  hourlyDistribution: [{
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    },
    transactionCount: {
      type: Number,
      required: true,
      min: 0
    },
    totalVolume: {
      type: Number,
      required: true,
      min: 0
    }
  }]
}, {
  timestamps: true,
  collection: 'transaction_metrics'
});

// Indexes
TransactionMetricsSchema.index({ date: -1 });
TransactionMetricsSchema.index({ createdAt: -1 });
TransactionMetricsSchema.index({ totalVolume: -1 });

export const TransactionMetrics = mongoose.model<ITransactionMetrics>('TransactionMetrics', TransactionMetricsSchema);
