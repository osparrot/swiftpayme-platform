import mongoose, { Schema, Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import {
  IDeposit,
  IWithdrawal,
  IReserveBalance,
  ITokenTransaction,
  IDocument,
  IDeliveryAddress,
  IWithdrawalFees,
  IComplianceCheck,
  IAuditRecord,
  IReserveAuditEntry
} from '../types';
import {
  DepositStatus,
  WithdrawalStatus,
  AssetType,
  ComplianceStatus,
  AuditStatus
} from '../enums/tokenizationEnums';

// Custom Decimal type for Mongoose
const DecimalType = {
  type: Schema.Types.Mixed,
  get: (value: any) => value ? new Decimal(value.toString()) : value,
  set: (value: any) => value ? new Decimal(value.toString()).toString() : value
};

// Document Schema
const DocumentSchema = new Schema<IDocument>({
  documentId: { type: String, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  hash: { type: String, required: true },
  uploadedAt: { type: Date, required: true, default: Date.now },
  verifiedAt: { type: Date },
  verifiedBy: { type: String }
}, { _id: false });

// Compliance Check Schema
const ComplianceCheckSchema = new Schema<IComplianceCheck>({
  status: { 
    type: String, 
    enum: Object.values(ComplianceStatus), 
    required: true,
    default: ComplianceStatus.UNDER_REVIEW
  },
  kycStatus: { type: String, required: true },
  amlStatus: { type: String, required: true },
  sanctionsCheck: { type: Boolean, required: true, default: false },
  riskScore: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 0
  },
  flags: [{ type: String }],
  checkedAt: { type: Date, required: true, default: Date.now },
  checkedBy: { type: String },
  notes: { type: String }
}, { _id: false });

// Audit Record Schema
const AuditRecordSchema = new Schema<IAuditRecord>({
  auditId: { type: String, required: true },
  auditor: { type: String, required: true },
  auditDate: { type: Date, required: true },
  findings: [{ type: String }],
  recommendations: [{ type: String }],
  status: { type: String, enum: Object.values(AuditStatus), required: true },
  reportUrl: { type: String }
}, { _id: false });

// Deposit Schema
const DepositSchema = new Schema<IDeposit & Document>({
  depositId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  assetType: { 
    type: String, 
    enum: Object.values(AssetType), 
    required: true,
    index: true
  },
  amount: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gt(0);
      },
      message: 'Amount must be greater than 0'
    }
  },
  unit: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(DepositStatus), 
    required: true, 
    default: DepositStatus.PENDING_VERIFICATION,
    index: true
  },
  verificationDocuments: [DocumentSchema],
  storageLocation: { type: String, required: true },
  custodian: { type: String, required: true },
  insurancePolicy: { type: String },
  estimatedValue: { ...DecimalType, required: true },
  currency: { type: String, required: true, default: 'USD' },
  compliance: { type: ComplianceCheckSchema, required: true },
  audit: { type: AuditRecordSchema, required: true },
  verifiedAt: { type: Date },
  storedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.amount) ret.amount = ret.amount.toString();
      if (ret.estimatedValue) ret.estimatedValue = ret.estimatedValue.toString();
      return ret;
    }
  }
});

// Delivery Address Schema
const DeliveryAddressSchema = new Schema<IDeliveryAddress>({
  name: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String },
  email: { type: String }
}, { _id: false });

// Withdrawal Fees Schema
const WithdrawalFeesSchema = new Schema<IWithdrawalFees>({
  processingFee: { ...DecimalType, required: true },
  shippingFee: { ...DecimalType, required: true },
  insuranceFee: { ...DecimalType, required: true },
  totalFee: { ...DecimalType, required: true },
  currency: { type: String, required: true, default: 'USD' }
}, { _id: false });

// Withdrawal Schema
const WithdrawalSchema = new Schema<IWithdrawal & Document>({
  withdrawalId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  tokenId: { 
    type: String, 
    required: true,
    index: true
  },
  amount: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gt(0);
      },
      message: 'Amount must be greater than 0'
    }
  },
  assetAmount: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gt(0);
      },
      message: 'Asset amount must be greater than 0'
    }
  },
  deliveryAddress: { type: DeliveryAddressSchema, required: true },
  status: { 
    type: String, 
    enum: Object.values(WithdrawalStatus), 
    required: true, 
    default: WithdrawalStatus.PENDING,
    index: true
  },
  compliance: { type: ComplianceCheckSchema, required: true },
  fees: { type: WithdrawalFeesSchema, required: true },
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  processedAt: { type: Date },
  completedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.amount) ret.amount = ret.amount.toString();
      if (ret.assetAmount) ret.assetAmount = ret.assetAmount.toString();
      if (ret.fees) {
        if (ret.fees.processingFee) ret.fees.processingFee = ret.fees.processingFee.toString();
        if (ret.fees.shippingFee) ret.fees.shippingFee = ret.fees.shippingFee.toString();
        if (ret.fees.insuranceFee) ret.fees.insuranceFee = ret.fees.insuranceFee.toString();
        if (ret.fees.totalFee) ret.fees.totalFee = ret.fees.totalFee.toString();
      }
      return ret;
    }
  }
});

