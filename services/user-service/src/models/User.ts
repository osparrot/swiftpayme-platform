import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
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
  NotificationEventType,
  Gender,
  MaritalStatus,
  EmploymentStatus,
  IncomeRange
} from '../enums/userEnums';
import { 
  IUser,
  IAddress,
  IPhone,
  IEmergencyContact,
  ISocialLinks,
  ISecurityQuestion,
  ISocialLogin,
  IUserPreferences,
  IUserDocument,
  IUserSession,
  IUserActivity,
  IUserNotification,
  IApiKey
} from '../types';

// Social Links Schema
const SocialLinksSchema = new Schema({
  facebook: { type: String, trim: true },
  twitter: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  instagram: { type: String, trim: true },
  github: { type: String, trim: true },
  youtube: { type: String, trim: true },
  tiktok: { type: String, trim: true },
  discord: { type: String, trim: true },
  telegram: { type: String, trim: true },
  whatsapp: { type: String, trim: true }
}, { _id: false });

// Address Schema
const AddressSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(AddressType),
    required: true
  },
  label: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  street2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// Phone Schema
const PhoneSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(PhoneType),
    required: true
  },
  label: {
    type: String,
    trim: true
  },
  number: {
    type: String,
    required: true,
    trim: true
  },
  countryCode: {
    type: String,
    required: true,
    trim: true
  },
  extension: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// Emergency Contact Schema
const EmergencyContactSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  }
}, { _id: false });

// Security Question Schema
const SecurityQuestionSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(SecurityQuestionType),
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true // Hashed
  }
}, {
  timestamps: true,
  _id: false
});

// Social Login Schema
const SocialLoginSchema = new Schema({
  provider: {
    type: String,
    enum: Object.values(LoginMethod),
    required: true
  },
  providerId: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  accessToken: {
    type: String,
    trim: true
  },
  refreshToken: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date
  },
  isLinked: {
    type: Boolean,
    default: true
  },
  linkedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Notification Preferences Schema
const NotificationPreferencesSchema = new Schema({
  email: {
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'never'],
      default: 'immediate'
    },
    types: [{
      type: String,
      enum: Object.values(NotificationEventType)
    }]
  },
  sms: {
    enabled: { type: Boolean, default: false },
    types: [{
      type: String,
      enum: Object.values(NotificationEventType)
    }]
  },
  push: {
    enabled: { type: Boolean, default: true },
    types: [{
      type: String,
      enum: Object.values(NotificationEventType)
    }]
  },
  inApp: {
    enabled: { type: Boolean, default: true },
    types: [{
      type: String,
      enum: Object.values(NotificationEventType)
    }]
  },
  marketing: { type: Boolean, default: false },
  newsletter: { type: Boolean, default: false },
  productUpdates: { type: Boolean, default: true },
  securityAlerts: { type: Boolean, default: true },
  transactionAlerts: { type: Boolean, default: true },
  complianceUpdates: { type: Boolean, default: true }
}, { _id: false });

// Privacy Preferences Schema
const PrivacyPreferencesSchema = new Schema({
  profileVisibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'private'
  },
  showEmail: { type: Boolean, default: false },
  showPhone: { type: Boolean, default: false },
  showAddress: { type: Boolean, default: false },
  showDateOfBirth: { type: Boolean, default: false },
  allowDataSharing: { type: Boolean, default: false },
  allowAnalytics: { type: Boolean, default: true },
  allowPersonalization: { type: Boolean, default: true },
  allowThirdPartyIntegrations: { type: Boolean, default: false },
  dataRetentionPeriod: { type: Number, default: 2555 } // 7 years in days
}, { _id: false });

// Security Preferences Schema
const SecurityPreferencesSchema = new Schema({
  sessionTimeout: { type: Number, default: 30 }, // minutes
  requireTwoFactor: { type: Boolean, default: false },
  allowMultipleSessions: { type: Boolean, default: true },
  logSecurityEvents: { type: Boolean, default: true },
  requirePasswordChange: { type: Boolean, default: false },
  passwordChangeInterval: { type: Number, default: 90 }, // days
  allowRememberDevice: { type: Boolean, default: true },
  trustedDevices: [{ type: String }],
  ipWhitelist: [{ type: String }],
  loginNotifications: { type: Boolean, default: true },
  suspiciousActivityAlerts: { type: Boolean, default: true }
}, { _id: false });

