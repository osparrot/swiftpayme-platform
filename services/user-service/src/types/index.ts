import { Request } from 'express';
import { Document } from 'mongoose';
import { 
  UserStatus, 
  UserRole, 
  AccountType, 
  VerificationStatus,
  NotificationPreference,
  TwoFactorMethod,
  SecurityQuestionType,
  AddressType,
  PhoneType,
  DocumentType,
  DocumentStatus,
  LoginMethod,
  SessionStatus,
  DeviceType,
  ActivityType,
  PreferenceCategory,
  PrivacyLevel,
  Gender,
  MaritalStatus,
  EmploymentStatus,
  IncomeRange,
  NotificationEventType,
  AuditEventType
} from '../enums/userEnums';

// Base interfaces
export interface UserRequest extends Request {
  requestId?: string;
  startTime?: number;
  clientIp?: string;
  userAgent?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId?: string;
    tokenId?: string;
  };
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
  metadata?: Record<string, any>;
}

// User interfaces
export interface IUser extends Document {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phone?: string;
  phoneVerified: boolean;
  phoneVerificationToken?: string;
  phoneVerificationExpires?: Date;
  password: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  lastPasswordChange?: Date;
  passwordHistory: string[];
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  employmentStatus?: EmploymentStatus;
  incomeRange?: IncomeRange;
  occupation?: string;
  employer?: string;
  bio?: string;
  website?: string;
  socialLinks?: ISocialLinks;
  addresses: IAddress[];
  phones: IPhone[];
  emergencyContact?: IEmergencyContact;
  status: UserStatus;
  role: UserRole;
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  kycStatus?: string;
  amlStatus?: string;
  riskLevel?: string;
  complianceRecordId?: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  securityQuestions: ISecurityQuestion[];
  loginMethods: LoginMethod[];
  socialLogins: ISocialLogin[];
  preferences: IUserPreferences;
  documents: IUserDocument[];
  sessions: IUserSession[];
  activities: IUserActivity[];
  notifications: IUserNotification[];
  apiKeys: IApiKey[];
  tags: string[];
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  deletedAt?: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
  suspendedBy?: string;
  reactivatedAt?: Date;
  reactivatedBy?: string;
  termsAcceptedAt?: Date;
  privacyPolicyAcceptedAt?: Date;
  marketingOptIn: boolean;
  marketingOptInAt?: Date;
  dataProcessingConsent: boolean;
  dataProcessingConsentAt?: Date;
  referralCode?: string;
  referredBy?: string;
  referralCount: number;
  loyaltyPoints: number;
  subscriptionTier?: string;
  subscriptionExpiresAt?: Date;
  trialEndsAt?: Date;
  isTrialUser: boolean;
  isPremiumUser: boolean;
  isVerifiedUser: boolean;
  isSuspended: boolean;
  isBlocked: boolean;
  isDeleted: boolean;
}

export interface IAddress {
  id: string;
  type: AddressType;
  label?: string;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPhone {
  id: string;
  type: PhoneType;
  label?: string;
  number: string;
  countryCode: string;
  extension?: string;
  isDefault: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmergencyContact {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface ISocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
  discord?: string;
  telegram?: string;
  whatsapp?: string;
}

export interface ISecurityQuestion {
  id: string;
  type: SecurityQuestionType;
  question: string;
  answer: string; // Hashed
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialLogin {
  provider: LoginMethod;
  providerId: string;
  email?: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isLinked: boolean;
  linkedAt: Date;
  metadata?: Record<string, any>;
}

export interface IUserPreferences {
  notifications: INotificationPreferences;
  privacy: IPrivacyPreferences;
  security: ISecurityPreferences;
  display: IDisplayPreferences;
  communication: ICommunicationPreferences;
  marketing: IMarketingPreferences;
  accessibility: IAccessibilityPreferences;
  customPreferences?: Record<string, any>;
}

export interface INotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    types: NotificationEventType[];
  };
  sms: {
    enabled: boolean;
    types: NotificationEventType[];
  };
  push: {
    enabled: boolean;
    types: NotificationEventType[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationEventType[];
  };
  marketing: boolean;
  newsletter: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  transactionAlerts: boolean;
  complianceUpdates: boolean;
}

export interface IPrivacyPreferences {
  profileVisibility: PrivacyLevel;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showDateOfBirth: boolean;
  allowDataSharing: boolean;
  allowAnalytics: boolean;
  allowPersonalization: boolean;
  allowThirdPartyIntegrations: boolean;
  dataRetentionPeriod: number; // in days
}

export interface ISecurityPreferences {
  sessionTimeout: number; // in minutes
  requireTwoFactor: boolean;
  allowMultipleSessions: boolean;
  logSecurityEvents: boolean;
  requirePasswordChange: boolean;
  passwordChangeInterval: number; // in days
  allowRememberDevice: boolean;
  trustedDevices: string[];
  ipWhitelist: string[];
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

export interface IDisplayPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
}

export interface ICommunicationPreferences {
  preferredLanguage: string;
  preferredChannel: NotificationPreference;
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      [key: string]: {
        start: string;
        end: string;
        enabled: boolean;
      };
    };
  };
  autoReply: {
    enabled: boolean;
    message: string;
  };
}

