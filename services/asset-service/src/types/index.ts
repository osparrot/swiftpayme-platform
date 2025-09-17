import { Request } from 'express';
import { Document } from 'mongoose';
import Decimal from 'decimal.js';
import {
  AssetType,
  AssetSymbol,
  AssetStatus,
  WalletType,
  WalletStatus,
  TransactionType,
  TransactionStatus,
  AssetClass,
  PriceSource,
  AssetGrade,
  AssetUnit,
  StorageType,
  CustodyType,
  AssetOrigin,
  CertificationType,
  RiskLevel,
  LiquidityLevel,
  MarketStatus,
  OrderType,
  OrderSide,
  OrderStatus,
  FeeTier,
  AuditStatus,
  ComplianceStatus,
  EventType
} from '../enums/assetEnums';

// Extended Request interface
export interface AssetRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId?: string;
    tokenId?: string;
  };
  requestId?: string;
  startTime?: number;
  clientIp?: string;
  userAgent?: string;
}

// Service Response interface
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// SwiftPayMe specific enums
export enum PhysicalAssetType {
  GOLD = 'gold',
  SILVER = 'silver',
  DIAMOND = 'diamond'
}

export enum DepositStatus {
  PENDING_VERIFICATION = 'pending_verification',
  UNDER_VERIFICATION = 'under_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  CREDITED = 'credited',
  RETURNED = 'returned'
}

export enum VerificationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUIRES_ADDITIONAL_INFO = 'requires_additional_info'
}

export enum ValuationType {
  ESTIMATED = 'estimated',
  PRELIMINARY = 'preliminary',
  PROFESSIONAL = 'professional',
  FINAL = 'final'
}

export enum VerificationMethod {
  VISUAL_INSPECTION = 'visual_inspection',
  XRF_ANALYSIS = 'xrf_analysis',
  ACID_TEST = 'acid_test',
  ELECTRONIC_TESTING = 'electronic_testing',
  PROFESSIONAL_APPRAISAL = 'professional_appraisal'
}

export enum ImageType {
  FRONT = 'front',
  BACK = 'back',
  SIDE = 'side',
  DETAIL = 'detail',
  CERTIFICATE = 'certificate',
  PACKAGING = 'packaging'
}

export enum PhysicalCertificateType {
  AUTHENTICITY = 'authenticity',
  PURITY = 'purity',
  WEIGHT = 'weight',
  GRADING = 'grading',
  APPRAISAL = 'appraisal',
  INSURANCE = 'insurance'
}

// SwiftPayMe Physical Asset interfaces
export interface IAssetImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  imageType: ImageType;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    colorSpace?: string;
    hasAlpha?: boolean;
    orientation?: number;
  };
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IAssetCertificate {
  id: string;
  type: PhysicalCertificateType;
  issuer: string;
  issuerLicense?: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  url: string;
  verificationUrl?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  metadata?: Record<string, any>;
}

export interface IAssetValuation {
  id: string;
  valuationType: ValuationType;
  valuedBy: string;
  valuedAt: Date;
  amount: number;
  currency: string;
  pricePerUnit: number;
  marketPrice: number;
  premiumPercentage: number;
  discountPercentage: number;
  methodology: string;
  confidence: number;
  notes?: string;
  sources?: Array<{
    name: string;
    url: string;
    accessedAt: Date;
  }>;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface IAssetVerification {
  id: string;
  status: VerificationStatus;
  verifiedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  verificationMethod: VerificationMethod;
  results?: {
    purityConfirmed?: boolean;
    weightConfirmed?: boolean;
    authenticityConfirmed?: boolean;
    conditionAssessment?: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
    defects?: string[];
    notes?: string;
  };
  equipment?: string;
  calibrationDate?: Date;
  rejectionReason?: string;
  reportUrl?: string;
  metadata?: Record<string, any>;
}

export interface IAssetDeposit extends Document {
  id: string;
  userId: string;
  trackingNumber: string;
  assetType: PhysicalAssetType;
  subType?: string;
  brand?: string;
  series?: string;
  year?: number;
  quantity: number;
  unit: string;
  weight?: {
    gross?: number;
    net?: number;
    unit?: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
    unit?: string;
  };
  purity?: {
    declared?: number;
    verified?: number;
    unit?: string;
  };
  condition?: string;
  status: DepositStatus;
  verificationStatus: VerificationStatus;
  
