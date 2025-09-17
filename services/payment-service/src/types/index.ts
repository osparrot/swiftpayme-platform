// Re-export all payment types
export * from './payment';

// Common service response type
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
}

// Request/Response types for API endpoints
export interface CreateAssetDepositRequest {
  assetType: 'gold' | 'silver' | 'diamond';
  assetDetails: {
    weight?: number;
    dimensions?: any;
    purity?: number;
    condition?: string;
    certificates?: string[];
    images?: string[];
    description?: string;
  };
  targetCurrency?: string;
}

export interface CreateBitcoinPurchaseRequest {
  amount: number;
  currency: string;
  destinationWallet?: string;
}

export interface CreateFiatTransferRequest {
  toUserId: string;
  amount: number;
  currency: string;
  memo?: string;
}

export interface CreateCryptoTransferRequest {
  fromWalletId: string;
  toAddress: string;
  amount: number;
  currency: 'BTC' | 'ETH' | 'LTC';
}

export interface WorkflowStatusResponse {
  workflow: {
    id: string;
    type: string;
    status: string;
    currentStep: string;
    progress: number;
    steps: {
      id: string;
      name: string;
      status: string;
      completedAt?: string;
    }[];
  };
  estimatedCompletion?: string;
}

export interface PaymentHistoryRequest {
  userId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaymentHistoryResponse {
  transactions: any[];
  workflows: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BalanceResponse {
  balances: {
    [currency: string]: number;
  };
  totalValue: {
    USD: number;
    EUR: number;
    GBP: number;
  };
  lastUpdated: string;
}

export interface MetricsResponse {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  assetDeposits: {
    total: number;
    pending: number;
    completed: number;
    totalValue: number;
  };
  bitcoinPurchases: {
    total: number;
    pending: number;
    completed: number;
    totalVolume: number;
  };
  fiatTransfers: {
    total: number;
    pending: number;
    completed: number;
    totalAmount: number;
  };
  averageProcessingTime: number;
  successRate: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

// Validation schemas
export interface ValidationSchema {
  [key: string]: {
    type: string;
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

// Event types
export interface PaymentEventData {
  workflowId: string;
  userId: string;
  type: string;
  data: any;
  timestamp: Date;
}

// Queue job types
export interface QueueJobData {
  workflowId: string;
  step?: string;
  data?: any;
  priority?: number;
  delay?: number;
}

// Service client types
export interface ServiceClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
}

// Middleware types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  requestId?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// Configuration types
export interface PaymentServiceConfig {
  port: number;
  environment: string;
  database: {
    uri: string;
    poolSize: number;
    timeout: number;
  };
  redis: {
    url: string;
    password?: string;
  };
  services: {
    userService: string;
    assetService: string;
    currencyService: string;
    cryptoService: string;
    notificationService: string;
  };
  security: {
    jwtSecret: string;
    apiKeySecret: string;
    encryptionKey: string;
  };
  features: {
    enableAssetDeposits: boolean;
    enableBitcoinPurchases: boolean;
    enableFiatTransfers: boolean;
    enableCryptoTransfers: boolean;
  };
  limits: {
    maxRequestSize: string;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  timeouts: {
    serverTimeout: number;
    keepAliveTimeout: number;
    headersTimeout: number;
    shutdownTimeout: number;
  };
}

// Logging types
export interface LogContext {
  requestId?: string;
  userId?: string;
  workflowId?: string;
  transactionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp: Date;
  service: string;
}

// Monitoring types
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    [component: string]: {
      status: 'up' | 'down' | 'unknown';
      responseTime?: number;
      error?: string;
    };
  };
  timestamp: Date;
}

export interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

// Database types
export interface DatabaseConnection {
  isConnected: boolean;
  host: string;
  database: string;
  connectionCount: number;
  lastPing?: Date;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 1 | 0>;
}

// External service integration types
export interface ExternalServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  headers?: Record<string, string>;
  responseTime: number;
}

export interface RetryOptions {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffDelay: number;
  retryableErrors: string[];
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  signature: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
}

// Audit types
export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Security types
export interface SecurityContext {
  userId: string;
  sessionId: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
}

// Notification types
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationDelivery {
  id: string;
  templateId: string;
  recipient: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
}

// Feature flag types
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// A/B testing types
export interface ExperimentVariant {
  name: string;
  weight: number;
  configuration: Record<string, any>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetAudience?: Record<string, any>;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface RequestMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  timestamp: Date;
}