// Display Preferences Schema
const DisplayPreferencesSchema = new Schema({
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },
  currency: { type: String, default: 'USD' },
  numberFormat: { type: String, default: 'en-US' },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  compactMode: { type: Boolean, default: false },
  showAvatars: { type: Boolean, default: true },
  animationsEnabled: { type: Boolean, default: true }
}, { _id: false });

// Communication Preferences Schema
const CommunicationPreferencesSchema = new Schema({
  preferredLanguage: { type: String, default: 'en' },
  preferredChannel: {
    type: String,
    enum: Object.values(NotificationPreference),
    default: NotificationPreference.EMAIL
  },
  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    schedule: {
      monday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: true }
      },
      tuesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: true }
      },
      wednesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: true }
      },
      thursday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: true }
      },
      friday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: true }
      },
      saturday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: false }
      },
      sunday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        enabled: { type: Boolean, default: false }
      }
    }
  },
  autoReply: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'Thank you for your message. I will get back to you soon.' }
  }
}, { _id: false });

// Marketing Preferences Schema
const MarketingPreferencesSchema = new Schema({
  optIn: { type: Boolean, default: false },
  optInDate: { type: Date },
  optOutDate: { type: Date },
  channels: [{
    type: String,
    enum: Object.values(NotificationPreference)
  }],
  interests: [{ type: String }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'never'],
    default: 'monthly'
  },
  allowPersonalization: { type: Boolean, default: true },
  allowRetargeting: { type: Boolean, default: false },
  allowDataSharing: { type: Boolean, default: false }
}, { _id: false });

// Accessibility Preferences Schema
const AccessibilityPreferencesSchema = new Schema({
  screenReader: { type: Boolean, default: false },
  highContrast: { type: Boolean, default: false },
  largeText: { type: Boolean, default: false },
  keyboardNavigation: { type: Boolean, default: false },
  reducedMotion: { type: Boolean, default: false },
  audioDescriptions: { type: Boolean, default: false },
  closedCaptions: { type: Boolean, default: false },
  colorBlindSupport: { type: Boolean, default: false }
}, { _id: false });

// User Preferences Schema
const UserPreferencesSchema = new Schema({
  notifications: { type: NotificationPreferencesSchema, default: () => ({}) },
  privacy: { type: PrivacyPreferencesSchema, default: () => ({}) },
  security: { type: SecurityPreferencesSchema, default: () => ({}) },
  display: { type: DisplayPreferencesSchema, default: () => ({}) },
  communication: { type: CommunicationPreferencesSchema, default: () => ({}) },
  marketing: { type: MarketingPreferencesSchema, default: () => ({}) },
  accessibility: { type: AccessibilityPreferencesSchema, default: () => ({}) },
  customPreferences: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// OCR Result Schema
const OcrResultSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  boundingBox: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }
}, { _id: false });

// User Document Schema
const UserDocumentSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(DocumentType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.PENDING
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: String,
    trim: true
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  extractedData: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  ocrResults: [OcrResultSchema],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  _id: false
});

// Location Info Schema
const LocationInfoSchema = new Schema({
  country: { type: String, trim: true },
  countryCode: { type: String, trim: true },
  region: { type: String, trim: true },
  regionCode: { type: String, trim: true },
  city: { type: String, trim: true },
  latitude: { type: Number },
  longitude: { type: Number },
  timezone: { type: String, trim: true },
  isp: { type: String, trim: true },
  organization: { type: String, trim: true },
  asn: { type: String, trim: true },
  vpnDetected: { type: Boolean, default: false },
  proxyDetected: { type: Boolean, default: false },
  torDetected: { type: Boolean, default: false },
  threatLevel: { type: String, trim: true }
}, { _id: false });

