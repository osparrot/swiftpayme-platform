import { Logger } from './Logger';

/**
 * SMS configuration interface
 */
export interface SmsConfig {
  provider: 'twilio' | 'aws_sns' | 'nexmo' | 'mock';
  apiKey: string;
  apiSecret: string;
  from: string;
  region?: string; // For AWS SNS
}

/**
 * SMS request interface
 */
export interface SmsRequest {
  to: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * SMS result interface
 */
export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * SMS template interface
 */
export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  metadata?: Record<string, any>;
}

/**
 * Comprehensive SMS service
 */
export class SmsService {
  private static instance: SmsService;
  private logger: Logger;
  private config: SmsConfig;
  private templates: Map<string, SmsTemplate>;
  private smsQueue: SmsRequest[];
  private isProcessing: boolean;
  private rateLimitMap: Map<string, number[]>; // Phone number -> timestamps

  private constructor() {
    this.logger = new Logger('SmsService');
    this.templates = new Map();
    this.smsQueue = [];
    this.isProcessing = false;
    this.rateLimitMap = new Map();

    this.config = {
      provider: (process.env.SMS_PROVIDER as any) || 'mock',
      apiKey: process.env.SMS_API_KEY || '',
      apiSecret: process.env.SMS_API_SECRET || '',
      from: process.env.SMS_FROM || 'SwiftPayMe',
      region: process.env.SMS_REGION || 'us-east-1'
    };

    this.initializeDefaultTemplates();
    this.startSmsProcessor();
    this.startRateLimitCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Send an SMS
   */
  async sendSms(request: SmsRequest): Promise<SmsResult> {
    try {
      // Validate phone number
      this.validatePhoneNumber(request.to);

      // Check rate limits
      if (!this.checkRateLimit(request.to)) {
        return {
          success: false,
          error: 'Rate limit exceeded for this phone number'
        };
      }

      // Validate message length
      if (request.message.length > 1600) {
        return {
          success: false,
          error: 'Message too long (max 1600 characters)'
        };
      }

      // Send SMS based on provider
      const result = await this.sendSmsViaProvider(request);

      // Update rate limit tracking
      this.updateRateLimit(request.to);

      this.logger.info('SMS sent', {
        to: this.maskPhoneNumber(request.to),
        success: result.success,
        messageId: result.messageId,
        provider: this.config.provider,
        metadata: request.metadata
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to send SMS', {
        error: error.message,
        to: this.maskPhoneNumber(request.to),
        metadata: request.metadata
      });

      return {
        success: false,
        error: error.message,
        metadata: request.metadata
      };
    }
  }

  /**
   * Send SMS using template
   */
  async sendTemplateSms(params: {
    templateId: string;
    to: string;
    variables: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<SmsResult> {
    const template = this.templates.get(params.templateId);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${params.templateId}`
      };
    }

    // Process template variables
    const message = this.processTemplate(template.content, params.variables);

    return this.sendSms({
      to: params.to,
      message,
      metadata: {
        ...params.metadata,
        templateId: params.templateId,
        variables: params.variables
      }
    });
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSms(requests: SmsRequest[]): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    // Process in batches to respect rate limits
    const batchSize = 3;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.sendSms(request));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
        }
      }

      // Delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Queue SMS for later sending
   */
  queueSms(request: SmsRequest): void {
    this.smsQueue.push(request);
    this.logger.info('SMS queued', {
      to: this.maskPhoneNumber(request.to),
      queueLength: this.smsQueue.length
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(params: {
    to: string;
    code: string;
    expiresIn: number; // minutes
  }): Promise<SmsResult> {
    return this.sendTemplateSms({
      templateId: 'verification_code',
      to: params.to,
      variables: {
        code: params.code,
        expiresIn: params.expiresIn,
        appName: 'SwiftPayMe'
      },
      metadata: {
        type: 'verification_code',
        code: params.code
      }
    });
  }

  /**
   * Send two-factor authentication code
   */
  async send2FACode(params: {
    to: string;
    code: string;
  }): Promise<SmsResult> {
    return this.sendTemplateSms({
      templateId: '2fa_code',
      to: params.to,
      variables: {
        code: params.code,
        appName: 'SwiftPayMe'
      },
      metadata: {
        type: '2fa_code',
        code: params.code
      }
    });
  }

  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(params: {
    to: string;
    alertType: string;
    details: Record<string, any>;
  }): Promise<SmsResult> {
    return this.sendTemplateSms({
      templateId: 'security_alert',
      to: params.to,
      variables: {
        alertType: params.alertType,
        timestamp: new Date().toLocaleString(),
        appName: 'SwiftPayMe'
      },
      metadata: {
        type: 'security_alert',
        alertType: params.alertType,
        details: params.details
      }
    });
  }

  /**
   * Send transaction alert SMS
   */
  async sendTransactionAlert(params: {
    to: string;
    transactionType: string;
    amount: number;
    currency: string;
  }): Promise<SmsResult> {
    return this.sendTemplateSms({
      templateId: 'transaction_alert',
      to: params.to,
      variables: {
        transactionType: params.transactionType,
        amount: params.amount.toFixed(2),
        currency: params.currency,
        appName: 'SwiftPayMe'
      },
      metadata: {
        type: 'transaction_alert',
        transactionType: params.transactionType,
        amount: params.amount,
        currency: params.currency
      }
    });
  }

  /**
   * Register SMS template
   */
  registerTemplate(template: SmsTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info('Registered SMS template', {
      templateId: template.id,
      name: template.name
    });
  }

  /**
   * Test SMS service configuration
   */
  async testService(): Promise<boolean> {
    try {
      // Send a test SMS to a dummy number (won't actually send)
      const result = await this.sendSms({
        to: '+1234567890',
        message: 'Test message from SwiftPayMe SMS service',
        metadata: { test: true }
      });

      return result.success;
    } catch (error) {
      this.logger.error('SMS service test failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Send SMS via configured provider
   */
  private async sendSmsViaProvider(request: SmsRequest): Promise<SmsResult> {
    switch (this.config.provider) {
      case 'twilio':
        return this.sendViaTwilio(request);
      case 'aws_sns':
        return this.sendViaAwsSns(request);
      case 'nexmo':
        return this.sendViaNexmo(request);
      case 'mock':
      default:
        return this.sendViaMock(request);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(request: SmsRequest): Promise<SmsResult> {
    try {
      // In a real implementation, this would use the Twilio SDK
      // const twilio = require('twilio');
      // const client = twilio(this.config.apiKey, this.config.apiSecret);
      
      // const message = await client.messages.create({
      //   body: request.message,
      //   from: this.config.from,
      //   to: request.to
      // });

      // Mock implementation for now
      const messageId = `twilio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
        metadata: {
          provider: 'twilio',
          sentAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Twilio error: ${error.message}`
      };
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAwsSns(request: SmsRequest): Promise<SmsResult> {
    try {
      // In a real implementation, this would use the AWS SDK
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS({ region: this.config.region });
      
      // const params = {
      //   Message: request.message,
      //   PhoneNumber: request.to,
      //   MessageAttributes: {
      //     'AWS.SNS.SMS.SenderID': {
      //       DataType: 'String',
      //       StringValue: this.config.from
      //     }
      //   }
      // };

      // const result = await sns.publish(params).promise();

      // Mock implementation for now
      const messageId = `sns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
        metadata: {
          provider: 'aws_sns',
          sentAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `AWS SNS error: ${error.message}`
      };
    }
  }

  /**
   * Send SMS via Nexmo/Vonage
   */
  private async sendViaNexmo(request: SmsRequest): Promise<SmsResult> {
    try {
      // In a real implementation, this would use the Nexmo SDK
      // const Nexmo = require('nexmo');
      // const nexmo = new Nexmo({
      //   apiKey: this.config.apiKey,
      //   apiSecret: this.config.apiSecret
      // });

      // const result = await new Promise((resolve, reject) => {
      //   nexmo.message.sendSms(
      //     this.config.from,
      //     request.to,
      //     request.message,
      //     (err, responseData) => {
      //       if (err) reject(err);
      //       else resolve(responseData);
      //     }
      //   );
      // });

      // Mock implementation for now
      const messageId = `nexmo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
        metadata: {
          provider: 'nexmo',
          sentAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Nexmo error: ${error.message}`
      };
    }
  }

  /**
   * Mock SMS sending for development/testing
   */
  private async sendViaMock(request: SmsRequest): Promise<SmsResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Mock SMS sent', {
      to: this.maskPhoneNumber(request.to),
      message: request.message,
      messageId
    });

