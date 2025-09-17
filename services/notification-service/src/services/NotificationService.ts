import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { RedisClient } from '../utils/RedisClient';
import { ServiceClient } from '../utils/ServiceClient';
import { 
  Notification, 
  NotificationTemplate, 
  NotificationChannel, 
  NotificationPreferences,
  DeliveryStatus,
  NotificationRule,
  NotificationMetrics
} from '../types/notification';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import _ from 'lodash';

export class NotificationService extends EventEmitter {
  private logger: Logger;
  private redisClient: RedisClient;
  private serviceClient: ServiceClient;
  private isInitialized: boolean = false;
  private notificationRules: Map<string, NotificationRule> = new Map();
  private deliveryMetrics: NotificationMetrics = {
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    channels: {},
    templates: {},
    deliveryRate: 0,
    averageDeliveryTime: 0
  };

  constructor() {
    super();
    this.logger = new Logger('NotificationService');
    this.redisClient = RedisClient.getInstance();
    this.serviceClient = new ServiceClient();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Notification Service');
      
      // Load notification rules
      await this.loadNotificationRules();
      
      // Initialize delivery metrics
      await this.initializeMetrics();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.logger.info('Notification Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Notification Service', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Notification Service');
    this.removeAllListeners();
    this.isInitialized = false;
    this.logger.info('Notification Service stopped');
  }

  public isInitialized(): boolean {
    return this.isInitialized;
  }

  // Core notification sending
  public async sendNotification(notification: Partial<Notification>): Promise<Notification> {
    try {
      // Create notification record
      const notificationRecord: Notification = {
        id: notification.id || uuidv4(),
        userId: notification.userId,
        type: notification.type || 'info',
        category: notification.category || 'general',
        title: notification.title || '',
        message: notification.message || '',
        data: notification.data || {},
        channels: notification.channels || ['push'],
        templateId: notification.templateId,
        priority: notification.priority || 'medium',
        scheduledAt: notification.scheduledAt,
        expiresAt: notification.expiresAt,
        status: 'pending',
        deliveryStatus: {},
        retryCount: 0,
        maxRetries: notification.maxRetries || 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save notification to database
      await this.saveNotification(notificationRecord);

      // Apply notification rules
      const processedNotification = await this.applyNotificationRules(notificationRecord);

      // Check user preferences
      const userPreferences = await this.getUserPreferences(processedNotification.userId);
      const filteredChannels = this.filterChannelsByPreferences(
        processedNotification.channels, 
        userPreferences,
        processedNotification.category
      );

      if (filteredChannels.length === 0) {
        this.logger.info('Notification filtered out by user preferences', { 
          notificationId: processedNotification.id,
          userId: processedNotification.userId 
        });
        
        await this.updateNotificationStatus(processedNotification.id, 'filtered');
        return processedNotification;
      }

      processedNotification.channels = filteredChannels;

      // Schedule or send immediately
      if (processedNotification.scheduledAt && processedNotification.scheduledAt > new Date()) {
        await this.scheduleNotification(processedNotification);
      } else {
        await this.processNotification(processedNotification);
      }

      // Update metrics
      this.deliveryMetrics.sent++;
      this.deliveryMetrics.pending++;

      // Emit event
      this.emit('notification-created', processedNotification);

      this.logger.info('Notification created and queued', { 
        notificationId: processedNotification.id,
        userId: processedNotification.userId,
        channels: processedNotification.channels
      });

      return processedNotification;
    } catch (error) {
      this.logger.error('Failed to send notification', { error, notification });
      throw error;
    }
  }

  // Bulk notification sending
  public async sendBulkNotifications(notifications: Partial<Notification>[]): Promise<Notification[]> {
    try {
      const results: Notification[] = [];
      
      // Process notifications in batches
      const batchSize = parseInt(process.env.BULK_NOTIFICATION_BATCH_SIZE || '100');
      const batches = _.chunk(notifications, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(notification => this.sendNotification(notification));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            this.logger.error('Failed to send bulk notification', { 
              error: result.reason,
              notification: batch[index]
            });
          }
        });

        // Add delay between batches to prevent overwhelming
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.info('Bulk notifications processed', { 
        total: notifications.length,
        successful: results.length,
        failed: notifications.length - results.length
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to send bulk notifications', { error });
      throw error;
    }
  }

  // Template-based notification sending
  public async sendTemplateNotification(
    templateId: string,
    userId: string,
    variables: any,
    options?: {
      channels?: string[];
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduledAt?: Date;
      expiresAt?: Date;
    }
  ): Promise<Notification> {
    try {
      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Render template
      const renderedContent = await this.renderTemplate(template, variables);

      // Create notification
      const notification: Partial<Notification> = {
        userId,
        type: template.type,
        category: template.category,
        title: renderedContent.title,
        message: renderedContent.message,
        data: { ...variables, templateId },
        channels: options?.channels || template.defaultChannels,
        templateId,
        priority: options?.priority || template.priority,
        scheduledAt: options?.scheduledAt,
        expiresAt: options?.expiresAt
      };

      return await this.sendNotification(notification);
    } catch (error) {
      this.logger.error('Failed to send template notification', { 
        error, 
        templateId, 
        userId 
      });
      throw error;
    }
  }

  // Notification processing
  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Update status to processing
      await this.updateNotificationStatus(notification.id, 'processing');

      // Process each channel
      const channelPromises = notification.channels.map(async (channel) => {
        try {
          await this.processNotificationChannel(notification, channel);
          
          // Update delivery status for this channel
          await this.updateChannelDeliveryStatus(notification.id, channel, 'queued');
          
        } catch (error) {
          this.logger.error('Failed to process notification channel', { 
            error,
            notificationId: notification.id,
            channel
          });
          
          // Update delivery status for this channel
          await this.updateChannelDeliveryStatus(notification.id, channel, 'failed', { 
            error: error.message 
          });
        }
      });

      await Promise.allSettled(channelPromises);

      // Update overall status
      await this.updateNotificationStatus(notification.id, 'sent');

      // Emit event
      this.emit('notification-sent', notification);

    } catch (error) {
      this.logger.error('Failed to process notification', { 
        error, 
        notificationId: notification.id 
      });
      
      await this.updateNotificationStatus(notification.id, 'failed');
      throw error;
    }
  }

