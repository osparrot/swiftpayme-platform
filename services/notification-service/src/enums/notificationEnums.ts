/**
 * SwiftPayMe Notification Service - Comprehensive Enums
 * Defines all notification types, statuses, channels, and priorities
 */

// ==================== NOTIFICATION TYPES ====================

/**
 * Core notification types for SwiftPayMe platform
 */
export enum NotificationType {
  // User Account Notifications
  USER_REGISTRATION = 'user_registration',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_PASSWORD_CHANGE = 'user_password_change',
  USER_EMAIL_VERIFICATION = 'user_email_verification',
  USER_PHONE_VERIFICATION = 'user_phone_verification',
  USER_ACCOUNT_LOCKED = 'user_account_locked',
  USER_ACCOUNT_UNLOCKED = 'user_account_unlocked',
  USER_ACCOUNT_SUSPENDED = 'user_account_suspended',
  USER_ACCOUNT_REACTIVATED = 'user_account_reactivated',

  // KYC/AML Notifications
  KYC_VERIFICATION_STARTED = 'kyc_verification_started',
  KYC_VERIFICATION_PENDING = 'kyc_verification_pending',
  KYC_VERIFICATION_APPROVED = 'kyc_verification_approved',
  KYC_VERIFICATION_REJECTED = 'kyc_verification_rejected',
  KYC_DOCUMENT_REQUIRED = 'kyc_document_required',
  KYC_DOCUMENT_UPLOADED = 'kyc_document_uploaded',
  KYC_DOCUMENT_APPROVED = 'kyc_document_approved',
  KYC_DOCUMENT_REJECTED = 'kyc_document_rejected',
  AML_CHECK_INITIATED = 'aml_check_initiated',
  AML_CHECK_COMPLETED = 'aml_check_completed',
  AML_CHECK_FAILED = 'aml_check_failed',

  // Asset Deposit Notifications
  ASSET_DEPOSIT_SUBMITTED = 'asset_deposit_submitted',
  ASSET_DEPOSIT_RECEIVED = 'asset_deposit_received',
  ASSET_DEPOSIT_VERIFIED = 'asset_deposit_verified',
  ASSET_DEPOSIT_APPROVED = 'asset_deposit_approved',
  ASSET_DEPOSIT_REJECTED = 'asset_deposit_rejected',
  ASSET_DEPOSIT_VALUED = 'asset_deposit_valued',
  ASSET_DEPOSIT_CREDITED = 'asset_deposit_credited',
  ASSET_WITHDRAWAL_REQUESTED = 'asset_withdrawal_requested',
  ASSET_WITHDRAWAL_APPROVED = 'asset_withdrawal_approved',
  ASSET_WITHDRAWAL_REJECTED = 'asset_withdrawal_rejected',
  ASSET_WITHDRAWAL_COMPLETED = 'asset_withdrawal_completed',

  // Tokenization Notifications
  TOKEN_MINTING_STARTED = 'token_minting_started',
  TOKEN_MINTING_COMPLETED = 'token_minting_completed',
  TOKEN_MINTING_FAILED = 'token_minting_failed',
  TOKEN_BURNING_STARTED = 'token_burning_started',
  TOKEN_BURNING_COMPLETED = 'token_burning_completed',
  TOKEN_BURNING_FAILED = 'token_burning_failed',
  TOKEN_TRANSFER_INITIATED = 'token_transfer_initiated',
  TOKEN_TRANSFER_COMPLETED = 'token_transfer_completed',
  TOKEN_TRANSFER_FAILED = 'token_transfer_failed',

  // Payment & Transaction Notifications
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  PAYMENT_REFUNDED = 'payment_refunded',
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_PENDING = 'transaction_pending',
  TRANSACTION_CONFIRMED = 'transaction_confirmed',
  TRANSACTION_FAILED = 'transaction_failed',
  TRANSACTION_REVERSED = 'transaction_reversed',

  // Bitcoin & Crypto Notifications
  BITCOIN_WALLET_CREATED = 'bitcoin_wallet_created',
  BITCOIN_TRANSACTION_INITIATED = 'bitcoin_transaction_initiated',
  BITCOIN_TRANSACTION_PENDING = 'bitcoin_transaction_pending',
  BITCOIN_TRANSACTION_CONFIRMED = 'bitcoin_transaction_confirmed',
  BITCOIN_TRANSACTION_FAILED = 'bitcoin_transaction_failed',
  BITCOIN_RECEIVED = 'bitcoin_received',
  BITCOIN_SENT = 'bitcoin_sent',
  CRYPTO_PRICE_ALERT = 'crypto_price_alert',
  CRYPTO_WALLET_BALANCE_LOW = 'crypto_wallet_balance_low',

  // Account Balance Notifications
  BALANCE_UPDATED = 'balance_updated',
  BALANCE_LOW = 'balance_low',
  BALANCE_CREDITED = 'balance_credited',
  BALANCE_DEBITED = 'balance_debited',
  BALANCE_FROZEN = 'balance_frozen',
  BALANCE_UNFROZEN = 'balance_unfrozen',

