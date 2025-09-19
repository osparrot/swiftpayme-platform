/**
 * SwiftPayMe Notification Service - TypeScript Interfaces
 * Comprehensive type definitions for notification system
 */

import { Document, Types } from 'mongoose';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationFrequency,
  TemplateType,
  EventType,
  SubscriptionStatus,
  DeliveryProvider,
  NotificationErrorCode,
  NotificationCategory
} from '../enums/notificationEnums';

// ==================== BASE INTERFACES ====================

/**
 * Base notification interface
 */
export interface INotification {
  notificationId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Recipient information
  recipientId: string;
  recipientType: 'user' | 'admin' | 'system';
  recipientEmail?: string;
  recipientPhone?: string;
  recipientDeviceTokens?: string[];
  
  // Content
  title: string;
  message: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Delivery settings
  channels: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  
  // Tracking
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Error handling
  errors?: INotificationError[];
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Notification document interface for Mongoose
 */
export interface INotificationDocument extends INotification, Document {
  _id: Types.ObjectId;
  
  // Virtual methods
  isExpired(): boolean;
  canRetry(): boolean;
  markAsRead(): Promise<void>;
  markAsDelivered(channel: NotificationChannel): Promise<void>;
  addError(error: INotificationError): Promise<void>;
}

// ==================== TEMPLATE INTERFACES ====================

/**
 * Notification template interface
 */
export interface INotificationTemplate {
  templateId: string;
  name: string;
  type: TemplateType;
  notificationType: NotificationType;
  
  // Template content
  subject?: string; // For email templates
  content: string;
  variables: string[];
  
  // Localization
  language: string;
  defaultLanguage: boolean;
  
  // Validation
  isActive: boolean;
  version: number;
  
  // Metadata
  description?: string;
  tags?: string[];
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

/**
 * Template document interface for Mongoose
 */
export interface INotificationTemplateDocument extends INotificationTemplate, Document {
  _id: Types.ObjectId;
  
  // Methods
  render(variables: Record<string, any>): Promise<string>;
  validate(): Promise<boolean>;
  createVersion(): Promise<INotificationTemplateDocument>;
}

// ==================== SUBSCRIPTION INTERFACES ====================

/**
 * Event subscription interface
 */
export interface IEventSubscription {
  subscriptionId: string;
  userId: string;
  eventType: EventType;
  notificationTypes: NotificationType[];
  
  // Channel preferences
  channels: NotificationChannel[];
  frequency: NotificationFrequency;
  quietHours?: IQuietHours;
  
  // Filters
  filters?: Record<string, any>;
  conditions?: ISubscriptionCondition[];
  
  // Status
  status: SubscriptionStatus;
  isActive: boolean;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
}

/**
 * Subscription document interface for Mongoose
 */
export interface IEventSubscriptionDocument extends IEventSubscription, Document {
  _id: Types.ObjectId;
  
  // Methods
  shouldTrigger(event: INotificationEvent): boolean;
  isInQuietHours(): boolean;
  updateLastTriggered(): Promise<void>;
}

// ==================== USER PREFERENCES ====================

/**
 * User notification preferences
 */
export interface IUserNotificationPreferences {
  userId: string;
  
  // Global settings
  globalEnabled: boolean;
  defaultChannels: NotificationChannel[];
  defaultFrequency: NotificationFrequency;
  quietHours?: IQuietHours;
  timezone: string;
  
  // Category preferences
  categoryPreferences: Record<NotificationCategory, ICategoryPreference>;
  
  // Channel-specific settings
  channelSettings: Record<NotificationChannel, IChannelSettings>;
  
  // Blocked types
  blockedTypes: NotificationType[];
  blockedSenders: string[];
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  lastModifiedAt: Date;
}

/**
 * Category preference settings
 */
export interface ICategoryPreference {
  enabled: boolean;
  channels: NotificationChannel[];
  frequency: NotificationFrequency;
  priority: NotificationPriority;
}

/**
 * Channel-specific settings
 */
export interface IChannelSettings {
  enabled: boolean;
  address?: string; // Email address, phone number, etc.
  verified: boolean;
  verifiedAt?: Date;
  preferences?: Record<string, any>;
}

/**
 * Quiet hours configuration
 */
export interface IQuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  days: number[]; // 0-6, Sunday = 0
  allowUrgent: boolean;
  allowCritical: boolean;
}

// ==================== DELIVERY INTERFACES ====================

/**
 * Notification delivery attempt
 */
export interface IDeliveryAttempt {
  attemptId: string;
  notificationId: string;
  channel: NotificationChannel;
  provider: DeliveryProvider;
  
  // Attempt details
  attemptNumber: number;
  status: 'pending' | 'success' | 'failed' | 'retry';
  
