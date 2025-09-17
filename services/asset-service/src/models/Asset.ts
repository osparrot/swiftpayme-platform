import mongoose, { Schema } from 'mongoose';
import Decimal from 'decimal.js';
import { IAsset } from '../types';
import {
  AssetType,
  AssetSymbol,
  AssetStatus,
  AssetClass,
  PriceSource,
  AssetGrade,
  AssetUnit,
  StorageType,
  CustodyType,
  AssetOrigin,
  CertificationType,
  RiskLevel,
  LiquidityLevel
} from '../enums/assetEnums';

// Custom Decimal type for Mongoose
const DecimalType = {
  type: Schema.Types.Mixed,
  get: (value: any) => value ? new Decimal(value.toString()) : new Decimal(0),
  set: (value: any) => value ? new Decimal(value.toString()).toString() : '0'
};

const AssetSchema = new Schema<IAsset>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  symbol: {
    type: String,
    enum: Object.values(AssetSymbol),
    required: true,
    unique: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  type: {
    type: String,
    enum: Object.values(AssetType),
    required: true,
    index: true
  },
  
  class: {
    type: String,
    enum: Object.values(AssetClass),
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: Object.values(AssetStatus),
    required: true,
    default: AssetStatus.ACTIVE,
    index: true
  },
  
  // Metadata
  metadata: {
    grade: {
      type: String,
      enum: Object.values(AssetGrade)
    },
    purity: {
      type: Number,
      min: 0,
      max: 1000
    },
    weight: DecimalType,
    unit: {
      type: String,
      enum: Object.values(AssetUnit),
      required: true
    },
    origin: {
      type: String,
      enum: Object.values(AssetOrigin)
    },
    manufacturer: {
      type: String,
      trim: true,
      maxlength: 100
    },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: 100
    },
    batchNumber: {
      type: String,
      trim: true,
      maxlength: 100
    },
    mintYear: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear() + 1
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    },
    region: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  
  // Pricing
  pricing: {
    currentPrice: {
      ...DecimalType,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      maxlength: 3
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now
    },
    priceSource: {
      type: String,
      enum: Object.values(PriceSource),
      required: true
    },
    bid: DecimalType,
    ask: DecimalType,
    spread: DecimalType,
    volume24h: DecimalType,
    marketCap: DecimalType,
    priceChange24h: DecimalType,
    priceChangePercent24h: DecimalType
  },
  
  // Trading
  trading: {
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    minOrderSize: {
      ...DecimalType,
      required: true
    },
    maxOrderSize: {
      ...DecimalType,
      required: true
    },
    tickSize: {
      ...DecimalType,
      required: true
    },
    lotSize: {
      ...DecimalType,
      required: true
    },
    fees: {
      maker: {
        ...DecimalType,
        required: true
      },
      taker: {
        ...DecimalType,
        required: true
      },
      withdrawal: {
        ...DecimalType,
        required: true
      },
      deposit: {
        ...DecimalType,
        required: true
      }
    },
    marketHours: {
      open: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      close: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      holidays: [{
        type: String
      }]
    }
  },
  
  // Risk and compliance
  risk: {
    level: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true,
      default: RiskLevel.MEDIUM
    },
    volatility: {
      ...DecimalType,
      required: true
    },
    liquidity: {
      type: String,
      enum: Object.values(LiquidityLevel),
      required: true,
      default: LiquidityLevel.MEDIUM
    },
    creditRating: {
      type: String,
      trim: true,
      maxlength: 10
    },
    regulatoryStatus: {
      type: String,
      required: true,
      default: 'compliant'
    },
    restrictions: [{
      type: String,
      trim: true
    }]
  },
  
  // Storage and custody
  storage: {
    type: {
      type: String,
      enum: Object.values(StorageType),
      required: true
    },
    custody: {
      type: String,
      enum: Object.values(CustodyType),
      required: true
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    facility: {
      type: String,
      trim: true,
      maxlength: 100
    },
    vault: {
      type: String,
      trim: true,
      maxlength: 100
    },
    insurance: {
      provider: {
        type: String,
        trim: true,
        maxlength: 100
      },
      policyNumber: {
        type: String,
        trim: true,
        maxlength: 100
      },
      coverage: DecimalType,
      expiresAt: Date
    }
  },
  
  // Certifications
  certifications: [{
    type: {
      type: String,
      enum: Object.values(CertificationType),
      required: true
    },
    issuer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    certificateNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    issuedAt: {
      type: Date,
      required: true
    },
    expiresAt: Date,
    documentUrl: {
      type: String,
      trim: true
    },
    verified: {
      type: Boolean,
      required: true,
      default: false
    }
  }],
  
  // Audit trail
  auditTrail: [{
    action: {
      type: String,
      required: true,
      trim: true
    },
    performedBy: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    details: Schema.Types.Mixed,
    ipAddress: {
      type: String,
      trim: true
    }
  }],
  
  // System fields
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  
  updatedBy: {
    type: String,
    trim: true
  },
  
  version: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: function(doc, ret) {
      // Convert Decimal fields to numbers for JSON serialization
      if (ret.pricing) {
        Object.keys(ret.pricing).forEach(key => {
          if (ret.pricing[key] && typeof ret.pricing[key] === 'string' && !isNaN(Number(ret.pricing[key]))) {
            ret.pricing[key] = Number(ret.pricing[key]);
          }
        });
      }
      
      if (ret.trading && ret.trading.fees) {
        Object.keys(ret.trading.fees).forEach(key => {
          if (ret.trading.fees[key] && typeof ret.trading.fees[key] === 'string' && !isNaN(Number(ret.trading.fees[key]))) {
            ret.trading.fees[key] = Number(ret.trading.fees[key]);
          }
        });
      }
      
      return ret;
    }
  }
});