  // Security Notifications
  SECURITY_LOGIN_ATTEMPT = 'security_login_attempt',
  SECURITY_FAILED_LOGIN = 'security_failed_login',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security_suspicious_activity',
  SECURITY_DEVICE_ADDED = 'security_device_added',
  SECURITY_DEVICE_REMOVED = 'security_device_removed',
  SECURITY_2FA_ENABLED = 'security_2fa_enabled',
  SECURITY_2FA_DISABLED = 'security_2fa_disabled',
  SECURITY_PASSWORD_RESET = 'security_password_reset',
  SECURITY_API_KEY_CREATED = 'security_api_key_created',
  SECURITY_API_KEY_REVOKED = 'security_api_key_revoked',

  // Admin Notifications
  ADMIN_USER_FLAGGED = 'admin_user_flagged',
  ADMIN_TRANSACTION_FLAGGED = 'admin_transaction_flagged',
  ADMIN_SYSTEM_ALERT = 'admin_system_alert',
  ADMIN_COMPLIANCE_ALERT = 'admin_compliance_alert',
  ADMIN_ASSET_VERIFICATION_REQUIRED = 'admin_asset_verification_required',
  ADMIN_HIGH_VALUE_TRANSACTION = 'admin_high_value_transaction',
  ADMIN_SUSPICIOUS_ACTIVITY = 'admin_suspicious_activity',

  // System Notifications
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_UPDATE = 'system_update',
  SYSTEM_DOWNTIME = 'system_downtime',
  SYSTEM_RECOVERY = 'system_recovery',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_PERFORMANCE_ALERT = 'system_performance_alert',

  // Marketing & Promotional
  MARKETING_WELCOME = 'marketing_welcome',
  MARKETING_PROMOTION = 'marketing_promotion',
  MARKETING_NEWSLETTER = 'marketing_newsletter',
  MARKETING_PRODUCT_UPDATE = 'marketing_product_update',
  MARKETING_FEATURE_ANNOUNCEMENT = 'marketing_feature_announcement'
}

// ==================== NOTIFICATION STATUS ====================

/**
 * Notification delivery and processing status
 */
export enum NotificationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  RETRY = 'retry'
}

// ==================== NOTIFICATION CHANNELS ====================

/**
 * Available notification delivery channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  VOICE = 'voice'
}

// ==================== NOTIFICATION PRIORITY ====================

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

// ==================== NOTIFICATION FREQUENCY ====================

/**
 * Notification frequency settings
 */
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never'
}

// ==================== TEMPLATE TYPES ====================

/**
 * Notification template types
 */
export enum TemplateType {
  EMAIL_HTML = 'email_html',
  EMAIL_TEXT = 'email_text',
  SMS_TEXT = 'sms_text',
  PUSH_NOTIFICATION = 'push_notification',
  IN_APP_MESSAGE = 'in_app_message',
  WEBHOOK_PAYLOAD = 'webhook_payload',
  SLACK_MESSAGE = 'slack_message'
}

// ==================== EVENT TYPES ====================

/**
 * Event types for subscription management
 */
export enum EventType {
  USER_EVENT = 'user_event',
  ASSET_EVENT = 'asset_event',
  PAYMENT_EVENT = 'payment_event',
  CRYPTO_EVENT = 'crypto_event',
  SECURITY_EVENT = 'security_event',
  SYSTEM_EVENT = 'system_event',
  ADMIN_EVENT = 'admin_event',
  MARKETING_EVENT = 'marketing_event'
}

// ==================== SUBSCRIPTION STATUS ====================

/**
 * Event subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

// ==================== DELIVERY PROVIDER ====================

/**
 * Third-party delivery providers
 */
export enum DeliveryProvider {
  // Email providers
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  SES = 'ses',
  SMTP = 'smtp',

  // SMS providers
  TWILIO = 'twilio',
  NEXMO = 'nexmo',
  AWS_SNS = 'aws_sns',

  // Push notification providers
  FIREBASE = 'firebase',
  APNS = 'apns',
  ONESIGNAL = 'onesignal',

  // Chat providers
  SLACK_API = 'slack_api',
  DISCORD_API = 'discord_api',
  TELEGRAM_API = 'telegram_api',
  WHATSAPP_API = 'whatsapp_api'
}

// ==================== ERROR CODES ====================

/**
 * Notification error codes
 */
export enum NotificationErrorCode {
  INVALID_RECIPIENT = 'invalid_recipient',
  INVALID_TEMPLATE = 'invalid_template',
  INVALID_CHANNEL = 'invalid_channel',
  PROVIDER_ERROR = 'provider_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  QUOTA_EXCEEDED = 'quota_exceeded',
  AUTHENTICATION_FAILED = 'authentication_failed',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  VALIDATION_ERROR = 'validation_error',
  TEMPLATE_RENDER_ERROR = 'template_render_error',
  RECIPIENT_BLOCKED = 'recipient_blocked',
  CONTENT_BLOCKED = 'content_blocked',
  INSUFFICIENT_BALANCE = 'insufficient_balance'
}

// ==================== NOTIFICATION CATEGORIES ====================

