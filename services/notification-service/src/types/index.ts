// Export all notification types
export * from './notification';

// Common service types
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

export interface ServiceConfig {
  port: number;
  environment: string;
  version: string;
  database: {
    uri: string;
    options: any;
  };
  redis: {
    url: string;
    options: any;
  };
  services: {
    userService: string;
    adminService: string;
    assetService: string;
    paymentService: string;
    cryptoService: string;
    currencyService: string;
  };
  security: {
    jwtSecret: string;
    allowedOrigins: string[];
    rateLimits: {
      windowMs: number;
      max: number;
    };
  };
  notifications: {
    retentionDays: number;
    maxRetries: number;
    batchSize: number;
  };
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  connections: {
    database: {
      status: string;
      host: string;
    };
    redis: {
      status: string;
      host: string;
    };
    socketIO: {
      status: string;
      connectedClients: number;
    };
  };
  services: {
    [serviceName: string]: boolean;
  };
  queues: {
    [queueName: string]: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: boolean;
    };
  };
  responseTime: number;
}

export interface MetricsData {
  service: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  eventLoop: {
    delay: number;
  };
  requests: {
    total: number;
    active: number;
    errors: number;
  };
  database: {
    connections: number;
    queries: number;
  };
  socketIO: {
    connectedClients: number;
    totalConnections: number;
  };
  notifications: any;
  queues: any;
  prometheus: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: any;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
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

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;
}

export interface QueueConfig {
  name: string;
  concurrency: number;
  rateLimits?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
  };
  retryPolicy: {
    attempts: number;
    backoff: 'fixed' | 'exponential';
    delay: number;
  };
  deadLetterQueue?: string;
  isActive: boolean;
}

export interface JobData {
  id: string;
  type: string;
  data: any;
  priority: number;
  delay?: number;
  attempts?: number;
  maxAttempts?: number;
  backoff?: string | number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface WebSocketEvent {
  event: string;
  data: any;
  room?: string;
  userId?: string;
  timestamp: Date;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number;
  checkPeriod?: number;
}

export interface ExternalServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: { [key: string]: string };
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    credentials: any;
  };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface ChannelProvider {
  name: string;
  type: string;
  config: any;
  isActive: boolean;
  priority: number;
  capabilities: string[];
  rateLimits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  healthCheck: {
    url?: string;
    method?: string;
    timeout: number;
    interval: number;
    failureThreshold: number;
  };
}

export interface DeliveryReport {
  notificationId: string;
  channel: string;
  status: string;
  timestamp: Date;
  attempts: number;
  latency: number;
  error?: string;
  metadata?: any;
}

export interface UserActivity {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  metadata?: any;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: any;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: { [key: string]: string };
}

export interface AuditLog {
  id: string;
  userId?: string;
  adminId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  timestamp: Date;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

export interface ComplianceRecord {
  id: string;
  type: 'gdpr' | 'ccpa' | 'hipaa' | 'pci' | 'sox';
  action: string;
  userId?: string;
  dataType: string;
  purpose: string;
  legalBasis?: string;
  timestamp: Date;
  expiresAt?: Date;
  metadata?: any;
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  retentionPeriod: number; // in days
  archiveAfter?: number; // in days
  deleteAfter: number; // in days
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention: number; // number of backups to keep
  compression: boolean;
  encryption: boolean;
  destination: {
    type: 's3' | 'gcs' | 'azure' | 'local';
    config: any;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  alerts: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      [metric: string]: {
        warning: number;
        critical: number;
      };
    };
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: string[];
  };
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  conditions?: {
    userIds?: string[];
    userGroups?: string[];
    environment?: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  permissions: string[];
  rateLimits?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  url: string;
  method: string;
  headers: { [key: string]: string };
  status: 'pending' | 'success' | 'failed' | 'retrying';
  statusCode?: number;
  response?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  createdAt: Date;
  deliveredAt?: Date;
}

export interface IntegrationConfig {
  name: string;
  type: string;
  enabled: boolean;
  config: any;
  credentials: any;
  rateLimits?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
  };
  healthCheck?: {
    enabled: boolean;
    url: string;
    interval: number;
    timeout: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalNotifications: number;
  processedNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface NotificationSchedule {
  id: string;
  name: string;
  description: string;
  templateId: string;
  audience: {
    type: 'all' | 'segment' | 'custom';
    criteria?: any;
  };
  schedule: {
    type: 'once' | 'recurring';
    startAt: Date;
    endAt?: Date;
    timezone: string;
    cron?: string;
  };
  channels: string[];
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTest {
  id: string;
  name: string;
  type: 'a_b' | 'multivariate';
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  variants: {
    id: string;
    name: string;
    templateId: string;
    percentage: number;
    metrics: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      converted: number;
    };
  }[];
  audience: {
    type: 'all' | 'segment' | 'custom';
    criteria?: any;
    size: number;
  };
  duration: number; // in hours
  confidenceLevel: number;
  winner?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface NotificationOptimization {
  userId: string;
  channel: string;
  optimalSendTime: string; // HH:mm format
  frequency: 'low' | 'medium' | 'high';
  contentPreference: 'text' | 'rich' | 'multimedia';
  engagementScore: number;
  lastUpdated: Date;
  confidence: number;
}

export interface NotificationFeedback {
  id: string;
  notificationId: string;
  userId: string;
  type: 'like' | 'dislike' | 'spam' | 'irrelevant' | 'helpful';
  comment?: string;
  timestamp: Date;
}

export interface NotificationInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  title: string;
  description: string;
  data: any;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  actions?: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

