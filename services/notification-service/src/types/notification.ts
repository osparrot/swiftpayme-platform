export interface Notification {
  id: string;
  userId?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security' | 'transaction' | 'marketing' | 'system';
  category: string;
  title: string;
  message: string;
  data?: any;
  channels: string[];
  templateId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
  status: NotificationStatus;
  deliveryStatus: { [channel: string]: ChannelDeliveryStatus };
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  readAt?: Date;
}

export type NotificationStatus = 
  | 'pending' 
  | 'processing' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'permanently_failed' 
  | 'acknowledged' 
  | 'expired' 
  | 'filtered';

export type DeliveryStatus = 
  | 'queued' 
  | 'sending' 
  | 'delivered' 
  | 'failed' 
  | 'permanently_failed' 
  | 'acknowledged';

export interface ChannelDeliveryStatus {
  status: DeliveryStatus;
  timestamp: Date;
  details?: any;
  error?: string;
  attempts: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security' | 'transaction' | 'marketing' | 'system';
  category: string;
  title: string;
  content: string;
  variables: string[];
  defaultChannels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord' | 'telegram' | 'whatsapp';
  config: any;
  isActive: boolean;
  priority: number;
  rateLimits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    failureThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
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
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    digest: boolean;
    digestFrequency: 'hourly' | 'daily' | 'weekly';
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'regex';
  value: any;
}

export interface NotificationAction {
  type: 'modify_priority' | 'add_channel' | 'remove_channel' | 'modify_content' | 'delay' | 'cancel';
  parameters: any;
}

export interface NotificationMetrics {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  channels: {
    [channel: string]: {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    };
  };
  templates: {
    [templateId: string]: {
      used: number;
      delivered: number;
      failed: number;
    };
  };
  deliveryRate: number;
  averageDeliveryTime: number;
}

export interface EmailNotification {
  notificationId: string;
  userId?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  metadata?: any;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  cid?: string;
}

export interface SMSNotification {
  notificationId: string;
  userId?: string;
  to: string;
  from?: string;
  message: string;
  templateId?: string;
  templateData?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  mediaUrls?: string[];
  metadata?: any;
}

export interface PushNotification {
  notificationId: string;
  userId?: string;
  deviceTokens?: string[];
  topic?: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ttl?: number;
  collapseKey?: string;
  metadata?: any;
}

export interface WebhookNotification {
  notificationId: string;
  userId?: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: { [key: string]: string };
  body?: any;
  timeout?: number;
  retries?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  signature?: {
    algorithm: 'sha256' | 'sha512';
    secret: string;
    header: string;
  };
  metadata?: any;
}

