import mongoose, { Schema, Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import {
  IToken,
  ITokenMetadata,
  ITokenAttribute,
  IBackingAssetDetails,
  IComplianceInfo,
  IAuditInfo
} from '../types';
import {
  TokenType,
  TokenStandard,
  TokenStatus,
  AssetType,
  CustodyType,
  ReserveType,
  AuditStatus
} from '../enums/tokenizationEnums';

// Custom Decimal type for Mongoose
const DecimalType = {
  type: Schema.Types.Mixed,
  get: (value: any) => value ? new Decimal(value.toString()) : value,
  set: (value: any) => value ? new Decimal(value.toString()).toString() : value
};

const TokenAttributeSchema = new Schema<ITokenAttribute>({
  traitType: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  displayType: { type: String }
}, { _id: false });

const BackingAssetDetailsSchema = new Schema<IBackingAssetDetails>({
  assetId: { type: String, required: true },
  assetType: { type: String, enum: Object.values(AssetType), required: true },
  grade: { type: String },
  purity: DecimalType,
  weight: DecimalType,
  unit: { type: String },
  origin: { type: String },
  certificationNumber: { type: String },
  storageLocation: { type: String },
  custodian: { type: String },
  insurancePolicy: { type: String },
  lastAuditDate: { type: Date },
  nextAuditDate: { type: Date }
}, { _id: false });

const TokenMetadataSchema = new Schema<ITokenMetadata>({
  description: { type: String, required: true },
  image: { type: String },
  externalUrl: { type: String },
  attributes: [TokenAttributeSchema],
  properties: { type: Schema.Types.Mixed, default: {} },
  backingAssetDetails: { type: BackingAssetDetailsSchema, required: true }
}, { _id: false });

const ComplianceInfoSchema = new Schema<IComplianceInfo>({
  isCompliant: { type: Boolean, required: true, default: false },
  lastCheck: { type: Date, required: true },
  nextCheck: { type: Date, required: true },
  requirements: [{ type: String }],
  exemptions: [{ type: String }],
  jurisdiction: { type: String, required: true }
}, { _id: false });

const AuditInfoSchema = new Schema<IAuditInfo>({
  lastAudit: { type: Date, required: true },
  nextAudit: { type: Date, required: true },
  auditor: { type: String, required: true },
  status: { type: String, enum: Object.values(AuditStatus), required: true },
  findings: [{ type: String }],
  recommendations: [{ type: String }]
}, { _id: false });

const TokenSchema = new Schema<IToken & Document>({
  tokenId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  name: { type: String, required: true },
  symbol: { 
    type: String, 
    required: true, 
    uppercase: true,
    index: true
  },
  decimals: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 18, 
    default: 18 
  },
  totalSupply: { 
    ...DecimalType, 
    required: true, 
    default: '0' 
  },
  circulatingSupply: { 
    ...DecimalType, 
    required: true, 
    default: '0' 
  },
  maxSupply: DecimalType,
  tokenType: { 
    type: String, 
    enum: Object.values(TokenType), 
    required: true,
    index: true
  },
  tokenStandard: { 
    type: String, 
    enum: Object.values(TokenStandard), 
    required: true 
  },
  status: { 
    type: String, 
    enum: Object.values(TokenStatus), 
    required: true, 
    default: TokenStatus.ACTIVE,
    index: true
  },
  contractAddress: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid contract address format'
    }
  },
  chainId: { type: Number },
  assetType: { 
    type: String, 
    enum: Object.values(AssetType), 
    required: true,
    index: true
  },
  backingAssetId: { 
    type: String, 
    required: true,
    index: true
  },
  reserveRatio: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gte(0) && decimal.lte(2);
      },
      message: 'Reserve ratio must be between 0 and 2'
    }
  },
  reserveType: { 
    type: String, 
    enum: Object.values(ReserveType), 
    required: true 
  },
  custodyType: { 
    type: String, 
    enum: Object.values(CustodyType), 
    required: true 
  },
  metadata: { 
    type: TokenMetadataSchema, 
    required: true 
  },
  compliance: { 
    type: ComplianceInfoSchema, 
    required: true 
  },
  audit: { 
    type: AuditInfoSchema, 
    required: true 
  },
  createdBy: { 
    type: String, 
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Convert Decimal fields to strings for JSON serialization
      if (ret.totalSupply) ret.totalSupply = ret.totalSupply.toString();
      if (ret.circulatingSupply) ret.circulatingSupply = ret.circulatingSupply.toString();
      if (ret.maxSupply) ret.maxSupply = ret.maxSupply.toString();
      if (ret.reserveRatio) ret.reserveRatio = ret.reserveRatio.toString();
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
TokenSchema.index({ tokenId: 1 });
TokenSchema.index({ symbol: 1 });
TokenSchema.index({ tokenType: 1, status: 1 });
TokenSchema.index({ assetType: 1, status: 1 });
TokenSchema.index({ backingAssetId: 1 });
TokenSchema.index({ createdBy: 1, createdAt: -1 });
TokenSchema.index({ 'compliance.isCompliant': 1 });
TokenSchema.index({ 'audit.status': 1 });

// Virtual for reserve coverage ratio
TokenSchema.virtual('reserveCoverageRatio').get(function() {
  if (this.circulatingSupply && this.reserveRatio) {
    return new Decimal(this.circulatingSupply.toString())
      .mul(new Decimal(this.reserveRatio.toString()));
  }
  return new Decimal(0);
});

// Virtual for utilization ratio
TokenSchema.virtual('utilizationRatio').get(function() {
  if (this.totalSupply && this.circulatingSupply) {
    const total = new Decimal(this.totalSupply.toString());
    const circulating = new Decimal(this.circulatingSupply.toString());
    return total.gt(0) ? circulating.div(total) : new Decimal(0);
  }
  return new Decimal(0);
});

// Pre-save middleware
TokenSchema.pre('save', function(next) {
  // Ensure circulating supply doesn't exceed total supply
  const totalSupply = new Decimal(this.totalSupply.toString());
  const circulatingSupply = new Decimal(this.circulatingSupply.toString());
  
  if (circulatingSupply.gt(totalSupply)) {
    return next(new Error('Circulating supply cannot exceed total supply'));
  }
  
  // Ensure total supply doesn't exceed max supply if set
  if (this.maxSupply) {
    const maxSupply = new Decimal(this.maxSupply.toString());
    if (totalSupply.gt(maxSupply)) {
      return next(new Error('Total supply cannot exceed max supply'));
    }
  }
  
  next();
});

// Static methods
TokenSchema.statics.findBySymbol = function(symbol: string) {
  return this.findOne({ symbol: symbol.toUpperCase(), status: TokenStatus.ACTIVE });
};

TokenSchema.statics.findByAssetType = function(assetType: AssetType) {
  return this.find({ assetType, status: TokenStatus.ACTIVE });
};

TokenSchema.statics.findCompliantTokens = function() {
  return this.find({ 
    'compliance.isCompliant': true, 
    status: TokenStatus.ACTIVE 
  });
};

// Instance methods
TokenSchema.methods.updateSupply = function(amount: Decimal, operation: 'mint' | 'burn') {
  if (operation === 'mint') {
    this.totalSupply = new Decimal(this.totalSupply.toString()).add(amount);
    this.circulatingSupply = new Decimal(this.circulatingSupply.toString()).add(amount);
  } else if (operation === 'burn') {
    this.totalSupply = new Decimal(this.totalSupply.toString()).sub(amount);
    this.circulatingSupply = new Decimal(this.circulatingSupply.toString()).sub(amount);
  }
  return this.save();
};

TokenSchema.methods.isCompliant = function(): boolean {
  return this.compliance.isCompliant && 
         this.audit.status === AuditStatus.COMPLETED &&
         this.status === TokenStatus.ACTIVE;
};

export const Token = mongoose.model<IToken & Document>('Token', TokenSchema);
export default Token;