// Indexes
AssetSchema.index({ symbol: 1, status: 1 });
AssetSchema.index({ type: 1, class: 1 });
AssetSchema.index({ 'pricing.currentPrice': 1 });
AssetSchema.index({ 'trading.isActive': 1 });
AssetSchema.index({ createdAt: -1 });
AssetSchema.index({ updatedAt: -1 });

// Text search index
AssetSchema.index({
  name: 'text',
  description: 'text',
  'metadata.manufacturer': 'text',
  'metadata.serialNumber': 'text'
});

// Methods
AssetSchema.methods.updatePrice = async function(price: Decimal, source: PriceSource): Promise<void> {
  this.pricing.currentPrice = price.toString();
  this.pricing.priceSource = source;
  this.pricing.lastUpdated = new Date();
  this.updatedAt = new Date();
  this.version += 1;
  
  await this.audit('price_updated', 'system', {
    oldPrice: this.pricing.currentPrice,
    newPrice: price.toString(),
    source
  });
  
  await this.save();
};

AssetSchema.methods.addCertification = async function(certification: any): Promise<void> {
  this.certifications.push(certification);
  this.updatedAt = new Date();
  this.version += 1;
  
  await this.audit('certification_added', certification.issuedBy || 'system', {
    certificationType: certification.type,
    issuer: certification.issuer
  });
  
  await this.save();
};

AssetSchema.methods.updateStatus = async function(status: AssetStatus, reason?: string): Promise<void> {
  const oldStatus = this.status;
  this.status = status;
  this.updatedAt = new Date();
  this.version += 1;
  
  await this.audit('status_updated', 'system', {
    oldStatus,
    newStatus: status,
    reason
  });
  
  await this.save();
};

AssetSchema.methods.calculateValue = function(quantity: Decimal): Decimal {
  const price = new Decimal(this.pricing.currentPrice.toString());
  return price.mul(quantity);
};

