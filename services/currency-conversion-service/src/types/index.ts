import { Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import { CurrencyCode, CurrencyType, CurrencyStatus, ExchangeRateProvider, ConversionStatus } from '../enums/currencyEnums';

// Core conversion types
export interface ConversionRequest {
  amount: Decimal;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  userId?: string;
  accountId?: string;
  requestId?: string;
}

export interface ConversionResult {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  originalAmount: Decimal;
  convertedAmount: Decimal;
  exchangeRate: Decimal;
  timestamp: Date;
  provider?: string;
  fees?: Decimal;
  status?: ConversionStatus;
}

export interface BatchConversionRequest {
  amount: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  userId?: string;
  accountId?: string;
}

export interface BatchConversionResult extends ConversionResult {
  success: boolean;
  error?: string;
}

// Exchange rate types
export interface ConversionRate {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: Decimal;
  timestamp: Date;
  provider: string;
  source?: ExchangeRateProvider;
  confidence?: number;
}

export interface HistoricalRate {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: Decimal;
  timestamp: Date;
  provider: string;
  source?: ExchangeRateProvider;
}

export interface ExchangeRateModel extends Document {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: Decimal;
  provider: ExchangeRateProvider;
  timestamp: Date;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Currency information types
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  type: CurrencyType;
  decimalPlaces: number;
  isSupported: boolean;
  status?: CurrencyStatus;
  minAmount?: Decimal;
  maxAmount?: Decimal;
  region?: string;
  country?: string;
}

export interface CurrencyPair {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  isSupported: boolean;
  lastUpdated?: Date;
  averageRate?: Decimal;
  volatility?: number;
}

// Event types
export interface RateUpdateEvent {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: string;
  provider: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ConversionEvent {
  userId?: string;
  accountId?: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  originalAmount: string;
  convertedAmount: string;
  exchangeRate: string;
  timestamp: Date;
  status: ConversionStatus;
  requestId?: string;
}

// API provider types
export interface ExchangeRateProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number;
  supportedCurrencies: CurrencyCode[];
  isActive: boolean;
  priority: number;
}

export interface ExternalApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

// Request/Response types for API endpoints
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

export interface ConvertCurrencyRequest {
  amount: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  userId?: string;
  accountId?: string;
}

export interface GetRateRequest {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  date?: string;
}

export interface GetHistoricalRatesRequest {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  startDate: string;
  endDate: string;
  interval?: 'daily' | 'hourly' | 'minute';
}

export interface BatchConvertRequest {
  conversions: BatchConversionRequest[];
  userId?: string;
}

export interface UpdateRatesRequest {
  currencies?: CurrencyCode[];
  providers?: ExchangeRateProvider[];
  force?: boolean;
}

// Repository interfaces
export interface ExchangeRateRepository {
  findLatestRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<ExchangeRateModel | null>;
  findHistoricalRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, date: Date): Promise<ExchangeRateModel | null>;
  saveRate(rate: Partial<ExchangeRateModel>): Promise<ExchangeRateModel>;
  findRatesByDateRange(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, startDate: Date, endDate: Date): Promise<ExchangeRateModel[]>;
  findRatesByProvider(provider: ExchangeRateProvider, limit?: number): Promise<ExchangeRateModel[]>;
  deleteOldRates(olderThan: Date): Promise<number>;
  healthCheck(): Promise<{ status: string }>;
}

export interface ConversionHistoryRepository {
  saveConversion(conversion: Partial<ConversionHistoryModel>): Promise<ConversionHistoryModel>;
  findConversionsByUser(userId: string, limit?: number): Promise<ConversionHistoryModel[]>;
  findConversionsByAccount(accountId: string, limit?: number): Promise<ConversionHistoryModel[]>;
  findConversionsByDateRange(startDate: Date, endDate: Date, limit?: number): Promise<ConversionHistoryModel[]>;
  getConversionStats(userId?: string): Promise<ConversionStats>;
  healthCheck(): Promise<{ status: string }>;
}