  // Timestamps
  depositedAt: Date;
  receivedAt?: Date;
  verificationStartedAt?: Date;
  verificationCompletedAt?: Date;
  creditedAt?: Date;
  
  // Location and shipping
  depositLocation?: {
    facility?: string;
    address?: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  shippingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    signedBy?: string;
    insuranceValue?: number;
    insuranceCurrency?: string;
  };
  
  // Asset data
  images: IAssetImage[];
  certificates: IAssetCertificate[];
  valuations: IAssetValuation[];
  verifications: IAssetVerification[];
  
  // Current values
  currentValuation?: {
    amount: number;
    currency: string;
    valuationId: string;
    lastUpdated: Date;
  };
  
  // Processing information
  assignedTo?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  processingNotes: Array<{
    id: string;
    note: string;
    addedBy: string;
    addedAt: Date;
    isInternal: boolean;
  }>;
  
  // Compliance and audit
  complianceChecks: {
    amlScreening: {
      status: 'pending' | 'passed' | 'failed';
      checkedAt?: Date;
      reference?: string;
    };
    sanctionsScreening: {
      status: 'pending' | 'passed' | 'failed';
      checkedAt?: Date;
      reference?: string;
    };
    originVerification: {
      status: 'pending' | 'verified' | 'suspicious';
      checkedAt?: Date;
      notes?: string;
    };
  };
  
  // Risk assessment
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    score: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  // Integration data
  externalReferences?: {
    userServiceRef?: string;
    paymentServiceRef?: string;
    complianceServiceRef?: string;
  };
  
  // Metadata and tags
  tags: string[];
  metadata: Record<string, any>;
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details: any;
    ipAddress?: string;
    userAgent?: string;
  }>;
  
  // Virtual properties
  totalValue: number;
  isVerified: boolean;
  isPending: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  processingTime: number | null;
  
  // Methods
  addImage(imageData: Partial<IAssetImage>): string;
  addCertificate(certificateData: Partial<IAssetCertificate>): string;
  addValuation(valuationData: Partial<IAssetValuation>): string;
  addVerification(verificationData: Partial<IAssetVerification>): string;
  updateStatus(newStatus: DepositStatus, userId: string, notes?: string): void;
  addProcessingNote(note: string, userId: string, isInternal?: boolean): string;
  calculateRiskScore(): number;
  toSafeObject(): any;
}

// SwiftPayMe Request/Response interfaces
export interface AssetDepositRequest {
  assetType: PhysicalAssetType;
  subType?: string;
  brand?: string;
  series?: string;
  year?: number;
  quantity: number;
  unit: string;
  weight?: {
    gross?: number;
    net?: number;
    unit?: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
    unit?: string;
  };
  purity?: {
    declared?: number;
    unit?: string;
  };
  condition?: string;
  estimatedValue?: {
    amount: number;
    currency: string;
  };
  images: Array<{
    url: string;
    imageType: ImageType;
    description?: string;
  }>;
  certificates?: Array<{
    type: PhysicalCertificateType;
    issuer: string;
    certificateNumber: string;
    issueDate: string;
    url: string;
  }>;
  shippingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    insuranceValue?: number;
    insuranceCurrency?: string;
  };
  notes?: string;
}

export interface AssetValuationRequest {
  depositId: string;
  valuationType: ValuationType;
  amount: number;
  currency: string;
  pricePerUnit: number;
  marketPrice: number;
  methodology: string;
  confidence?: number;
  notes?: string;
  sources?: Array<{
    name: string;
    url: string;
  }>;
}

export interface AssetVerificationRequest {
  depositId: string;
  verificationMethod: VerificationMethod;
  equipment?: string;
  calibrationDate?: string;
  results?: {
    purityConfirmed?: boolean;
    weightConfirmed?: boolean;
    authenticityConfirmed?: boolean;
    conditionAssessment?: string;
    defects?: string[];
    notes?: string;
  };
}