    return {
      success: true,
      messageId,
      metadata: {
        provider: 'mock',
        sentAt: new Date().toISOString(),
        mockMessage: request.message
      }
    };
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error(`Invalid phone number format: ${phoneNumber}. Must be in E.164 format (e.g., +1234567890)`);
    }
  }

  /**
   * Check rate limit for phone number
   */
  private checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const maxSmsPerHour = 10;

    const timestamps = this.rateLimitMap.get(phoneNumber) || [];
    const recentTimestamps = timestamps.filter(timestamp => now - timestamp < oneHour);

    return recentTimestamps.length < maxSmsPerHour;
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimit(phoneNumber: string): void {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(phoneNumber) || [];
    timestamps.push(now);
    this.rateLimitMap.set(phoneNumber, timestamps);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) {
      return phoneNumber;
    }
    
    const visibleDigits = 4;
    const masked = '*'.repeat(phoneNumber.length - visibleDigits);
    return masked + phoneNumber.slice(-visibleDigits);
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }

    return processed;
  }

  /**
   * Initialize default SMS templates
   */
  private initializeDefaultTemplates(): void {
    const templates: SmsTemplate[] = [
      {
        id: 'verification_code',
        name: 'Verification Code',
        content: 'Your {{appName}} verification code is: {{code}}. This code expires in {{expiresIn}} minutes. Do not share this code with anyone.',
        variables: ['appName', 'code', 'expiresIn']
      },
      {
        id: '2fa_code',
        name: 'Two-Factor Authentication Code',
        content: 'Your {{appName}} login code is: {{code}}. If you did not request this code, please contact support immediately.',
        variables: ['appName', 'code']
      },
      {
        id: 'security_alert',
        name: 'Security Alert',
        content: 'SECURITY ALERT: {{alertType}} detected on your {{appName}} account at {{timestamp}}. If this was not you, secure your account immediately.',
        variables: ['appName', 'alertType', 'timestamp']
      },
      {
        id: 'transaction_alert',
        name: 'Transaction Alert',
        content: '{{appName}} Alert: {{transactionType}} of {{amount}} {{currency}} processed. Check your account for details.',
        variables: ['appName', 'transactionType', 'amount', 'currency']
      },
      {
        id: 'account_locked',
        name: 'Account Locked Alert',
        content: 'Your {{appName}} account has been temporarily locked due to suspicious activity. Contact support to unlock your account.',
        variables: ['appName']
      },
      {
        id: 'password_changed',
        name: 'Password Changed Alert',
        content: 'Your {{appName}} password was successfully changed. If you did not make this change, contact support immediately.',
        variables: ['appName']
      }
    ];

    templates.forEach(template => this.registerTemplate(template));
  }

  /**
   * Start SMS processor for queued messages
   */
  private startSmsProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.smsQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const batch = this.smsQueue.splice(0, 3); // Process 3 SMS at a time
        await this.sendBulkSms(batch);
        
        this.logger.info('Processed queued SMS messages', {
          processed: batch.length,
          remaining: this.smsQueue.length
        });
      } catch (error) {
        this.logger.error('Error processing SMS queue', {
          error: error.message
        });
      } finally {
        this.isProcessing = false;
      }
    }, 15000); // Process every 15 seconds
  }

  /**
   * Start rate limit cleanup
   */
  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const [phoneNumber, timestamps] of this.rateLimitMap.entries()) {
        const recentTimestamps = timestamps.filter(timestamp => now - timestamp < oneHour);
        
        if (recentTimestamps.length === 0) {
          this.rateLimitMap.delete(phoneNumber);
        } else {
          this.rateLimitMap.set(phoneNumber, recentTimestamps);
        }
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }
}

export default SmsService;
