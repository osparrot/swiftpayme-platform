import mongoose, { Schema, Model } from 'mongoose';
import { Decimal } from 'decimal.js';
import { ExchangeRateModel } from '../types';
import { CurrencyCode, ExchangeRateProvider } from '../enums/currencyEnums';

// Custom Decimal type for Mongoose
class DecimalType extends mongoose.SchemaType {
  constructor(key: string, options: any) {
    super(key, options, 'Decimal');
  }

  cast(val: any) {
    if (val instanceof Decimal) {
      return val;
    }
    if (typeof val === 'string' || typeof val === 'number') {
      return new Decimal(val);
    }
    throw new Error(`Cannot cast ${val} to Decimal`);
  }
}

mongoose.Schema.Types.Decimal = DecimalType;

// Exchange Rate schema
const exchangeRateSchema = new Schema<ExchangeRateModel>({
  fromCurrency: {
    type: String,
    enum: Object.values(CurrencyCode),
    required: true,
    index: true
  },
  toCurrency: {
    type: String,
    enum: Object.values(CurrencyCode),
    required: true,
    index: true
  },
  rate: {
    type: DecimalType,
    required: true,
    validate: {
      validator: function(value: Decimal) {
        return value.gt(0);
      },
      message: 'Exchange rate must be positive'
    }
  },
  provider: {
    type: String,
    enum: Object.values(ExchangeRateProvider),
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Convert Decimal to string for JSON serialization
      if (ret.rate instanceof Decimal) {
        ret.rate = ret.rate.toString();
      }
      return ret;
    }
  }
});

// Compound indexes for efficient queries
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, timestamp: -1 });
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, provider: 1, timestamp: -1 });
exchangeRateSchema.index({ provider: 1, timestamp: -1 });
exchangeRateSchema.index({ timestamp: -1 });
exchangeRateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Pre-save middleware
exchangeRateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate currency pair
  if (this.fromCurrency === this.toCurrency) {
    return next(new Error('From and to currencies cannot be the same'));
  }
  
  // Ensure timestamp is not in the future
  if (this.timestamp > new Date()) {
    this.timestamp = new Date();
  }
  
  next();
});

// Static methods
exchangeRateSchema.statics.findLatestRate = function(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  return this.findOne({ 
    fromCurrency, 
    toCurrency 
  }).sort({ timestamp: -1 });
};

exchangeRateSchema.statics.findLatestRateByProvider = function(
  fromCurrency: CurrencyCode, 
  toCurrency: CurrencyCode, 
  provider: ExchangeRateProvider
) {
  return this.findOne({ 
    fromCurrency, 
    toCurrency, 
    provider 
  }).sort({ timestamp: -1 });
};

exchangeRateSchema.statics.findHistoricalRate = function(
  fromCurrency: CurrencyCode, 
  toCurrency: CurrencyCode, 
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.findOne({
    fromCurrency,
    toCurrency,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ timestamp: -1 });
};

