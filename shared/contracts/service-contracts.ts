// SwiftPayMe Service Contracts
// Defines the API contracts between all microservices

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

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  requestId?: string;
  timestamp: string;
}

// User Service Contracts
export namespace UserServiceContracts {
  export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: 'active' | 'suspended' | 'pending' | 'blocked';
    kycStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
    riskScore: number;
    fiatAccounts: FiatAccount[];
    bitcoinWallets: BitcoinWallet[];
    assetDeposits: string[]; // Asset deposit IDs
    createdAt: string;
    updatedAt: string;
  }

  export interface FiatAccount {
    id: string;
    currency: string;
    balance: number;
    availableBalance: number;
    pendingBalance: number;
    isActive: boolean;
  }

  export interface BitcoinWallet {
    id: string;
    type: 'internal' | 'external';
    address: string;
    balance: number;
    isActive: boolean;
  }

  export interface CreateUserRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }

  export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface LoginResponse {
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
  }

  export interface KYCVerificationRequest {
    documentType: 'passport' | 'drivers_license' | 'national_id';
    documentNumber: string;
    documentImages: string[];
    selfieImage: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }
}

// Asset Service Contracts
export namespace AssetServiceContracts {
  export interface AssetDeposit {
    id: string;
    userId: string;
    assetType: 'gold' | 'silver' | 'diamond';
    weight: number;
    purity: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    images: string[];
    certificates: string[];
    estimatedValue: number;
    finalValue?: number;
    currency: string;
    status: 'submitted' | 'received' | 'verifying' | 'verified' | 'rejected' | 'credited';
    verificationMethod: string[];
    verificationResults: VerificationResult[];
    riskAssessment: RiskAssessment;
    createdAt: string;
    updatedAt: string;
  }

  export interface VerificationResult {
    method: string;
    result: 'pass' | 'fail' | 'inconclusive';
    confidence: number;
    details: any;
    verifiedBy: string;
    verifiedAt: string;
  }

  export interface RiskAssessment {
    score: number;
    factors: string[];
    recommendation: 'approve' | 'reject' | 'manual_review';
    notes?: string;
  }

  export interface CreateAssetDepositRequest {
    assetType: 'gold' | 'silver' | 'diamond';
    weight: number;
    purity: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    images: string[];
    certificates?: string[];
    estimatedValue: number;
    currency: string;
  }

  export interface VerifyAssetRequest {
    verificationMethod: string;
    result: 'pass' | 'fail' | 'inconclusive';
    confidence: number;
    details: any;
  }

  export interface ApproveAssetRequest {
    finalValue: number;
    notes?: string;
  }
}

// Currency Service Contracts
export namespace CurrencyServiceContracts {
  export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    timestamp: string;
    source: string;
  }

  export interface PreciousMetalPrice {
    metal: 'gold' | 'silver' | 'platinum' | 'palladium';
    price: number;
    currency: string;
    unit: 'oz' | 'gram' | 'kg';
    timestamp: string;
    source: string;
  }

  export interface CryptocurrencyPrice {
    symbol: string;
    price: number;
    currency: string;
    change24h: number;
    volume24h: number;
    timestamp: string;
    source: string;
  }

  export interface ConvertCurrencyRequest {
    from: string;
    to: string;
    amount: number;
  }

  export interface ConvertCurrencyResponse {
    from: string;
    to: string;
    amount: number;
    convertedAmount: number;
    rate: number;
    timestamp: string;
  }

  export interface GetPricesRequest {
    assets: string[];
    currency?: string;
  }

  export interface GetPricesResponse {
    prices: {
      [asset: string]: {
        price: number;
        currency: string;
        timestamp: string;
      };
    };
  }
}

// Crypto Service Contracts
export namespace CryptoServiceContracts {
  export interface BitcoinWallet {
    id: string;
    userId: string;
    type: 'internal' | 'external';
    address: string;
    balance: number;
    unconfirmedBalance: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface BitcoinTransaction {
    id: string;
    walletId: string;
    txHash: string;
    type: 'send' | 'receive';
    amount: number;
    fee: number;
    fromAddress: string;
    toAddress: string;
    confirmations: number;
    status: 'pending' | 'confirmed' | 'failed';
    blockHeight?: number;
    createdAt: string;
    confirmedAt?: string;
  }