AssetSchema.methods.isTradeableAt = function(timestamp: Date): boolean {
  if (!this.trading.isActive || this.status !== AssetStatus.ACTIVE) {
    return false;
  }
  
  // Check market hours if specified
  if (this.trading.marketHours && this.trading.marketHours.open && this.trading.marketHours.close) {
    const time = timestamp.toTimeString().substring(0, 5);
    const open = this.trading.marketHours.open;
    const close = this.trading.marketHours.close;
    
    if (time < open || time > close) {
      return false;
    }
    
    // Check holidays
    const dateStr = timestamp.toISOString().substring(0, 10);
    if (this.trading.marketHours.holidays && this.trading.marketHours.holidays.includes(dateStr)) {
      return false;
    }
  }
  
  return true;
};

AssetSchema.methods.getStorageInfo = function(): any {
  return {
    type: this.storage.type,
    custody: this.storage.custody,
    location: this.storage.location,
    facility: this.storage.facility,
    vault: this.storage.vault,
    insurance: this.storage.insurance
  };
};

AssetSchema.methods.audit = async function(action: string, performedBy: string, details?: any): Promise<void> {
  this.auditTrail.push({
    action,
    performedBy,
    timestamp: new Date(),
    details,
    ipAddress: details?.ipAddress
  });
};

// Static methods
AssetSchema.statics.findBySymbol = function(symbol: AssetSymbol) {
  return this.findOne({ symbol, isActive: true });
};

AssetSchema.statics.findActiveAssets = function() {
  return this.find({ status: AssetStatus.ACTIVE, isActive: true });
};

AssetSchema.statics.findByType = function(type: AssetType) {
  return this.find({ type, isActive: true });
};

AssetSchema.statics.findTradeableAssets = function() {
  return this.find({
    status: AssetStatus.ACTIVE,
    'trading.isActive': true,
    isActive: true
  });
};

AssetSchema.statics.searchAssets = function(query: any) {
  const filter: any = { isActive: true };
  
  if (query.symbol) filter.symbol = query.symbol;
  if (query.type) filter.type = query.type;
  if (query.class) filter.class = query.class;
  if (query.status) filter.status = query.status;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  
  if (query.minPrice || query.maxPrice) {
    filter['pricing.currentPrice'] = {};
    if (query.minPrice) filter['pricing.currentPrice'].$gte = query.minPrice.toString();
    if (query.maxPrice) filter['pricing.currentPrice'].$lte = query.maxPrice.toString();
  }
  
  if (query.currency) filter['pricing.currency'] = query.currency;
  
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
AssetSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-update middleware
AssetSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Virtual for price age
AssetSchema.virtual('priceAge').get(function() {
  return Date.now() - this.pricing.lastUpdated.getTime();
});

// Virtual for market cap calculation
AssetSchema.virtual('marketCapFormatted').get(function() {
  if (!this.pricing.marketCap) return null;
  
  const marketCap = new Decimal(this.pricing.marketCap.toString());
  if (marketCap.gte(1e9)) {
    return `$${marketCap.div(1e9).toFixed(2)}B`;
  } else if (marketCap.gte(1e6)) {
    return `$${marketCap.div(1e6).toFixed(2)}M`;
  } else if (marketCap.gte(1e3)) {
    return `$${marketCap.div(1e3).toFixed(2)}K`;
  } else {
    return `$${marketCap.toFixed(2)}`;
  }
});

// Virtual for spread calculation
AssetSchema.virtual('spreadPercent').get(function() {
  if (!this.pricing.bid || !this.pricing.ask) return null;
  
  const bid = new Decimal(this.pricing.bid.toString());
  const ask = new Decimal(this.pricing.ask.toString());
  const midPrice = bid.add(ask).div(2);
  
  if (midPrice.eq(0)) return null;
  
  const spread = ask.sub(bid);
  return spread.div(midPrice).mul(100).toNumber();
});

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
export default Asset;

