/**
 * SwiftPayMe Account Service - Types and Interfaces
 * Comprehensive type definitions for multi-currency account management
 */

import { Document } from 'mongoose';

// ==================== ENUMS ====================

export enum SupportedCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP'
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FROZEN = 'frozen',
  CLOSED = 'closed',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  CURRENCY_CONVERSION = 'currency_conversion',
  ASSET_TOKEN_CONVERSION = 'asset_token_conversion',
  CRYPTO_PURCHASE = 'crypto_purchase',
  FEE_DEDUCTION = 'fee_deduction',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed'
}

export enum ConversionType {
  CURRENCY_TO_CURRENCY = 'currency_to_currency',
  ASSET_TOKEN_TO_CURRENCY = 'asset_token_to_currency',
  CURRENCY_TO_ASSET_TOKEN = 'currency_to_asset_token'
}

export enum BalanceType {
  AVAILABLE = 'available',
  PENDING = 'pending',
  RESERVED = 'reserved',
  FROZEN = 'frozen'
}

// ==================== INTERFACES ====================

export interface ICurrencyBalance {
  currency: SupportedCurrency;
  available: number;
  pending: number;
  reserved: number;
  frozen: number;
  lastUpdated: Date;
}

export interface IAccountDocument extends Document {
  accountId: string;
  userId: string;
  status: AccountStatus;
  balances: ICurrencyBalance[];
  defaultCurrency: SupportedCurrency;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  totalBalance: number;
  isActive: boolean;
  
  // Methods
  getBalance(currency: SupportedCurrency, type?: BalanceType): number;
  updateBalance(currency: SupportedCurrency, amount: number, type: BalanceType): Promise<void>;
  reserveBalance(currency: SupportedCurrency, amount: number): Promise<boolean>;
  releaseReservedBalance(currency: SupportedCurrency, amount: number): Promise<void>;
  freezeBalance(currency: SupportedCurrency, amount: number): Promise<boolean>;
  unfreezeBalance(currency: SupportedCurrency, amount: number): Promise<void>;
  hasBalance(currency: SupportedCurrency, amount: number, type?: BalanceType): boolean;
  addCurrency(currency: SupportedCurrency): Promise<void>;
  removeCurrency(currency: SupportedCurrency): Promise<void>;
}

export interface ITransactionDocument extends Document {
  transactionId: string;
  accountId: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: SupportedCurrency;
  balanceAfter: number;
  description: string;
  reference: string;
  metadata: Record<string, any>;
  
  // Related transaction for conversions
  relatedTransactionId?: string;
  
  // Conversion specific fields
  conversionDetails?: {
    fromCurrency: SupportedCurrency;
    toCurrency: SupportedCurrency;
    fromAmount: number;
    toAmount: number;
    exchangeRate: number;
    conversionFee: number;
    conversionType: ConversionType;
  };
  
  // Asset token conversion fields
  assetTokenDetails?: {
    tokenType: string;
    tokenAmount: number;
    tokenValue: number;
    assetId: string;
  };
  
  // External references
  externalTransactionId?: string;
  paymentId?: string;
  workflowId?: string;
  
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  
  // Methods
  complete(): Promise<void>;
  fail(reason: string): Promise<void>;
  cancel(reason: string): Promise<void>;
  reverse(reason: string): Promise<ITransactionDocument>;
}

export interface ICurrencyConversionDocument extends Document {
  conversionId: string;
  userId: string;
  accountId: string;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  conversionFee: number;
  conversionType: ConversionType;
  status: TransactionStatus;
  
  // Related transactions
  debitTransactionId: string;
  creditTransactionId: string;
  
  // Asset token details if applicable
  assetTokenDetails?: {
    tokenType: string;
    tokenAmount: number;
    assetId: string;
    tokenValue: number;
  };
  
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Methods
  execute(): Promise<void>;
  cancel(reason: string): Promise<void>;
  reverse(reason: string): Promise<ICurrencyConversionDocument>;
}

// ==================== REQUEST/RESPONSE INTERFACES ====================

export interface ICreateAccountRequest {
  userId: string;
  defaultCurrency: SupportedCurrency;
  initialBalances?: {
    currency: SupportedCurrency;
    amount: number;
  }[];
}

export interface IAccountResponse {
  success: boolean;
  account?: IAccountDocument;
  error?: string;
  correlationId?: string;
}

export interface IAccountListResponse {
  success: boolean;
  accounts?: IAccountDocument[];
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  error?: string;
}

