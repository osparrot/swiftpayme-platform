import { Logger } from './Logger';
import { LocationService, LocationInfo } from './LocationService';
import { DeviceDetectionService, DeviceInfo } from './DeviceDetectionService';

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  requiresManualReview: boolean;
  metadata?: Record<string, any>;
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  details?: Record<string, any>;
}

/**
 * User behavior data for risk assessment
 */
export interface UserBehaviorData {
  userId: string;
  email: string;
  registrationDate: Date;
  lastLoginDate?: Date;
  loginFrequency: number; // logins per week
  failedLoginAttempts: number;
  deviceHistory: DeviceInfo[];
  locationHistory: LocationInfo[];
  transactionHistory?: any[];
  kycStatus: 'pending' | 'verified' | 'rejected';
  accountAge: number; // in days
  metadata?: Record<string, any>;
}

/**
 * Risk assessment service
 */
export class RiskAssessmentService {
  private static instance: RiskAssessmentService;
  private logger: Logger;
  private locationService: LocationService;
  private deviceService: DeviceDetectionService;

  private constructor() {
    this.logger = new Logger('RiskAssessmentService');
    this.locationService = LocationService.getInstance();
    this.deviceService = DeviceDetectionService.getInstance();
  }

  public static getInstance(): RiskAssessmentService {
    if (!RiskAssessmentService.instance) {
      RiskAssessmentService.instance = new RiskAssessmentService();
    }
    return RiskAssessmentService.instance;
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assessRisk(
    userData: UserBehaviorData,
    currentLocation: LocationInfo,
    currentDevice: DeviceInfo,
    context: 'login' | 'registration' | 'transaction' | 'kyc' = 'login'
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    // Location-based risk assessment
    const locationRisk = await this.assessLocationRisk(userData, currentLocation);
    factors.push(...locationRisk);

    // Device-based risk assessment
    const deviceRisk = this.assessDeviceRisk(userData, currentDevice);
    factors.push(...deviceRisk);

    // Behavioral risk assessment
    const behaviorRisk = this.assessBehavioralRisk(userData);
    factors.push(...behaviorRisk);

    // Account-based risk assessment
    const accountRisk = this.assessAccountRisk(userData);
    factors.push(...accountRisk);

    // Context-specific risk assessment
    const contextRisk = this.assessContextualRisk(userData, context);
    factors.push(...contextRisk);

    // Calculate overall risk score
    const riskScore = this.calculateOverallRiskScore(factors);
    const overallRisk = this.categorizeRisk(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, overallRisk);

    // Determine if manual review is required
    const requiresManualReview = this.requiresManualReview(factors, riskScore);

    const assessment: RiskAssessment = {
      overallRisk,
      riskScore,
      factors,
      recommendations,
      requiresManualReview,
      metadata: {
        assessedAt: new Date().toISOString(),
        context,
        userId: userData.userId,
        factorCount: factors.length
      }
    };

    this.logger.info('Risk assessment completed', {
      userId: userData.userId,
      overallRisk,
      riskScore,
      factorCount: factors.length,
      requiresManualReview,
      context
    });

    return assessment;
  }

  /**
   * Assess location-based risks
   */
  private async assessLocationRisk(userData: UserBehaviorData, currentLocation: LocationInfo): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // High-risk country
    if (currentLocation.riskScore > 50) {
      factors.push({
        type: 'high_risk_location',
        severity: currentLocation.riskScore > 80 ? 'critical' : 'high',
        score: Math.min(currentLocation.riskScore, 40),
        description: `Login from high-risk location: ${currentLocation.country}`,
        details: {
          country: currentLocation.country,
          city: currentLocation.city,
          riskScore: currentLocation.riskScore
        }
      });
    }

    // VPN/Proxy usage
    if (currentLocation.isVpn || currentLocation.isProxy) {
      factors.push({
        type: 'vpn_proxy_usage',
        severity: 'medium',
        score: 25,
        description: `Connection through ${currentLocation.isVpn ? 'VPN' : 'proxy'}`,
        details: {
          isVpn: currentLocation.isVpn,
          isProxy: currentLocation.isProxy,
          isp: currentLocation.isp
        }
      });
    }

    // Suspicious location change
    if (userData.locationHistory.length > 0) {
      const lastLocation = userData.locationHistory[userData.locationHistory.length - 1];
      const timeDiff = 60; // Assume 1 hour for this example
      
      if (this.locationService.isSuspiciousLocationChange(lastLocation, currentLocation, timeDiff)) {
        factors.push({
          type: 'suspicious_location_change',
          severity: 'high',
          score: 35,
          description: 'Impossible travel between locations',
          details: {
            previousLocation: `${lastLocation.city}, ${lastLocation.country}`,
            currentLocation: `${currentLocation.city}, ${currentLocation.country}`,
            timeDifference: timeDiff
          }
        });
      }
    }

    // New country
    const visitedCountries = new Set(userData.locationHistory.map(l => l.countryCode));
    if (!visitedCountries.has(currentLocation.countryCode) && visitedCountries.size > 0) {
      factors.push({
        type: 'new_country',
        severity: 'medium',
        score: 15,
        description: `First login from ${currentLocation.country}`,
        details: {
          newCountry: currentLocation.country,
          previousCountries: Array.from(visitedCountries)
        }
      });
    }

    return factors;
  }

