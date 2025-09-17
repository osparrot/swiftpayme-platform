export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  BLOCKED = 'blocked',
  DELETED = 'deleted'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  COMPLIANCE_OFFICER = 'compliance_officer',
  FINANCIAL_ANALYST = 'financial_analyst',
  SYSTEM = 'system'
}

export enum AccountType {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum NotificationPreference {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  NONE = 'none'
}

export enum TwoFactorMethod {
  NONE = 'none',
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp',
  BACKUP_CODES = 'backup_codes'
}

export enum SecurityQuestionType {
  MOTHERS_MAIDEN_NAME = 'mothers_maiden_name',
  FIRST_PET_NAME = 'first_pet_name',
  CHILDHOOD_FRIEND = 'childhood_friend',
  FIRST_SCHOOL = 'first_school',
  BIRTH_CITY = 'birth_city',
  FAVORITE_TEACHER = 'favorite_teacher',
  CUSTOM = 'custom'
}

export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  BILLING = 'billing',
  SHIPPING = 'shipping',
  OTHER = 'other'
}

export enum PhoneType {
  MOBILE = 'mobile',
  HOME = 'home',
  WORK = 'work',
  FAX = 'fax',
  OTHER = 'other'
}

export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  PROOF_OF_ADDRESS = 'proof_of_address',
  PROOF_OF_INCOME = 'proof_of_income',
  BUSINESS_REGISTRATION = 'business_registration',
  TAX_DOCUMENT = 'tax_document',
  OTHER = 'other'
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  UNDER_REVIEW = 'under_review'
}

export enum LoginMethod {
  PASSWORD = 'password',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  LINKEDIN = 'linkedin',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
  TWITTER = 'twitter'
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SUSPICIOUS = 'suspicious'
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
}

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  EMAIL_CHANGE = 'email_change',
  PHONE_CHANGE = 'phone_change',
  ADDRESS_CHANGE = 'address_change',
  DOCUMENT_UPLOAD = 'document_upload',
  VERIFICATION_REQUEST = 'verification_request',
  SECURITY_SETTING_CHANGE = 'security_setting_change',
  NOTIFICATION_SETTING_CHANGE = 'notification_setting_change',
  ACCOUNT_DELETION = 'account_deletion',
  ACCOUNT_SUSPENSION = 'account_suspension',
  ACCOUNT_REACTIVATION = 'account_reactivation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FAILED_LOGIN = 'failed_login',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PHONE_VERIFICATION = 'phone_verification',
  TWO_FACTOR_SETUP = 'two_factor_setup',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  API_KEY_GENERATED = 'api_key_generated',
  API_KEY_REVOKED = 'api_key_revoked'
}

export enum PreferenceCategory {
  NOTIFICATIONS = 'notifications',
  SECURITY = 'security',
  PRIVACY = 'privacy',
  COMMUNICATION = 'communication',
  MARKETING = 'marketing',
  DISPLAY = 'display',
  LANGUAGE = 'language',
  TIMEZONE = 'timezone',
  CURRENCY = 'currency',
  THEME = 'theme'
}

