import { Logger } from './Logger';

/**
 * Location information interface
 */
export interface LocationInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  riskScore: number; // 0-100, higher is riskier
  metadata?: Record<string, any>;
}

/**
 * Location service for IP geolocation and risk assessment
 */
export class LocationService {
  private static instance: LocationService;
  private logger: Logger;
  private locationCache: Map<string, { info: LocationInfo; timestamp: number }>;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.logger = new Logger('LocationService');
    this.locationCache = new Map();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Get location information from IP address
   */
  async getLocationFromIP(ip: string): Promise<LocationInfo> {
    // Check cache first
    const cached = this.locationCache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.info;
    }

    try {
      // In a real implementation, this would call a geolocation API
      // like MaxMind, IPStack, or similar service
      const locationInfo = await this.fetchLocationFromAPI(ip);
      
      // Cache the result
      this.locationCache.set(ip, {
        info: locationInfo,
        timestamp: Date.now()
      });

      this.logger.info('Location resolved', {
        ip: this.maskIP(ip),
        country: locationInfo.country,
        city: locationInfo.city,
        riskScore: locationInfo.riskScore
      });

      return locationInfo;
    } catch (error) {
      this.logger.error('Location resolution failed', {
        ip: this.maskIP(ip),
        error: error.message
      });

      // Return default location info
      return this.getDefaultLocationInfo(ip);
    }
  }

  /**
   * Calculate risk score based on location and other factors
   */
  calculateRiskScore(locationInfo: LocationInfo, userHistory?: any[]): number {
    let riskScore = 0;

    // Base risk by country (simplified example)
    const highRiskCountries = ['CN', 'RU', 'IR', 'KP', 'SY'];
    const mediumRiskCountries = ['PK', 'BD', 'NG', 'ID'];

    if (highRiskCountries.includes(locationInfo.countryCode)) {
      riskScore += 40;
    } else if (mediumRiskCountries.includes(locationInfo.countryCode)) {
      riskScore += 20;
    }

    // VPN/Proxy detection
    if (locationInfo.isVpn) {
      riskScore += 30;
    }
    if (locationInfo.isProxy) {
      riskScore += 25;
    }

    // User history analysis (if available)
    if (userHistory && userHistory.length > 0) {
      const uniqueCountries = new Set(userHistory.map(h => h.countryCode));
      const isNewCountry = !uniqueCountries.has(locationInfo.countryCode);
      
      if (isNewCountry && uniqueCountries.size > 0) {
        riskScore += 15; // New country adds risk
      }
    }

    // Cap at 100
    return Math.min(riskScore, 100);
  }

  /**
   * Check if location change is suspicious
   */
  isSuspiciousLocationChange(
    previousLocation: LocationInfo,
    currentLocation: LocationInfo,
    timeDifference: number // in minutes
  ): boolean {
    // Same location
    if (previousLocation.countryCode === currentLocation.countryCode &&
        previousLocation.city === currentLocation.city) {
      return false;
    }

    // Calculate approximate distance (simplified)
    const distance = this.calculateDistance(
      previousLocation.latitude || 0,
      previousLocation.longitude || 0,
      currentLocation.latitude || 0,
      currentLocation.longitude || 0
    );

    // Impossible travel speed (more than 1000 km/h)
    const maxPossibleDistance = (timeDifference / 60) * 1000; // km
    
    if (distance > maxPossibleDistance) {
      this.logger.warn('Suspicious location change detected', {
        previousCountry: previousLocation.country,
        currentCountry: currentLocation.country,
        distance: Math.round(distance),
        timeDifference,
        maxPossible: Math.round(maxPossibleDistance)
      });
      return true;
    }

    return false;
  }

  /**
   * Get location history for analysis
   */
  async getLocationHistory(userId: string, limit: number = 10): Promise<LocationInfo[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Mock API call for location data
   */
  private async fetchLocationFromAPI(ip: string): Promise<LocationInfo> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock data based on IP patterns (for development)
    const mockData = this.generateMockLocationData(ip);
    
    return {
      ...mockData,
      riskScore: this.calculateRiskScore(mockData)
    };
  }

  /**
   * Generate mock location data for development
   */
  private generateMockLocationData(ip: string): LocationInfo {
    // Simple mock based on IP
    const ipNum = parseInt(ip.split('.')[0]);
    
    const locations = [
      {
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast Cable',
        isVpn: false,
        isProxy: false
      },
      {
        country: 'United Kingdom',
        countryCode: 'GB',
        region: 'England',
        city: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        isp: 'BT Group',
        isVpn: false,
        isProxy: false
      },
      {
        country: 'Germany',
        countryCode: 'DE',
        region: 'Bavaria',
        city: 'Munich',
        latitude: 48.1351,
        longitude: 11.5820,
        timezone: 'Europe/Berlin',
        isp: 'Deutsche Telekom',
        isVpn: false,
        isProxy: false
      },
      {
        country: 'Japan',
        countryCode: 'JP',
        region: 'Tokyo',
        city: 'Tokyo',
        latitude: 35.6762,
        longitude: 139.6503,
        timezone: 'Asia/Tokyo',
        isp: 'NTT Communications',
        isVpn: false,
        isProxy: false
      }
    ];

    const location = locations[ipNum % locations.length];
    
    return {
      ip,
      ...location,
      riskScore: 0, // Will be calculated later
      metadata: {
        resolvedAt: new Date().toISOString(),
        source: 'mock'
      }
    };
  }

  /**
   * Get default location info when resolution fails
   */
  private getDefaultLocationInfo(ip: string): LocationInfo {
    return {
      ip,
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC',
      isVpn: false,
      isProxy: false,
      riskScore: 50, // Medium risk for unknown locations
      metadata: {
        resolvedAt: new Date().toISOString(),
        source: 'default'
      }
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Mask IP address for logging
   */
  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }
}

export default LocationService;
