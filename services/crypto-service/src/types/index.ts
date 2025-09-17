import { Request } from 'express';
import { Decimal } from 'decimal.js';
import { 
  CryptoCurrency, 
  TransactionType, 
  TransactionStatus, 
  WalletType, 
  NetworkType, 
  AddressType,
  PaymentMethod,
  SecurityLevel,
  ComplianceStatus,
  FeeType,
  CryptoOperationType,
  LightningOperationType
} from '../enums/cryptoEnums';

// Extended Request interface for authentication
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  tokenInfo?: {
    iat: number;
    exp: number;
    iss?: string;
  };
  requestId?: string;
}

// Core Crypto Types
export interface CryptoWallet {
  id: string;
  userId: string;
  currency: CryptoCurrency;
  walletName: string;
  addresses: CryptoAddress[];
  balance: Decimal;
  type: WalletType;
  network: NetworkType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CryptoAddress {
  id: string;
  walletId: string;
  address: string;
  type: AddressType;
  label?: string;
  isUsed: boolean;
  balance: Decimal;
  createdAt: Date;
}

export interface CryptoTransaction {
  id: string;
  userId: string;
  walletId: string;
  currency: CryptoCurrency;
  type: TransactionType;
  amount: Decimal;
  fee: Decimal;
  fromAddress?: string;
  toAddress?: string;
  txHash?: string;
  blockHeight?: number;
  confirmations: number;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  memo?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LightningInvoice {
  id: string;
  userId: string;
  paymentRequest: string;
  paymentHash: string;
  amount: Decimal;
  memo?: string;
  expiresAt: Date;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
}

export interface LightningPayment {
  id: string;
  userId: string;
  paymentHash: string;
  paymentPreimage?: string;
  amount: Decimal;
  fee: Decimal;
  status: TransactionStatus;
  invoice: string;
  createdAt: Date;
  completedAt?: Date;
}

// Bitcoin Core Types
export interface BitcoinNetwork {
  version: number;
  subversion: string;
  protocolversion: number;
  localservices: string;
  localrelay: boolean;
  timeoffset: number;
  connections: number;
  networkactive: boolean;
  networks: Array<{
    name: string;
    limited: boolean;
    reachable: boolean;
    proxy: string;
    proxy_randomize_credentials: boolean;
  }>;
  relayfee: number;
  incrementalfee: number;
  localaddresses: Array<{
    address: string;
    port: number;
    score: number;
  }>;
  warnings: string;
}

export interface BitcoinTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: BitcoinVin[];
  vout: BitcoinVout[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface BitcoinVin {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  txinwitness?: string[];
  sequence: number;
}

export interface BitcoinVout {
  value: number;
  n: number;
  scriptPubKey: BitcoinScriptPubKey;
}

export interface BitcoinScriptPubKey {
  asm: string;
  hex: string;
  reqSigs?: number;
  type: string;
  addresses?: string[];
}

export interface BitcoinAddressInfo {
  address: string;
  scriptPubKey: string;
  ismine: boolean;
  iswatchonly: boolean;
  solvable: boolean;
  desc: string;
  isscript: boolean;
  iswitness: boolean;
  witness_version?: number;
  witness_program?: string;
  pubkey?: string;
  iscompressed?: boolean;
  label?: string;
  timestamp?: number;
  hdkeypath?: string;
  hdseedid?: string;
  hdmasterfingerprint?: string;
  labels: Array<{
    name: string;
    purpose: string;
  }>;
}

export interface BitcoinWalletInfo {
  walletname: string;
  walletversion: number;
  balance: number;
  unconfirmed_balance: number;
  immature_balance: number;
  txcount: number;
  keypoololdest: number;
  keypoolsize: number;
  keypoolsize_hd_internal: number;
  unlocked_until?: number;
  paytxfee: number;
  hdseedid?: string;
  private_keys_enabled: boolean;
  avoid_reuse: boolean;
  scanning: boolean | { duration: number; progress: number };
}

export interface BitcoinBlockInfo {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  tx: string[] | BitcoinTransaction[];
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface BitcoinMempoolInfo {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface BitcoinFeeEstimate {
  feerate?: number;
  errors?: string[];
  blocks: number;
}

export interface BitcoinRawTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: BitcoinVin[];
  vout: BitcoinVout[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface BitcoinUtxo {
  txid: string;
  vout: number;
  address: string;
  label?: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  redeemScript?: string;
  witnessScript?: string;
  spendable: boolean;
  solvable: boolean;
  safe: boolean;
}

export interface BitcoinRpcError {
  code: number;
  message: string;
}

// Request/Response Types
export interface CreateWalletRequest {
  userId: string;
  currency: CryptoCurrency;
  type?: WalletType;
  label?: string;
}

export interface CreateWalletResponse {
  walletId: string;
  address: string;
  walletName: string;
  currency: CryptoCurrency;
  type: WalletType;
}

export interface GetBalanceRequest {
  userId: string;
  currency: CryptoCurrency;
  address?: string;
}

export interface GetBalanceResponse {
  balance: string;
  confirmedBalance: string;
  unconfirmedBalance: string;
  currency: CryptoCurrency;
  address?: string;
}

export interface SendTransactionRequest {
  userId: string;
  currency: CryptoCurrency;
  fromAddress: string;
  toAddress: string;
  amount: string;
  feeType?: FeeType;
  customFeeRate?: number;
  memo?: string;
}

export interface SendTransactionResponse {
  txHash: string;
  amount: string;
  fee: string;
  status: TransactionStatus;
  estimatedConfirmationTime?: number;
}

export interface CreateLightningInvoiceRequest {
  userId: string;
  amount: string;
  memo?: string;
  expirySeconds?: number;
}

export interface CreateLightningInvoiceResponse {
  paymentRequest: string;
  paymentHash: string;
  amount: string;
  expiresAt: string;
}

export interface PayLightningInvoiceRequest {
  userId: string;
  invoice: string;
  amount?: string;
}

export interface PayLightningInvoiceResponse {
  paymentHash: string;
  paymentPreimage: string;
  amount: string;
  fee: string;
  status: string;
}

export interface ValidateAddressRequest {
  address: string;
  currency: CryptoCurrency;
}

export interface ValidateAddressResponse {
  isValid: boolean;
  address: string;
  currency: CryptoCurrency;
  addressType?: AddressType;
  network?: NetworkType;
}

export interface GetTransactionRequest {
  userId: string;
  txHash: string;
  currency: CryptoCurrency;
}

export interface GetTransactionResponse {
  transaction: CryptoTransaction;
}

export interface ListTransactionsRequest {
  userId: string;
  currency?: CryptoCurrency;
  limit?: number;
  offset?: number;
  status?: TransactionStatus;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export interface ListTransactionsResponse {
  transactions: CryptoTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface EstimateFeeRequest {
  currency: CryptoCurrency;
  amount: string;
  feeType: FeeType;
  customBlocks?: number;
}

export interface EstimateFeeResponse {
  estimatedFee: string;
  feeRate: string;
  confirmationTarget: number;
  currency: CryptoCurrency;
}

// Service Interfaces
export interface CryptoHandler {
  createWallet(userId: string): Promise<{ address: string; walletName: string }>;
  getBalance(userId: string, address: string): Promise<number>;
  sendTransaction(userId: string, fromAddress: string, toAddress: string, amount: number): Promise<string>;
  validateAddress(address: string): Promise<boolean>;
  healthCheck(): Promise<{ status: string; details: any }>;
}

export interface CryptoServiceConfig {
  bitcoin: {
    rpcHost: string;
    rpcPort: number;
    rpcUsername: string;
    rpcPassword: string;
    network: NetworkType;
    walletName: string;
  };
  lightning: {
    host: string;
    port: number;
    macaroonPath?: string;
    tlsCertPath?: string;
    nodes: Array<{
      url: string;
      priority: number;
      timeout: number;
    }>;
  };
  security: {
    level: SecurityLevel;
    encryptionEnabled: boolean;
    multiSigEnabled: boolean;
    coldStorageEnabled: boolean;
  };
  compliance: {
    enabled: boolean;
    kycRequired: boolean;
    amlChecks: boolean;
    reportingEnabled: boolean;
  };
  monitoring: {
    enabled: boolean;
    metricsEnabled: boolean;
    alertingEnabled: boolean;
    healthCheckInterval: number;
  };
}

// Event Types
export interface CryptoEvent {
  id: string;
  type: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface TransactionEvent extends CryptoEvent {
  type: 'transaction_created' | 'transaction_confirmed' | 'transaction_failed';
  data: {
    transactionId: string;
    txHash?: string;
    amount: string;
    currency: CryptoCurrency;
    status: TransactionStatus;
  };
}

export interface WalletEvent extends CryptoEvent {
  type: 'wallet_created' | 'address_generated' | 'balance_updated';
  data: {
    walletId: string;
    address?: string;
    balance?: string;
    currency: CryptoCurrency;
  };
}

export interface SecurityEvent extends CryptoEvent {
  type: 'security_alert' | 'suspicious_activity' | 'compliance_violation';
  data: {
    alertLevel: SecurityLevel;
    description: string;
    metadata: Record<string, any>;
  };
}

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    bitcoin: ComponentHealth;
    lightning: ComponentHealth;
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  details?: Record<string, any>;
}

// Cache Types
export interface CacheOptions {
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Metrics Types
export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export interface PerformanceMetrics {
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
}

// Error Types
export interface CryptoError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
}

export interface LoggingConfig {
  level: string;
  format: string;
  destination: string;
  fluentd?: {
    host: string;
    port: number;
    tag: string;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