/**
 * Notification categories for user preferences
 */
export enum NotificationCategory {
  ACCOUNT = 'account',
  SECURITY = 'security',
  TRANSACTIONS = 'transactions',
  ASSETS = 'assets',
  CRYPTO = 'crypto',
  MARKETING = 'marketing',
  SYSTEM = 'system',
  ADMIN = 'admin'
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get notification category from notification type
 */
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  if (type.startsWith('user_') || type.startsWith('kyc_') || type.startsWith('aml_')) {
    return NotificationCategory.ACCOUNT;
  }
  if (type.startsWith('security_')) {
    return NotificationCategory.SECURITY;
  }
  if (type.startsWith('payment_') || type.startsWith('transaction_') || type.startsWith('balance_')) {
    return NotificationCategory.TRANSACTIONS;
  }
  if (type.startsWith('asset_') || type.startsWith('token_')) {
    return NotificationCategory.ASSETS;
  }
  if (type.startsWith('bitcoin_') || type.startsWith('crypto_')) {
    return NotificationCategory.CRYPTO;
  }
  if (type.startsWith('marketing_')) {
    return NotificationCategory.MARKETING;
  }
  if (type.startsWith('system_')) {
    return NotificationCategory.SYSTEM;
  }
  if (type.startsWith('admin_')) {
    return NotificationCategory.ADMIN;
  }
  return NotificationCategory.SYSTEM;
}

/**
 * Get default priority for notification type
 */
export function getDefaultPriority(type: NotificationType): NotificationPriority {
  const criticalTypes = [
    NotificationType.SECURITY_SUSPICIOUS_ACTIVITY,
    NotificationType.ADMIN_SUSPICIOUS_ACTIVITY,
    NotificationType.SYSTEM_ERROR,
    NotificationType.USER_ACCOUNT_LOCKED,
    NotificationType.PAYMENT_FAILED
  ];

  const highTypes = [
    NotificationType.ASSET_DEPOSIT_APPROVED,
    NotificationType.ASSET_DEPOSIT_REJECTED,
    NotificationType.BITCOIN_TRANSACTION_CONFIRMED,
    NotificationType.PAYMENT_COMPLETED,
    NotificationType.KYC_VERIFICATION_APPROVED,
    NotificationType.KYC_VERIFICATION_REJECTED
  ];

  if (criticalTypes.includes(type)) {
    return NotificationPriority.CRITICAL;
  }
  if (highTypes.includes(type)) {
    return NotificationPriority.HIGH;
  }
  if (type.startsWith('marketing_')) {
    return NotificationPriority.LOW;
  }
  return NotificationPriority.NORMAL;
}

/**
 * Get default channels for notification type
 */
export function getDefaultChannels(type: NotificationType): NotificationChannel[] {
  const securityTypes = [
    NotificationType.SECURITY_LOGIN_ATTEMPT,
    NotificationType.SECURITY_FAILED_LOGIN,
    NotificationType.SECURITY_SUSPICIOUS_ACTIVITY
  ];

  const transactionTypes = [
    NotificationType.PAYMENT_COMPLETED,
    NotificationType.BITCOIN_TRANSACTION_CONFIRMED,
    NotificationType.ASSET_DEPOSIT_CREDITED
  ];

  if (securityTypes.includes(type)) {
    return [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP];
  }
  if (transactionTypes.includes(type)) {
    return [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP];
  }
  if (type.startsWith('marketing_')) {
    return [NotificationChannel.EMAIL];
  }
  if (type.startsWith('admin_')) {
    return [NotificationChannel.EMAIL, NotificationChannel.SLACK, NotificationChannel.IN_APP];
  }
  return [NotificationChannel.EMAIL, NotificationChannel.IN_APP];
}

// ==================== TYPE GUARDS ====================

/**
 * Check if notification type is security-related
 */
export function isSecurityNotification(type: NotificationType): boolean {
  return type.startsWith('security_') || 
         type === NotificationType.USER_ACCOUNT_LOCKED ||
         type === NotificationType.USER_ACCOUNT_SUSPENDED;
}

/**
 * Check if notification type is transaction-related
 */
export function isTransactionNotification(type: NotificationType): boolean {
  return type.startsWith('payment_') || 
         type.startsWith('transaction_') || 
         type.startsWith('balance_') ||
         type.startsWith('bitcoin_');
}

/**
 * Check if notification type is admin-related
 */
export function isAdminNotification(type: NotificationType): boolean {
  return type.startsWith('admin_');
}

/**
 * Check if notification type requires immediate delivery
 */
export function requiresImmediateDelivery(type: NotificationType): boolean {
  const immediateTypes = [
    NotificationType.SECURITY_SUSPICIOUS_ACTIVITY,
    NotificationType.ADMIN_SUSPICIOUS_ACTIVITY,
    NotificationType.SYSTEM_ERROR,
    NotificationType.USER_ACCOUNT_LOCKED,
    NotificationType.PAYMENT_FAILED,
    NotificationType.BITCOIN_TRANSACTION_FAILED
  ];
  return immediateTypes.includes(type);
}