// SwiftPayMe Event interfaces
export interface AssetDepositEvent {
  eventType: 'deposit_created' | 'deposit_verified' | 'deposit_rejected' | 'deposit_credited';
  depositId: string;
  userId: string;
  assetType: PhysicalAssetType;
  trackingNumber: string;
  amount?: number;
  currency?: string;
  status: DepositStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AssetValuationEvent {
  eventType: 'valuation_created' | 'valuation_updated' | 'price_alert';
  depositId: string;
  valuationId: string;
  assetType: PhysicalAssetType;
  oldValue?: number;
  newValue: number;
  currency: string;
  changePercent?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AssetVerificationEvent {
  eventType: 'verification_started' | 'verification_completed' | 'verification_failed';
  depositId: string;
  verificationId: string;
  verifiedBy?: string;
  status: VerificationStatus;
  results?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Original Asset interfaces (keeping existing functionality)
export interface IAsset extends Document {
  id: string;
  symbol: AssetSymbol;
  name: string;
  description?: string;
  type: AssetType;
  class: AssetClass;
  status: AssetStatus;
  
  // Metadata
  metadata: {
    grade?: AssetGrade;
    purity?: number;
    weight?: Decimal;
    unit: AssetUnit;
    origin?: AssetOrigin;
    manufacturer?: string;
    serialNumber?: string;
    batchNumber?: string;
    mintYear?: number;
    country?: string;
    region?: string;
  };
  
  // Pricing
  pricing: {
    currentPrice: Decimal;
    currency: string;
    lastUpdated: Date;
    priceSource: PriceSource;
    bid?: Decimal;
    ask?: Decimal;
    spread?: Decimal;
    volume24h?: Decimal;
    marketCap?: Decimal;
    priceChange24h?: Decimal;
    priceChangePercent24h?: Decimal;
  };
  
  // Trading
  trading: {
    isActive: boolean;
    minOrderSize: Decimal;
    maxOrderSize: Decimal;
    tickSize: Decimal;
    lotSize: Decimal;
    fees: {
      maker: Decimal;
      taker: Decimal;
      withdrawal: Decimal;
      deposit: Decimal;
    };
    marketHours?: {
      open: string;
      close: string;
      timezone: string;
      holidays: string[];
    };
  };
  
  // Risk and compliance
  risk: {
    level: RiskLevel;
    volatility: Decimal;
    liquidity: LiquidityLevel;
    creditRating?: string;
    regulatoryStatus: ComplianceStatus;
    restrictions?: string[];
  };
  
  // Storage and custody
  storage: {
    type: StorageType;
    custody: CustodyType;
    location?: string;
    facility?: string;
    vault?: string;
    insurance?: {
      provider: string;
      policyNumber: string;
      coverage: Decimal;
      expiresAt: Date;
    };
  };
  
  // Certifications
  certifications: Array<{
    type: CertificationType;
    issuer: string;
    certificateNumber: string;
    issuedAt: Date;
    expiresAt?: Date;
    documentUrl?: string;
    verified: boolean;
  }>;
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;
  
  // Methods
  updatePrice(price: Decimal, source: PriceSource): Promise<void>;
  addCertification(certification: any): Promise<void>;
  updateStatus(status: AssetStatus, reason?: string): Promise<void>;
  calculateValue(quantity: Decimal): Decimal;
  isTradeableAt(timestamp: Date): boolean;
  getStorageInfo(): any;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Wallet interfaces
export interface IAssetWallet extends Document {
  id: string;
  userId: string;
  assetId: string;
  walletType: WalletType;
  status: WalletStatus;
  
  // Wallet details
  address?: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  mnemonic?: string;
  derivationPath?: string;
  
  // Balance information
  balance: {
    available: Decimal;
    locked: Decimal;
    pending: Decimal;
    total: Decimal;
    lastUpdated: Date;
  };
  
  // Security
  security: {
    isMultiSig: boolean;
    requiredSignatures?: number;
    signatories?: string[];
    encryptionMethod: string;
    backupExists: boolean;
    lastBackupAt?: Date;
    twoFactorEnabled: boolean;
    whitelistedAddresses?: string[];
  };
  
  // Limits and restrictions
  limits: {
    dailyWithdrawal: Decimal;
    monthlyWithdrawal: Decimal;
    maxTransactionAmount: Decimal;
    minTransactionAmount: Decimal;
    dailyTransactionCount: number;
  };
  
  // Usage statistics
  statistics: {
    totalDeposits: Decimal;
    totalWithdrawals: Decimal;
    transactionCount: number;
    lastTransactionAt?: Date;
    averageTransactionAmount: Decimal;
  };
  
  // Metadata
  metadata: {
    label?: string;
    description?: string;
    tags?: string[];
    category?: string;
    isDefault: boolean;
    isArchived: boolean;
  };
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Methods
  updateBalance(amount: Decimal, type: 'credit' | 'debit'): Promise<void>;
  lockFunds(amount: Decimal, reason?: string): Promise<void>;
  unlockFunds(amount: Decimal): Promise<void>;
  canWithdraw(amount: Decimal): boolean;
  getAvailableBalance(): Decimal;
  generateAddress(): Promise<string>;
  backup(): Promise<void>;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Transaction interfaces
export interface IAssetTransaction extends Document {
  id: string;
  walletId: string;
  assetId: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Transaction details
  amount: Decimal;
  fee: Decimal;
  netAmount: Decimal;
  fromAddress?: string;
  toAddress?: string;
  
  // External references
  externalTxId?: string;
  blockHash?: string;
  blockNumber?: number;
  confirmations?: number;
  requiredConfirmations?: number;
  
  // Metadata
  metadata: {
    description?: string;
    reference?: string;
    category?: string;
    tags?: string[];
    notes?: string;
  };
  
  // Timing
  initiatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  
  // Error handling
  error?: {
    code: string;
    message: string;
    details?: any;
    retryCount: number;
    lastRetryAt?: Date;
  };
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Methods
  updateStatus(status: TransactionStatus, details?: any): Promise<void>;
  addConfirmation(): Promise<void>;
  retry(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  calculateFee(): Decimal;
  isExpired(): boolean;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Price interfaces
export interface IAssetPrice extends Document {
  id: string;
  assetId: string;
  symbol: AssetSymbol;
  
  // Price data
  price: Decimal;
  currency: string;
  source: PriceSource;
  timestamp: Date;
  
  // Market data
  bid?: Decimal;
  ask?: Decimal;
  spread?: Decimal;
  volume?: Decimal;
  high24h?: Decimal;
  low24h?: Decimal;
  open24h?: Decimal;
  close24h?: Decimal;
  change24h?: Decimal;
  changePercent24h?: Decimal;
  
  // Additional data
  marketCap?: Decimal;
  circulatingSupply?: Decimal;
  totalSupply?: Decimal;
  
  // Quality indicators
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  isStale: boolean;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isValid(): boolean;
  getAge(): number;
  calculateSpread(): Decimal;
}

// Asset Order interfaces
export interface IAssetOrder extends Document {
  id: string;
  userId: string;
  assetId: string;
  walletId: string;
  
  // Order details
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  quantity: Decimal;
  price?: Decimal;
  stopPrice?: Decimal;
  
  // Execution details
  filledQuantity: Decimal;
  remainingQuantity: Decimal;
  averagePrice?: Decimal;
  totalValue: Decimal;
  fees: Decimal;
  
  // Timing
  timeInForce: string;
  expiresAt?: Date;
  placedAt: Date;
  executedAt?: Date;
  cancelledAt?: Date;
  
  // Metadata
  metadata: {
    clientOrderId?: string;
    reference?: string;
    notes?: string;
  };
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Methods
  execute(quantity: Decimal, price: Decimal): Promise<void>;
  cancel(reason?: string): Promise<void>;
  isExpired(): boolean;
  calculateFees(): Decimal;
}

// Asset Audit interfaces
export interface IAssetAudit extends Document {
  id: string;
  assetId?: string;
  walletId?: string;
  transactionId?: string;
  
  // Audit details
  type: string;
  status: AuditStatus;
  auditor: string;
  
  // Findings
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    description: string;
    recommendation?: string;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
  }>;
  
  // Compliance
  compliance: {
    status: ComplianceStatus;
    regulations: string[];
    violations?: string[];
    remediation?: string[];
  };
  
  // Documentation
  documentation: Array<{
    type: string;
    name: string;
    url: string;
    hash?: string;
    uploadedAt: Date;
  }>;
  
  // Timing
  scheduledAt?: Date;
  startedAt: Date;
  completedAt?: Date;
  nextAuditAt?: Date;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Methods
  addFinding(finding: any): Promise<void>;
  resolveFinding(findingId: string, resolvedBy: string): Promise<void>;
  complete(): Promise<void>;
  scheduleNext(): Promise<void>;
}

// Request/Response types
export interface CreateAssetRequest {
  symbol: AssetSymbol;
  name: string;
  description?: string;
  type: AssetType;
  class: AssetClass;
  metadata: any;
  pricing: any;
  trading: any;
  storage: any;
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  status?: AssetStatus;
  metadata?: any;
  pricing?: any;
  trading?: any;
  storage?: any;
}

export interface CreateWalletRequest {
  assetId: string;
  walletType: WalletType;
  metadata?: any;
  security?: any;
  limits?: any;
}

export interface UpdateWalletRequest {
  status?: WalletStatus;
  metadata?: any;
  security?: any;
  limits?: any;
}

export interface CreateTransactionRequest {
  walletId: string;
  type: TransactionType;
  amount: Decimal;
  toAddress?: string;
  metadata?: any;
}

export interface AssetSearchQuery {
  symbol?: AssetSymbol;
  type?: AssetType;
  class?: AssetClass;
  status?: AssetStatus;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WalletSearchQuery {
  userId?: string;
  assetId?: string;
  walletType?: WalletType;
  status?: WalletStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionSearchQuery {
  userId?: string;
  walletId?: string;
  assetId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Event interfaces
export interface AssetEvent {
  id: string;
  type: EventType;
  assetId?: string;
  walletId?: string;
  transactionId?: string;
  userId?: string;
  data: any;
  timestamp: Date;
  source: string;
  version: string;
}

// Configuration interfaces
export interface AssetServiceConfig {
  database: {
    uri: string;
    options: any;
  };
  redis: {
    url: string;
    options: any;
  };
  pricing: {
    sources: PriceSource[];
    updateInterval: number;
    staleThreshold: number;
  };
  security: {
    encryptionKey: string;
    hashAlgorithm: string;
    keyDerivationRounds: number;
  };
  limits: {
    maxWalletsPerUser: number;
    maxTransactionsPerDay: number;
    maxTransactionAmount: Decimal;
  };
  audit: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
}

// Utility types
export type AssetMetrics = {
  totalAssets: number;
  totalWallets: number;
  totalTransactions: number;
  totalValue: Decimal;
  activeUsers: number;
  averageTransactionAmount: Decimal;
  topAssetsByVolume: Array<{
    assetId: string;
    symbol: AssetSymbol;
    volume: Decimal;
  }>;
};

export type WalletBalance = {
  assetId: string;
  symbol: AssetSymbol;
  available: Decimal;
  locked: Decimal;
  pending: Decimal;
  total: Decimal;
  value: Decimal;
  currency: string;
};

export type PortfolioSummary = {
  totalValue: Decimal;
  currency: string;
  balances: WalletBalance[];
  allocation: Array<{
    assetType: AssetType;
    percentage: number;
    value: Decimal;
  }>;
  performance: {
    day: Decimal;
    week: Decimal;
    month: Decimal;
    year: Decimal;
  };
};

export default {
  AssetRequest,
  ServiceResponse,
  IAsset,
  IAssetWallet,
  IAssetTransaction,
  IAssetPrice,
  IAssetOrder,
  IAssetAudit,
  CreateAssetRequest,
  UpdateAssetRequest,
  CreateWalletRequest,
  UpdateWalletRequest,
  CreateTransactionRequest,
  AssetSearchQuery,
  WalletSearchQuery,
  TransactionSearchQuery,
  AssetEvent,
  AssetServiceConfig,
  AssetMetrics,
  WalletBalance,
  PortfolioSummary,
  // SwiftPayMe specific exports
  PhysicalAssetType,
  DepositStatus,
  VerificationStatus,
  ValuationType,
  VerificationMethod,
  ImageType,
  PhysicalCertificateType,
  IAssetDeposit,
  IAssetImage,
  IAssetCertificate,
  IAssetValuation,
  IAssetVerification,
  AssetDepositRequest,
  AssetValuationRequest,
  AssetVerificationRequest,
  AssetDepositEvent,
  AssetValuationEvent,
  AssetVerificationEvent
};

// Extended Request interface
export interface AssetRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId?: string;
    tokenId?: string;
  };
  requestId?: string;
  startTime?: number;
  clientIp?: string;
  userAgent?: string;
}

// Service Response interface
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Asset interfaces
export interface IAsset extends Document {
  id: string;
  symbol: AssetSymbol;
  name: string;
  description?: string;
  type: AssetType;
  class: AssetClass;
  status: AssetStatus;
  
  // Metadata
  metadata: {
    grade?: AssetGrade;
    purity?: number;
    weight?: Decimal;
    unit: AssetUnit;
    origin?: AssetOrigin;
    manufacturer?: string;
    serialNumber?: string;
    batchNumber?: string;
    mintYear?: number;
    country?: string;
    region?: string;
  };
  
  // Pricing
  pricing: {
    currentPrice: Decimal;
    currency: string;
    lastUpdated: Date;
    priceSource: PriceSource;
    bid?: Decimal;
    ask?: Decimal;
    spread?: Decimal;
    volume24h?: Decimal;
    marketCap?: Decimal;
    priceChange24h?: Decimal;
    priceChangePercent24h?: Decimal;
  };
  
  // Trading
  trading: {
    isActive: boolean;
    minOrderSize: Decimal;
    maxOrderSize: Decimal;
    tickSize: Decimal;
    lotSize: Decimal;
    fees: {
      maker: Decimal;
      taker: Decimal;
      withdrawal: Decimal;
      deposit: Decimal;
    };
    marketHours?: {
      open: string;
      close: string;
      timezone: string;
      holidays: string[];
    };
  };
  
  // Risk and compliance
  risk: {
    level: RiskLevel;
    volatility: Decimal;
    liquidity: LiquidityLevel;
    creditRating?: string;
    regulatoryStatus: ComplianceStatus;
    restrictions?: string[];
  };
  
  // Storage and custody
  storage: {
    type: StorageType;
    custody: CustodyType;
    location?: string;
    facility?: string;
    vault?: string;
    insurance?: {
      provider: string;
      policyNumber: string;
      coverage: Decimal;
      expiresAt: Date;
    };
  };
  
  // Certifications
  certifications: Array<{
    type: CertificationType;
    issuer: string;
    certificateNumber: string;
    issuedAt: Date;
    expiresAt?: Date;
    documentUrl?: string;
    verified: boolean;
  }>;
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;
  
  // Methods
  updatePrice(price: Decimal, source: PriceSource): Promise<void>;
  addCertification(certification: any): Promise<void>;
  updateStatus(status: AssetStatus, reason?: string): Promise<void>;
  calculateValue(quantity: Decimal): Decimal;
  isTradeableAt(timestamp: Date): boolean;
  getStorageInfo(): any;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Wallet interfaces
export interface IAssetWallet extends Document {
  id: string;
  userId: string;
  assetId: string;
  walletType: WalletType;
  status: WalletStatus;
  
  // Wallet details
  address?: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  mnemonic?: string;
  derivationPath?: string;
  
  // Balance information
  balance: {
    available: Decimal;
    locked: Decimal;
    pending: Decimal;
    total: Decimal;
    lastUpdated: Date;
  };
  
  // Security
  security: {
    isMultiSig: boolean;
    requiredSignatures?: number;
    signatories?: string[];
    encryptionMethod: string;
    backupExists: boolean;
    lastBackupAt?: Date;
    twoFactorEnabled: boolean;
    whitelistedAddresses?: string[];
  };
  
  // Limits and restrictions
  limits: {
    dailyWithdrawal: Decimal;
    monthlyWithdrawal: Decimal;
    maxTransactionAmount: Decimal;
    minTransactionAmount: Decimal;
    dailyTransactionCount: number;
  };
  
  // Usage statistics
  statistics: {
    totalDeposits: Decimal;
    totalWithdrawals: Decimal;
    transactionCount: number;
    lastTransactionAt?: Date;
    averageTransactionAmount: Decimal;
  };
  
  // Metadata
  metadata: {
    label?: string;
    description?: string;
    tags?: string[];
    category?: string;
    isDefault: boolean;
    isArchived: boolean;
  };
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Methods
  updateBalance(amount: Decimal, type: 'credit' | 'debit'): Promise<void>;
  lockFunds(amount: Decimal, reason?: string): Promise<void>;
  unlockFunds(amount: Decimal): Promise<void>;
  canWithdraw(amount: Decimal): boolean;
  getAvailableBalance(): Decimal;
  generateAddress(): Promise<string>;
  backup(): Promise<void>;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Transaction interfaces
export interface IAssetTransaction extends Document {
  id: string;
  walletId: string;
  assetId: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Transaction details
  amount: Decimal;
  fee: Decimal;
  netAmount: Decimal;
  fromAddress?: string;
  toAddress?: string;
  
  // External references
  externalTxId?: string;
  blockHash?: string;
  blockNumber?: number;
  confirmations?: number;
  requiredConfirmations?: number;
  
  // Metadata
  metadata: {
    description?: string;
    reference?: string;
    category?: string;
    tags?: string[];
    notes?: string;
  };
  
  // Timing
  initiatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  
  // Error handling
  error?: {
    code: string;
    message: string;
    details?: any;
    retryCount: number;
    lastRetryAt?: Date;
  };
  
  // Audit trail
  auditTrail: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
    ipAddress?: string;
  }>;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Methods
  updateStatus(status: TransactionStatus, details?: any): Promise<void>;
  addConfirmation(): Promise<void>;
  retry(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  calculateFee(): Decimal;
  isExpired(): boolean;
  audit(action: string, performedBy: string, details?: any): Promise<void>;
}

// Asset Price interfaces
export interface IAssetPrice extends Document {
  id: string;
  assetId: string;
  symbol: AssetSymbol;
  
  // Price data
  price: Decimal;
  currency: string;
  source: PriceSource;
  timestamp: Date;
  
  // Market data
  bid?: Decimal;
  ask?: Decimal;
  spread?: Decimal;
  volume?: Decimal;
  high24h?: Decimal;
  low24h?: Decimal;
  open24h?: Decimal;
  close24h?: Decimal;
  change24h?: Decimal;
  changePercent24h?: Decimal;
  
  // Additional data
  marketCap?: Decimal;
  circulatingSupply?: Decimal;
  totalSupply?: Decimal;
  
  // Quality indicators
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  isStale: boolean;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isValid(): boolean;
  getAge(): number;
  calculateSpread(): Decimal;
}

// Asset Order interfaces
export interface IAssetOrder extends Document {
  id: string;
  userId: string;
  assetId: string;
  walletId: string;
  
  // Order details
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  quantity: Decimal;
  price?: Decimal;
  stopPrice?: Decimal;
  
  // Execution details
  filledQuantity: Decimal;
  remainingQuantity: Decimal;
  averagePrice?: Decimal;
  totalValue: Decimal;
  fees: Decimal;
  
  // Timing
  timeInForce: string;
  expiresAt?: Date;
  placedAt: Date;
  executedAt?: Date;
  cancelledAt?: Date;
  
  // Metadata
  metadata: {
    clientOrderId?: string;
    reference?: string;
    notes?: string;
  };
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Methods
  execute(quantity: Decimal, price: Decimal): Promise<void>;
  cancel(reason?: string): Promise<void>;
  isExpired(): boolean;
  calculateFees(): Decimal;
}

// Asset Audit interfaces
export interface IAssetAudit extends Document {
  id: string;
  assetId?: string;
  walletId?: string;
  transactionId?: string;
  
  // Audit details
  type: string;
  status: AuditStatus;
  auditor: string;
  
  // Findings
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    description: string;
    recommendation?: string;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
  }>;
  
  // Compliance
  compliance: {
    status: ComplianceStatus;
    regulations: string[];
    violations?: string[];
    remediation?: string[];
  };
  
  // Documentation
  documentation: Array<{
    type: string;
    name: string;
    url: string;
    hash?: string;
    uploadedAt: Date;
  }>;
  
  // Timing
  scheduledAt?: Date;
  startedAt: Date;
  completedAt?: Date;
  nextAuditAt?: Date;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Methods
  addFinding(finding: any): Promise<void>;
  resolveFinding(findingId: string, resolvedBy: string): Promise<void>;
  complete(): Promise<void>;
  scheduleNext(): Promise<void>;
}

// Request/Response types
export interface CreateAssetRequest {
  symbol: AssetSymbol;
  name: string;
  description?: string;
  type: AssetType;
  class: AssetClass;
  metadata: any;
  pricing: any;
  trading: any;
  storage: any;
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  status?: AssetStatus;
  metadata?: any;
  pricing?: any;
  trading?: any;
  storage?: any;
}

export interface CreateWalletRequest {
  assetId: string;
  walletType: WalletType;
  metadata?: any;
  security?: any;
  limits?: any;
}

export interface UpdateWalletRequest {
  status?: WalletStatus;
  metadata?: any;
  security?: any;
  limits?: any;
}

export interface CreateTransactionRequest {
  walletId: string;
  type: TransactionType;
  amount: Decimal;
  toAddress?: string;
  metadata?: any;
}

export interface AssetSearchQuery {
  symbol?: AssetSymbol;
  type?: AssetType;
  class?: AssetClass;
  status?: AssetStatus;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WalletSearchQuery {
  userId?: string;
  assetId?: string;
  walletType?: WalletType;
  status?: WalletStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionSearchQuery {
  userId?: string;
  walletId?: string;
  assetId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Event interfaces
export interface AssetEvent {
  id: string;
  type: EventType;
  assetId?: string;
  walletId?: string;
  transactionId?: string;
  userId?: string;
  data: any;
  timestamp: Date;
  source: string;
  version: string;
}

// Configuration interfaces
export interface AssetServiceConfig {
  database: {
    uri: string;
    options: any;
  };
  redis: {
    url: string;
    options: any;
  };
  pricing: {
    sources: PriceSource[];
    updateInterval: number;
    staleThreshold: number;
  };
  security: {
    encryptionKey: string;
    hashAlgorithm: string;
    keyDerivationRounds: number;
  };
  limits: {
    maxWalletsPerUser: number;
    maxTransactionsPerDay: number;
    maxTransactionAmount: Decimal;
  };
  audit: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
}

// Utility types
export type AssetMetrics = {
  totalAssets: number;
  totalWallets: number;
  totalTransactions: number;
  totalValue: Decimal;
  activeUsers: number;
  averageTransactionAmount: Decimal;
  topAssetsByVolume: Array<{
    assetId: string;
    symbol: AssetSymbol;
    volume: Decimal;
  }>;
};

export type WalletBalance = {
  assetId: string;
  symbol: AssetSymbol;
  available: Decimal;
  locked: Decimal;
  pending: Decimal;
  total: Decimal;
  value: Decimal;
  currency: string;
};

export type PortfolioSummary = {
  totalValue: Decimal;
  currency: string;
  balances: WalletBalance[];
  allocation: Array<{
    assetType: AssetType;
    percentage: number;
    value: Decimal;
  }>;
  performance: {
    day: Decimal;
    week: Decimal;
    month: Decimal;
    year: Decimal;
  };
};

export default {
  AssetRequest,
  ServiceResponse,
  IAsset,
  IAssetWallet,
  IAssetTransaction,
  IAssetPrice,
  IAssetOrder,
  IAssetAudit,
  CreateAssetRequest,
  UpdateAssetRequest,
  CreateWalletRequest,
  UpdateWalletRequest,
  CreateTransactionRequest,
  AssetSearchQuery,
  WalletSearchQuery,
  TransactionSearchQuery,
  AssetEvent,
  AssetServiceConfig,
  AssetMetrics,
  WalletBalance,
  PortfolioSummary
};