// Device Info Schema
const DeviceInfoSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  fingerprint: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  os: {
    type: String,
    required: true,
    trim: true
  },
  osVersion: {
    type: String,
    trim: true
  },
  browser: {
    type: String,
    required: true,
    trim: true
  },
  browserVersion: {
    type: String,
    trim: true
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  isTablet: {
    type: Boolean,
    default: false
  },
  isDesktop: {
    type: Boolean,
    default: true
  },
  isTrusted: {
    type: Boolean,
    default: false
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// User Session Schema
const UserSessionSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    unique: true,
    sparse: true
  },
  deviceInfo: {
    type: DeviceInfoSchema,
    required: true
  },
  ipAddress: {
    type: String,
    required: true,
    trim: true
  },
  location: LocationInfoSchema,
  userAgent: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.ACTIVE
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTrusted: {
    type: Boolean,
    default: false
  },
  loginMethod: {
    type: String,
    enum: Object.values(LoginMethod),
    required: true
  },
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  terminatedAt: {
    type: Date
  },
  terminatedBy: {
    type: String,
    trim: true
  },
  terminationReason: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// User Activity Schema
const UserActivitySchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(ActivityType),
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  deviceId: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  location: LocationInfoSchema,
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// User Notification Schema
const UserNotificationSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationEventType),
    required: true
  },
  channel: {
    type: String,
    enum: Object.values(NotificationPreference),
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  scheduledFor: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  actionUrl: {
    type: String,
    trim: true
  },
  actionText: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// API Key Schema
const ApiKeySchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true // Hashed
  },
  keyPreview: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  scopes: [{
    type: String,
    trim: true
  }],
  ipWhitelist: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsedAt: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  expiresAt: {
    type: Date
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: String,
    trim: true
  },
  revocationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  _id: false
});

// Main User Schema
const UserSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    trim: true
  },
  emailVerificationExpires: {
    type: Date
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationToken: {
    type: String,
    trim: true
  },
  phoneVerificationExpires: {
    type: Date
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  passwordResetToken: {
    type: String,
    trim: true
  },
  passwordResetExpires: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  lastPasswordChange: {
    type: Date
  },
  passwordHistory: [{
    type: String // Hashed passwords
  }],
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: Object.values(Gender)
  },
  nationality: {
    type: String,
    trim: true
  },
  maritalStatus: {
    type: String,
    enum: Object.values(MaritalStatus)
  },
  employmentStatus: {
    type: String,
    enum: Object.values(EmploymentStatus)
  },
  incomeRange: {
    type: String,
    enum: Object.values(IncomeRange)
  },
  occupation: {
    type: String,
    trim: true
  },
  employer: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  website: {
    type: String,
    trim: true
  },
  socialLinks: SocialLinksSchema,
  addresses: [AddressSchema],
  phones: [PhoneSchema],
  emergencyContact: EmergencyContactSchema,
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING_VERIFICATION,
    index: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    index: true
  },
  accountType: {
    type: String,
    enum: Object.values(AccountType),
    default: AccountType.PERSONAL,
    index: true
  },
  verificationStatus: {
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.UNVERIFIED,
    index: true
  },
  kycStatus: {
    type: String,
    trim: true
  },
  amlStatus: {
    type: String,
    trim: true
  },
  riskLevel: {
    type: String,
    trim: true
  },
  complianceRecordId: {
    type: String,
    trim: true,
    index: true
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorMethod: {
    type: String,
    enum: Object.values(TwoFactorMethod),
    default: TwoFactorMethod.NONE
  },
  twoFactorSecret: {
    type: String,
    trim: true
  },
  twoFactorBackupCodes: [{
    type: String,
    trim: true
  }],
  securityQuestions: [SecurityQuestionSchema],
  loginMethods: [{
    type: String,
    enum: Object.values(LoginMethod),
    default: LoginMethod.PASSWORD
  }],
  socialLogins: [SocialLoginSchema],
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({})
  },
  documents: [UserDocumentSchema],
  sessions: [UserSessionSchema],
  activities: [UserActivitySchema],
  notifications: [UserNotificationSchema],
  apiKeys: [ApiKeySchema],
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  lastLoginAt: {
    type: Date
  },
  lastActiveAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  },
  suspendedAt: {
    type: Date
  },
  suspensionReason: {
    type: String,
    trim: true
  },
  suspendedBy: {
    type: String,
    trim: true
  },
  reactivatedAt: {
    type: Date
  },
  reactivatedBy: {
    type: String,
    trim: true
  },
  termsAcceptedAt: {
    type: Date
  },
  privacyPolicyAcceptedAt: {
    type: Date
  },
  marketingOptIn: {
    type: Boolean,
    default: false
  },
  marketingOptInAt: {
    type: Date
  },
  dataProcessingConsent: {
    type: Boolean,
    required: true
  },
  dataProcessingConsentAt: {
    type: Date
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  referredBy: {
    type: String,
    trim: true
  },
  referralCount: {
    type: Number,
    default: 0
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  subscriptionTier: {
    type: String,
    trim: true
  },
  subscriptionExpiresAt: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ phone: 1, phoneVerified: 1 });
