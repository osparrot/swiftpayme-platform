import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { 
  UserRequest, 
  ServiceResponse,
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
  IUserAuditRequest
} from '../types';
import { 
  UserStatus, 
  UserRole, 
  AccountType, 
  VerificationStatus,
  ActivityType,
  NotificationEventType,
  ErrorCode
} from '../enums/userEnums';
import { Logger } from '../utils/Logger';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  UnauthorizedError,
  ForbiddenError,
  BadRequestError
} from '../utils/Errors';
import { ValidationSchemas } from '../utils/ValidationSchemas';
import { AuditService } from '../utils/AuditService';
import { MetricsCollector } from '../utils/MetricsCollector';
import { NotificationService } from '../utils/NotificationService';
import { EmailService } from '../utils/EmailService';
import { SmsService } from '../utils/SmsService';
import { FileUploadService } from '../utils/FileUploadService';
import { TwoFactorService } from '../utils/TwoFactorService';
import { DeviceDetectionService } from '../utils/DeviceDetectionService';
import { LocationService } from '../utils/LocationService';
import { RiskAssessmentService } from '../utils/RiskAssessmentService';

export class UserController {
  private logger: Logger;
  private auditService: AuditService;
  private metricsCollector: MetricsCollector;
  private notificationService: NotificationService;
  private emailService: EmailService;
  private smsService: SmsService;
  private fileUploadService: FileUploadService;
  private twoFactorService: TwoFactorService;
  private deviceDetectionService: DeviceDetectionService;
  private locationService: LocationService;
  private riskAssessmentService: RiskAssessmentService;

  constructor() {
    this.logger = new Logger('UserController');
    this.auditService = new AuditService();
    this.metricsCollector = new MetricsCollector();
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
    this.smsService = new SmsService();
    this.fileUploadService = new FileUploadService();
    this.twoFactorService = new TwoFactorService();
    this.deviceDetectionService = new DeviceDetectionService();
    this.locationService = new LocationService();
    this.riskAssessmentService = new RiskAssessmentService();
  }