export interface SlackNotification {
  notificationId: string;
  userId?: string;
  channel: string;
  text: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
  attachments?: SlackAttachment[];
  blocks?: any[];
  threadTs?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface SlackAttachment {
  fallback: string;
  color?: string;
  pretext?: string;
  authorName?: string;
  authorLink?: string;
  authorIcon?: string;
  title?: string;
  titleLink?: string;
  text?: string;
  fields?: SlackField[];
  imageUrl?: string;
  thumbUrl?: string;
  footer?: string;
  footerIcon?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface DiscordNotification {
  notificationId: string;
  userId?: string;
  channelId: string;
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatarUrl?: string;
  tts?: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface TelegramNotification {
  notificationId: string;
  userId?: string;
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  replyMarkup?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface WhatsAppNotification {
  notificationId: string;
  userId?: string;
  to: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'template';
  content: any;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface NotificationQueue {
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord' | 'telegram' | 'whatsapp';
  concurrency: number;
  rateLimits: {
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

export interface NotificationJob {
  id: string;
  queueName: string;
  type: string;
  data: any;
  priority: number;
  delay: number;
  attempts: number;
  maxAttempts: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
}

export interface NotificationEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
}

export interface NotificationWebhook {
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
  headers?: { [key: string]: string };
  createdBy: string;
  createdAt: Date;
  lastTriggeredAt?: Date;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export interface NotificationAnalytics {
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    averageDeliveryTime: number;
    channelBreakdown: {
      [channel: string]: {
        sent: number;
        delivered: number;
        failed: number;
        deliveryRate: number;
      };
    };
    typeBreakdown: {
      [type: string]: {
        sent: number;
        delivered: number;
        failed: number;
      };
    };
    categoryBreakdown: {
      [category: string]: {
        sent: number;
        delivered: number;
        failed: number;
      };
    };
    hourlyDistribution: {
      [hour: string]: number;
    };
    topFailureReasons: {
      reason: string;
      count: number;
    }[];
  };
}

export interface NotificationReport {
  id: string;
  type: 'delivery' | 'performance' | 'user_engagement' | 'channel_analysis' | 'template_usage';
  title: string;
  description: string;
  period: {
    start: Date;
    end: Date;
  };
  data: any;
  format: 'json' | 'csv' | 'pdf' | 'excel';
  generatedBy: string;
  generatedAt: Date;
  filePath?: string;
  isScheduled: boolean;
  schedule?: string;
}

export interface NotificationDigest {
  id: string;
  userId: string;
  type: 'hourly' | 'daily' | 'weekly';
  notifications: Notification[];
  summary: {
    total: number;
    byType: { [type: string]: number };
    byCategory: { [category: string]: number };
    unread: number;
  };
  generatedAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface NotificationDevice {
  id: string;
  userId: string;
  type: 'ios' | 'android' | 'web' | 'desktop';
  token: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  type: 'broadcast' | 'targeted' | 'triggered';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  templateId: string;
  audience: {
    type: 'all' | 'segment' | 'custom';
    criteria?: any;
    userIds?: string[];
  };
  channels: string[];
  schedule?: {
    startAt: Date;
    endAt?: Date;
    timezone: string;
  };
  throttling?: {
    maxPerHour: number;
    maxPerDay: number;
  };
  tracking: {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface NotificationSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    field: string;
    operator: string;
    value: any;
  }[];
  userCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastCalculatedAt?: Date;
}

export interface NotificationA11y {
  screenReader: {
    enabled: boolean;
    altText?: string;
    ariaLabel?: string;
  };
  highContrast: {
    enabled: boolean;
    colors?: {
      background: string;
      text: string;
      accent: string;
    };
  };
  fontSize: {
    scale: number; // 1.0 = normal, 1.2 = 20% larger, etc.
  };
  reducedMotion: {
    enabled: boolean;
  };
}

export interface NotificationLocalization {
  language: string;
  region?: string;
  title: string;
  content: string;
  variables?: { [key: string]: string };
  direction: 'ltr' | 'rtl';
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: string;
}

export interface NotificationPersonalization {
  userId: string;
  preferences: {
    tone: 'formal' | 'casual' | 'friendly';
    frequency: 'minimal' | 'normal' | 'frequent';
    contentType: 'text' | 'rich' | 'multimedia';
  };
  demographics: {
    age?: number;
    gender?: string;
    location?: string;
    timezone?: string;
  };
  behavior: {
    lastActive?: Date;
    engagementScore?: number;
    preferredChannels?: string[];
    optimalSendTime?: string;
  };
}

// Request/Response types
export interface SendNotificationRequest {
  userId?: string;
  type: string;
  category: string;
  title: string;
  message: string;
  data?: any;
  channels?: string[];
  templateId?: string;
  templateData?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
  maxRetries?: number;
}

export interface SendBulkNotificationRequest {
  notifications: SendNotificationRequest[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface SendTemplateNotificationRequest {
  templateId: string;
  userId: string;
  variables: any;
  channels?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface UpdatePreferencesRequest {
  channels?: { [channel: string]: boolean };
  categories?: { [category: string]: boolean };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  frequency?: {
    immediate: boolean;
    digest: boolean;
    digestFrequency: 'hourly' | 'daily' | 'weekly';
  };
}

export interface CreateTemplateRequest {
  name: string;
  type: string;
  category: string;
  title: string;
  content: string;
  variables: string[];
  defaultChannels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface CreateChannelRequest {
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord' | 'telegram' | 'whatsapp';
  config: any;
  priority?: number;
  rateLimits?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: { [key: string]: string };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface GetNotificationsRequest {
  userId?: string;
  type?: string;
  category?: string;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface GetAnalyticsRequest {
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  channels?: string[];
  types?: string[];
  categories?: string[];
  groupBy?: string[];
}

export interface GenerateReportRequest {
  type: 'delivery' | 'performance' | 'user_engagement' | 'channel_analysis' | 'template_usage';
  period: {
    start: Date;
    end: Date;
  };
  format: 'json' | 'csv' | 'pdf' | 'excel';
  filters?: any;
  groupBy?: string[];
}

// Response types
export interface NotificationResponse {
  success: boolean;
  data?: Notification;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

export interface BulkNotificationResponse {
  success: boolean;
  data?: {
    total: number;
    successful: number;
    failed: number;
    notifications: Notification[];
    errors: {
      index: number;
      error: string;
    }[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

export interface NotificationListResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

export interface AnalyticsResponse {
  success: boolean;
  data?: NotificationAnalytics;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

export interface MetricsResponse {
  success: boolean;
  data?: NotificationMetrics;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

// Error types
export interface NotificationError {
  code: string;
  message: string;
  category: 'validation' | 'authentication' | 'authorization' | 'rate_limit' | 'service' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  details?: any;
  timestamp: Date;
}

// Validation schemas
export interface NotificationValidationSchema {
  title: {
    type: 'string';
    required: true;
    maxLength: number;
  };
  message: {
    type: 'string';
    required: true;
    maxLength: number;
  };
  channels: {
    type: 'array';
    items: {
      type: 'string';
      enum: string[];
    };
  };
  priority: {
    type: 'string';
    enum: string[];
  };
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

