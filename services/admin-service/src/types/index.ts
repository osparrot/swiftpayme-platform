// Re-export all admin types
export * from './admin';

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

// Authentication types
export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  requestId?: string;
}

// File upload types
export interface FileUploadResult {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string;
  url?: string;
}

// Export/Import types
export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  fields?: string[];
  filters?: any;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ImportResult {
  success: boolean;
  processed: number;
  errors: number;
  warnings: number;
  details: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errorLog?: string[];
}

// Real-time event types
export interface RealTimeEvent {
  type: string;
  category: 'user' | 'asset' | 'transaction' | 'system' | 'security';
  data: any;
  timestamp: Date;
  adminId?: string;
}

export interface SocketEventData {
  event: string;
  data: any;
  room?: string;
  adminId?: string;
}

// Dashboard widget types
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'alert' | 'activity';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
  refreshInterval?: number;
  permissions?: string[];
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  adminId?: string;
}

// Chart data types
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'pie';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  title?: string;
  xAxis?: {
    label: string;
    type: 'category' | 'time' | 'value';
  };
  yAxis?: {
    label: string;
    min?: number;
    max?: number;
  };
  legend?: boolean;
  colors?: string[];
}

// Notification types
export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack';
  config: any;
  isActive: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channels: NotificationChannel[];
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  conditions: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: any;
  }[];
  template: string;
  recipients: string[];
  isActive: boolean;
  cooldown?: number; // minutes
}

// Workflow types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'approval' | 'notification';
  config: any;
  conditions?: any[];
  timeout?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'event' | 'schedule' | 'manual';
    config: any;
  };
  steps: WorkflowStep[];
  isActive: boolean;
  version: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  context: any;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Integration types
export interface ExternalServiceConfig {
  name: string;
  type: 'api' | 'webhook' | 'database' | 'queue';
  endpoint: string;
  authentication: {
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth';
    config: any;
  };
  timeout: number;
  retries: number;
  isActive: boolean;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  responses: {
    status: number;
    description: string;
    schema?: any;
  }[];
  permissions?: string[];
}

// Monitoring types
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
  details?: any;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend?: 'up' | 'down' | 'stable';
  timestamp: Date;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: any;
}

// Security types
export interface SecurityPolicy {
  id: string;
  name: string;
  type: 'password' | 'session' | 'access' | 'data' | 'network';
  rules: {
    name: string;
    value: any;
    enforced: boolean;
  }[];
  isActive: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface AccessLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  allowed: boolean;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface ThreatDetection {
  id: string;
  type: 'brute_force' | 'anomaly' | 'malware' | 'intrusion' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target: string;
  description: string;
  indicators: string[];
  status: 'detected' | 'investigating' | 'mitigated' | 'false_positive';
  detectedAt: Date;
  mitigatedAt?: Date;
}

// Compliance types
export interface ComplianceRule {
  id: string;
  name: string;
  regulation: string; // GDPR, PCI-DSS, SOX, etc.
  description: string;
  requirements: string[];
  controls: {
    id: string;
    description: string;
    implemented: boolean;
    evidence?: string;
  }[];
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_assessed';
  lastAssessment?: Date;
  nextAssessment?: Date;
}

export interface AuditTrail {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  performedBy: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Configuration types
export interface SystemConfiguration {
  category: string;
  settings: {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    isEditable: boolean;
    validation?: {
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: string;
      enum?: any[];
    };
  }[];
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Backup and recovery types
export interface BackupConfiguration {
  type: 'full' | 'incremental' | 'differential';
  schedule: string; // cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  compression: boolean;
  encryption: boolean;
  destination: {
    type: 'local' | 's3' | 'gcs' | 'azure';
    config: any;
  };
}

export interface RecoveryPlan {
  id: string;
  name: string;
  type: 'disaster' | 'data_corruption' | 'security_breach' | 'system_failure';
  steps: {
    order: number;
    description: string;
    estimatedTime: number;
    responsible: string;
    automated: boolean;
  }[];
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  lastTested?: Date;
  isActive: boolean;
}

// Testing types
export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  steps: {
    action: string;
    expected: string;
  }[];
  status: 'pass' | 'fail' | 'skip' | 'pending';
  lastRun?: Date;
  duration?: number;
  error?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[];
  schedule?: string;
  isActive: boolean;
  lastRun?: Date;
  results?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
}

export interface CacheStats {
  totalKeys: number;
  totalMemory: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
  };
}

// Queue types
export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  throughput: number; // jobs per minute
  averageProcessingTime: number;
  errorRate: number;
}

// Utility types
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SearchOptions {
  query?: string;
  filters?: FilterOptions;
  pagination?: PaginationOptions;
}

export interface BulkOperation {
  operation: 'create' | 'update' | 'delete';
  data: any[];
  options?: {
    validateOnly?: boolean;
    continueOnError?: boolean;
    batchSize?: number;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: number;
  results: {
    operation: string;
    success: boolean;
    data?: any;
    error?: string;
  }[];
}

// Event types
export interface SystemEvent {
  id: string;
  type: string;
  category: 'system' | 'user' | 'security' | 'business';
  source: string;
  data: any;
  timestamp: Date;
  processed: boolean;
}

export interface EventHandler {
  name: string;
  events: string[];
  handler: (event: SystemEvent) => Promise<void>;
  isActive: boolean;
}

// Migration types
export interface Migration {
  id: string;
  name: string;
  description: string;
  version: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  executedAt?: Date;
}

export interface MigrationStatus {
  current: string;
  pending: Migration[];
  executed: Migration[];
}

// Plugin types
export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  config?: any;
  hooks: {
    [event: string]: (data: any) => Promise<any>;
  };
  isActive: boolean;
  installedAt: Date;
}

export interface PluginRegistry {
  plugins: Plugin[];
  hooks: {
    [event: string]: Plugin[];
  };
}

// Theme types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Localization types
export interface Translation {
  key: string;
  language: string;
  value: string;
  context?: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isActive: boolean;
  completeness: number; // percentage
}