// Reserve Audit Entry Schema
const ReserveAuditEntrySchema = new Schema<IReserveAuditEntry>({
  timestamp: { type: Date, required: true, default: Date.now },
  action: { type: String, required: true },
  amount: { ...DecimalType, required: true },
  reason: { type: String, required: true },
  performedBy: { type: String, required: true },
  transactionId: { type: String }
}, { _id: false });

// Reserve Balance Schema
const ReserveBalanceSchema = new Schema<IReserveBalance & Document>({
  tokenId: { 
    type: String, 
    required: true,
    index: true
  },
  assetType: { 
    type: String, 
    enum: Object.values(AssetType), 
    required: true,
    index: true
  },
  totalReserve: { 
    ...DecimalType, 
    required: true,
    default: '0'
  },
  availableReserve: { 
    ...DecimalType, 
    required: true,
    default: '0'
  },
  lockedReserve: { 
    ...DecimalType, 
    required: true,
    default: '0'
  },
  unit: { type: String, required: true },
  lastUpdated: { type: Date, required: true, default: Date.now },
  auditTrail: [ReserveAuditEntrySchema]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.totalReserve) ret.totalReserve = ret.totalReserve.toString();
      if (ret.availableReserve) ret.availableReserve = ret.availableReserve.toString();
      if (ret.lockedReserve) ret.lockedReserve = ret.lockedReserve.toString();
      if (ret.auditTrail) {
        ret.auditTrail.forEach((entry: any) => {
          if (entry.amount) entry.amount = entry.amount.toString();
        });
      }
      return ret;
    }
  }
});

// Token Transaction Schema
const TokenTransactionSchema = new Schema<ITokenTransaction & Document>({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  tokenId: { 
    type: String, 
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['mint', 'burn', 'transfer'], 
    required: true,
    index: true
  },
  from: { type: String },
  to: { type: String },
  amount: { 
    ...DecimalType, 
    required: true,
    validate: {
      validator: function(v: any) {
        const decimal = new Decimal(v.toString());
        return decimal.gt(0);
      },
      message: 'Amount must be greater than 0'
    }
  },
  blockNumber: { type: Number },
  transactionHash: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  gasUsed: DecimalType,
  gasFee: DecimalType,
  status: { 
    type: String, 
    required: true,
    index: true
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.amount) ret.amount = ret.amount.toString();
      if (ret.gasUsed) ret.gasUsed = ret.gasUsed.toString();
      if (ret.gasFee) ret.gasFee = ret.gasFee.toString();
      return ret;
    }
  }
});

// Indexes
DepositSchema.index({ depositId: 1 });
DepositSchema.index({ userId: 1, status: 1 });
DepositSchema.index({ assetType: 1, status: 1 });
DepositSchema.index({ status: 1, createdAt: -1 });

WithdrawalSchema.index({ withdrawalId: 1 });
WithdrawalSchema.index({ userId: 1, status: 1 });
WithdrawalSchema.index({ tokenId: 1, status: 1 });
WithdrawalSchema.index({ status: 1, createdAt: -1 });

ReserveBalanceSchema.index({ tokenId: 1 }, { unique: true });
ReserveBalanceSchema.index({ assetType: 1 });
ReserveBalanceSchema.index({ lastUpdated: -1 });

TokenTransactionSchema.index({ transactionId: 1 });
TokenTransactionSchema.index({ tokenId: 1, type: 1 });
TokenTransactionSchema.index({ type: 1, createdAt: -1 });
TokenTransactionSchema.index({ transactionHash: 1 });

// Export models
export const Deposit = mongoose.model<IDeposit & Document>('Deposit', DepositSchema);
export const Withdrawal = mongoose.model<IWithdrawal & Document>('Withdrawal', WithdrawalSchema);
export const ReserveBalance = mongoose.model<IReserveBalance & Document>('ReserveBalance', ReserveBalanceSchema);
export const TokenTransaction = mongoose.model<ITokenTransaction & Document>('TokenTransaction', TokenTransactionSchema);

// Re-export other models
export { Token } from './Token';
export { MintingRequest } from './MintingRequest';
export { BurningRequest } from './BurningRequest';

