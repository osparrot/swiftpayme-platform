/**
 * SwiftPayMe Notification Service - Notification Model
 * Comprehensive Mongoose model for notifications with validation and indexing
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  INotificationDocument,
  INotificationError,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  getNotificationCategory,
  getDefaultPriority,
  getDefaultChannels
} from '../types/notificationTypes';

// ==================== NOTIFICATION ERROR SCHEMA ====================

const NotificationErrorSchema = new Schema({
  code: {
    type: String,
    required: true,
    enum: [
      'invalid_recipient',
      'invalid_template',
      'invalid_channel',
      'provider_error',
      'rate_limit_exceeded',
      'quota_exceeded',
      'authentication_failed',
      'network_error',
      'timeout_error',
      'validation_error',
      'template_render_error',
      'recipient_blocked',
      'content_blocked',
      'insufficient_balance'
    ]
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app', 'webhook', 'slack', 'discord', 'telegram', 'whatsapp', 'voice']
  },
  provider: {
    type: String,
    enum: [
      'sendgrid', 'mailgun', 'ses', 'smtp',
      'twilio', 'nexmo', 'aws_sns',
      'firebase', 'apns', 'onesignal',
      'slack_api', 'discord_api', 'telegram_api', 'whatsapp_api'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  retryable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// ==================== NOTIFICATION SCHEMA ====================

const NotificationSchema = new Schema<INotificationDocument>({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  type: {
    type: String,
    required: true,
    enum: Object.values(NotificationType),
    index: true
  },
  
  category: {
    type: String,
    required: true,
    enum: Object.values(NotificationCategory),
    index: true
  },
  
  priority: {
    type: String,
    required: true,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.NORMAL,
    index: true
  },
  
  status: {
    type: String,
    required: true,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
    index: true
  },
  
  // ==================== RECIPIENT INFORMATION ====================
  
  recipientId: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return v && v.length > 0;
      },
      message: 'Recipient ID is required'
    }
  },
  
  recipientType: {
    type: String,
    required: true,
    enum: ['user', 'admin', 'system'],
    default: 'user',
    index: true
  },
  
  recipientEmail: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    },
    lowercase: true,
    trim: true
  },
  
  recipientPhone: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format'
    },
    trim: true
  },
  
  recipientDeviceTokens: [{
    type: String,
    trim: true
  }],
  
  // ==================== CONTENT ====================
  
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
    validate: {
      validator: function(v: string) {
        return v && v.length > 0;
      },
      message: 'Title is required'
    }
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 5000,
    trim: true,
    validate: {
      validator: function(v: string) {
        return v && v.length > 0;
      },
      message: 'Message is required'
    }
  },
  
  data: {
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
      message: 'Data must be valid JSON'
    }
  },
  
  metadata: {
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
      message: 'Metadata must be valid JSON'
    }
  },
  
  // ==================== DELIVERY SETTINGS ====================
  
  channels: [{
    type: String,
    enum: Object.values(NotificationChannel),
    required: true
  }],
  
  scheduledAt: {
    type: Date,
    index: true,
    validate: {
      validator: function(v: Date) {
        if (!v) return true; // Optional field
        return v >= new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  
  expiresAt: {
    type: Date,
    index: true,
    validate: {
      validator: function(v: Date) {
        if (!v) return true; // Optional field
        const scheduledAt = (this as any).scheduledAt || new Date();
        return v > scheduledAt;
      },
      message: 'Expiration time must be after scheduled time'
    }
  },
  
  // ==================== TRACKING ====================
  
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  
  lastAttemptAt: {
    type: Date,
    index: true
  },
  
  deliveredAt: {
    type: Date,
    index: true
  },
  
  readAt: {
    type: Date,
    index: true
  },
  
  // ==================== ERROR HANDLING ====================
  
  errors: [NotificationErrorSchema],
  
  // ==================== AUDIT ====================
  
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  collection: 'notifications',
  versionKey: false
});

// ==================== INDEXES ====================

// Compound indexes for efficient queries
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ status: 1, expiresAt: 1 });
NotificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

// Text search index
NotificationSchema.index({ 
  title: 'text', 
  message: 'text' 
}, {
  weights: {
    title: 10,
    message: 5
  },
  name: 'notification_text_search'
});

// TTL index for automatic cleanup of old notifications (90 days)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// ==================== VIRTUAL PROPERTIES ====================

NotificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

NotificationSchema.virtual('canRetry').get(function() {
  return this.attempts < this.maxAttempts && 
         this.status !== NotificationStatus.DELIVERED &&
         this.status !== NotificationStatus.CANCELLED &&
         !this.isExpired;
});

NotificationSchema.virtual('isRead').get(function() {
  return !!this.readAt;
});

NotificationSchema.virtual('isDelivered').get(function() {
  return !!this.deliveredAt;
});

NotificationSchema.virtual('hasErrors').get(function() {
  return this.errors && this.errors.length > 0;
});

NotificationSchema.virtual('lastError').get(function() {
  if (!this.errors || this.errors.length === 0) return null;
  return this.errors[this.errors.length - 1];
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Set category if not provided
  if (!this.category) {
    this.category = getNotificationCategory(this.type);
  }
  
  // Set default priority if not provided
  if (!this.priority || this.priority === NotificationPriority.NORMAL) {
    this.priority = getDefaultPriority(this.type);
  }
  
  // Set default channels if not provided
  if (!this.channels || this.channels.length === 0) {
    this.channels = getDefaultChannels(this.type);
  }
  
  // Set default expiration (7 days from now)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  // Validate recipient information based on channels
  if (this.channels.includes(NotificationChannel.EMAIL) && !this.recipientEmail) {
    return next(new Error('Email address is required for email notifications'));
  }
  
  if (this.channels.includes(NotificationChannel.SMS) && !this.recipientPhone) {
    return next(new Error('Phone number is required for SMS notifications'));
  }
  
  if (this.channels.includes(NotificationChannel.PUSH) && 
      (!this.recipientDeviceTokens || this.recipientDeviceTokens.length === 0)) {
    return next(new Error('Device tokens are required for push notifications'));
  }
  
  next();
});

// Post-save middleware
NotificationSchema.post('save', function(doc) {
  // Emit event for real-time updates
  if (typeof process !== 'undefined' && process.emit) {
    process.emit('notification:created', doc);
  }
});

// ==================== INSTANCE METHODS ====================

NotificationSchema.methods.markAsRead = async function(): Promise<void> {
  if (!this.readAt) {
    this.readAt = new Date();
    this.status = NotificationStatus.READ;
    await this.save();
  }
};

NotificationSchema.methods.markAsDelivered = async function(channel: NotificationChannel): Promise<void> {
  if (!this.deliveredAt) {
    this.deliveredAt = new Date();
    this.status = NotificationStatus.DELIVERED;
    
    // Add delivery metadata
    if (!this.metadata) this.metadata = {};
    if (!this.metadata.deliveryChannels) this.metadata.deliveryChannels = [];
    if (!this.metadata.deliveryChannels.includes(channel)) {
      this.metadata.deliveryChannels.push(channel);
    }
    
    await this.save();
  }
};

NotificationSchema.methods.addError = async function(error: INotificationError): Promise<void> {
  if (!this.errors) this.errors = [];
  this.errors.push(error);
  
  // Update status based on error
  if (error.retryable && this.canRetry) {
    this.status = NotificationStatus.RETRY;
  } else {
    this.status = NotificationStatus.FAILED;
  }
  
  this.lastAttemptAt = new Date();
  this.attempts += 1;
  
  await this.save();
};

NotificationSchema.methods.incrementAttempt = async function(): Promise<void> {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  
  if (this.attempts >= this.maxAttempts) {
    this.status = NotificationStatus.FAILED;
  }
  
  await this.save();
};

NotificationSchema.methods.cancel = async function(): Promise<void> {
  this.status = NotificationStatus.CANCELLED;
  await this.save();
};

NotificationSchema.methods.reschedule = async function(newScheduledAt: Date): Promise<void> {
  if (newScheduledAt <= new Date()) {
    throw new Error('New scheduled time must be in the future');
  }
  
  this.scheduledAt = newScheduledAt;
  this.status = NotificationStatus.PENDING;
  this.attempts = 0;
  this.errors = [];
  
  await this.save();
};

// ==================== STATIC METHODS ====================

NotificationSchema.statics.findByRecipient = function(recipientId: string, options: any = {}) {
  const query = this.find({ recipientId });
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.type) {
    query.where('type', options.type);
  }
  
  if (options.category) {
    query.where('category', options.category);
  }
  
  if (options.includeRead === false) {
    query.where('readAt', null);
  }
  
  if (options.includeExpired === false) {
    query.where('expiresAt').gt(new Date());
  }
  
  return query
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0);
};

NotificationSchema.statics.findPendingForDelivery = function() {
  return this.find({
    status: { $in: [NotificationStatus.PENDING, NotificationStatus.RETRY] },
    $or: [
      { scheduledAt: { $lte: new Date() } },
      { scheduledAt: null }
    ],
    expiresAt: { $gt: new Date() }
  }).sort({ priority: -1, createdAt: 1 });
};

NotificationSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    status: { $nin: [NotificationStatus.DELIVERED, NotificationStatus.CANCELLED] }
  });
};

NotificationSchema.statics.getAnalytics = function(startDate: Date, endDate: Date, filters: any = {}) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        ...filters
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status',
          channel: '$channels'
        },
        count: { $sum: 1 },
        avgDeliveryTime: {
          $avg: {
            $subtract: ['$deliveredAt', '$createdAt']
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// ==================== MODEL CREATION ====================

const NotificationModel: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);

export default NotificationModel;
export { NotificationSchema };