export interface IMarketingPreferences {
  optIn: boolean;
  optInDate?: Date;
  optOutDate?: Date;
  channels: NotificationPreference[];
  interests: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  allowPersonalization: boolean;
  allowRetargeting: boolean;
  allowDataSharing: boolean;
}

export interface IAccessibilityPreferences {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  audioDescriptions: boolean;
  closedCaptions: boolean;
  colorBlindSupport: boolean;
}

export interface IUserDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  fileName: string;
  originalName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  expiresAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  extractedData?: Record<string, any>;
  ocrResults?: IOcrResult[];
  metadata: Record<string, any>;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface IOcrResult {
  field: string;
  value: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IUserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  deviceInfo: IDeviceInfo;
  ipAddress: string;
  location?: ILocationInfo;
  userAgent: string;
  status: SessionStatus;
  isActive: boolean;
  isTrusted: boolean;
  loginMethod: LoginMethod;
  twoFactorVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  terminatedAt?: Date;
  terminatedBy?: string;
  terminationReason?: string;
  metadata?: Record<string, any>;
}

export interface IDeviceInfo {
  id: string;
  fingerprint: string;
  type: DeviceType;
  name?: string;
  os: string;
  osVersion?: string;
  browser: string;
  browserVersion?: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTrusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface ILocationInfo {
  country: string;
  countryCode: string;
  region?: string;
  regionCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  asn?: string;
  vpnDetected?: boolean;
  proxyDetected?: boolean;
  torDetected?: boolean;
  threatLevel?: string;
}

export interface IUserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  location?: ILocationInfo;
  success: boolean;
  errorMessage?: string;
  riskScore?: number;
  flagged: boolean;
  flagReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IUserNotification {
  id: string;
  userId: string;
  type: NotificationEventType;
  channel: NotificationPreference;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: Date;
  isSent: boolean;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKey {
  id: string;
  userId: string;
  name: string;
  description?: string;
  key: string; // Hashed
  keyPreview: string; // First 8 characters
  permissions: string[];
  scopes: string[];
  ipWhitelist?: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  usageCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;
}

// Request/Response interfaces
export interface IUserRegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  accountType?: AccountType;
  referralCode?: string;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  marketingOptIn?: boolean;
  dataProcessingConsent: boolean;
  metadata?: Record<string, any>;
}

export interface IUserLoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberDevice?: boolean;
  deviceInfo?: Partial<IDeviceInfo>;
  metadata?: Record<string, any>;
}

export interface IUserUpdateRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  displayName?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  employmentStatus?: EmploymentStatus;
  incomeRange?: IncomeRange;
  occupation?: string;
  employer?: string;
  bio?: string;
  website?: string;
  socialLinks?: Partial<ISocialLinks>;
  emergencyContact?: IEmergencyContact;
  metadata?: Record<string, any>;
}

export interface IPasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  logoutAllSessions?: boolean;
}

export interface IPasswordResetRequest {
  email: string;
  resetUrl?: string;
}

export interface IPasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IEmailVerificationRequest {
  token: string;
}

export interface IPhoneVerificationRequest {
  phone: string;
  code: string;
}

export interface ITwoFactorSetupRequest {
  method: TwoFactorMethod;
  phone?: string;
  email?: string;
}

export interface ITwoFactorVerifyRequest {
  code: string;
  backupCode?: string;
}