  private async processNotificationChannel(notification: Notification, channel: string): Promise<void> {
    // This would queue the notification for the specific channel
    // The actual sending is handled by the respective channel services
    
    const queueData = {
      notificationId: notification.id,
      userId: notification.userId,
      channel,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      templateId: notification.templateId
    };

    // Add to appropriate queue based on channel
    switch (channel) {
      case 'email':
        await this.queueEmailNotification(queueData);
        break;
      case 'sms':
        await this.queueSMSNotification(queueData);
        break;
      case 'push':
        await this.queuePushNotification(queueData);
        break;
      case 'webhook':
        await this.queueWebhookNotification(queueData);
        break;
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  // Queue methods (these would integrate with the QueueService)
  private async queueEmailNotification(data: any): Promise<void> {
    // This would be implemented to add to email queue
    this.logger.debug('Queuing email notification', { notificationId: data.notificationId });
  }

  private async queueSMSNotification(data: any): Promise<void> {
    // This would be implemented to add to SMS queue
    this.logger.debug('Queuing SMS notification', { notificationId: data.notificationId });
  }

  private async queuePushNotification(data: any): Promise<void> {
    // This would be implemented to add to push queue
    this.logger.debug('Queuing push notification', { notificationId: data.notificationId });
  }

  private async queueWebhookNotification(data: any): Promise<void> {
    // This would be implemented to add to webhook queue
    this.logger.debug('Queuing webhook notification', { notificationId: data.notificationId });
  }

  // Delivery status management
  public async updateDeliveryStatus(
    notificationId: string, 
    status: DeliveryStatus, 
    details?: any
  ): Promise<void> {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, status);

      // Update metrics
      this.updateDeliveryMetrics(status);

      // Emit delivery status event
      this.emit('delivery-status-updated', {
        notificationId,
        userId: notification.userId,
        status,
        details,
        timestamp: new Date()
      });

      this.logger.info('Delivery status updated', { 
        notificationId, 
        status, 
        details 
      });

    } catch (error) {
      this.logger.error('Failed to update delivery status', { 
        error, 
        notificationId, 
        status 
      });
    }
  }