// Database models
export interface ConversionHistoryModel extends Document {
  userId?: string;
  accountId?: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  originalAmount: Decimal;
  convertedAmount: Decimal;
  exchangeRate: Decimal;
  provider: string;
  status: ConversionStatus;
  fees?: Decimal;
  requestId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrencyConfigModel extends Document {
  code: CurrencyCode;
  name: string;
  symbol: string;
  type: CurrencyType;
  status: CurrencyStatus;
  decimalPlaces: number;
  minAmount: Decimal;
  maxAmount: Decimal;
  isSupported: boolean;
  providers: ExchangeRateProvider[];
  updateFrequency: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Statistics and analytics types
export interface ConversionStats {
  totalConversions: number;
  totalVolume: Record<CurrencyCode, Decimal>;
  popularPairs: Array<{
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    count: number;
    volume: Decimal;
  }>;
  averageAmount: Decimal;
  successRate: number;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface RateVolatility {
  currencyPair: CurrencyPair;
  volatility: number;
  standardDeviation: number;
  averageRate: Decimal;
  minRate: Decimal;
  maxRate: Decimal;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface MarketData {
  currency: CurrencyCode;
  currentPrice: Decimal;
  priceChange24h: Decimal;
  priceChangePercentage24h: number;
  marketCap?: Decimal;
  volume24h?: Decimal;
  lastUpdated: Date;
}

// Service integration types
export interface AccountServiceIntegration {
  updateBalance(userId: string, accountId: string, currency: CurrencyCode, amount: Decimal, operation: 'add' | 'subtract'): Promise<boolean>;
  getBalance(userId: string, accountId: string, currency: CurrencyCode): Promise<Decimal>;
  validateAccount(userId: string, accountId: string): Promise<boolean>;
}

export interface NotificationServiceIntegration {
  sendConversionNotification(userId: string, conversion: ConversionResult): Promise<boolean>;
  sendRateAlert(userId: string, currencyPair: CurrencyPair, rate: Decimal, threshold: Decimal): Promise<boolean>;
}

export interface ComplianceServiceIntegration {
  checkConversionCompliance(userId: string, conversion: ConversionRequest): Promise<ComplianceResult>;
  reportLargeConversion(userId: string, conversion: ConversionResult): Promise<boolean>;
}

export interface ComplianceResult {
  isCompliant: boolean;
  riskScore: number;
  flags: string[];
  requiresManualReview: boolean;
  restrictions?: {
    maxAmount?: Decimal;
    allowedCurrencies?: CurrencyCode[];
    cooldownPeriod?: number;
  };
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

export interface RateCacheEntry extends CacheEntry<Decimal> {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  provider: string;
}

// Configuration types
export interface ServiceConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  mongodb: {
    uri: string;
    options: Record<string, any>;
  };
  externalApis: {
    exchangeRateHost: {
      baseUrl: string;
      apiKey?: string;
      timeout: number;
    };
    coinGecko: {
      baseUrl: string;
      apiKey?: string;
      timeout: number;
    };
    goldApi: {
      baseUrl: string;
      apiKey?: string;
      timeout: number;
    };
  };
  cache: {
    defaultTtl: number;
    rateTtl: number;
    conversionTtl: number;
  };
  rateUpdates: {
    interval: number;
    batchSize: number;
    maxRetries: number;
  };
  limits: {
    maxConversionAmount: Decimal;
    maxBatchSize: number;
    rateLimitPerMinute: number;
  };
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  statusCode: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: string;
    redis: string;
    externalApis: Record<string, string>;
  };
  metrics?: string;
  timestamp: string;
  uptime: number;
  version: string;
}

// Monitoring and metrics types
export interface MetricsData {
  conversionsPerSecond: number;
  averageConversionLatency: number;
  cacheHitRate: number;
  externalApiLatency: Record<string, number>;
  errorRate: number;
  activeConnections: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Audit and logging types
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  status: 'success' | 'failure';
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Rate limiting types
export interface RateLimitInfo {
  exceeded: boolean;
  remaining: number;
  resetTime: Date;
  limit: number;
  windowMs: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

