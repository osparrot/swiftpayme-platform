import mongoose, { Schema, Document } from 'mongoose';

export interface IAssetMetrics extends Document {
  date: string;
  totalAssets: number;
  totalValue: number;
  averageAssetValue: number;
  approvalRate: number;
  rejectionRate: number;
  assetGrowthRate: number;
  topAssetTypes: Array<{
    assetType: string;
    assetCount: number;
    totalValue: number;
    percentage: number;
  }>;
  assetsByStatus: Map<string, number>;
  averageProcessingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssetMetricsSchema: Schema = new Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalAssets: {
    type: Number,
    default: 0,
    min: 0
  },
  totalValue: {
    type: Number,
    default: 0,
    min: 0
  },
  averageAssetValue: {
    type: Number,
    default: 0,
    min: 0
  },
  approvalRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rejectionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assetGrowthRate: {
    type: Number,
    default: 0
  },
  topAssetTypes: [{
    assetType: {
      type: String,
      required: true,
      enum: ['gold', 'silver', 'platinum', 'palladium', 'diamond', 'jewelry', 'watch', 'art', 'collectible', 'other']
    },
    assetCount: {
      type: Number,
      required: true,
      min: 0
    },
    totalValue: {
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
  assetsByStatus: {
    type: Map,
    of: Number,
    default: new Map()
  },
  averageProcessingTime: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'asset_metrics'
});

// Indexes
AssetMetricsSchema.index({ date: -1 });
AssetMetricsSchema.index({ createdAt: -1 });
AssetMetricsSchema.index({ totalValue: -1 });

export const AssetMetrics = mongoose.model<IAssetMetrics>('AssetMetrics', AssetMetricsSchema);