export interface IDepositRequest {
  accountId: string;
  amount: number;
  currency: SupportedCurrency;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface IWithdrawalRequest {
  accountId: string;
  amount: number;
  currency: SupportedCurrency;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface ITransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: SupportedCurrency;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface ICurrencyConversionRequest {
  accountId: string;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  amount: number;
  conversionType?: ConversionType;
  assetTokenDetails?: {
    tokenType: string;
    tokenAmount: number;
    assetId: string;
  };
}

export interface IAssetTokenConversionRequest {
  accountId: string;
  tokenType: string;
  tokenAmount: number;
  assetId: string;
  targetCurrency: SupportedCurrency;
}

export interface ICryptoChargeRequest {
  accountId: string;
  amount: number;
  currency: SupportedCurrency;
  cryptoAmount: number;
  cryptoCurrency: string;
  paymentId: string;
  description?: string;
}

export interface ITransactionResponse {
  success: boolean;
  transaction?: ITransactionDocument;
  account?: IAccountDocument;
  error?: string;
  correlationId?: string;
}

export interface ITransactionListResponse {
  success: boolean;
  transactions?: ITransactionDocument[];
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  error?: string;
}

export interface IConversionResponse {
  success: boolean;
  conversion?: ICurrencyConversionDocument;
  debitTransaction?: ITransactionDocument;
  creditTransaction?: ITransactionDocument;
  account?: IAccountDocument;
  error?: string;
  correlationId?: string;
}

export interface IBalanceResponse {
  success: boolean;
  balances?: ICurrencyBalance[];
  totalValueUSD?: number;
  error?: string;
}

export interface IExchangeRateResponse {
  success: boolean;
  rates?: {
    [key: string]: number;
  };
  timestamp?: Date;
  error?: string;
}

// ==================== QUERY INTERFACES ====================

export interface IAccountQuery {
  userId?: string;
  status?: AccountStatus;
  defaultCurrency?: SupportedCurrency;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ITransactionQuery {
  accountId?: string;
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  currency?: SupportedCurrency;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  reference?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IConversionQuery {
  userId?: string;
  accountId?: string;
  fromCurrency?: SupportedCurrency;
  toCurrency?: SupportedCurrency;
  conversionType?: ConversionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ==================== ANALYTICS INTERFACES ====================

export interface IAccountAnalytics {
  totalAccounts: number;
  activeAccounts: number;
  totalBalanceUSD: number;
  balancesByCurrency: {
    [currency: string]: {
      totalBalance: number;
      accountCount: number;
    };
  };
  transactionVolume: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  conversionVolume: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topCurrencies: {
    currency: SupportedCurrency;
    totalBalance: number;
    transactionCount: number;
  }[];
}

// ==================== SERVICE INTEGRATION INTERFACES ====================

export interface IUserServiceResponse {
  success: boolean;
  user?: {
    userId: string;
    email: string;
    status: string;
    kycStatus: string;
  };
  error?: string;
}

export interface ICurrencyServiceResponse {
  success: boolean;
  rates?: {
    [key: string]: number;
  };
  error?: string;
}

export interface ITokenizationServiceResponse {
  success: boolean;
  token?: {
    tokenId: string;
    tokenType: string;
    amount: number;
    value: number;
    assetId: string;
  };
  error?: string;
}

export interface ILedgerServiceRequest {
  userId: string;
  accountId: string;
  transactionId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

// ==================== ERROR INTERFACES ====================

export interface IAccountError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export class InsufficientBalanceError extends Error implements IAccountError {
  code = 'INSUFFICIENT_BALANCE';
  statusCode = 400;
  
  constructor(currency: SupportedCurrency, requested: number, available: number) {
    super(`Insufficient ${currency} balance. Requested: ${requested}, Available: ${available}`);
  }
}

export class AccountNotFoundError extends Error implements IAccountError {
  code = 'ACCOUNT_NOT_FOUND';
  statusCode = 404;
  
  constructor(accountId: string) {
    super(`Account ${accountId} not found`);
  }
}

export class CurrencyNotSupportedError extends Error implements IAccountError {
  code = 'CURRENCY_NOT_SUPPORTED';
  statusCode = 400;
  
  constructor(currency: string) {
    super(`Currency ${currency} is not supported`);
  }
}

export class ConversionFailedError extends Error implements IAccountError {
  code = 'CONVERSION_FAILED';
  statusCode = 500;
  
  constructor(reason: string) {
    super(`Currency conversion failed: ${reason}`);
  }
}

export class AccountSuspendedError extends Error implements IAccountError {
  code = 'ACCOUNT_SUSPENDED';
  statusCode = 403;
  
  constructor(accountId: string) {
    super(`Account ${accountId} is suspended`);
  }
}

