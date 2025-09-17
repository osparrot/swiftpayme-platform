export type PaymentWorkflowType = 'asset_deposit' | 'bitcoin_purchase' | 'fiat_transfer' | 'crypto_transfer';
export type PaymentWorkflowStatus = 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type PaymentStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface PaymentWorkflowStep {
  id: string;
  name: string;
  status: PaymentStepStatus;
  data: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt?: Date;
}

export interface PaymentWorkflow {
  id: string;
  type: PaymentWorkflowType;
  userId: string;
  status: PaymentWorkflowStatus;
  currentStep: string;
  steps: PaymentWorkflowStep[];
  context: WorkflowContext;
  result?: any;
  error?: {
    code: string;
    message: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  expiresAt: Date;
}

export interface AssetDepositWorkflow extends PaymentWorkflow {
  type: 'asset_deposit';
  context: AssetDepositContext;
}

export interface BitcoinPurchaseWorkflow extends PaymentWorkflow {
  type: 'bitcoin_purchase';
  context: BitcoinPurchaseContext;
}

export interface FiatTransferWorkflow extends PaymentWorkflow {
  type: 'fiat_transfer';
  context: FiatTransferContext;
}

export interface CryptoTransferWorkflow extends PaymentWorkflow {
  type: 'crypto_transfer';
  context: CryptoTransferContext;
}

export interface WorkflowContext {
  userId: string;
  [key: string]: any;
}

export interface AssetDepositContext extends WorkflowContext {
  assetType: 'gold' | 'silver' | 'diamond';
  assetDetails: any;
  targetCurrency: string;
  estimatedValue: number | null;
  finalValue: number | null;
  assetDepositId: string | null;
  fiatTransactionId: string | null;
}

export interface BitcoinPurchaseContext extends WorkflowContext {
  purchaseAmount: number;
  purchaseCurrency: string;
  bitcoinAmount: number | null;
  exchangeRate: number | null;
  fiatTransactionId: string | null;
  bitcoinTransactionId: string | null;
  destinationWallet?: string;
}

export interface FiatTransferContext extends WorkflowContext {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  memo?: string;
  transferTransactionId: string | null;
}

export interface CryptoTransferContext extends WorkflowContext {
  fromWalletId: string;
  toAddress: string;
  amount: number;
  currency: 'BTC' | 'ETH' | 'LTC';
  fee: number | null;
  transactionId: string | null;
  confirmations: number;
}

export interface PaymentTransaction {
  id: string;
  workflowId: string;
  userId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  description: string;
  metadata: any;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface AssetDeposit {
  id: string;
  userId: string;
  workflowId: string;
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
  status: 'submitted' | 'received' | 'verifying' | 'verified' | 'valued' | 'credited' | 'rejected';
  verification: {
    method: string;
    verifiedBy?: string;
    verifiedAt?: Date;
    confidence: number;
    notes?: string;
  };
  valuation: {
    estimatedValue: number;
    finalValue?: number;
    currency: string;
    valuedBy?: string;
    valuedAt?: Date;
    methodology?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CryptoPurchase {
  id: string;
  userId: string;
  workflowId: string;
  cryptocurrency: 'BTC' | 'ETH' | 'LTC';
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  exchangeRate: number;
  fee: number;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  destinationWallet?: string;
  transactionHash?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface FiatTransfer {
  id: string;
  workflowId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  fee: number;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  memo?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentEvent {
  id: string;
  type: string;
  workflowId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export interface PaymentNotification {
  id: string;
  userId: string;
  type: 'workflow_initiated' | 'workflow_completed' | 'workflow_failed' | 'step_completed' | 'step_failed';
  workflowId: string;
  workflowType: PaymentWorkflowType;
  message: string;
  data?: any;
  result?: any;
  error?: any;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface PaymentMetrics {
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

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

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

export interface UserBalance {
  userId: string;
  balances: {
    [currency: string]: number;
  };
  totalValue: {
    USD: number;
    EUR: number;
    GBP: number;
  };
  lastUpdated: Date;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface AssetValuation {
  assetType: 'gold' | 'silver' | 'diamond';
  weight: number;
  purity?: number;
  marketPrice: number;
  premiumDiscount: number;
  finalValue: number;
  currency: string;
  confidence: number;
  methodology: string;
  valuedAt: Date;
}

export interface BitcoinWalletInfo {
  walletId: string;
  userId: string;
  type: 'internal' | 'external';
  address?: string;
  balance: number;
  isActive: boolean;
}

export interface TransactionFee {
  type: 'fixed' | 'percentage';
  amount: number;
  currency: string;
  description: string;
}

export interface ComplianceCheck {
  userId: string;
  transactionId: string;
  type: 'aml' | 'kyc' | 'sanctions';
  status: 'pending' | 'passed' | 'failed' | 'manual_review';
  score?: number;
  flags?: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface RiskAssessment {
  userId: string;
  transactionId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    factor: string;
    score: number;
    weight: number;
  }[];
  recommendation: 'approve' | 'review' | 'reject';
  assessedAt: Date;
}

export interface PaymentLimit {
  userId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'transaction';
  currency: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'bank_account' | 'credit_card' | 'crypto_wallet' | 'asset_deposit';
  details: any;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface PaymentSchedule {
  id: string;
  userId: string;
  type: 'recurring_purchase' | 'recurring_transfer';
  frequency: 'daily' | 'weekly' | 'monthly';
  amount: number;
  currency: string;
  destination?: string;
  isActive: boolean;
  nextExecutionAt: Date;
  createdAt: Date;
  lastExecutedAt?: Date;
}

export interface PaymentAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
    assetDeposits: {
      count: number;
      totalValue: number;
    };
    bitcoinPurchases: {
      count: number;
      totalVolume: number;
    };
    fiatTransfers: {
      count: number;
      totalAmount: number;
    };
  };
  trends: {
    volumeGrowth: number;
    transactionGrowth: number;
    averageSizeGrowth: number;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  type: PaymentWorkflowType;
  description: string;
  steps: {
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedDuration: number;
    dependencies: string[];
  }[];
  defaultConfiguration: any;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffDelay: number;
  };
  createdAt: Date;
  lastTriggeredAt?: Date;
}

export interface PaymentAuditLog {
  id: string;
  userId: string;
  workflowId?: string;
  transactionId?: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface PaymentConfiguration {
  fees: {
    assetDeposit: TransactionFee;
    bitcoinPurchase: TransactionFee;
    fiatTransfer: TransactionFee;
    cryptoTransfer: TransactionFee;
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    transactionLimit: number;
  };
  processing: {
    autoApprovalThreshold: number;
    manualReviewThreshold: number;
    timeoutDuration: number;
  };
  compliance: {
    kycRequired: boolean;
    amlChecksEnabled: boolean;
    sanctionsScreening: boolean;
  };
}

export interface PaymentError {
  code: string;
  message: string;
  category: 'validation' | 'business' | 'technical' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  details?: any;
  timestamp: Date;
}

export interface PaymentReconciliation {
  id: string;
  date: Date;
  type: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  summary: {
    totalTransactions: number;
    totalVolume: number;
    discrepancies: number;
    resolvedDiscrepancies: number;
  };
  discrepancies: {
    transactionId: string;
    type: string;
    amount: number;
    description: string;
    resolved: boolean;
  }[];
  createdAt: Date;
  completedAt?: Date;
}