UserSchema.index({ status: 1, role: 1 });
UserSchema.index({ verificationStatus: 1, accountType: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ updatedAt: -1 });
UserSchema.index({ lastLoginAt: -1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ referralCode: 1 });
UserSchema.index({ complianceRecordId: 1 });
UserSchema.index({ 'sessions.sessionToken': 1 });
UserSchema.index({ 'sessions.expiresAt': 1 });
UserSchema.index({ 'apiKeys.key': 1 });
UserSchema.index({ 'activities.type': 1, 'activities.timestamp': -1 });
UserSchema.index({ 'notifications.isRead': 1, 'notifications.createdAt': -1 });

// Virtual properties
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.virtual('isActive').get(function() {
  return this.status === UserStatus.ACTIVE;
});

UserSchema.virtual('isVerified').get(function() {
  return this.verificationStatus === VerificationStatus.VERIFIED;
});

UserSchema.virtual('isSuspended').get(function() {
  return this.status === UserStatus.SUSPENDED;
});

UserSchema.virtual('isBlocked').get(function() {
  return this.status === UserStatus.BLOCKED;
});

UserSchema.virtual('isDeleted').get(function() {
  return this.status === UserStatus.DELETED || !!this.deletedAt;
});

UserSchema.virtual('isPremiumUser').get(function() {
  return this.accountType === AccountType.PREMIUM || this.accountType === AccountType.ENTERPRISE;
});

UserSchema.virtual('isTrialUser').get(function() {
  return !!this.trialEndsAt && this.trialEndsAt > new Date();
});

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

UserSchema.virtual('activeSessions').get(function() {
  return this.sessions.filter(session => 
    session.isActive && session.expiresAt > new Date()
  );
});

UserSchema.virtual('unreadNotifications').get(function() {
  return this.notifications.filter(notification => !notification.isRead);
});

UserSchema.virtual('activeApiKeys').get(function() {
  return this.apiKeys.filter(apiKey => 
    apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt > new Date())
  );
});

UserSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(address => address.isDefault);
});