export interface IAddressRequest {
  type: AddressType;
  label?: string;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface IPhoneRequest {
  type: PhoneType;
  label?: string;
  number: string;
  countryCode: string;
  extension?: string;
  isDefault?: boolean;
}

export interface IDocumentUploadRequest {
  type: DocumentType;
  description?: string;
  expiresAt?: Date;
}

export interface IPreferencesUpdateRequest {
  category: PreferenceCategory;
  preferences: Record<string, any>;
}

export interface IApiKeyCreateRequest {
  name: string;
  description?: string;
  permissions: string[];
  scopes: string[];
  ipWhitelist?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  expiresAt?: Date;
}

// Admin interfaces
export interface IUserSearchRequest {
  query?: string;
  status?: UserStatus;
  role?: UserRole;
  accountType?: AccountType;
  verificationStatus?: VerificationStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IUserBulkActionRequest {
  userIds: string[];
  action: 'suspend' | 'activate' | 'delete' | 'verify' | 'unverify';
  reason?: string;
  notifyUsers?: boolean;
}

export interface IUserAuditRequest {
  userId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// Analytics interfaces
export interface IUserMetrics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  verifiedUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  usersByStatus: Record<UserStatus, number>;
  usersByRole: Record<UserRole, number>;
  usersByAccountType: Record<AccountType, number>;
  usersByVerificationStatus: Record<VerificationStatus, number>;
  loginMetrics: {
    totalLogins: number;
    uniqueLogins: number;
    failedLogins: number;
    averageSessionDuration: number;
  };
  registrationMetrics: {
    registrationsByDay: Array<{ date: string; count: number }>;
    registrationsBySource: Record<string, number>;
    verificationRate: number;
    averageVerificationTime: number;
  };
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    retentionRate: number;
    churnRate: number;
  };
  securityMetrics: {
    twoFactorAdoptionRate: number;
    suspiciousActivities: number;
    blockedAccounts: number;
    passwordResets: number;
  };
}

// Error interfaces
export interface IUserError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  stack?: string;
}

// Webhook interfaces
export interface IWebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  signature: string;
  version: string;
}

// Export all types
export type {
  UserRequest,
  ServiceResponse,
  IUser,
  IAddress,
  IPhone,
  IEmergencyContact,
  ISocialLinks,
  ISecurityQuestion,
  ISocialLogin,
  IUserPreferences,
  INotificationPreferences,
  IPrivacyPreferences,
  ISecurityPreferences,
  IDisplayPreferences,
  ICommunicationPreferences,
  IMarketingPreferences,
  IAccessibilityPreferences,
  IUserDocument,
  IOcrResult,
  IUserSession,
  IDeviceInfo,
  ILocationInfo,
  IUserActivity,
  IUserNotification,
  IApiKey,
  IUserRegistrationRequest,
  IUserLoginRequest,
  IUserUpdateRequest,
  IPasswordChangeRequest,
  IPasswordResetRequest,
  IPasswordResetConfirmRequest,
  IEmailVerificationRequest,
  IPhoneVerificationRequest,
  ITwoFactorSetupRequest,
  ITwoFactorVerifyRequest,
  IAddressRequest,
  IPhoneRequest,
  IDocumentUploadRequest,
  IPreferencesUpdateRequest,
  IApiKeyCreateRequest,
  IUserSearchRequest,
  IUserBulkActionRequest,
  IUserAuditRequest,
  IUserMetrics,
  IUserError,
  IWebhookPayload
};



// SwiftPayMe specific interfaces
export interface ISwiftPayUser extends IUser {
  kycVerification: IKYCVerification;
  assetDeposits: IAssetDeposit[];
  fiatAccounts: Map<string, IFiatAccount>;
  bitcoinWallets: IBitcoinWallet[];
  transactionHistory: ITransactionHistory[];
  tradingLimits: ITradingLimits;
  paymentPreferences: IPaymentPreferences;
  totalAssetValue: number;
  totalFiatBalance: number;
  totalBitcoinBalance: number;
  isKYCVerified: boolean;
  canDepositAssets: boolean;
}

