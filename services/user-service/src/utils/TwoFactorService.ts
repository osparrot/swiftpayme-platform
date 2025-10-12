import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Logger } from './Logger';
import { SmsService } from './SmsService';
import { TwoFactorMethod } from '../enums/userEnums';

/**
 * Two-factor authentication service
 */
export class TwoFactorService {
  private static instance: TwoFactorService;
  private logger: Logger;
  private smsService: SmsService;

  private constructor() {
    this.logger = new Logger('TwoFactorService');
    this.smsService = SmsService.getInstance();
  }

  public static getInstance(): TwoFactorService {
    if (!TwoFactorService.instance) {
      TwoFactorService.instance = new TwoFactorService();
    }
    return TwoFactorService.instance;
  }

  /**
   * Generate TOTP secret and QR code
   */
  async generateTOTPSecret(userEmail: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: 'SwiftPayMe',
      length: 32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    const backupCodes = this.generateBackupCodes();

    this.logger.info('TOTP secret generated', {
      userEmail: userEmail.replace(/(.{3}).*(@.*)/, '$1***$2')
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTOTPCode(secret: string, token: string, window: number = 1): boolean {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window
    });

    this.logger.info('TOTP verification attempt', {
      success: verified,
      window
    });

    return verified;
  }

  /**
   * Generate and send SMS code
   */
  async generateAndSendSMSCode(phoneNumber: string): Promise<{
    success: boolean;
    code?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const result = await this.smsService.send2FACode({
        to: phoneNumber,
        code
      });

      if (result.success) {
        return {
          success: true,
          code,
          expiresAt
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error('SMS 2FA code generation failed', {
        error: error.message,
        phoneNumber: phoneNumber.replace(/(.{3}).*(.{4})/, '$1***$2')
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify SMS code
   */
  verifySMSCode(storedCode: string, providedCode: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      this.logger.warn('SMS code verification failed - expired');
      return false;
    }

    const verified = storedCode === providedCode;
    
    this.logger.info('SMS code verification attempt', {
      success: verified
    });

    return verified;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(backupCodes: string[], providedCode: string): {
    verified: boolean;
    remainingCodes?: string[];
  } {
    const codeIndex = backupCodes.indexOf(providedCode);
    
    if (codeIndex === -1) {
      this.logger.warn('Backup code verification failed - invalid code');
      return { verified: false };
    }

    // Remove used backup code
    const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);

    this.logger.info('Backup code verification successful', {
      remainingCodes: remainingCodes.length
    });

    return {
      verified: true,
      remainingCodes
    };
  }

  /**
   * Generate new backup codes
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      codes.push(this.generateBackupCode());
    }

    return codes;
  }

  /**
   * Generate SMS verification code
   */
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate backup code
   */
  private generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }
}

export default TwoFactorService;