UserSchema.virtual('defaultPhone').get(function() {
  return this.phones.find(phone => phone.isDefault);
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.hashPassword = async function(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
};

UserSchema.methods.updatePassword = async function(newPassword: string): Promise<void> {
  // Add current password to history
  if (this.password) {
    this.passwordHistory.push(this.password);
    // Keep only last 5 passwords
    if (this.passwordHistory.length > 5) {
      this.passwordHistory = this.passwordHistory.slice(-5);
    }
  }
  
  this.password = await this.hashPassword(newPassword);
  this.passwordChangedAt = new Date();
  this.lastPasswordChange = new Date();
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

UserSchema.methods.generateReferralCode = function(): string {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.referralCode = `${this.firstName.substring(0, 2).toUpperCase()}${code}`;
  return this.referralCode;
};

UserSchema.methods.addActivity = function(activity: Partial<IUserActivity>): void {
  const activityId = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.activities.push({
    id: activityId,
    userId: this.id,
    timestamp: new Date(),
    ...activity
  } as IUserActivity);
};

UserSchema.methods.addNotification = function(notification: Partial<IUserNotification>): void {
  const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.notifications.push({
    id: notificationId,
    userId: this.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...notification
  } as IUserNotification);
};

UserSchema.methods.addSession = function(session: Partial<IUserSession>): void {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.sessions.push({
    id: sessionId,
    userId: this.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...session
  } as IUserSession);
};

UserSchema.methods.terminateSession = function(sessionId: string, reason?: string): boolean {
  const session = this.sessions.find(s => s.id === sessionId);
  if (session) {
    session.isActive = false;
    session.status = SessionStatus.TERMINATED;
    session.terminatedAt = new Date();
    session.terminationReason = reason;
    return true;
  }
  return false;
};

UserSchema.methods.terminateAllSessions = function(except?: string, reason?: string): number {
  let terminatedCount = 0;
  this.sessions.forEach(session => {
    if (session.isActive && session.id !== except) {
      session.isActive = false;
      session.status = SessionStatus.TERMINATED;
      session.terminatedAt = new Date();
      session.terminationReason = reason || 'All sessions terminated';
      terminatedCount++;
    }
  });
  return terminatedCount;
};

UserSchema.methods.addDocument = function(document: Partial<IUserDocument>): void {
  const documentId = `document_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.documents.push({
    id: documentId,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    ...document
  } as IUserDocument);
};

UserSchema.methods.addApiKey = function(apiKey: Partial<IApiKey>): void {
  const apiKeyId = `apikey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.apiKeys.push({
    id: apiKeyId,
    userId: this.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...apiKey
  } as IApiKey);
};

UserSchema.methods.revokeApiKey = function(apiKeyId: string, reason?: string): boolean {
  const apiKey = this.apiKeys.find(key => key.id === apiKeyId);
  if (apiKey) {
    apiKey.isActive = false;
    apiKey.revokedAt = new Date();
    apiKey.revocationReason = reason;
    return true;
  }
  return false;
};

UserSchema.methods.updateLastActivity = function(): void {
  this.lastActiveAt = new Date();
};

UserSchema.methods.suspend = function(reason?: string, suspendedBy?: string): void {
  this.status = UserStatus.SUSPENDED;
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  this.suspendedBy = suspendedBy;
  
  // Terminate all active sessions
  this.terminateAllSessions(undefined, 'Account suspended');
};

UserSchema.methods.reactivate = function(reactivatedBy?: string): void {
  this.status = UserStatus.ACTIVE;
  this.reactivatedAt = new Date();
  this.reactivatedBy = reactivatedBy;
  this.suspendedAt = undefined;
  this.suspensionReason = undefined;
  this.suspendedBy = undefined;
};

UserSchema.methods.softDelete = function(): void {
  this.status = UserStatus.DELETED;
  this.deletedAt = new Date();
  
  // Terminate all active sessions
  this.terminateAllSessions(undefined, 'Account deleted');
  
  // Revoke all API keys
  this.apiKeys.forEach(apiKey => {
    if (apiKey.isActive) {
      apiKey.isActive = false;
      apiKey.revokedAt = new Date();
      apiKey.revocationReason = 'Account deleted';
    }
  });
};

UserSchema.methods.canLogin = function(): boolean {
  return this.status === UserStatus.ACTIVE && !this.isDeleted;
};

UserSchema.methods.needsPasswordChange = function(): boolean {
  if (!this.preferences.security.requirePasswordChange) return false;
  if (!this.lastPasswordChange) return true;
  
  const daysSinceLastChange = Math.floor(
    (Date.now() - this.lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceLastChange >= this.preferences.security.passwordChangeInterval;
};

UserSchema.methods.isPasswordInHistory = async function(password: string): Promise<boolean> {
  for (const historicalPassword of this.passwordHistory) {
    if (await bcrypt.compare(password, historicalPassword)) {
      return true;
    }
  }
  return false;
};

UserSchema.methods.toSafeObject = function(): any {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordHistory;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  delete obj.phoneVerificationToken;
  delete obj.twoFactorSecret;
  delete obj.twoFactorBackupCodes;
  delete obj.securityQuestions;
  delete obj.apiKeys;
  delete obj.__v;
  return obj;
};

// Static methods
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone });
};

UserSchema.statics.findByReferralCode = function(referralCode: string) {
  return this.findOne({ referralCode });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ status: UserStatus.ACTIVE });
};

