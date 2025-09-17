export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserManagementAction {
  type: 'suspend' | 'activate' | 'verify_kyc' | 'reject_kyc' | 'update_limits' | 'reset_password';
  userId: string;
  adminId: string;
  reason?: string;
  data?: any;
  timestamp: Date;
}

export interface AssetVerificationAction {
  type: 'verify' | 'reject' | 'request_more_info' | 'approve_valuation' | 'update_valuation';
  assetDepositId: string;
  adminId: string;
  verificationMethod?: string;
  confidence?: number;
  notes?: string;
  valuation?: {
    amount: number;
    currency: string;
    methodology: string;
  };
  timestamp: Date;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  category: 'system' | 'security' | 'compliance' | 'performance' | 'business';
  title: string;
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceCase {
  id: string;
  type: 'aml' | 'kyc' | 'sanctions' | 'suspicious_activity' | 'large_transaction';
  userId: string;
  transactionId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  description: string;
  findings?: string;
  actions: ComplianceAction[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface ComplianceAction {
  id: string;
  type: string;
  description: string;
  performedBy: string;
  timestamp: Date;
  data?: any;
}

export interface AdminDashboardMetrics {
  users: {
    total: number;
    active: number;
    pendingKyc: number;
    suspended: number;
    newToday: number;
    newThisWeek: number;
  };
  assets: {
    pendingVerification: number;
    verified: number;
    rejected: number;
    totalValue: number;
    averageValue: number;
    verifiedToday: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
    averageAmount: number;
    todayVolume: number;
  };
  system: {
    uptime: number;
    activeAlerts: number;
    criticalAlerts: number;
    performanceScore: number;
    errorRate: number;
    responseTime: number;
  };
  compliance: {
    openCases: number;
    highPriorityCases: number;
    resolvedToday: number;
    averageResolutionTime: number;
  };
}

export interface AdminReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  category: 'operations' | 'compliance' | 'financial' | 'security' | 'performance';
  title: string;
  description: string;
  parameters: any;
  data: any;
  generatedBy: string;
  generatedAt: Date;
  format: 'json' | 'csv' | 'pdf' | 'excel';
  filePath?: string;
  isScheduled: boolean;
  schedule?: string;
}

export interface AdminNotification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  category: 'system' | 'user' | 'asset' | 'transaction' | 'compliance';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  adminId?: string; // null for broadcast notifications
  createdAt: Date;
  readAt?: Date;
}

export interface AdminConfiguration {
  id: string;
  category: string;
  key: string;
  value: any;
  description: string;
  isEditable: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  kycLevel: 'basic' | 'enhanced' | 'premium';
  riskScore: number;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  registeredAt: Date;
  lastLoginAt?: Date;
  balances: {
    [currency: string]: number;
  };
  limits: {
    daily: number;
    monthly: number;
    transaction: number;
  };
  preferences: {
    notifications: boolean;
    marketing: boolean;
    language: string;
    timezone: string;
  };
}

export interface AssetDeposit {
  id: string;
  userId: string;
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
    method?: string;
    verifiedBy?: string;
    verifiedAt?: Date;
    confidence?: number;
    notes?: string;
  };
  valuation: {
    estimatedValue?: number;
    finalValue?: number;
    currency: string;
    valuedBy?: string;
    valuedAt?: Date;
    methodology?: string;
  };
  submittedAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'asset_deposit' | 'bitcoin_purchase' | 'fiat_transfer' | 'crypto_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  fee: number;
  description: string;
  metadata: any;
  workflowId?: string;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    responseTime: number;
  };
  redis: {
    connections: number;
    memory: number;
    hits: number;
    misses: number;
  };
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      errorRate: number;
    };
  };
}

export interface SecurityIncident {
  id: string;
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach' | 'system_compromise' | 'fraud_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  description: string;
  affectedUsers?: string[];
  affectedSystems?: string[];
  detectedAt: Date;
  reportedBy?: string;
  assignedTo?: string;
  actions: SecurityAction[];
  resolution?: string;
  resolvedAt?: Date;
}