export interface IAssetDeposit {
  id: string;
  assetType: 'gold' | 'silver' | 'diamond';
  quantity: number;
  unit: string;
  purity?: number;
  estimatedValue: {
    amount: number;
    currency: string;
  };
  actualValue?: {
    amount: number;
    currency: string;
  };
  status: 'pending_verification' | 'verified' | 'rejected' | 'credited';
  depositDate: Date;
  verificationDate?: Date;
  creditedDate?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  images: Array<{
    url: string;
    description?: string;
    uploadedAt: Date;
  }>;
  certificates: Array<{
    type: string;
    issuer: string;
    certificateNumber: string;
    url: string;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFiatAccount {
  currency: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalSpent: number;
  lastTransactionAt?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface IBitcoinWallet {
  id: string;
  type: 'internal' | 'external';
  label?: string;
  address: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  balance: number;
  unconfirmedBalance: number;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  isDefault: boolean;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface ITransactionHistory {
  id: string;
  type: 'asset_deposit' | 'asset_credit' | 'fiat_transfer' | 'bitcoin_purchase' | 'bitcoin_transfer' | 'bitcoin_receive';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: {
    value: number;
    currency: string;
  };
  fee: {
    value: number;
    currency: string;
  };
  fromAccount?: string;
  toAccount?: string;
  reference?: string;
  description?: string;
  transactionHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKYCVerification {
  level: 'basic' | 'intermediate' | 'advanced';
  status: 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'expired';
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  expiresAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  documents: Array<{
    type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'proof_of_income';
    status: 'pending' | 'approved' | 'rejected';
    url?: string;
    extractedData?: Record<string, any>;
    verifiedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
  }>;
  riskScore?: number;
  riskFactors: Array<{
    factor: string;
    score: number;
    description: string;
  }>;
  complianceChecks: {
    aml: {
      status: 'pending' | 'passed' | 'failed';
      checkedAt?: Date;
      provider?: string;
      reference?: string;
    };
    sanctions: {
      status: 'pending' | 'passed' | 'failed';
      checkedAt?: Date;
      provider?: string;
      reference?: string;
    };
    pep: {
      status: 'pending' | 'passed' | 'failed';
      checkedAt?: Date;
      provider?: string;
      reference?: string;
    };
  };
  limits: {
    dailyAssetDeposit: number;
    monthlyAssetDeposit: number;
    dailyBitcoinPurchase: number;
    monthlyBitcoinPurchase: number;
  };
  metadata: Record<string, any>;
}

export interface ITradingLimits {
  dailyAssetDeposit: number;
  monthlyAssetDeposit: number;
  dailyBitcoinPurchase: number;
  monthlyBitcoinPurchase: number;
  dailyTransfer: number;
  monthlyTransfer: number;
}

export interface IPaymentPreferences {
  defaultCurrency: string;
  autoConvertAssets: boolean;
  bitcoinNetwork: 'mainnet' | 'testnet';
  notifyOnDeposits: boolean;
  notifyOnCredits: boolean;
  notifyOnBitcoinTransactions: boolean;
  requireTwoFactorForTransactions: boolean;
  autoGenerateBitcoinAddress: boolean;
}

// Request interfaces for SwiftPayMe
export interface SwiftPayUserRequest extends UserRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId?: string;
    tokenId?: string;
    kycVerified?: boolean;
    canDepositAssets?: boolean;
  };
}

export interface AssetDepositRequest {
  assetType: 'gold' | 'silver' | 'diamond';
  quantity: number;
  unit: string;
  purity?: number;
  estimatedValue: {
    amount: number;
    currency: string;
  };
  images: Array<{
    url: string;
    description?: string;
  }>;
  certificates?: Array<{
    type: string;
    issuer: string;
    certificateNumber: string;
    url: string;
  }>;
}

export interface BitcoinPurchaseRequest {
  fiatAmount: number;
  fiatCurrency: string;
  bitcoinAmount: number;
  exchangeRate: number;
  walletId?: string;
}

export interface BitcoinTransferRequest {
  fromWalletId: string;
  toAddress: string;
  amount: number;
  fee?: number;
  description?: string;
}

export interface KYCSubmissionRequest {
  level: 'basic' | 'intermediate' | 'advanced';
  documents: Array<{
    type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'proof_of_income';
    url: string;
  }>;
}

// Response interfaces
export interface AssetDepositResponse {
  depositId: string;
  status: string;
  estimatedProcessingTime: string;
  trackingNumber: string;
}

export interface BitcoinWalletResponse {
  walletId: string;
  address: string;
  balance: number;
  qrCode?: string;
}

export interface TransactionSummaryResponse {
  totalAssetValue: number;
  totalFiatBalance: number;
  totalBitcoinBalance: number;
  recentTransactions: ITransactionHistory[];
  pendingDeposits: number;
  monthlyVolume: number;
}

// Validation interfaces
export interface AssetDepositValidation {
  isValidAssetType: boolean;
  isValidQuantity: boolean;
  isValidPurity: boolean;
  hasRequiredImages: boolean;
  meetsMinimumValue: boolean;
  withinDailyLimit: boolean;
  withinMonthlyLimit: boolean;
}

export interface BitcoinTransactionValidation {
  hasValidAddress: boolean;
  hasSufficientBalance: boolean;
  meetsMinimumAmount: boolean;
  withinDailyLimit: boolean;
  withinMonthlyLimit: boolean;
  hasValidFee: boolean;
}

// Event interfaces for inter-service communication
export interface AssetDepositEvent {
  eventType: 'asset_deposited' | 'asset_verified' | 'asset_credited' | 'asset_rejected';
  userId: string;
  depositId: string;
  assetType: string;
  amount?: number;
  currency?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BitcoinTransactionEvent {
  eventType: 'bitcoin_purchased' | 'bitcoin_sent' | 'bitcoin_received' | 'bitcoin_confirmed';
  userId: string;
  transactionId: string;
  amount: number;
  address?: string;
  transactionHash?: string;
  confirmations?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface KYCStatusEvent {
  eventType: 'kyc_submitted' | 'kyc_approved' | 'kyc_rejected' | 'kyc_expired';
  userId: string;
  level: string;
  status: string;
  reviewedBy?: string;
  rejectionReason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