  // User Registration
  public async register(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      this.logger.info('User registration attempt', { requestId, email: req.body.email });

      // Validate request
      const { error, value } = ValidationSchemas.userRegistration.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const registrationData: IUserRegistrationRequest = value;

      // Check if user already exists
      const existingUser = await User.findByEmail(registrationData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Check phone if provided
      if (registrationData.phone) {
        const existingPhoneUser = await User.findByPhone(registrationData.phone);
        if (existingPhoneUser) {
          throw new ConflictError('User with this phone number already exists');
        }
      }

      // Validate referral code if provided
      let referrer = null;
      if (registrationData.referralCode) {
        referrer = await User.findByReferralCode(registrationData.referralCode);
        if (!referrer) {
          throw new BadRequestError('Invalid referral code');
        }
      }

      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const emailVerificationToken = uuidv4();
      const phoneVerificationToken = registrationData.phone ? Math.random().toString().substring(2, 8) : undefined;

      const user = new User({
        id: userId,
        email: registrationData.email,
        password: registrationData.password,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phone: registrationData.phone,
        dateOfBirth: registrationData.dateOfBirth,
        accountType: registrationData.accountType || AccountType.PERSONAL,
        referredBy: referrer?.id,
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        phoneVerificationToken,
        phoneVerificationExpires: registrationData.phone ? new Date(Date.now() + 10 * 60 * 1000) : undefined, // 10 minutes
        termsAcceptedAt: registrationData.termsAccepted ? new Date() : undefined,
        privacyPolicyAcceptedAt: registrationData.privacyPolicyAccepted ? new Date() : undefined,
        marketingOptIn: registrationData.marketingOptIn || false,
        marketingOptInAt: registrationData.marketingOptIn ? new Date() : undefined,
        dataProcessingConsent: registrationData.dataProcessingConsent,
        dataProcessingConsentAt: new Date(),
        metadata: registrationData.metadata || new Map()
      });

      await user.save();

      // Update referrer's referral count
      if (referrer) {
        referrer.referralCount += 1;
        await referrer.save();
      }

      // Send verification emails/SMS
      if (user.emailVerificationToken) {
        await this.emailService.sendEmailVerification(user.email, user.emailVerificationToken);
      }

      if (user.phone && user.phoneVerificationToken) {
        await this.smsService.sendPhoneVerification(user.phone, user.phoneVerificationToken);
      }

      // Log activity
      user.addActivity({
        type: ActivityType.LOGIN,
        description: 'User registered',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      // Send audit event
      await this.auditService.logUserEvent({
        userId: user.id,
        eventType: 'user_created',
        details: {
          email: user.email,
          accountType: user.accountType,
          referredBy: referrer?.id
        },
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        requestId
      });

      // Send welcome notification
      user.addNotification({
        type: NotificationEventType.WELCOME,
        channel: 'email',
        title: 'Welcome to Swiftpay!',
        message: 'Thank you for joining Swiftpay. Please verify your email to get started.',
        priority: 'normal'
      });

      await user.save();

      // Collect metrics
      this.metricsCollector.incrementCounter('user_registrations_total');
      this.metricsCollector.incrementCounter('user_registrations_by_type', { type: user.accountType });

      this.logger.info('User registered successfully', { requestId, userId: user.id, email: user.email });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject(),
          message: 'Registration successful. Please check your email for verification instructions.'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // User Login
  public async login(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      this.logger.info('User login attempt', { requestId, email: req.body.email });

      // Validate request
      const { error, value } = ValidationSchemas.userLogin.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const loginData: IUserLoginRequest = value;

      // Find user
      const user = await User.findByEmail(loginData.email);
      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if user can login
      if (!user.canLogin()) {
        throw new ForbiddenError('Account is not active');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        // Log failed login attempt
        user.addActivity({
          type: ActivityType.FAILED_LOGIN,
          description: 'Failed login attempt - invalid password',
          success: false,
          ipAddress: req.clientIp,
          userAgent: req.userAgent
        });
        await user.save();

        this.metricsCollector.incrementCounter('user_login_failures_total');
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if two-factor authentication is required
      if (user.twoFactorEnabled && !loginData.twoFactorCode) {
        const response: ServiceResponse = {
          success: false,
          error: {
            code: ErrorCode.TWO_FACTOR_REQUIRED,
            message: 'Two-factor authentication required'
          },
          requestId,
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
        return;
      }

      // Verify two-factor code if provided
      if (user.twoFactorEnabled && loginData.twoFactorCode) {
        const isTwoFactorValid = await this.twoFactorService.verifyCode(
          user.twoFactorSecret!,
          loginData.twoFactorCode
        );
        if (!isTwoFactorValid) {
          throw new UnauthorizedError('Invalid two-factor authentication code');
        }
      }

      // Detect device and location
      const deviceInfo = await this.deviceDetectionService.detectDevice(req.userAgent || '');
      const locationInfo = await this.locationService.getLocationInfo(req.clientIp || '');

      // Assess risk
      const riskScore = await this.riskAssessmentService.assessLoginRisk({
        user,
        deviceInfo,
        locationInfo,
        ipAddress: req.clientIp
      });

      // Generate session
      const sessionToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          sessionId: uuidv4()
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Create session
      user.addSession({
        sessionToken,
        refreshToken,
        deviceInfo,
        ipAddress: req.clientIp || '',
        location: locationInfo,
        userAgent: req.userAgent || '',
        loginMethod: 'password',
        twoFactorVerified: user.twoFactorEnabled,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isTrusted: loginData.rememberDevice || false
      });

      // Update user login info
      user.lastLoginAt = new Date();
      user.lastActiveAt = new Date();

      // Log activity
      user.addActivity({
        type: ActivityType.LOGIN,
        description: 'User logged in successfully',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        riskScore
      });

      await user.save();

      // Send login notification if enabled
      if (user.preferences.security.loginNotifications) {
        user.addNotification({
          type: NotificationEventType.LOGIN_ALERT,
          channel: 'email',
          title: 'New Login Detected',
          message: `A new login was detected from ${locationInfo?.city || 'Unknown location'}`,
          priority: 'normal',
          data: new Map(Object.entries({
            deviceInfo,
            locationInfo,
            timestamp: new Date().toISOString()
          }))
        });
      }

      // Collect metrics
      this.metricsCollector.incrementCounter('user_logins_total');
      this.metricsCollector.incrementCounter('user_logins_by_method', { method: 'password' });
      this.metricsCollector.recordHistogram('login_risk_score', riskScore);

      this.logger.info('User logged in successfully', { requestId, userId: user.id, email: user.email });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject(),
          tokens: {
            accessToken: sessionToken,
            refreshToken,
            expiresIn: 24 * 60 * 60 // 24 hours in seconds
          },
          session: {
            deviceInfo,
            locationInfo,
            riskScore
          }
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Get User Profile
  public async getProfile(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.params.userId || req.user?.id;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      this.logger.info('Get user profile', { requestId, userId });

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check permissions
      if (req.user?.id !== userId && !this.hasAdminPermissions(req.user?.role)) {
        throw new ForbiddenError('Access denied');
      }

      // Update last activity
      if (req.user?.id === userId) {
        user.updateLastActivity();
        await user.save();
      }

      this.logger.info('User profile retrieved', { requestId, userId });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject()
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Update User Profile
  public async updateProfile(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.params.userId || req.user?.id;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      this.logger.info('Update user profile', { requestId, userId });

      // Validate request
      const { error, value } = ValidationSchemas.userUpdate.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const updateData: IUserUpdateRequest = value;

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check permissions
      if (req.user?.id !== userId && !this.hasAdminPermissions(req.user?.role)) {
        throw new ForbiddenError('Access denied');
      }

      // Store original data for audit
      const originalData = {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth
      };

      // Update user fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof IUserUpdateRequest] !== undefined) {
          (user as any)[key] = updateData[key as keyof IUserUpdateRequest];
        }
      });

      // If phone number changed, reset phone verification
      if (updateData.phone && updateData.phone !== originalData.phone) {
        user.phoneVerified = false;
        user.phoneVerificationToken = Math.random().toString().substring(2, 8);
        user.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Send verification SMS
        await this.smsService.sendPhoneVerification(user.phone, user.phoneVerificationToken);
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.PROFILE_UPDATE,
        description: 'User profile updated',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        details: new Map(Object.entries({
          updatedFields: Object.keys(updateData),
          originalData,
          newData: updateData
        }))
      });

      // Send audit event
      await this.auditService.logUserEvent({
        userId: user.id,
        eventType: 'profile_updated',
        details: {
          updatedFields: Object.keys(updateData),
          changes: updateData
        },
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        requestId
      });

      this.logger.info('User profile updated', { requestId, userId });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject(),
          message: 'Profile updated successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Change Password
  public async changePassword(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      this.logger.info('Change password attempt', { requestId, userId });

      // Validate request
      const { error, value } = ValidationSchemas.passwordChange.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const passwordData: IPasswordChangeRequest = value;

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(passwordData.currentPassword);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Check if new password is in history
      const isPasswordInHistory = await user.isPasswordInHistory(passwordData.newPassword);
      if (isPasswordInHistory) {
        throw new BadRequestError('Cannot reuse a previous password');
      }

      // Update password
      await user.updatePassword(passwordData.newPassword);

      // Terminate all sessions except current one if requested
      if (passwordData.logoutAllSessions) {
        user.terminateAllSessions(req.user?.sessionId, 'Password changed');
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.PASSWORD_CHANGE,
        description: 'Password changed successfully',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      // Send notification
      user.addNotification({
        type: NotificationEventType.PASSWORD_CHANGED,
        channel: 'email',
        title: 'Password Changed',
        message: 'Your password has been changed successfully.',
        priority: 'high'
      });

      // Send audit event
      await this.auditService.logUserEvent({
        userId: user.id,
        eventType: 'password_changed',
        details: {
          logoutAllSessions: passwordData.logoutAllSessions
        },
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        requestId
      });

      this.logger.info('Password changed successfully', { requestId, userId });

      const response: ServiceResponse = {
        success: true,
        data: {
          message: 'Password changed successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Request Password Reset
  public async requestPasswordReset(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      this.logger.info('Password reset request', { requestId, email: req.body.email });

      // Validate request
      const { error, value } = ValidationSchemas.passwordResetRequest.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const resetData: IPasswordResetRequest = value;

      const user = await User.findByEmail(resetData.email);
      if (!user) {
        // Don't reveal if user exists or not
        const response: ServiceResponse = {
          success: true,
          data: {
            message: 'If an account with this email exists, a password reset link has been sent.'
          },
          requestId,
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
        return;
      }

      // Generate reset token
      const resetToken = uuidv4();
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await user.save();

      // Send reset email
      await this.emailService.sendPasswordReset(user.email, resetToken, resetData.resetUrl);

      // Log activity
      user.addActivity({
        type: ActivityType.PASSWORD_RESET,
        description: 'Password reset requested',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      this.logger.info('Password reset email sent', { requestId, userId: user.id });

      const response: ServiceResponse = {
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent.'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Confirm Password Reset
  public async confirmPasswordReset(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      this.logger.info('Password reset confirmation', { requestId });

      // Validate request
      const { error, value } = ValidationSchemas.passwordResetConfirm.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const resetData: IPasswordResetConfirmRequest = value;

      const user = await User.findOne({
        passwordResetToken: resetData.token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Check if new password is in history
      const isPasswordInHistory = await user.isPasswordInHistory(resetData.newPassword);
      if (isPasswordInHistory) {
        throw new BadRequestError('Cannot reuse a previous password');
      }

      // Update password
      await user.updatePassword(resetData.newPassword);

      // Terminate all sessions
      user.terminateAllSessions(undefined, 'Password reset');

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.PASSWORD_RESET,
        description: 'Password reset completed',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      // Send notification
      user.addNotification({
        type: NotificationEventType.PASSWORD_CHANGED,
        channel: 'email',
        title: 'Password Reset Complete',
        message: 'Your password has been reset successfully.',
        priority: 'high'
      });

      this.logger.info('Password reset completed', { requestId, userId: user.id });

      const response: ServiceResponse = {
        success: true,
        data: {
          message: 'Password reset successfully. Please log in with your new password.'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Verify Email
  public async verifyEmail(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      this.logger.info('Email verification attempt', { requestId });

      // Validate request
      const { error, value } = ValidationSchemas.emailVerification.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const verificationData: IEmailVerificationRequest = value;

      const user = await User.findOne({
        emailVerificationToken: verificationData.token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired verification token');
      }

      if (user.emailVerified) {
        throw new BadRequestError('Email is already verified');
      }

      // Verify email
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;

      // Update verification status if both email and phone are verified (or phone not required)
      if (!user.phone || user.phoneVerified) {
        user.verificationStatus = VerificationStatus.VERIFIED;
        if (user.status === UserStatus.PENDING_VERIFICATION) {
          user.status = UserStatus.ACTIVE;
        }
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.EMAIL_VERIFICATION,
        description: 'Email verified successfully',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      // Send welcome notification if fully verified
      if (user.verificationStatus === VerificationStatus.VERIFIED) {
        user.addNotification({
          type: NotificationEventType.VERIFICATION_COMPLETED,
          channel: 'email',
          title: 'Account Verified!',
          message: 'Your account has been fully verified. Welcome to Swiftpay!',
          priority: 'normal'
        });
      }

      this.logger.info('Email verified successfully', { requestId, userId: user.id });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject(),
          message: 'Email verified successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Verify Phone
  public async verifyPhone(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      this.logger.info('Phone verification attempt', { requestId, userId });

      // Validate request
      const { error, value } = ValidationSchemas.phoneVerification.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const verificationData: IPhoneVerificationRequest = value;

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.phone || user.phone !== verificationData.phone) {
        throw new BadRequestError('Phone number does not match');
      }

      if (user.phoneVerified) {
        throw new BadRequestError('Phone is already verified');
      }

      if (!user.phoneVerificationToken || user.phoneVerificationExpires! < new Date()) {
        throw new BadRequestError('Verification code has expired');
      }

      if (user.phoneVerificationToken !== verificationData.code) {
        throw new BadRequestError('Invalid verification code');
      }

      // Verify phone
      user.phoneVerified = true;
      user.phoneVerificationToken = undefined;
      user.phoneVerificationExpires = undefined;

      // Update verification status if email is also verified
      if (user.emailVerified) {
        user.verificationStatus = VerificationStatus.VERIFIED;
        if (user.status === UserStatus.PENDING_VERIFICATION) {
          user.status = UserStatus.ACTIVE;
        }
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.PHONE_VERIFICATION,
        description: 'Phone verified successfully',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      // Send welcome notification if fully verified
      if (user.verificationStatus === VerificationStatus.VERIFIED) {
        user.addNotification({
          type: NotificationEventType.VERIFICATION_COMPLETED,
          channel: 'email',
          title: 'Account Verified!',
          message: 'Your account has been fully verified. Welcome to Swiftpay!',
          priority: 'normal'
        });
      }

      this.logger.info('Phone verified successfully', { requestId, userId });

      const response: ServiceResponse = {
        success: true,
        data: {
          user: user.toSafeObject(),
          message: 'Phone verified successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Get User Sessions
  public async getSessions(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      this.logger.info('Get user sessions', { requestId, userId });

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Filter active sessions
      const activeSessions = user.sessions.filter(session => 
        session.isActive && session.expiresAt > new Date()
      );

      this.logger.info('User sessions retrieved', { requestId, userId, sessionCount: activeSessions.length });

      const response: ServiceResponse = {
        success: true,
        data: {
          sessions: activeSessions.map(session => ({
            id: session.id,
            deviceInfo: session.deviceInfo,
            location: session.location,
            ipAddress: session.ipAddress,
            loginMethod: session.loginMethod,
            isTrusted: session.isTrusted,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
            expiresAt: session.expiresAt
          }))
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Terminate Session
  public async terminateSession(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.user?.id;
      const sessionId = req.params.sessionId;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!sessionId) {
        throw new BadRequestError('Session ID is required');
      }

      this.logger.info('Terminate session', { requestId, userId, sessionId });

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const terminated = user.terminateSession(sessionId, 'Terminated by user');
      if (!terminated) {
        throw new NotFoundError('Session not found');
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.LOGOUT,
        description: 'Session terminated',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        details: new Map(Object.entries({ terminatedSessionId: sessionId }))
      });

      this.logger.info('Session terminated', { requestId, userId, sessionId });

      const response: ServiceResponse = {
        success: true,
        data: {
          message: 'Session terminated successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Logout (terminate current session)
  public async logout(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.user?.id;
      const sessionId = req.user?.sessionId;

      if (!userId || !sessionId) {
        throw new UnauthorizedError('Authentication required');
      }

      this.logger.info('User logout', { requestId, userId, sessionId });

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const terminated = user.terminateSession(sessionId, 'User logout');
      if (!terminated) {
        throw new NotFoundError('Session not found');
      }

      await user.save();

      // Log activity
      user.addActivity({
        type: ActivityType.LOGOUT,
        description: 'User logged out',
        success: true,
        ipAddress: req.clientIp,
        userAgent: req.userAgent
      });

      this.logger.info('User logged out', { requestId, userId });

      const response: ServiceResponse = {
        success: true,
        data: {
          message: 'Logged out successfully'
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Get User Activities
  public async getActivities(req: UserRequest, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const userId = req.params.userId || req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const type = req.query.type as ActivityType;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      this.logger.info('Get user activities', { requestId, userId, page, limit, type });

      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check permissions
      if (req.user?.id !== userId && !this.hasAdminPermissions(req.user?.role)) {
        throw new ForbiddenError('Access denied');
      }

      // Filter activities
      let activities = user.activities;
      if (type) {
        activities = activities.filter(activity => activity.type === type);
      }

      // Sort by timestamp (newest first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedActivities = activities.slice(startIndex, endIndex);

      this.logger.info('User activities retrieved', { 
        requestId, 
        userId, 
        totalActivities: activities.length,
        returnedActivities: paginatedActivities.length 
      });

      const response: ServiceResponse = {
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            page,
            limit,
            total: activities.length,
            pages: Math.ceil(activities.length / limit)
          }
        },
        requestId,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Health Check
  public async healthCheck(req: UserRequest, res: Response): Promise<void> {
    try {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'user-service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.SERVICE_VERSION || '1.0.0'
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // Helper Methods
  private hasAdminPermissions(role?: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.MODERATOR || role === UserRole.SUPPORT;
  }

  private handleError(error: any, req: UserRequest, res: Response): void {
    const requestId = req.requestId || uuidv4();
    
    this.logger.error('Controller error', {
      requestId,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    let statusCode = 500;
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorCode = ErrorCode.VALIDATION_ERROR;
      message = error.message;
    } else if (error instanceof NotFoundError) {
      statusCode = 404;
      errorCode = ErrorCode.RESOURCE_NOT_FOUND;
      message = error.message;
    } else if (error instanceof ConflictError) {
      statusCode = 409;
      errorCode = ErrorCode.RESOURCE_CONFLICT;
      message = error.message;
    } else if (error instanceof UnauthorizedError) {
      statusCode = 401;
      errorCode = ErrorCode.AUTHENTICATION_ERROR;
      message = error.message;
    } else if (error instanceof ForbiddenError) {
      statusCode = 403;
      errorCode = ErrorCode.AUTHORIZATION_ERROR;
      message = error.message;
    } else if (error instanceof BadRequestError) {
      statusCode = 400;
      errorCode = ErrorCode.INVALID_REQUEST_FORMAT;
      message = error.message;
    }

    const response: ServiceResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }
}

export default new UserController();