export interface SecurityAction {
  id: string;
  type: string;
  description: string;
  performedBy: string;
  timestamp: Date;
  result?: string;
}

export interface AdminTask {
  id: string;
  type: 'user_verification' | 'asset_approval' | 'compliance_review' | 'system_maintenance' | 'report_generation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  data?: any;
}

export interface AdminPreferences {
  adminId: string;
  dashboard: {
    layout: string;
    widgets: string[];
    refreshInterval: number;
  };
  notifications: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
    categories: string[];
  };
  display: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  security: {
    sessionTimeout: number;
    requireMfaForSensitiveActions: boolean;
  };
}

export interface AdminAPIKey {
  id: string;
  adminId: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface AdminWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  createdBy: string;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

export interface AdminBackup {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  filePath: string;
  checksum: string;
  createdBy?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface AdminMaintenance {
  id: string;
  type: 'scheduled' | 'emergency';
  title: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  affectedServices: string[];
  startTime: Date;
  endTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  createdBy: string;
  createdAt: Date;
}

// Request/Response types
export interface AdminLoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  user?: AdminUser;
  requiresMfa?: boolean;
  error?: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  kycStatus?: string;
  limits?: {
    daily?: number;
    monthly?: number;
    transaction?: number;
  };
}

export interface AssetVerificationRequest {
  assetDepositId: string;
  action: 'verify' | 'reject' | 'request_more_info' | 'approve_valuation' | 'update_valuation';
  verificationMethod?: string;
  confidence?: number;
  notes?: string;
  valuation?: {
    amount: number;
    currency: string;
    methodology: string;
  };
}

export interface GenerateReportRequest {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  category: 'operations' | 'compliance' | 'financial' | 'security' | 'performance';
  startDate?: Date;
  endDate?: Date;
  format: 'json' | 'csv' | 'pdf' | 'excel';
  parameters?: any;
}

export interface SystemConfigurationRequest {
  category: string;
  configurations: {
    key: string;
    value: any;
  }[];
}

export interface BulkUserActionRequest {
  userIds: string[];
  action: 'suspend' | 'activate' | 'verify_kyc' | 'reject_kyc' | 'reset_password';
  reason?: string;
  data?: any;
}

export interface SearchUsersRequest {
  query?: string;
  filters?: {
    kycStatus?: string;
    isActive?: boolean;
    isSuspended?: boolean;
    registeredAfter?: Date;
    registeredBefore?: Date;
    riskScoreMin?: number;
    riskScoreMax?: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface SearchAssetsRequest {
  query?: string;
  filters?: {
    assetType?: string;
    status?: string;
    submittedAfter?: Date;
    submittedBefore?: Date;
    valueMin?: number;
    valueMax?: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface SearchTransactionsRequest {
  query?: string;
  filters?: {
    type?: string;
    status?: string;
    userId?: string;
    amountMin?: number;
    amountMax?: number;
    createdAfter?: Date;
    createdBefore?: Date;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export interface AdminStatsResponse {
  users: {
    total: number;
    active: number;
    pendingKyc: number;
    suspended: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  assets: {
    pendingVerification: number;
    verified: number;
    rejected: number;
    totalValue: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  system: {
    uptime: number;
    activeAlerts: number;
    performanceScore: number;
    errorRate: number;
  };
}

export interface AdminActivityResponse {
  recentActions: AdminActivityLog[];
  activeAdmins: {
    adminId: string;
    name: string;
    lastActivity: Date;
    currentActions: number;
  }[];
  systemEvents: {
    type: string;
    message: string;
    timestamp: Date;
    severity: string;
  }[];
}

// Validation schemas
export interface AdminValidationSchema {
  email: {
    type: 'string';
    required: true;
    pattern: string;
  };
  password: {
    type: 'string';
    required: true;
    minLength: number;
    pattern: string;
  };
  role: {
    type: 'string';
    required: true;
    enum: string[];
  };
}

// Error types
export interface AdminError {
  code: string;
  message: string;
  category: 'authentication' | 'authorization' | 'validation' | 'business' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  details?: any;
  timestamp: Date;
}

