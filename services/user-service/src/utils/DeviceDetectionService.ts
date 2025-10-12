import { Logger } from './Logger';

/**
 * Device information interface
 */
export interface DeviceInfo {
  id: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  userAgent: string;
  fingerprint: string;
  isTrusted: boolean;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

/**
 * Device detection service
 */
export class DeviceDetectionService {
  private static instance: DeviceDetectionService;
  private logger: Logger;
  private trustedDevices: Map<string, DeviceInfo>;

  private constructor() {
    this.logger = new Logger('DeviceDetectionService');
    this.trustedDevices = new Map();
  }

  public static getInstance(): DeviceDetectionService {
    if (!DeviceDetectionService.instance) {
      DeviceDetectionService.instance = new DeviceDetectionService();
    }
    return DeviceDetectionService.instance;
  }

  /**
   * Detect device from user agent and other headers
   */
  detectDevice(userAgent: string, headers: Record<string, string>): DeviceInfo {
    const deviceInfo: DeviceInfo = {
      id: this.generateDeviceId(userAgent, headers),
      type: this.detectDeviceType(userAgent),
      os: this.detectOS(userAgent),
      browser: this.detectBrowser(userAgent),
      userAgent,
      fingerprint: this.generateFingerprint(userAgent, headers),
      isTrusted: false,
      lastSeen: new Date(),
      metadata: {
        acceptLanguage: headers['accept-language'],
        acceptEncoding: headers['accept-encoding'],
        connection: headers.connection
      }
    };

    // Check if device is trusted
    const existingDevice = this.trustedDevices.get(deviceInfo.id);
    if (existingDevice) {
      deviceInfo.isTrusted = existingDevice.isTrusted;
      deviceInfo.lastSeen = new Date();
      this.trustedDevices.set(deviceInfo.id, deviceInfo);
    }

    this.logger.info('Device detected', {
      deviceId: deviceInfo.id,
      type: deviceInfo.type,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      isTrusted: deviceInfo.isTrusted
    });

    return deviceInfo;
  }

  /**
   * Trust a device
   */
  trustDevice(deviceId: string): boolean {
    const device = this.trustedDevices.get(deviceId);
    if (device) {
      device.isTrusted = true;
      this.trustedDevices.set(deviceId, device);
      
      this.logger.info('Device trusted', { deviceId });
      return true;
    }
    return false;
  }

  /**
   * Untrust a device
   */
  untrustDevice(deviceId: string): boolean {
    const device = this.trustedDevices.get(deviceId);
    if (device) {
      device.isTrusted = false;
      this.trustedDevices.set(deviceId, device);
      
      this.logger.info('Device untrusted', { deviceId });
      return true;
    }
    return false;
  }

  /**
   * Get trusted devices for a user
   */
  getTrustedDevices(userId: string): DeviceInfo[] {
    // In a real implementation, this would query the database
    return Array.from(this.trustedDevices.values()).filter(device => device.isTrusted);
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    
    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  /**
   * Detect operating system from user agent
   */
  private detectOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('windows nt 10.0')) return 'Windows 10';
    if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
    if (ua.includes('windows nt 6.2')) return 'Windows 8';
    if (ua.includes('windows nt 6.1')) return 'Windows 7';
    if (ua.includes('windows')) return 'Windows';
    
    if (ua.includes('mac os x')) {
      const match = ua.match(/mac os x ([\d_]+)/);
      if (match) {
        return `macOS ${match[1].replace(/_/g, '.')}`;
      }
      return 'macOS';
    }
    
    if (ua.includes('android')) {
      const match = ua.match(/android ([\d.]+)/);
      if (match) {
        return `Android ${match[1]}`;
      }
      return 'Android';
    }
    
    if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = ua.match(/os ([\d_]+)/);
      if (match) {
        return `iOS ${match[1].replace(/_/g, '.')}`;
      }
      return 'iOS';
    }
    
    if (ua.includes('linux')) return 'Linux';
    
    return 'Unknown';
  }

  /**
   * Detect browser from user agent
   */
  private detectBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('edg/')) {
      const match = ua.match(/edg\/([\d.]+)/);
      return match ? `Edge ${match[1]}` : 'Edge';
    }
    
    if (ua.includes('chrome/') && !ua.includes('edg/')) {
      const match = ua.match(/chrome\/([\d.]+)/);
      return match ? `Chrome ${match[1]}` : 'Chrome';
    }
    
    if (ua.includes('firefox/')) {
      const match = ua.match(/firefox\/([\d.]+)/);
      return match ? `Firefox ${match[1]}` : 'Firefox';
    }
    
    if (ua.includes('safari/') && !ua.includes('chrome/')) {
      const match = ua.match(/version\/([\d.]+)/);
      return match ? `Safari ${match[1]}` : 'Safari';
    }
    
    if (ua.includes('opera/') || ua.includes('opr/')) {
      const match = ua.match(/(?:opera|opr)\/([\d.]+)/);
      return match ? `Opera ${match[1]}` : 'Opera';
    }
    
    return 'Unknown';
  }

  /**
   * Generate device ID
   */
  private generateDeviceId(userAgent: string, headers: Record<string, string>): string {
    const components = [
      userAgent,
      headers['accept-language'] || '',
      headers['accept-encoding'] || ''
    ].join('|');
    
    return this.hashString(components);
  }

  /**
   * Generate device fingerprint
   */
  private generateFingerprint(userAgent: string, headers: Record<string, string>): string {
    const components = [
      userAgent,
      headers['accept-language'] || '',
      headers['accept-encoding'] || '',
      headers['accept'] || '',
      headers['connection'] || ''
    ].join('|');
    
    return this.hashString(components);
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export default DeviceDetectionService;