exchangeRateSchema.statics.findRatesByDateRange = function(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    fromCurrency,
    toCurrency,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

exchangeRateSchema.statics.findRatesByProvider = function(
  provider: ExchangeRateProvider,
  limit: number = 100
) {
  return this.find({ provider })
    .sort({ timestamp: -1 })
    .limit(limit);
};

exchangeRateSchema.statics.getAverageRate = async function(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  startDate: Date,
  endDate: Date
) {
  const pipeline = [
    {
      $match: {
        fromCurrency,
        toCurrency,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        averageRate: { $avg: '$rate' },
        minRate: { $min: '$rate' },
        maxRate: { $max: '$rate' },
        count: { $sum: 1 }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || null;
};

exchangeRateSchema.statics.getVolatility = async function(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  startDate: Date,
  endDate: Date
) {
  const pipeline = [
    {
      $match: {
        fromCurrency,
        toCurrency,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $sort: { timestamp: 1 }
    },
    {
      $group: {
        _id: null,
        rates: { $push: '$rate' },
        count: { $sum: 1 }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  if (!result[0] || result[0].count < 2) {
    return null;
  }
  
  const rates = result[0].rates.map((r: any) => new Decimal(r));
  const mean = rates.reduce((sum: Decimal, rate: Decimal) => sum.plus(rate), new Decimal(0)).div(rates.length);
  
  const variance = rates.reduce((sum: Decimal, rate: Decimal) => {
    const diff = rate.minus(mean);
    return sum.plus(diff.mul(diff));
  }, new Decimal(0)).div(rates.length - 1);
  
  const standardDeviation = variance.sqrt();
  const volatility = standardDeviation.div(mean).mul(100); // Coefficient of variation as percentage
  
  return {
    volatility: volatility.toNumber(),
    standardDeviation: standardDeviation.toNumber(),
    mean: mean.toNumber(),
    count: result[0].count
  };
};

exchangeRateSchema.statics.deleteOldRates = function(olderThan: Date) {
  return this.deleteMany({
    createdAt: { $lt: olderThan }
  });
};

exchangeRateSchema.statics.getProviderStats = async function(provider: ExchangeRateProvider) {
  const pipeline = [
    {
      $match: { provider }
    },
    {
      $group: {
        _id: {
          fromCurrency: '$fromCurrency',
          toCurrency: '$toCurrency'
        },
        latestRate: { $last: '$rate' },
        latestTimestamp: { $last: '$timestamp' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalPairs: { $sum: 1 },
        totalUpdates: { $sum: '$count' },
        pairs: {
          $push: {
            fromCurrency: '$_id.fromCurrency',
            toCurrency: '$_id.toCurrency',
            latestRate: '$latestRate',
            latestTimestamp: '$latestTimestamp',
            updateCount: '$count'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalPairs: 0,
    totalUpdates: 0,
    pairs: []
  };
};

// Instance methods
exchangeRateSchema.methods.isStale = function(maxAgeMinutes: number = 15): boolean {
  const now = new Date();
  const ageMinutes = (now.getTime() - this.timestamp.getTime()) / (1000 * 60);
  return ageMinutes > maxAgeMinutes;
};

exchangeRateSchema.methods.getInverseRate = function(): Decimal {
  return new Decimal(1).div(this.rate);
};

exchangeRateSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.rate = this.rate.toString();
  return obj;
};

// Virtual for currency pair string
exchangeRateSchema.virtual('currencyPair').get(function() {
  return `${this.fromCurrency}/${this.toCurrency}`;
});

// Virtual for age in minutes
exchangeRateSchema.virtual('ageMinutes').get(function() {
  const now = new Date();
  return Math.floor((now.getTime() - this.timestamp.getTime()) / (1000 * 60));
});

// Create and export the model
interface IExchangeRateModel extends Model<ExchangeRateModel> {
  findLatestRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<ExchangeRateModel | null>;
  findLatestRateByProvider(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, provider: ExchangeRateProvider): Promise<ExchangeRateModel | null>;
  findHistoricalRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, date: Date): Promise<ExchangeRateModel | null>;
  findRatesByDateRange(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, startDate: Date, endDate: Date): Promise<ExchangeRateModel[]>;
  findRatesByProvider(provider: ExchangeRateProvider, limit?: number): Promise<ExchangeRateModel[]>;
  getAverageRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, startDate: Date, endDate: Date): Promise<any>;
  getVolatility(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, startDate: Date, endDate: Date): Promise<any>;
  deleteOldRates(olderThan: Date): Promise<any>;
  getProviderStats(provider: ExchangeRateProvider): Promise<any>;
}

const ExchangeRate = mongoose.model<ExchangeRateModel, IExchangeRateModel>('ExchangeRate', exchangeRateSchema);

export { ExchangeRate, ExchangeRateModel };