  public async updateChannelDeliveryStatus(
    notificationId: string,
    channel: string,
    status: DeliveryStatus,
    details?: any
  ): Promise<void> {
    try {
      // Update channel-specific delivery status
      await this.updateNotificationChannelStatus(notificationId, channel, status, details);

      // Update channel metrics
      this.updateChannelMetrics(channel, status);

      this.logger.debug('Channel delivery status updated', { 
        notificationId, 
        channel, 
        status 
      });

    } catch (error) {
      this.logger.error('Failed to update channel delivery status', { 
        error, 
        notificationId, 
        channel, 
        status 
      });
    }
  }

  // User preferences management
  public async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Try to get from cache first
      const cacheKey = `user_preferences:${userId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database or user service
      const preferences = await this.fetchUserPreferences(userId);
      
      // Cache for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(preferences));
      
      return preferences;
    } catch (error) {
      this.logger.error('Failed to get user preferences', { error, userId });
      
      // Return default preferences
      return this.getDefaultPreferences();
    }
  }

  public async updateUserPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Get current preferences
      const currentPreferences = await this.getUserPreferences(userId);
      
      // Merge with new preferences
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      // Save to database
      await this.saveUserPreferences(userId, updatedPreferences);
      
      // Update cache
      const cacheKey = `user_preferences:${userId}`;
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(updatedPreferences));
      
      this.logger.info('User preferences updated', { userId, preferences });
      
      return updatedPreferences;
    } catch (error) {
      this.logger.error('Failed to update user preferences', { error, userId, preferences });
      throw error;
    }
  }

  // Notification acknowledgment
  public async acknowledgeNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await this.getNotification(notificationId);
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (notification.userId !== userId) {
        throw new Error('Unauthorized to acknowledge this notification');
      }

      // Mark as acknowledged
      await this.updateNotificationStatus(notificationId, 'acknowledged');
      
      // Update metrics
      this.updateDeliveryMetrics('acknowledged');

      this.logger.info('Notification acknowledged', { notificationId, userId });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to acknowledge notification', { 
        error, 
        notificationId, 
        userId 
      });
      return false;
    }
  }

  // Token verification for WebSocket authentication
  public async verifyToken(token: string): Promise<any> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user/admin info from appropriate service
      if (decoded.adminId) {
        // Admin token
        const admin = await this.serviceClient.get(
          `${process.env.ADMIN_SERVICE_URL}/api/admin/verify`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        return {
          id: decoded.adminId,
          type: 'admin',
          email: decoded.email,
          role: decoded.role
        };
      } else if (decoded.userId) {
        // User token
        const user = await this.serviceClient.get(
          `${process.env.USER_SERVICE_URL}/api/users/verify`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        return {
          id: decoded.userId,
          type: 'user',
          email: decoded.email
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Token verification failed', { error });
      return null;
    }
  }

  // Notification rules management
  private async applyNotificationRules(notification: Notification): Promise<Notification> {
    try {
      let processedNotification = { ...notification };

      // Apply each rule
      for (const [ruleId, rule] of this.notificationRules) {
        if (rule.isActive && this.matchesRuleConditions(processedNotification, rule)) {
          processedNotification = await this.applyRule(processedNotification, rule);
        }
      }

      return processedNotification;
    } catch (error) {
      this.logger.error('Failed to apply notification rules', { error, notificationId: notification.id });
      return notification;
    }
  }

  private matchesRuleConditions(notification: Notification, rule: NotificationRule): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = _.get(notification, condition.field);
      
      switch (condition.operator) {
        case 'eq':
          return fieldValue === condition.value;
        case 'ne':
          return fieldValue !== condition.value;
        case 'gt':
          return fieldValue > condition.value;
        case 'lt':
          return fieldValue < condition.value;
        case 'gte':
          return fieldValue >= condition.value;
        case 'lte':
          return fieldValue <= condition.value;
        case 'contains':
          return String(fieldValue).includes(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  private async applyRule(notification: Notification, rule: NotificationRule): Promise<Notification> {
    // Apply rule transformations
    const processedNotification = { ...notification };

    // This would implement rule-specific logic
    // For example: changing priority, adding channels, modifying content, etc.

    this.logger.debug('Applied notification rule', { 
      notificationId: notification.id,
      ruleId: rule.id,
      ruleName: rule.name
    });

    return processedNotification;
  }

  // Retry failed notifications
  public async retryFailedNotifications(): Promise<void> {
    try {
      const failedNotifications = await this.getFailedNotifications();
      
      for (const notification of failedNotifications) {
        if (notification.retryCount < notification.maxRetries) {
          // Increment retry count
          notification.retryCount++;
          await this.updateNotification(notification);
          
          // Retry processing
          await this.processNotification(notification);
          
          this.logger.info('Retrying failed notification', { 
            notificationId: notification.id,
            retryCount: notification.retryCount
          });
        } else {
          // Mark as permanently failed
          await this.updateNotificationStatus(notification.id, 'permanently_failed');
          
          this.logger.warn('Notification permanently failed after max retries', { 
            notificationId: notification.id,
            maxRetries: notification.maxRetries
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to retry failed notifications', { error });
    }
  }

  // Cleanup old notifications
  public async cleanupOldNotifications(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '30');
      const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

      const deletedCount = await this.deleteOldNotifications(cutoffDate);

      this.logger.info('Old notifications cleaned up', { deletedCount, cutoffDate });
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications', { error });
    }
  }

  // Scheduled notification management
  private async scheduleNotification(notification: Notification): Promise<void> {
    try {
      // Calculate delay
      const delay = notification.scheduledAt!.getTime() - Date.now();
      
      if (delay <= 0) {
        // Send immediately if scheduled time has passed
        await this.processNotification(notification);
      } else {
        // Schedule for later processing
        await this.addToScheduledQueue(notification, delay);
        
        this.logger.info('Notification scheduled', { 
          notificationId: notification.id,
          scheduledAt: notification.scheduledAt,
          delay
        });
      }
    } catch (error) {
      this.logger.error('Failed to schedule notification', { 
        error, 
        notificationId: notification.id 
      });
    }
  }

  // Helper methods
  private filterChannelsByPreferences(
    channels: string[], 
    preferences: NotificationPreferences,
    category: string
  ): string[] {
    return channels.filter(channel => {
      // Check global channel preference
      if (!preferences.channels[channel]) {
        return false;
      }

      // Check category-specific preference
      if (preferences.categories && preferences.categories[category] === false) {
        return false;
      }

      return true;
    });
  }

  private updateDeliveryMetrics(status: DeliveryStatus): void {
    switch (status) {
      case 'delivered':
        this.deliveryMetrics.delivered++;
        this.deliveryMetrics.pending = Math.max(0, this.deliveryMetrics.pending - 1);
        break;
      case 'failed':
      case 'permanently_failed':
        this.deliveryMetrics.failed++;
        this.deliveryMetrics.pending = Math.max(0, this.deliveryMetrics.pending - 1);
        break;
      case 'acknowledged':
        // Don't change pending count for acknowledgments
        break;
    }

    // Update delivery rate
    const total = this.deliveryMetrics.sent;
    if (total > 0) {
      this.deliveryMetrics.deliveryRate = (this.deliveryMetrics.delivered / total) * 100;
    }
  }

  private updateChannelMetrics(channel: string, status: DeliveryStatus): void {
    if (!this.deliveryMetrics.channels[channel]) {
      this.deliveryMetrics.channels[channel] = {
        sent: 0,
        delivered: 0,
        failed: 0,
        deliveryRate: 0
      };
    }

    const channelMetrics = this.deliveryMetrics.channels[channel];

    switch (status) {
      case 'queued':
        channelMetrics.sent++;
        break;
      case 'delivered':
        channelMetrics.delivered++;
        break;
      case 'failed':
      case 'permanently_failed':
        channelMetrics.failed++;
        break;
    }

    // Update channel delivery rate
    if (channelMetrics.sent > 0) {
      channelMetrics.deliveryRate = (channelMetrics.delivered / channelMetrics.sent) * 100;
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      channels: {
        email: true,
        sms: false,
        push: true,
        webhook: false
      },
      categories: {
        security: true,
        transaction: true,
        marketing: false,
        system: true,
        asset: true,
        kyc: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      },
      frequency: {
        immediate: true,
        digest: false,
        digestFrequency: 'daily'
      }
    };
  }

  private setupEventListeners(): void {
    // Set up internal event listeners
    this.on('notification-sent', (notification) => {
      this.logger.debug('Notification sent event', { notificationId: notification.id });
    });

    this.on('delivery-status-updated', (update) => {
      this.logger.debug('Delivery status updated event', { 
        notificationId: update.notificationId,
        status: update.status
      });
    });
  }

  private async initializeMetrics(): Promise<void> {
    // Initialize metrics from database or cache
    try {
      const cachedMetrics = await this.redisClient.get('notification_metrics');
      if (cachedMetrics) {
        this.deliveryMetrics = JSON.parse(cachedMetrics);
      }
    } catch (error) {
      this.logger.warn('Failed to load cached metrics', { error });
    }
  }

  private async loadNotificationRules(): Promise<void> {
    try {
      // Load notification rules from database
      const rules = await this.getNotificationRules();
      
      rules.forEach(rule => {
        this.notificationRules.set(rule.id, rule);
      });

      this.logger.info('Notification rules loaded', { count: rules.length });
    } catch (error) {
      this.logger.error('Failed to load notification rules', { error });
    }
  }

  // Database operation placeholders (would be implemented with actual database)
  private async saveNotification(notification: Notification): Promise<void> {
    // Implementation would save to database
  }

  private async getNotification(id: string): Promise<Notification | null> {
    // Implementation would query the database
    return null;
  }

  private async updateNotification(notification: Notification): Promise<void> {
    // Implementation would update in database
  }

  private async updateNotificationStatus(id: string, status: DeliveryStatus): Promise<void> {
    // Implementation would update status in database
  }

  private async updateNotificationChannelStatus(
    id: string, 
    channel: string, 
    status: DeliveryStatus, 
    details?: any
  ): Promise<void> {
    // Implementation would update channel status in database
  }

  private async getFailedNotifications(): Promise<Notification[]> {
    // Implementation would query failed notifications
    return [];
  }

  private async deleteOldNotifications(cutoffDate: Date): Promise<number> {
    // Implementation would delete old notifications
    return 0;
  }

  private async fetchUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Implementation would fetch from user service or database
    return this.getDefaultPreferences();
  }

  private async saveUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    // Implementation would save to database
  }

  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // Implementation would get template from database
    return null;
  }

  private async renderTemplate(template: NotificationTemplate, variables: any): Promise<any> {
    // Implementation would render template with variables
    return {
      title: template.title,
      message: template.content
    };
  }

  private async getNotificationRules(): Promise<NotificationRule[]> {
    // Implementation would get rules from database
    return [];
  }

  private async addToScheduledQueue(notification: Notification, delay: number): Promise<void> {
    // Implementation would add to scheduled queue
  }
}