  /**
   * Assess device-based risks
   */
  private assessDeviceRisk(userData: UserBehaviorData, currentDevice: DeviceInfo): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Untrusted device
    if (!currentDevice.isTrusted) {
      const isNewDevice = !userData.deviceHistory.some(d => d.id === currentDevice.id);
      
      if (isNewDevice) {
        factors.push({
          type: 'new_device',
          severity: 'medium',
          score: 20,
          description: `Login from new ${currentDevice.type} device`,
          details: {
            deviceType: currentDevice.type,
            os: currentDevice.os,
            browser: currentDevice.browser
          }
        });
      }
    }

    // Suspicious device characteristics
    if (currentDevice.type === 'unknown') {
      factors.push({
        type: 'unknown_device',
        severity: 'medium',
        score: 15,
        description: 'Login from unrecognized device type',
        details: {
          userAgent: currentDevice.userAgent
        }
      });
    }

    return Promise.resolve(factors);
  }

  /**
   * Assess behavioral risks
   */
  private assessBehavioralRisk(userData: UserBehaviorData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // High failed login attempts
    if (userData.failedLoginAttempts > 5) {
      factors.push({
        type: 'high_failed_logins',
        severity: userData.failedLoginAttempts > 10 ? 'high' : 'medium',
        score: Math.min(userData.failedLoginAttempts * 2, 30),
        description: `${userData.failedLoginAttempts} failed login attempts`,
        details: {
          failedAttempts: userData.failedLoginAttempts
        }
      });
    }

    // Unusual login frequency
    if (userData.loginFrequency > 50) { // More than 50 logins per week
      factors.push({
        type: 'unusual_login_frequency',
        severity: 'low',
        score: 10,
        description: 'Unusually high login frequency',
        details: {
          loginFrequency: userData.loginFrequency
        }
      });
    }

    // Long period of inactivity followed by sudden activity
    if (userData.lastLoginDate) {
      const daysSinceLastLogin = (Date.now() - userData.lastLoginDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastLogin > 90) { // More than 3 months
        factors.push({
          type: 'long_inactivity',
          severity: 'medium',
          score: 15,
          description: `Account inactive for ${Math.round(daysSinceLastLogin)} days`,
          details: {
            daysSinceLastLogin: Math.round(daysSinceLastLogin)
          }
        });
      }
    }

    return factors;
  }

  /**
   * Assess account-based risks
   */
  private assessAccountRisk(userData: UserBehaviorData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // New account
    if (userData.accountAge < 7) { // Less than a week old
      factors.push({
        type: 'new_account',
        severity: 'medium',
        score: 20,
        description: `Account created ${userData.accountAge} days ago`,
        details: {
          accountAge: userData.accountAge,
          registrationDate: userData.registrationDate
        }
      });
    }

    // Unverified KYC
    if (userData.kycStatus !== 'verified') {
      factors.push({
        type: 'unverified_kyc',
        severity: userData.kycStatus === 'rejected' ? 'high' : 'medium',
        score: userData.kycStatus === 'rejected' ? 30 : 15,
        description: `KYC status: ${userData.kycStatus}`,
        details: {
          kycStatus: userData.kycStatus
        }
      });
    }

    // Suspicious email patterns
    const emailDomain = userData.email.split('@')[1];
    const suspiciousEmailDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
    
    if (suspiciousEmailDomains.includes(emailDomain)) {
      factors.push({
        type: 'suspicious_email',
        severity: 'high',
        score: 25,
        description: 'Email from temporary/suspicious domain',
        details: {
          emailDomain
        }
      });
    }

    return factors;
  }

  /**
   * Assess context-specific risks
   */
  private assessContextualRisk(userData: UserBehaviorData, context: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    switch (context) {
      case 'registration':
        // Additional checks for new registrations
        break;
        
      case 'transaction':
        // Transaction-specific risk factors
        if (userData.transactionHistory && userData.transactionHistory.length === 0) {
          factors.push({
            type: 'first_transaction',
            severity: 'medium',
            score: 15,
            description: 'First transaction attempt',
            details: {
              context: 'transaction'
            }
          });
        }
        break;
        
      case 'kyc':
        // KYC-specific risk factors
        break;
    }

    return factors;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    // Sum all factor scores with diminishing returns
    let totalScore = 0;
    let weightedSum = 0;
    
    factors.forEach((factor, index) => {
      const weight = 1 / (1 + index * 0.1); // Diminishing weight for additional factors
      weightedSum += factor.score * weight;
      totalScore += weight;
    });

    const averageScore = totalScore > 0 ? weightedSum / totalScore : 0;
    
    // Cap at 100
    return Math.min(Math.round(averageScore), 100);
  }

  /**
   * Categorize risk level
   */
  private categorizeRisk(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(factors: RiskFactor[], overallRisk: string): string[] {
    const recommendations: string[] = [];

    // General recommendations based on overall risk
    switch (overallRisk) {
      case 'critical':
        recommendations.push('Block access and require manual verification');
        recommendations.push('Escalate to security team immediately');
        break;
      case 'high':
        recommendations.push('Require additional authentication (2FA)');
        recommendations.push('Limit account functionality until verification');
        break;
      case 'medium':
        recommendations.push('Monitor account activity closely');
        recommendations.push('Consider requiring email verification');
        break;
      case 'low':
        recommendations.push('Allow normal access with standard monitoring');
        break;
    }

    // Specific recommendations based on risk factors
    factors.forEach(factor => {
      switch (factor.type) {
        case 'new_device':
          recommendations.push('Send device verification email');
          break;
        case 'high_risk_location':
          recommendations.push('Require location-based verification');
          break;
        case 'vpn_proxy_usage':
          recommendations.push('Request explanation for VPN/proxy usage');
          break;
        case 'suspicious_location_change':
          recommendations.push('Verify identity through multiple channels');
          break;
        case 'high_failed_logins':
          recommendations.push('Implement temporary account lockout');
          break;
        case 'unverified_kyc':
          recommendations.push('Prioritize KYC verification process');
          break;
      }
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Determine if manual review is required
   */
  private requiresManualReview(factors: RiskFactor[], riskScore: number): boolean {
    // High risk score always requires review
    if (riskScore >= 70) return true;

    // Critical severity factors require review
    const hasCriticalFactors = factors.some(f => f.severity === 'critical');
    if (hasCriticalFactors) return true;

    // Multiple high severity factors require review
    const highSeverityCount = factors.filter(f => f.severity === 'high').length;
    if (highSeverityCount >= 2) return true;

    // Specific factor combinations require review
    const factorTypes = factors.map(f => f.type);
    const suspiciousPatterns = [
      ['high_risk_location', 'new_device'],
      ['suspicious_location_change', 'vpn_proxy_usage'],
      ['high_failed_logins', 'new_device', 'new_country']
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.every(type => factorTypes.includes(type))) {
        return true;
      }
    }

    return false;
  }
}

export default RiskAssessmentService;
