import mongoose, { Schema, Document } from 'mongoose';

export interface IUserMetrics extends Document {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  userRetentionRate: number;
  topCountries: Array<{
    country: string;
    countryCode: string;
    userCount: number;
    percentage: number;
  }>;
  userSegments: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const UserMetricsSchema: Schema = new Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  newUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  activeUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  verifiedUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  userGrowthRate: {
    type: Number,
    default: 0
  },
  averageSessionDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  userRetentionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topCountries: [{
    country: {
      type: String,
      required: true
    },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 3
    },
    userCount: {
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
  userSegments: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true,
  collection: 'user_metrics'
});

// Indexes
UserMetricsSchema.index({ date: -1 });
UserMetricsSchema.index({ createdAt: -1 });

export const UserMetrics = mongoose.model<IUserMetrics>('UserMetrics', UserMetricsSchema);