  // Request/Response
  request?: Record<string, any>;
  response?: Record<string, any>;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Error handling
  error?: INotificationError;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Notification error details
 */
export interface INotificationError {
  code: NotificationErrorCode;
  message: string;
  details?: Record<string, any>;
  channel?: NotificationChannel;
  provider?: DeliveryProvider;
  timestamp: Date;
  retryable: boolean;
}

// ==================== EVENT INTERFACES ====================

/**
 * Notification event for triggering notifications
 */
export interface INotificationEvent {
  eventId: string;
  eventType: EventType;
  notificationType: NotificationType;
  
  // Event data
  userId?: string;
  adminId?: string;
  data: Record<string, any>;
  
  // Context
  source: string;
  sourceId?: string;
  correlationId?: string;
  
  // Timing
  timestamp: Date;
  scheduledFor?: Date;
  
  // Metadata
  metadata?: Record<string, any>;
}

// ==================== PROVIDER INTERFACES ====================

/**
 * Notification provider configuration
 */
export interface IProviderConfig {
  provider: DeliveryProvider;
  channel: NotificationChannel;
  
  // Configuration
  config: Record<string, any>;
  credentials: Record<string, any>;
  
  // Settings
  isActive: boolean;
  priority: number;
  rateLimit?: IRateLimit;
  
  // Health
  isHealthy: boolean;
  lastHealthCheck?: Date;
  healthCheckInterval: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rate limiting configuration
 */
export interface IRateLimit {
  maxRequests: number;
  windowMs: number;
  retryAfter?: number;
}

// ==================== ANALYTICS INTERFACES ====================

/**
 * Notification analytics data
 */
export interface INotificationAnalytics {
  notificationId: string;
  type: NotificationType;
  category: NotificationCategory;
  
  // Delivery metrics
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;
  
  // Channel metrics
  channelMetrics: Record<NotificationChannel, IChannelMetrics>;
  
  // User engagement
  opened: boolean;
  clicked: boolean;
  converted: boolean;
  
  // Device/Platform info
  deviceType?: string;
  platform?: string;
  userAgent?: string;
  
  // Location
  country?: string;
  city?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Channel-specific metrics
 */
export interface IChannelMetrics {
  sent: boolean;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  unsubscribed: boolean;
  
  // Timing
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  
  // Provider info
  provider: DeliveryProvider;
  providerId?: string;
  
  // Error info
  error?: INotificationError;
}

// ==================== BATCH INTERFACES ====================

/**
 * Batch notification for bulk sending
 */
export interface IBatchNotification {
  batchId: string;
  name: string;
  description?: string;
  
  // Batch settings
  type: NotificationType;
  template: string;
  channels: NotificationChannel[];
  
  // Recipients
  recipients: IBatchRecipient[];
  totalRecipients: number;
  
  // Scheduling
  scheduledAt?: Date;
  timezone?: string;
  
  // Status
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Progress
  processed: number;
  successful: number;
  failed: number;
  
  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Batch recipient information
 */
export interface IBatchRecipient {
  recipientId: string;
  recipientType: 'user' | 'admin';
  email?: string;
  phone?: string;
  variables?: Record<string, any>;
  
  // Status
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
  notificationId?: string;
  
  // Error
  error?: INotificationError;
  
  // Timing
  processedAt?: Date;
}

// ==================== SUBSCRIPTION CONDITION ====================

/**
 * Subscription condition for filtering
 */
export interface ISubscriptionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
  logicalOperator?: 'and' | 'or';
}

// ==================== REQUEST/RESPONSE INTERFACES ====================

/**
 * Create notification request
 */
export interface ICreateNotificationRequest {
  type: NotificationType;
  recipientId: string;
  recipientType?: 'user' | 'admin' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Notification response
 */
export interface INotificationResponse {
  success: boolean;
  data?: INotification;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
}

/**
 * Batch notification request
 */
export interface IBatchNotificationRequest {
  name: string;
  description?: string;
  type: NotificationType;
  template: string;
  channels: NotificationChannel[];
  recipients: IBatchRecipient[];
  scheduledAt?: Date;
  timezone?: string;
}

/**
 * Get notifications query parameters
 */
export interface IGetNotificationsQuery {
  userId?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeRead?: boolean;
  includeExpired?: boolean;
}

// ==================== WEBHOOK INTERFACES ====================

/**
 * Webhook notification payload
 */
export interface IWebhookPayload {
  event: string;
  timestamp: Date;
  data: Record<string, any>;
  signature?: string;
  version: string;
}

/**
 * Webhook configuration
 */
export interface IWebhookConfig {
  url: string;
  secret?: string;
  events: NotificationType[];
  headers?: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  isActive: boolean;
}

// ==================== EXPORT ALL TYPES ====================

export {
  // Enums
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationFrequency,
  TemplateType,
  EventType,
  SubscriptionStatus,
  DeliveryProvider,
  NotificationErrorCode,
  NotificationCategory
} from '../enums/notificationEnums';

