import { Logger } from './Logger';
import { EmailService } from './EmailService';
import { SmsService } from './SmsService';

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Notification template interface
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  type: NotificationType;
  variables: string[];
  metadata?: Record<string, any>;
}

/**
 * Notification request interface
 */
export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  templateId?: string;
  subject?: string;
  content: string;
  priority: NotificationPriority;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

/**
 * Notification result interface
 */
export interface NotificationResult {
  id: string;
  success: boolean;
  error?: string;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    marketing: boolean;
    security: boolean;
    transactions: boolean;
    updates: boolean;
  };
  sms: {
    enabled: boolean;
    security: boolean;
    transactions: boolean;
    alerts: boolean;
  };
  push: {
    enabled: boolean;
    security: boolean;
    transactions: boolean;
    marketing: boolean;
    updates: boolean;
  };
  inApp: {
    enabled: boolean;
    all: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  timezone: string;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

/**
 * Comprehensive notification service
 */
export class NotificationService {
  private static instance: NotificationService;
  private logger: Logger;
  private emailService: EmailService;
  private smsService: SmsService;
  private templates: Map<string, NotificationTemplate>;
  private userPreferences: Map<string, NotificationPreferences>;
  private pendingNotifications: NotificationRequest[];

  private constructor() {
    this.logger = new Logger('NotificationService');
    this.emailService = EmailService.getInstance();
    this.smsService = SmsService.getInstance();
    this.templates = new Map();
    this.userPreferences = new Map();
    this.pendingNotifications = [];

    this.initializeDefaultTemplates();
    this.startNotificationProcessor();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send a notification
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(request.userId);
      if (!this.shouldSendNotification(request, preferences)) {
        return {
          id: this.generateNotificationId(),
          success: false,
          error: 'Notification blocked by user preferences'
        };
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for later if not urgent
        if (request.priority !== NotificationPriority.URGENT) {
          return this.scheduleNotification(request, preferences);
        }
      }

      // Process template if provided
      let content = request.content;
      let subject = request.subject;

      if (request.templateId) {
        const template = this.templates.get(request.templateId);
        if (template) {
          content = this.processTemplate(template.content, request.variables || {});
          subject = template.subject ? this.processTemplate(template.subject, request.variables || {}) : subject;
        }
      }

      // Send notification based on type
      switch (request.type) {
        case NotificationType.EMAIL:
          return await this.sendEmailNotification({
            ...request,
            content,
            subject: subject || 'Notification from SwiftPayMe'
          });

        case NotificationType.SMS:
          return await this.sendSmsNotification({
            ...request,
            content
          });

        case NotificationType.PUSH:
          return await this.sendPushNotification({
            ...request,
            content,
            subject
          });

        case NotificationType.IN_APP:
          return await this.sendInAppNotification({
            ...request,
            content,
            subject
          });

        default:
          throw new Error(`Unsupported notification type: ${request.type}`);
      }

    } catch (error) {
      this.logger.error('Failed to send notification', {
        error: error.message,
        request
      });

      return {
        id: this.generateNotificationId(),
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send multiple notifications
   */
  async sendBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Process in batches to avoid overwhelming external services
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.sendNotification(request));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            id: this.generateNotificationId(),
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Send welcome notification to new user
   */
  async sendWelcomeNotification(userId: string, userEmail: string, userName: string): Promise<NotificationResult> {
    return this.sendNotification({
      userId,
      type: NotificationType.EMAIL,
      templateId: 'welcome',
      subject: 'Welcome to SwiftPayMe!',
      content: '', // Will be filled by template
      priority: NotificationPriority.NORMAL,
      variables: {
        userName,
        userEmail,
        loginUrl: `${process.env.WEB_UI_URL}/login`,
        supportUrl: `${process.env.WEB_UI_URL}/support`
      }
    });
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(userId: string, alertType: string, details: Record<string, any>): Promise<NotificationResult[]> {
    const requests: NotificationRequest[] = [
      {
        userId,
        type: NotificationType.EMAIL,
        templateId: 'security_alert',
        subject: 'Security Alert - SwiftPayMe',
        content: '',
        priority: NotificationPriority.HIGH,
        variables: {
          alertType,
          ...details,
          timestamp: new Date().toISOString(),
          supportUrl: `${process.env.WEB_UI_URL}/support`
        }
      }
    ];

    // Also send SMS for critical security events
    if (['login_from_new_device', 'password_changed', 'account_locked'].includes(alertType)) {
      requests.push({
        userId,
        type: NotificationType.SMS,
        templateId: 'security_alert_sms',
        content: '',
        priority: NotificationPriority.HIGH,
        variables: {
          alertType,
          ...details
        }
      });
    }

    return this.sendBulkNotifications(requests);
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    userId: string, 
    transactionType: string, 
    amount: number, 
    currency: string,
    details: Record<string, any>
  ): Promise<NotificationResult[]> {
    const requests: NotificationRequest[] = [
      {
        userId,
        type: NotificationType.EMAIL,
        templateId: 'transaction',
        subject: `Transaction ${transactionType} - SwiftPayMe`,
        content: '',
        priority: NotificationPriority.NORMAL,
        variables: {
          transactionType,
          amount: amount.toFixed(2),
          currency,
          ...details,
          timestamp: new Date().toISOString(),
          accountUrl: `${process.env.WEB_UI_URL}/account`
        }
      },
      {
        userId,
        type: NotificationType.IN_APP,
        templateId: 'transaction_in_app',
        content: '',
        priority: NotificationPriority.NORMAL,
        variables: {
          transactionType,
          amount: amount.toFixed(2),
          currency,
          ...details
        }
      }
    ];

    return this.sendBulkNotifications(requests);
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In a real implementation, this would fetch from database
    // For now, return default preferences
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const currentPreferences = await this.getUserPreferences(userId);
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    this.userPreferences.set(userId, updatedPreferences);
    
    // In a real implementation, save to database
    this.logger.info('Updated user notification preferences', {
      userId,
      preferences: updatedPreferences
    });
  }

  /**
   * Register notification template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info('Registered notification template', {
      templateId: template.id,
      name: template.name,
      type: template.type
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(request: NotificationRequest): Promise<NotificationResult> {
    const result = await this.emailService.sendEmail({
      to: '', // Would get user email from database
      subject: request.subject || 'Notification',
      content: request.content,
      isHtml: true,
      metadata: request.metadata
    });

    return {
      id: this.generateNotificationId(),
      success: result.success,
      error: result.error,
      deliveredAt: result.success ? new Date() : undefined,
      metadata: result.metadata
    };
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(request: NotificationRequest): Promise<NotificationResult> {
    const result = await this.smsService.sendSms({
      to: '', // Would get user phone from database
      message: request.content,
      metadata: request.metadata
    });

    return {
      id: this.generateNotificationId(),
      success: result.success,
      error: result.error,
      deliveredAt: result.success ? new Date() : undefined,
      metadata: result.metadata
    };
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(request: NotificationRequest): Promise<NotificationResult> {
    // Placeholder for push notification implementation
    // Would integrate with FCM, APNs, or similar service
    
    this.logger.info('Push notification sent', {
      userId: request.userId,
      subject: request.subject,
      content: request.content
    });

    return {
      id: this.generateNotificationId(),
      success: true,
      deliveredAt: new Date()
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(request: NotificationRequest): Promise<NotificationResult> {
    // Placeholder for in-app notification implementation
    // Would typically store in database and send via WebSocket
    
    this.logger.info('In-app notification sent', {
      userId: request.userId,
      subject: request.subject,
      content: request.content
    });

    return {
      id: this.generateNotificationId(),
      success: true,
      deliveredAt: new Date()
    };
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(request: NotificationRequest, preferences: NotificationPreferences): boolean {
    switch (request.type) {
      case NotificationType.EMAIL:
        return preferences.email.enabled;
      case NotificationType.SMS:
        return preferences.sms.enabled;
      case NotificationType.PUSH:
        return preferences.push.enabled;
      case NotificationType.IN_APP:
        return preferences.inApp.enabled;
      default:
        return false;
    }
  }

  /**
   * Check if current time is in user's quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= preferences.quietHours.start && currentTime <= preferences.quietHours.end;
  }

  /**
   * Schedule notification for later delivery
   */
  private async scheduleNotification(request: NotificationRequest, preferences: NotificationPreferences): Promise<NotificationResult> {
    // Calculate next delivery time (after quiet hours)
    const scheduledAt = this.calculateNextDeliveryTime(preferences);
    
    this.pendingNotifications.push({
      ...request,
      scheduledAt
    });

    this.logger.info('Notification scheduled for later delivery', {
      userId: request.userId,
      scheduledAt,
      type: request.type
    });

    return {
      id: this.generateNotificationId(),
      success: true,
      metadata: {
        scheduled: true,
        scheduledAt
      }
    };
  }

  /**
   * Calculate next delivery time after quiet hours
   */
  private calculateNextDeliveryTime(preferences: NotificationPreferences): Date {
    if (!preferences.quietHours) {
      return new Date();
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    const deliveryTime = new Date(now);
    deliveryTime.setHours(endHour, endMinute, 0, 0);

    // If end time is today and in the future, deliver then
    if (deliveryTime > now) {
      return deliveryTime;
    }

    // Otherwise, deliver tomorrow at the end of quiet hours
    const tomorrowDelivery = new Date(tomorrow);
    tomorrowDelivery.setHours(endHour, endMinute, 0, 0);
    return tomorrowDelivery;
  }

  /**
   * Process notification template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return processed;
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      email: {
        enabled: true,
        marketing: false,
        security: true,
        transactions: true,
        updates: true
      },
      sms: {
        enabled: true,
        security: true,
        transactions: false,
        alerts: true
      },
      push: {
        enabled: true,
        security: true,
        transactions: true,
        marketing: false,
        updates: true
      },
      inApp: {
        enabled: true,
        all: true
      },
      frequency: 'immediate',
      timezone: 'UTC'
    };
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        type: NotificationType.EMAIL,
        subject: 'Welcome to SwiftPayMe!',
        content: `
          <h1>Welcome to SwiftPayMe, {{userName}}!</h1>
          <p>Thank you for joining our platform. You can now:</p>
          <ul>
            <li>Deposit physical assets and receive fiat credit</li>
            <li>Trade cryptocurrencies with ease</li>
            <li>Manage your portfolio in real-time</li>
          </ul>
          <p><a href="{{loginUrl}}">Login to your account</a></p>
          <p>Need help? <a href="{{supportUrl}}">Contact our support team</a></p>
        `,
        variables: ['userName', 'loginUrl', 'supportUrl']
      },
      {
        id: 'security_alert',
        name: 'Security Alert Email',
        type: NotificationType.EMAIL,
        subject: 'Security Alert - {{alertType}}',
        content: `
          <h1>Security Alert</h1>
          <p>We detected a security event on your account:</p>
          <p><strong>Alert Type:</strong> {{alertType}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
          <p>If this was not you, please <a href="{{supportUrl}}">contact support immediately</a>.</p>
        `,
        variables: ['alertType', 'timestamp', 'supportUrl']
      },
      {
        id: 'transaction',
        name: 'Transaction Notification',
        type: NotificationType.EMAIL,
        subject: 'Transaction {{transactionType}} - {{amount}} {{currency}}',
        content: `
          <h1>Transaction {{transactionType}}</h1>
          <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
          <p><a href="{{accountUrl}}">View your account</a></p>
        `,
        variables: ['transactionType', 'amount', 'currency', 'timestamp', 'accountUrl']
      }
    ];

    templates.forEach(template => this.registerTemplate(template));
  }

  /**
   * Start notification processor for scheduled notifications
   */
  private startNotificationProcessor(): void {
    setInterval(async () => {
      const now = new Date();
      const readyNotifications = this.pendingNotifications.filter(
        n => n.scheduledAt && n.scheduledAt <= now
      );

      if (readyNotifications.length > 0) {
        this.logger.info('Processing scheduled notifications', {
          count: readyNotifications.length
        });

        for (const notification of readyNotifications) {
          try {
            await this.sendNotification(notification);
          } catch (error) {
            this.logger.error('Failed to send scheduled notification', {
              error: error.message,
              notification
            });
          }
        }

        // Remove processed notifications
        this.pendingNotifications = this.pendingNotifications.filter(
          n => !readyNotifications.includes(n)
        );
      }
    }, 60000); // Check every minute
  }
}

export default NotificationService;
