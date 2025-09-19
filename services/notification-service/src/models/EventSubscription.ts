/**
 * SwiftPayMe Notification Service - Event Subscription Model
 * Mongoose model for managing user notification subscriptions and preferences
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  IEventSubscriptionDocument,
  INotificationEvent,
  IQuietHours,
  ISubscriptionCondition,
  EventType,
  NotificationType,
  NotificationChannel,
  NotificationFrequency,
  SubscriptionStatus
} from '../types/notificationTypes';

// ==================== SUBSCRIPTION CONDITION SCHEMA ====================

const SubscriptionConditionSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true
  },
  operator: {
    type: String,
    required: true,
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'regex']
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  logicalOperator: {
    type: String,
    enum: ['and', 'or'],
    default: 'and'
  }
}, { _id: false });

// ==================== QUIET HOURS SCHEMA ====================

const QuietHoursSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: String,
    required: function() { return this.enabled; },
    validate: {
      validator: function(v: string) {
        if (!this.enabled) return true;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: function() { return this.enabled; },
    validate: {
      validator: function(v: string) {
        if (!this.enabled) return true;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  timezone: {
    type: String,
    required: function() { return this.enabled; },
    default: 'UTC',
    validate: {
      validator: function(v: string) {
        if (!this.enabled) return true;
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid timezone'
    }
  },
  days: [{
    type: Number,
    min: 0,
    max: 6,
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v >= 0 && v <= 6;
      },
      message: 'Days must be integers between 0 (Sunday) and 6 (Saturday)'
    }
  }],
  allowUrgent: {
    type: Boolean,
    default: true
  },
  allowCritical: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// ==================== EVENT SUBSCRIPTION SCHEMA ====================

const EventSubscriptionSchema = new Schema<IEventSubscriptionDocument>({
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  userId: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return v && v.length > 0;
      },
      message: 'User ID is required'
    }
  },
  
  eventType: {
    type: String,
    required: true,
    enum: Object.values(EventType),
    index: true
  },
  
  notificationTypes: [{
    type: String,
    enum: Object.values(NotificationType),
    required: true
  }],
  
  // ==================== CHANNEL PREFERENCES ====================
  
  channels: [{
    type: String,
    enum: Object.values(NotificationChannel),
    required: true
  }],
  
  frequency: {
    type: String,
    required: true,
    enum: Object.values(NotificationFrequency),
    default: NotificationFrequency.IMMEDIATE
  },
  
  quietHours: QuietHoursSchema,
  
  // ==================== FILTERS ====================
  
  filters: {
    type: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v: any) {
        if (!v) return true;
        try {
          JSON.stringify(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Filters must be valid JSON'
    }
  },
  
  conditions: [SubscriptionConditionSchema],
  
  // ==================== STATUS ====================
  
  status: {
    type: String,
    required: true,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
    index: true
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // ==================== AUDIT ====================
  
  lastTriggeredAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'event_subscriptions',
  versionKey: false
});

// ==================== INDEXES ====================

// Compound indexes for efficient queries
EventSubscriptionSchema.index({ userId: 1, eventType: 1, status: 1 });
EventSubscriptionSchema.index({ eventType: 1, notificationTypes: 1, isActive: 1 });
EventSubscriptionSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
EventSubscriptionSchema.index({ status: 1, lastTriggeredAt: -1 });

// Unique constraint to prevent duplicate subscriptions
EventSubscriptionSchema.index(
  { userId: 1, eventType: 1, notificationTypes: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $ne: SubscriptionStatus.CANCELLED } }
  }
);

// ==================== VIRTUAL PROPERTIES ====================

EventSubscriptionSchema.virtual('isInQuietHours').get(function() {
  if (!this.quietHours || !this.quietHours.enabled) {
    return false;
  }
  
  const now = new Date();
  const userTime = new Intl.DateTimeFormat('en-US', {
    timeZone: this.quietHours.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
  
  const currentDay = new Intl.DateTimeFormat('en-US', {
    timeZone: this.quietHours.timezone,
    weekday: 'numeric'
  }).format(now);
  
  // Check if current day is in quiet hours days
  if (this.quietHours.days && this.quietHours.days.length > 0) {
    const dayNumber = parseInt(currentDay) % 7; // Convert to 0-6 format
    if (!this.quietHours.days.includes(dayNumber)) {
      return false;
    }
  }
  
  // Check if current time is within quiet hours
  const startTime = this.quietHours.startTime;
  const endTime = this.quietHours.endTime;
  
  if (startTime <= endTime) {
    // Same day range (e.g., 09:00 to 17:00)
    return userTime >= startTime && userTime <= endTime;
  } else {
    // Overnight range (e.g., 22:00 to 06:00)
    return userTime >= startTime || userTime <= endTime;
  }
});

EventSubscriptionSchema.virtual('canReceiveNotifications').get(function() {
  return this.isActive && this.status === SubscriptionStatus.ACTIVE;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware
EventSubscriptionSchema.pre('save', function(next) {
  // Validate notification types belong to event type
  const validTypes = this.getValidNotificationTypesForEvent();
  const invalidTypes = this.notificationTypes.filter(type => !validTypes.includes(type));
  
  if (invalidTypes.length > 0) {
    return next(new Error(`Invalid notification types for event type ${this.eventType}: ${invalidTypes.join(', ')}`));
  }
  
  // Ensure at least one channel is selected
  if (!this.channels || this.channels.length === 0) {
    return next(new Error('At least one notification channel must be selected'));
  }
  
  // Validate quiet hours
  if (this.quietHours && this.quietHours.enabled) {
    if (!this.quietHours.startTime || !this.quietHours.endTime) {
      return next(new Error('Start time and end time are required when quiet hours are enabled'));
    }
  }
  
  next();
});

// Post-save middleware
EventSubscriptionSchema.post('save', function(doc) {
  // Emit event for cache invalidation
  if (typeof process !== 'undefined' && process.emit) {
    process.emit('subscription:updated', doc);
  }
});

// ==================== INSTANCE METHODS ====================

EventSubscriptionSchema.methods.shouldTrigger = function(event: INotificationEvent): boolean {
  // Check if subscription is active
  if (!this.canReceiveNotifications) {
    return false;
  }
  
  // Check if event type matches
  if (this.eventType !== event.eventType) {
    return false;
  }
  
  // Check if notification type is subscribed
  if (!this.notificationTypes.includes(event.notificationType)) {
    return false;
  }
  
  // Check frequency restrictions
  if (this.frequency !== NotificationFrequency.IMMEDIATE) {
    const now = new Date();
    const lastTriggered = this.lastTriggeredAt;
    
    if (lastTriggered) {
      const timeDiff = now.getTime() - lastTriggered.getTime();
      
      switch (this.frequency) {
        case NotificationFrequency.HOURLY:
          if (timeDiff < 60 * 60 * 1000) return false;
          break;
        case NotificationFrequency.DAILY:
          if (timeDiff < 24 * 60 * 60 * 1000) return false;
          break;
        case NotificationFrequency.WEEKLY:
          if (timeDiff < 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case NotificationFrequency.MONTHLY:
          if (timeDiff < 30 * 24 * 60 * 60 * 1000) return false;
          break;
        case NotificationFrequency.NEVER:
          return false;
      }
    }
  }
  
  // Check filters
  if (this.filters && Object.keys(this.filters).length > 0) {
    if (!this.matchesFilters(event.data)) {
      return false;
    }
  }
  
  // Check conditions
  if (this.conditions && this.conditions.length > 0) {
    if (!this.matchesConditions(event.data)) {
      return false;
    }
  }
  
  return true;
};

EventSubscriptionSchema.methods.isInQuietHours = function(): boolean {
  return this.isInQuietHours;
};

EventSubscriptionSchema.methods.updateLastTriggered = async function(): Promise<void> {
  this.lastTriggeredAt = new Date();
  await this.save();
};

EventSubscriptionSchema.methods.activate = async function(): Promise<void> {
  this.status = SubscriptionStatus.ACTIVE;
  this.isActive = true;
  await this.save();
};

EventSubscriptionSchema.methods.deactivate = async function(): Promise<void> {
  this.status = SubscriptionStatus.INACTIVE;
  this.isActive = false;
  await this.save();
};

EventSubscriptionSchema.methods.pause = async function(): Promise<void> {
  this.status = SubscriptionStatus.PAUSED;
  await this.save();
};

EventSubscriptionSchema.methods.cancel = async function(): Promise<void> {
  this.status = SubscriptionStatus.CANCELLED;
  this.isActive = false;
  await this.save();
};

EventSubscriptionSchema.methods.matchesFilters = function(data: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(this.filters)) {
    if (data[key] !== value) {
      return false;
    }
  }
  return true;
};

EventSubscriptionSchema.methods.matchesConditions = function(data: Record<string, any>): boolean {
  if (!this.conditions || this.conditions.length === 0) {
    return true;
  }
  
  let result = true;
  let currentLogicalOp = 'and';
  
  for (const condition of this.conditions) {
    const fieldValue = this.getNestedValue(data, condition.field);
    const conditionResult = this.evaluateCondition(fieldValue, condition);
    
    if (currentLogicalOp === 'and') {
      result = result && conditionResult;
    } else {
      result = result || conditionResult;
    }
    
    currentLogicalOp = condition.logicalOperator || 'and';
  }
  
  return result;
};

EventSubscriptionSchema.methods.getNestedValue = function(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

EventSubscriptionSchema.methods.evaluateCondition = function(fieldValue: any, condition: ISubscriptionCondition): boolean {
  const { operator, value } = condition;
  
  switch (operator) {
    case 'eq':
      return fieldValue === value;
    case 'ne':
      return fieldValue !== value;
    case 'gt':
      return fieldValue > value;
    case 'gte':
      return fieldValue >= value;
    case 'lt':
      return fieldValue < value;
    case 'lte':
      return fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'nin':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(value);
    case 'regex':
      return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
    default:
      return false;
  }
};

EventSubscriptionSchema.methods.getValidNotificationTypesForEvent = function(): NotificationType[] {
  // Map event types to valid notification types
  const eventTypeMap: Record<EventType, NotificationType[]> = {
    [EventType.USER_EVENT]: [
      NotificationType.USER_REGISTRATION,
      NotificationType.USER_LOGIN,
      NotificationType.USER_LOGOUT,
      NotificationType.USER_PROFILE_UPDATE,
      NotificationType.USER_PASSWORD_CHANGE,
      NotificationType.USER_EMAIL_VERIFICATION,
      NotificationType.USER_PHONE_VERIFICATION,
      NotificationType.USER_ACCOUNT_LOCKED,
      NotificationType.USER_ACCOUNT_UNLOCKED,
      NotificationType.USER_ACCOUNT_SUSPENDED,
      NotificationType.USER_ACCOUNT_REACTIVATED,
      NotificationType.KYC_VERIFICATION_STARTED,
      NotificationType.KYC_VERIFICATION_PENDING,
      NotificationType.KYC_VERIFICATION_APPROVED,
      NotificationType.KYC_VERIFICATION_REJECTED
    ],
    [EventType.ASSET_EVENT]: [
      NotificationType.ASSET_DEPOSIT_SUBMITTED,
      NotificationType.ASSET_DEPOSIT_RECEIVED,
      NotificationType.ASSET_DEPOSIT_VERIFIED,
      NotificationType.ASSET_DEPOSIT_APPROVED,
      NotificationType.ASSET_DEPOSIT_REJECTED,
      NotificationType.ASSET_DEPOSIT_VALUED,
      NotificationType.ASSET_DEPOSIT_CREDITED,
      NotificationType.ASSET_WITHDRAWAL_REQUESTED,
      NotificationType.ASSET_WITHDRAWAL_APPROVED,
      NotificationType.ASSET_WITHDRAWAL_REJECTED,
      NotificationType.ASSET_WITHDRAWAL_COMPLETED,
      NotificationType.TOKEN_MINTING_STARTED,
      NotificationType.TOKEN_MINTING_COMPLETED,
      NotificationType.TOKEN_MINTING_FAILED,
      NotificationType.TOKEN_BURNING_STARTED,
      NotificationType.TOKEN_BURNING_COMPLETED,
      NotificationType.TOKEN_BURNING_FAILED
    ],
    [EventType.PAYMENT_EVENT]: [
      NotificationType.PAYMENT_INITIATED,
      NotificationType.PAYMENT_PROCESSING,
      NotificationType.PAYMENT_COMPLETED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.PAYMENT_CANCELLED,
      NotificationType.PAYMENT_REFUNDED,
      NotificationType.TRANSACTION_CREATED,
      NotificationType.TRANSACTION_PENDING,
      NotificationType.TRANSACTION_CONFIRMED,
      NotificationType.TRANSACTION_FAILED,
      NotificationType.TRANSACTION_REVERSED,
      NotificationType.BALANCE_UPDATED,
      NotificationType.BALANCE_LOW,
      NotificationType.BALANCE_CREDITED,
      NotificationType.BALANCE_DEBITED
    ],
    [EventType.CRYPTO_EVENT]: [
      NotificationType.BITCOIN_WALLET_CREATED,
      NotificationType.BITCOIN_TRANSACTION_INITIATED,
      NotificationType.BITCOIN_TRANSACTION_PENDING,
      NotificationType.BITCOIN_TRANSACTION_CONFIRMED,
      NotificationType.BITCOIN_TRANSACTION_FAILED,
      NotificationType.BITCOIN_RECEIVED,
      NotificationType.BITCOIN_SENT,
      NotificationType.CRYPTO_PRICE_ALERT,
      NotificationType.CRYPTO_WALLET_BALANCE_LOW
    ],
    [EventType.SECURITY_EVENT]: [
      NotificationType.SECURITY_LOGIN_ATTEMPT,
      NotificationType.SECURITY_FAILED_LOGIN,
      NotificationType.SECURITY_SUSPICIOUS_ACTIVITY,
      NotificationType.SECURITY_DEVICE_ADDED,
      NotificationType.SECURITY_DEVICE_REMOVED,
      NotificationType.SECURITY_2FA_ENABLED,
      NotificationType.SECURITY_2FA_DISABLED,
      NotificationType.SECURITY_PASSWORD_RESET,
      NotificationType.SECURITY_API_KEY_CREATED,
      NotificationType.SECURITY_API_KEY_REVOKED
    ],
    [EventType.SYSTEM_EVENT]: [
      NotificationType.SYSTEM_MAINTENANCE,
      NotificationType.SYSTEM_UPDATE,
      NotificationType.SYSTEM_DOWNTIME,
      NotificationType.SYSTEM_RECOVERY,
      NotificationType.SYSTEM_ERROR,
      NotificationType.SYSTEM_PERFORMANCE_ALERT
    ],
    [EventType.ADMIN_EVENT]: [
      NotificationType.ADMIN_USER_FLAGGED,
      NotificationType.ADMIN_TRANSACTION_FLAGGED,
      NotificationType.ADMIN_SYSTEM_ALERT,
      NotificationType.ADMIN_COMPLIANCE_ALERT,
      NotificationType.ADMIN_ASSET_VERIFICATION_REQUIRED,
      NotificationType.ADMIN_HIGH_VALUE_TRANSACTION,
      NotificationType.ADMIN_SUSPICIOUS_ACTIVITY
    ],
    [EventType.MARKETING_EVENT]: [
      NotificationType.MARKETING_WELCOME,
      NotificationType.MARKETING_PROMOTION,
      NotificationType.MARKETING_NEWSLETTER,
      NotificationType.MARKETING_PRODUCT_UPDATE,
      NotificationType.MARKETING_FEATURE_ANNOUNCEMENT
    ]
  };
  
  return eventTypeMap[this.eventType] || [];
};

// ==================== STATIC METHODS ====================

EventSubscriptionSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.eventType) {
    query.where('eventType', options.eventType);
  }
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.isActive !== undefined) {
    query.where('isActive', options.isActive);
  }
  
  return query.sort({ createdAt: -1 });
};

EventSubscriptionSchema.statics.findActiveSubscriptions = function(eventType?: EventType) {
  const query = this.find({
    isActive: true,
    status: SubscriptionStatus.ACTIVE
  });
  
  if (eventType) {
    query.where('eventType', eventType);
  }
  
  return query;
};

EventSubscriptionSchema.statics.findSubscriptionsForEvent = function(event: INotificationEvent) {
  return this.find({
    eventType: event.eventType,
    notificationTypes: event.notificationType,
    isActive: true,
    status: SubscriptionStatus.ACTIVE
  });
};

EventSubscriptionSchema.statics.bulkUpdateStatus = function(subscriptionIds: string[], status: SubscriptionStatus) {
  return this.updateMany(
    { subscriptionId: { $in: subscriptionIds } },
    { status, updatedAt: new Date() }
  );
};

// ==================== MODEL CREATION ====================

const EventSubscriptionModel: Model<IEventSubscriptionDocument> = mongoose.model<IEventSubscriptionDocument>(
  'EventSubscription',
  EventSubscriptionSchema
);

export default EventSubscriptionModel;
export { EventSubscriptionSchema };