UserSchema.statics.findVerifiedUsers = function() {
  return this.find({ verificationStatus: VerificationStatus.VERIFIED });
};

UserSchema.statics.findSuspendedUsers = function() {
  return this.find({ status: UserStatus.SUSPENDED });
};

UserSchema.statics.findDeletedUsers = function() {
  return this.find({ status: UserStatus.DELETED });
};

UserSchema.statics.findByRole = function(role: UserRole) {
  return this.find({ role });
};

UserSchema.statics.findByAccountType = function(accountType: AccountType) {
  return this.find({ accountType });
};

UserSchema.statics.searchUsers = function(query: string, options: any = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { displayName: searchRegex }
    ],
    ...options.filter
  };
  
  return this.find(filter)
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .sort(options.sort || { createdAt: -1 });
};

UserSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] }
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', VerificationStatus.VERIFIED] }, 1, 0] }
        },
        suspendedUsers: {
          $sum: { $cond: [{ $eq: ['$status', UserStatus.SUSPENDED] }, 1, 0] }
        },
        deletedUsers: {
          $sum: { $cond: [{ $eq: ['$status', UserStatus.DELETED] }, 1, 0] }
        },
        premiumUsers: {
          $sum: { $cond: [{ $in: ['$accountType', [AccountType.PREMIUM, AccountType.ENTERPRISE]] }, 1, 0] }
        },
        twoFactorUsers: {
          $sum: { $cond: ['$twoFactorEnabled', 1, 0] }
        }
      }
    }
  ]);
};

// Pre-save middleware
UserSchema.pre('save', async function(next) {
  // Generate ID if not provided
  if (!this.id) {
    this.id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Hash password if modified
  if (this.isModified('password') && !this.password.startsWith('$2')) {
    this.password = await this.hashPassword(this.password);
  }
  
  // Generate referral code if not provided
  if (!this.referralCode && this.firstName) {
    this.generateReferralCode();
  }
  
  // Set display name if not provided
  if (!this.displayName) {
    this.displayName = this.fullName;
  }
  
  // Update verification status based on email and phone verification
  if (this.emailVerified && this.phoneVerified && this.verificationStatus === VerificationStatus.UNVERIFIED) {
    this.verificationStatus = VerificationStatus.VERIFIED;
  }
  
  // Activate user if verified and currently pending
  if (this.verificationStatus === VerificationStatus.VERIFIED && this.status === UserStatus.PENDING_VERIFICATION) {
    this.status = UserStatus.ACTIVE;
  }
  
  next();
});

// Pre-update middleware
UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Post-save middleware
UserSchema.post('save', function(doc) {
  console.log(`User saved: ${doc.id} (${doc.email})`);
});

// Transform output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.passwordHistory;
    delete ret.passwordResetToken;
    delete ret.emailVerificationToken;
    delete ret.phoneVerificationToken;
    delete ret.twoFactorSecret;
    delete ret.twoFactorBackupCodes;
    return ret;
  }
});

// Interface for TypeScript
export interface IUserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  findByReferralCode(referralCode: string): Promise<IUser | null>;
  findActiveUsers(): Promise<IUser[]>;
  findVerifiedUsers(): Promise<IUser[]>;
  findSuspendedUsers(): Promise<IUser[]>;
  findDeletedUsers(): Promise<IUser[]>;
  findByRole(role: UserRole): Promise<IUser[]>;
  findByAccountType(accountType: AccountType): Promise<IUser[]>;
  searchUsers(query: string, options?: any): Promise<IUser[]>;
  getUserStats(): Promise<any[]>;
}

export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);
export default User;