export enum PrivacyLevel {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated',
  DOMESTIC_PARTNERSHIP = 'domestic_partnership',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum EmploymentStatus {
  EMPLOYED = 'employed',
  UNEMPLOYED = 'unemployed',
  SELF_EMPLOYED = 'self_employed',
  STUDENT = 'student',
  RETIRED = 'retired',
  DISABLED = 'disabled',
  HOMEMAKER = 'homemaker',
  OTHER = 'other'
}

export enum IncomeRange {
  UNDER_25K = 'under_25k',
  RANGE_25K_50K = '25k_50k',
  RANGE_50K_75K = '50k_75k',
  RANGE_75K_100K = '75k_100k',
  RANGE_100K_150K = '100k_150k',
  RANGE_150K_250K = '150k_250k',
  OVER_250K = 'over_250k',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum ErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  PHONE_ALREADY_VERIFIED = 'PHONE_ALREADY_VERIFIED',
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  VERIFICATION_CODE_INVALID = 'VERIFICATION_CODE_INVALID',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR_CODE = 'INVALID_TWO_FACTOR_CODE',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  DOCUMENT_VERIFICATION_FAILED = 'DOCUMENT_VERIFICATION_FAILED',
  INVALID_DOCUMENT_TYPE = 'INVALID_DOCUMENT_TYPE',
  DOCUMENT_SIZE_EXCEEDED = 'DOCUMENT_SIZE_EXCEEDED',
  UNSUPPORTED_FILE_FORMAT = 'UNSUPPORTED_FILE_FORMAT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
  FIELD_TOO_LONG = 'FIELD_TOO_LONG',
  FIELD_TOO_SHORT = 'FIELD_TOO_SHORT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION'
}

export enum NotificationEventType {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PHONE_VERIFICATION = 'phone_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  PROFILE_UPDATED = 'profile_updated',
  SECURITY_ALERT = 'security_alert',
  LOGIN_ALERT = 'login_alert',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  DOCUMENT_VERIFIED = 'document_verified',
  DOCUMENT_REJECTED = 'document_rejected',
  VERIFICATION_COMPLETED = 'verification_completed',
  COMPLIANCE_UPDATE = 'compliance_update',
  PROMOTIONAL = 'promotional',
  NEWSLETTER = 'newsletter',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  FEATURE_ANNOUNCEMENT = 'feature_announcement'
}

export enum AuditEventType {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_CHANGED = 'email_changed',
  PHONE_CHANGED = 'phone_changed',
  PROFILE_UPDATED = 'profile_updated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_VERIFIED = 'document_verified',
  VERIFICATION_STATUS_CHANGED = 'verification_status_changed',
  ACCOUNT_STATUS_CHANGED = 'account_status_changed',
  SECURITY_SETTINGS_CHANGED = 'security_settings_changed',
  PRIVACY_SETTINGS_CHANGED = 'privacy_settings_changed',
  NOTIFICATION_SETTINGS_CHANGED = 'notification_settings_changed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  FAILED_LOGIN_ATTEMPT = 'failed_login_attempt',
  SUSPICIOUS_ACTIVITY_DETECTED = 'suspicious_activity_detected',
  API_KEY_GENERATED = 'api_key_generated',
  API_KEY_REVOKED = 'api_key_revoked',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_EVENT = 'system_event'
}

export enum DataRetentionPeriod {
  DAYS_30 = 30,
  DAYS_90 = 90,
  DAYS_180 = 180,
  YEAR_1 = 365,
  YEARS_3 = 1095,
  YEARS_5 = 1825,
  YEARS_7 = 2555,
  YEARS_10 = 3650,
  PERMANENT = -1
}

export enum UserMetric {
  TOTAL_USERS = 'total_users',
  ACTIVE_USERS = 'active_users',
  NEW_REGISTRATIONS = 'new_registrations',
  VERIFIED_USERS = 'verified_users',
  SUSPENDED_USERS = 'suspended_users',
  DELETED_USERS = 'deleted_users',
  LOGIN_RATE = 'login_rate',
  VERIFICATION_RATE = 'verification_rate',
  RETENTION_RATE = 'retention_rate',
  CHURN_RATE = 'churn_rate',
  AVERAGE_SESSION_DURATION = 'average_session_duration',
  FAILED_LOGIN_RATE = 'failed_login_rate',
  TWO_FACTOR_ADOPTION_RATE = 'two_factor_adoption_rate',
  DOCUMENT_UPLOAD_RATE = 'document_upload_rate',
  SUPPORT_TICKET_RATE = 'support_ticket_rate',
  USER_SATISFACTION_SCORE = 'user_satisfaction_score'
}

export default {
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
  ErrorCode,
  NotificationEventType,
  AuditEventType,
  DataRetentionPeriod,
  UserMetric
};