  export interface CreateWalletRequest {
    userId: string;
    type: 'internal' | 'external';
    label?: string;
  }

  export interface SendBitcoinRequest {
    fromWalletId: string;
    toAddress: string;
    amount: number;
    feeRate?: number;
    memo?: string;
  }

  export interface SendBitcoinResponse {
    transactionId: string;
    txHash: string;
    amount: number;
    fee: number;
    estimatedConfirmationTime: number;
  }

  export interface GetBalanceRequest {
    walletId: string;
  }

  export interface GetBalanceResponse {
    balance: number;
    unconfirmedBalance: number;
    currency: 'BTC';
  }
}

// Payment Service Contracts
export namespace PaymentServiceContracts {
  export interface PaymentTransaction {
    id: string;
    userId: string;
    type: 'asset_deposit' | 'fiat_transfer' | 'bitcoin_purchase' | 'bitcoin_transfer';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    fromAccount?: string;
    toAccount?: string;
    metadata: any;
    steps: TransactionStep[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  }

  export interface TransactionStep {
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    service: string;
    request: any;
    response?: any;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }

  export interface ProcessAssetDepositRequest {
    assetDepositId: string;
    userId: string;
    finalValue: number;
    currency: string;
  }

  export interface ProcessBitcoinPurchaseRequest {
    userId: string;
    amount: number;
    currency: string;
    walletId?: string;
  }

  export interface ProcessFiatTransferRequest {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    memo?: string;
  }

  export interface GetTransactionRequest {
    transactionId: string;
    userId?: string;
  }

  export interface GetTransactionsRequest {
    userId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
}

// Admin Service Contracts
export namespace AdminServiceContracts {
  export interface Admin {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'super_admin' | 'admin' | 'operator' | 'viewer';
    permissions: string[];
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface SystemMetrics {
    users: {
      total: number;
      active: number;
      pendingKyc: number;
      suspended: number;
    };
    assets: {
      totalDeposits: number;
      pendingVerification: number;
      totalValue: number;
      currency: string;
    };
    transactions: {
      total: number;
      pending: number;
      completed: number;
      failed: number;
      volume24h: number;
    };
    system: {
      uptime: number;
      version: string;
      environment: string;
    };
  }

  export interface UserManagementRequest {
    action: 'suspend' | 'activate' | 'block' | 'verify_kyc' | 'reject_kyc';
    userId: string;
    reason?: string;
    notes?: string;
  }

  export interface AssetVerificationRequest {
    assetDepositId: string;
    action: 'approve' | 'reject';
    finalValue?: number;
    notes?: string;
  }

  export interface SystemConfigRequest {
    key: string;
    value: any;
    description?: string;
  }

  export interface GenerateReportRequest {
    type: 'users' | 'assets' | 'transactions' | 'financial' | 'compliance';
    period: {
      start: string;
      end: string;
    };
    format: 'json' | 'csv' | 'pdf' | 'excel';
    filters?: any;
  }
}

// Notification Service Contracts
export namespace NotificationServiceContracts {
  export interface Notification {
    id: string;
    userId?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'security' | 'transaction';
    category: string;
    title: string;
    message: string;
    data?: any;
    channels: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';
    createdAt: string;
    deliveredAt?: string;
    acknowledgedAt?: string;
  }

  export interface SendNotificationRequest {
    userId?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'security' | 'transaction';
    category: string;
    title: string;
    message: string;
    data?: any;
    channels?: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    scheduledAt?: string;
  }

  export interface SendBulkNotificationRequest {
    notifications: SendNotificationRequest[];
  }

  export interface SendTemplateNotificationRequest {
    templateId: string;
    userId: string;
    variables: any;
    channels?: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }

  export interface NotificationPreferences {
    channels: {
      [channel: string]: boolean;
    };
    categories: {
      [category: string]: boolean;
    };
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  }

  export interface UpdatePreferencesRequest {
    userId: string;
    preferences: Partial<NotificationPreferences>;
  }
}

// Event Contracts for Inter-Service Communication
export namespace EventContracts {
  export interface BaseEvent {
    id: string;
    type: string;
    source: string;
    timestamp: string;
    correlationId?: string;
    userId?: string;
  }

  export interface UserCreatedEvent extends BaseEvent {
    type: 'user.created';
    data: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }

  export interface UserKycUpdatedEvent extends BaseEvent {
    type: 'user.kyc.updated';
    data: {
      userId: string;
      status: 'pending' | 'in_review' | 'approved' | 'rejected';
      previousStatus: string;
    };
  }

  export interface AssetDepositCreatedEvent extends BaseEvent {
    type: 'asset.deposit.created';
    data: {
      assetDepositId: string;
      userId: string;
      assetType: string;
      estimatedValue: number;
      currency: string;
    };
  }

  export interface AssetDepositVerifiedEvent extends BaseEvent {
    type: 'asset.deposit.verified';
    data: {
      assetDepositId: string;
      userId: string;
      finalValue: number;
      currency: string;
      verificationResults: any[];
    };
  }

  export interface AssetDepositCreditedEvent extends BaseEvent {
    type: 'asset.deposit.credited';
    data: {
      assetDepositId: string;
      userId: string;
      amount: number;
      currency: string;
      transactionId: string;
    };
  }

  export interface TransactionCreatedEvent extends BaseEvent {
    type: 'transaction.created';
    data: {
      transactionId: string;
      userId: string;
      type: string;
      amount: number;
      currency: string;
    };
  }

  export interface TransactionCompletedEvent extends BaseEvent {
    type: 'transaction.completed';
    data: {
      transactionId: string;
      userId: string;
      type: string;
      amount: number;
      currency: string;
      finalStatus: string;
    };
  }

  export interface BitcoinTransactionCreatedEvent extends BaseEvent {
    type: 'bitcoin.transaction.created';
    data: {
      transactionId: string;
      userId: string;
      walletId: string;
      amount: number;
      txHash: string;
      type: 'send' | 'receive';
    };
  }

  export interface BitcoinTransactionConfirmedEvent extends BaseEvent {
    type: 'bitcoin.transaction.confirmed';
    data: {
      transactionId: string;
      userId: string;
      txHash: string;
      confirmations: number;
      blockHeight: number;
    };
  }

  export interface PriceUpdateEvent extends BaseEvent {
    type: 'price.updated';
    data: {
      asset: string;
      price: number;
      currency: string;
      change: number;
      timestamp: string;
    };
  }

  export interface SystemAlertEvent extends BaseEvent {
    type: 'system.alert';
    data: {
      alertId: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      message: string;
      service: string;
    };
  }

  export interface ComplianceAlertEvent extends BaseEvent {
    type: 'compliance.alert';
    data: {
      alertId: string;
      type: 'aml' | 'kyc' | 'sanctions' | 'pep';
      userId: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      details: any;
    };
  }
}

// API Gateway Contracts
export namespace ApiGatewayContracts {
  export interface RouteConfig {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    target: string;
    auth: boolean;
    roles?: string[];
    rateLimit?: {
      windowMs: number;
      max: number;
    };
    validation?: {
      body?: any;
      query?: any;
      params?: any;
    };
    cache?: {
      ttl: number;
      key?: string;
    };
  }

  export interface ServiceConfig {
    name: string;
    baseUrl: string;
    healthCheck: string;
    timeout: number;
    retries: number;
    circuitBreaker: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    };
  }

  export interface AuthContext {
    userId?: string;
    adminId?: string;
    email: string;
    role?: string;
    permissions?: string[];
    type: 'user' | 'admin';
  }

  export interface RequestContext {
    requestId: string;
    correlationId?: string;
    userAgent?: string;
    ip: string;
    auth?: AuthContext;
    startTime: number;
  }
}

// Error Contracts
export namespace ErrorContracts {
  export interface ApiError {
    code: string;
    message: string;
    details?: any;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    service?: string;
  }

  export interface ValidationError {
    field: string;
    message: string;
    value?: any;
  }

  export interface ServiceError {
    service: string;
    operation: string;
    error: string;
    statusCode: number;
    retryable: boolean;
  }
}

// Health Check Contracts
export namespace HealthCheckContracts {
  export interface HealthStatus {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version: string;
    uptime: number;
    dependencies: {
      [service: string]: {
        status: 'healthy' | 'unhealthy';
        responseTime: number;
        lastChecked: string;
      };
    };
    metrics: {
      memory: any;
      cpu: any;
      requests: any;
    };
  }

  export interface ServiceDiscovery {
    services: {
      [serviceName: string]: {
        url: string;
        status: 'healthy' | 'unhealthy';
        lastHealthCheck: string;
        version: string;
      };
    };
  }
}

