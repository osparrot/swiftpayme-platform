import { Request } from 'express';
import { Decimal } from 'decimal.js';
import {
  TokenType,
  TokenStandard,
  TokenStatus,
  MintingStatus,
  BurningStatus,
  DepositStatus,
  WithdrawalStatus,
  AuditStatus,
  ComplianceStatus,
  AssetType,
  CustodyType,
  ReserveType
} from '../enums/tokenizationEnums';

// Extend Express Request interface for SwiftPayMe
export interface TokenizationRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
  };
  requestId?: string;
}

// Service response interface for SwiftPayMe
export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

export interface IToken {
  _id?: string;
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: Decimal;
  circulatingSupply: Decimal;
  maxSupply?: Decimal;
  tokenType: TokenType;
  tokenStandard: TokenStandard;
  status: TokenStatus;
  contractAddress?: string;
  chainId?: number;
  assetType: AssetType;
  backingAssetId: string;
  reserveRatio: Decimal;
  reserveType: ReserveType;
  custodyType: CustodyType;
  metadata: ITokenMetadata;
  compliance: IComplianceInfo;
  audit: IAuditInfo;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITokenMetadata {
  description: string;
  image?: string;
  externalUrl?: string;
  attributes: ITokenAttribute[];
  properties: Record<string, any>;
  backingAssetDetails: IBackingAssetDetails;
}

export interface ITokenAttribute {
  traitType: string;
  value: string | number;
  displayType?: string;
}

export interface IBackingAssetDetails {
  assetId: string;
  assetType: AssetType;
  grade?: string;
  purity?: Decimal;
  weight?: Decimal;
  unit?: string;
  origin?: string;
  certificationNumber?: string;
  storageLocation?: string;
  custodian?: string;
  insurancePolicy?: string;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
}

export interface IMintingRequest {
  _id?: string;
  requestId: string;
  tokenId: string;
  userId: string;
  amount: Decimal;
  depositId: string;
  status: MintingStatus;
  reason?: string;
  transactionHash?: string;
  gasUsed?: Decimal;
  gasFee?: Decimal;
  compliance: IComplianceCheck;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface IBurningRequest {
  _id?: string;
  requestId: string;
  tokenId: string;
  userId: string;
  amount: Decimal;
  withdrawalId?: string;
  status: BurningStatus;
  reason?: string;
  transactionHash?: string;
  gasUsed?: Decimal;
  gasFee?: Decimal;
  compliance: IComplianceCheck;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface IDeposit {
  _id?: string;
  depositId: string;
  userId: string;
  assetType: AssetType;
  amount: Decimal;
  unit: string;
  status: DepositStatus;
  verificationDocuments: IDocument[];
  storageLocation: string;
  custodian: string;
  insurancePolicy?: string;
  estimatedValue: Decimal;
  currency: string;
  compliance: IComplianceCheck;
  audit: IAuditRecord;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  storedAt?: Date;
}

export interface IWithdrawal {
  _id?: string;
  withdrawalId: string;
  userId: string;
  tokenId: string;
  amount: Decimal;
  assetAmount: Decimal;
  deliveryAddress: IDeliveryAddress;
  status: WithdrawalStatus;
  compliance: IComplianceCheck;
  fees: IWithdrawalFees;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export interface IDocument {
  documentId: string;
  type: string;
  name: string;
  url: string;
  hash: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface IDeliveryAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface IWithdrawalFees {
  processingFee: Decimal;
  shippingFee: Decimal;
  insuranceFee: Decimal;
  totalFee: Decimal;
  currency: string;
}

export interface IComplianceCheck {
  status: ComplianceStatus;
  kycStatus: string;
  amlStatus: string;
  sanctionsCheck: boolean;
  riskScore: number;
  flags: string[];
  checkedAt: Date;
  checkedBy?: string;
  notes?: string;
}

export interface IComplianceInfo {
  isCompliant: boolean;
  lastCheck: Date;
  nextCheck: Date;
  requirements: string[];
  exemptions: string[];
  jurisdiction: string;
}

export interface IAuditInfo {
  lastAudit: Date;
  nextAudit: Date;
  auditor: string;
  status: AuditStatus;
  findings: string[];
  recommendations: string[];
}

export interface IAuditRecord {
  auditId: string;
  auditor: string;
  auditDate: Date;
  findings: string[];
  recommendations: string[];
  status: AuditStatus;
  reportUrl?: string;
}

export interface IReserveBalance {
  _id?: string;
  tokenId: string;
  assetType: AssetType;
  totalReserve: Decimal;
  availableReserve: Decimal;
  lockedReserve: Decimal;
  unit: string;
  lastUpdated: Date;
  auditTrail: IReserveAuditEntry[];
}

export interface IReserveAuditEntry {
  timestamp: Date;
  action: string;
  amount: Decimal;
  reason: string;
  performedBy: string;
  transactionId?: string;
}

export interface ITokenTransaction {
  _id?: string;
  transactionId: string;
  tokenId: string;
  type: 'mint' | 'burn' | 'transfer';
  from?: string;
  to?: string;
  amount: Decimal;
  blockNumber?: number;
  transactionHash?: string;
  gasUsed?: Decimal;
  gasFee?: Decimal;
  status: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ITokenizationConfig {
  minMintAmount: Decimal;
  maxMintAmount: Decimal;
  minBurnAmount: Decimal;
  maxBurnAmount: Decimal;
  mintingFee: Decimal;
  burningFee: Decimal;
  reserveRatio: Decimal;
  auditFrequency: number; // days
  complianceChecks: string[];
  supportedAssets: AssetType[];
  custodyProviders: string[];
}

export interface ITokenizationMetrics {
  totalTokensIssued: number;
  totalSupply: Decimal;
  totalReserves: Decimal;
  mintingRequests: {
    pending: number;
    completed: number;
    failed: number;
  };
  burningRequests: {
    pending: number;
    completed: number;
    failed: number;
  };
  complianceStatus: {
    compliant: number;
    nonCompliant: number;
    underReview: number;
  };
}

export interface ITokenizationService {
  createToken(tokenData: Partial<IToken>): Promise<IToken>;
  mintTokens(mintingRequest: Partial<IMintingRequest>): Promise<IMintingRequest>;
  burnTokens(burningRequest: Partial<IBurningRequest>): Promise<IBurningRequest>;
  processDeposit(depositData: Partial<IDeposit>): Promise<IDeposit>;
  processWithdrawal(withdrawalData: Partial<IWithdrawal>): Promise<IWithdrawal>;
  updateReserves(tokenId: string, amount: Decimal, action: string): Promise<IReserveBalance>;
  performCompliance(entityId: string, entityType: string): Promise<IComplianceCheck>;
  auditReserves(tokenId: string): Promise<IAuditRecord>;
  getTokenMetrics(tokenId: string): Promise<ITokenizationMetrics>;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IQueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
  search?: string;
}

