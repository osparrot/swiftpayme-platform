import nodemailer from 'nodemailer';
import { Logger } from './Logger';

/**
 * Email configuration interface
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Email request interface
 */
export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  content: string;
  isHtml?: boolean;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Content-ID for inline images
}

/**
 * Email result interface
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  metadata?: Record<string, any>;
}

/**
 * Comprehensive email service
 */
export class EmailService {
  private static instance: EmailService;
  private logger: Logger;
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate>;
  private emailQueue: EmailRequest[];
  private isProcessing: boolean;

  private constructor() {
    this.logger = new Logger('EmailService');
    this.templates = new Map();
    this.emailQueue = [];
    this.isProcessing = false;

    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@swiftpayme.com'
    };

    this.initializeTransporter();
    this.initializeDefaultTemplates();
    this.startEmailProcessor();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send an email
   */
  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    try {
      // Validate email addresses
      this.validateEmailAddresses(request);

      // Prepare mail options
      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
        cc: request.cc ? (Array.isArray(request.cc) ? request.cc.join(', ') : request.cc) : undefined,
        bcc: request.bcc ? (Array.isArray(request.bcc) ? request.bcc.join(', ') : request.bcc) : undefined,
        subject: request.subject,
        text: request.isHtml ? undefined : request.content,
        html: request.isHtml ? request.content : undefined,
        attachments: request.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding,
          cid: att.cid
        }))
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      this.logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: request.to,
        subject: request.subject,
        metadata: request.metadata
      });

      return {
        success: true,
        messageId: info.messageId,
        metadata: {
          ...request.metadata,
          sentAt: new Date().toISOString(),
          response: info.response
        }
      };

    } catch (error) {
      this.logger.error('Failed to send email', {
        error: error.message,
        to: request.to,
        subject: request.subject,
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
   * Send email using template
   */
  async sendTemplateEmail(params: {
    templateId: string;
    to: string | string[];
    variables: Record<string, any>;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: EmailAttachment[];
    metadata?: Record<string, any>;
  }): Promise<EmailResult> {
    const template = this.templates.get(params.templateId);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${params.templateId}`
      };
    }

    // Process template variables
    const subject = this.processTemplate(template.subject, params.variables);
    const htmlContent = this.processTemplate(template.htmlContent, params.variables);
    const textContent = template.textContent ? this.processTemplate(template.textContent, params.variables) : undefined;

    return this.sendEmail({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject,
      content: htmlContent,
      isHtml: true,
      attachments: params.attachments,
      metadata: {
        ...params.metadata,
        templateId: params.templateId,
        variables: params.variables
      }
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(requests: EmailRequest[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Process in batches to avoid overwhelming SMTP server
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.sendEmail(request));
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

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Queue email for later sending
   */
  queueEmail(request: EmailRequest): void {
    this.emailQueue.push(request);
    this.logger.info('Email queued', {
      to: request.to,
      subject: request.subject,
      queueLength: this.emailQueue.length
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(params: {
    to: string;
    userName: string;
    activationToken?: string;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      templateId: 'welcome',
      to: params.to,
      variables: {
        userName: params.userName,
        activationUrl: params.activationToken 
          ? `${process.env.WEB_UI_URL}/activate?token=${params.activationToken}`
          : `${process.env.WEB_UI_URL}/login`,
        loginUrl: `${process.env.WEB_UI_URL}/login`,
        supportUrl: `${process.env.WEB_UI_URL}/support`,
        year: new Date().getFullYear()
      },
      metadata: {
        type: 'welcome',
        userId: params.to
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    userName: string;
    resetToken: string;
    expiresIn: number; // minutes
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      templateId: 'password_reset',
      to: params.to,
      variables: {
        userName: params.userName,
        resetUrl: `${process.env.WEB_UI_URL}/reset-password?token=${params.resetToken}`,
        expiresIn: params.expiresIn,
        supportUrl: `${process.env.WEB_UI_URL}/support`
      },
      metadata: {
        type: 'password_reset',
        userId: params.to,
        resetToken: params.resetToken
      }
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(params: {
    to: string;
    userName: string;
    verificationToken: string;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      templateId: 'email_verification',
      to: params.to,
      variables: {
        userName: params.userName,
        verificationUrl: `${process.env.WEB_UI_URL}/verify-email?token=${params.verificationToken}`,
        supportUrl: `${process.env.WEB_UI_URL}/support`
      },
      metadata: {
        type: 'email_verification',
        userId: params.to,
        verificationToken: params.verificationToken
      }
    });
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlertEmail(params: {
    to: string;
    userName: string;
    alertType: string;
    details: Record<string, any>;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      templateId: 'security_alert',
      to: params.to,
      variables: {
        userName: params.userName,
        alertType: params.alertType,
        timestamp: new Date().toLocaleString(),
        ipAddress: params.details.ipAddress || 'Unknown',
        userAgent: params.details.userAgent || 'Unknown',
        location: params.details.location || 'Unknown',
        accountUrl: `${process.env.WEB_UI_URL}/account/security`,
        supportUrl: `${process.env.WEB_UI_URL}/support`
      },
      metadata: {
        type: 'security_alert',
        userId: params.to,
        alertType: params.alertType,
        details: params.details
      }
    });
  }

  /**
   * Register email template
   */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info('Registered email template', {
      templateId: template.id,
      name: template.name
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.info('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });

    this.transporter.on('error', (error) => {
      this.logger.error('SMTP transporter error', {
        error: error.message
      });
    });

    this.logger.info('Email service initialized', {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure
    });
  }

  /**
   * Validate email addresses
   */
  private validateEmailAddresses(request: EmailRequest): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validateEmail = (email: string) => {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    };

    // Validate 'to' addresses
    if (Array.isArray(request.to)) {
      request.to.forEach(validateEmail);
    } else {
      validateEmail(request.to);
    }

    // Validate 'cc' addresses
    if (request.cc) {
      if (Array.isArray(request.cc)) {
        request.cc.forEach(validateEmail);
      } else {
        validateEmail(request.cc);
      }
    }

    // Validate 'bcc' addresses
    if (request.bcc) {
      if (Array.isArray(request.bcc)) {
        request.bcc.forEach(validateEmail);
      } else {
        validateEmail(request.bcc);
      }
    }
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
   * Initialize default email templates
   */
  private initializeDefaultTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to SwiftPayMe, {{userName}}!',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to SwiftPayMe</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to SwiftPayMe!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e40af; margin-top: 0;">Hello {{userName}},</h2>
              <p>Thank you for joining SwiftPayMe! We're excited to have you on board.</p>
              
              <p>With SwiftPayMe, you can:</p>
              <ul style="color: #4b5563;">
                <li>Deposit physical assets (gold, silver, diamonds) and receive fiat credit</li>
                <li>Trade Bitcoin and other cryptocurrencies</li>
                <li>Manage your portfolio with real-time updates</li>
                <li>Access professional-grade trading tools</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{activationUrl}}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Get Started</a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Need help getting started? <a href="{{supportUrl}}" style="color: #2563eb;">Contact our support team</a></p>
              <p>Best regards,<br>The SwiftPayMe Team</p>
              <p style="margin-top: 20px; font-size: 12px;">© {{year}} SwiftPayMe. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Welcome to SwiftPayMe, {{userName}}!
          
          Thank you for joining our platform. You can now:
          - Deposit physical assets and receive fiat credit
          - Trade cryptocurrencies with ease
          - Manage your portfolio in real-time
          
          Get started: {{activationUrl}}
          
          Need help? Contact support: {{supportUrl}}
          
          Best regards,
          The SwiftPayMe Team
        `,
        variables: ['userName', 'activationUrl', 'loginUrl', 'supportUrl', 'year']
      },
      {
        id: 'password_reset',
        name: 'Password Reset Email',
        subject: 'Reset Your SwiftPayMe Password',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc2626; margin-bottom: 10px;">Password Reset Request</h1>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #991b1b; margin-top: 0;">Hello {{userName}},</h2>
              <p>We received a request to reset your SwiftPayMe password.</p>
              
              <p>Click the button below to reset your password. This link will expire in {{expiresIn}} minutes.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">If you didn't request this password reset, please ignore this email or <a href="{{supportUrl}}" style="color: #dc2626;">contact support</a> if you have concerns.</p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>For security reasons, this link will expire in {{expiresIn}} minutes.</p>
              <p>Best regards,<br>The SwiftPayMe Security Team</p>
            </div>
          </body>
          </html>
        `,
        variables: ['userName', 'resetUrl', 'expiresIn', 'supportUrl']
      },
      {
        id: 'email_verification',
        name: 'Email Verification',
        subject: 'Verify Your SwiftPayMe Email Address',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin-bottom: 10px;">Verify Your Email Address</h1>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #065f46; margin-top: 0;">Hello {{userName}},</h2>
              <p>Please verify your email address to complete your SwiftPayMe account setup.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email Address</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">If you didn't create a SwiftPayMe account, please ignore this email.</p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Need help? <a href="{{supportUrl}}" style="color: #059669;">Contact our support team</a></p>
              <p>Best regards,<br>The SwiftPayMe Team</p>
            </div>
          </body>
          </html>
        `,
        variables: ['userName', 'verificationUrl', 'supportUrl']
      },
      {
        id: 'security_alert',
        name: 'Security Alert Email',
        subject: 'Security Alert: {{alertType}}',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Security Alert</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc2626; margin-bottom: 10px;">🔒 Security Alert</h1>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #991b1b; margin-top: 0;">Hello {{userName}},</h2>
              <p>We detected unusual activity on your SwiftPayMe account:</p>
              
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p><strong>Alert Type:</strong> {{alertType}}</p>
                <p><strong>Time:</strong> {{timestamp}}</p>
                <p><strong>IP Address:</strong> {{ipAddress}}</p>
                <p><strong>Location:</strong> {{location}}</p>
                <p><strong>Device:</strong> {{userAgent}}</p>
              </div>
              
              <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{accountUrl}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Review Account Security</a>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>Concerned about your account security? <a href="{{supportUrl}}" style="color: #dc2626;">Contact support immediately</a></p>
              <p>Best regards,<br>The SwiftPayMe Security Team</p>
            </div>
          </body>
          </html>
        `,
        variables: ['userName', 'alertType', 'timestamp', 'ipAddress', 'location', 'userAgent', 'accountUrl', 'supportUrl']
      }
    ];

    templates.forEach(template => this.registerTemplate(template));
  }

  /**
   * Start email processor for queued emails
   */
  private startEmailProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.emailQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const batch = this.emailQueue.splice(0, 5); // Process 5 emails at a time
        await this.sendBulkEmails(batch);
        
        this.logger.info('Processed queued emails', {
          processed: batch.length,
          remaining: this.emailQueue.length
        });
      } catch (error) {
        this.logger.error('Error processing email queue', {
          error: error.message
        });
      } finally {
        this.isProcessing = false;
      }
    }, 10000); // Process every 10 seconds
  }
}

export default EmailService;
