import Redis from 'ioredis';
import axios from 'axios';
import { Logger } from './Logger';
import { EventEmitter } from 'events';

export interface ServiceInfo {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
  version: string;
  metadata?: any;
}

export interface ServiceDiscoveryConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  healthCheckInterval: number;
  serviceTimeout: number;
  retryAttempts: number;
}

export class ServiceDiscovery extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private services: Map<string, ServiceInfo> = new Map();
  private healthCheckInterval: number;
  private serviceTimeout: number;
  private retryAttempts: number;
  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config?: Partial<ServiceDiscoveryConfig>) {
    super();
    
    const defaultConfig: ServiceDiscoveryConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
      },
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
      serviceTimeout: parseInt(process.env.SERVICE_TIMEOUT || '5000'), // 5 seconds
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3')
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.healthCheckInterval = finalConfig.healthCheckInterval;
    this.serviceTimeout = finalConfig.serviceTimeout;
    this.retryAttempts = finalConfig.retryAttempts;
    this.logger = new Logger('ServiceDiscovery');

    // Initialize Redis connection
    this.redis = new Redis({
      host: finalConfig.redis.host,
      port: finalConfig.redis.port,
      password: finalConfig.redis.password,
      db: finalConfig.redis.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('ServiceDiscovery connected to Redis');

      // Load existing services from Redis
      await this.loadServicesFromRedis();

      // Start health checking
      this.startHealthChecking();

      this.isRunning = true;
      this.logger.info('ServiceDiscovery initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ServiceDiscovery', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.isRunning = false;

      // Stop health checking
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
      }

      // Disconnect from Redis
      if (this.redis.status === 'ready') {
        await this.redis.disconnect();
      }

      this.logger.info('ServiceDiscovery stopped');

    } catch (error) {
      this.logger.error('Error stopping ServiceDiscovery', { error });
    }
  }

  public async registerService(
    name: string, 
    url: string, 
    metadata?: any
  ): Promise<void> {
    try {
      const serviceInfo: ServiceInfo = {
        name,
        url,
        status: 'unknown',
        lastHealthCheck: new Date(),
        version: 'unknown',
        metadata
      };

      // Store in memory
      this.services.set(name, serviceInfo);

      // Store in Redis for persistence
      await this.redis.hset(
        'swiftpayme:services',
        name,
        JSON.stringify(serviceInfo)
      );

      this.logger.info('Service registered', { name, url });

      // Perform initial health check
      await this.checkServiceHealth(name);

      // Emit registration event
      this.emit('service-registered', { name, url, metadata });

    } catch (error) {
      this.logger.error('Failed to register service', { error, name, url });
      throw error;
    }
  }

  public async unregisterService(name: string): Promise<void> {
    try {
      // Remove from memory
      this.services.delete(name);

      // Remove from Redis
      await this.redis.hdel('swiftpayme:services', name);

      this.logger.info('Service unregistered', { name });

      // Emit unregistration event
      this.emit('service-unregistered', { name });

    } catch (error) {
      this.logger.error('Failed to unregister service', { error, name });
      throw error;
    }
  }

  public getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  public getServices(): { [name: string]: ServiceInfo } {
    const result: { [name: string]: ServiceInfo } = {};
    
    for (const [name, info] of this.services) {
      result[name] = { ...info };
    }
    
    return result;
  }

  public getHealthyServices(): ServiceInfo[] {
    return Array.from(this.services.values()).filter(
      service => service.status === 'healthy'
    );
  }

  public getUnhealthyServices(): ServiceInfo[] {
    return Array.from(this.services.values()).filter(
      service => service.status === 'unhealthy'
    );
  }

  public async getServiceUrl(name: string): Promise<string | null> {
    const service = this.services.get(name);
    
    if (!service) {
      this.logger.warn('Service not found', { name });
      return null;
    }

    if (service.status !== 'healthy') {
      this.logger.warn('Service is not healthy', { name, status: service.status });
      return null;
    }

    return service.url;
  }

  public async checkServiceHealth(name: string): Promise<boolean> {
    const service = this.services.get(name);
    
    if (!service) {
      this.logger.warn('Cannot check health of unknown service', { name });
      return false;
    }

    try {
      const startTime = Date.now();
      
      // Perform health check with timeout
      const response = await axios.get(`${service.url}/health`, {
        timeout: this.serviceTimeout,
        validateStatus: (status) => status === 200
      });

      const responseTime = Date.now() - startTime;
      const healthData = response.data;

      // Update service info
      service.status = 'healthy';
      service.lastHealthCheck = new Date();
      
      if (healthData?.data?.version) {
        service.version = healthData.data.version;
      }

      // Update in Redis
      await this.redis.hset(
        'swiftpayme:services',
        name,
        JSON.stringify(service)
      );

      this.logger.debug('Service health check passed', { 
        name, 
        responseTime,
        version: service.version
      });

      // Emit health check event
      this.emit('service-healthy', { 
        name, 
        service, 
        responseTime,
        healthData 
      });

      return true;

    } catch (error) {
      // Update service status to unhealthy
      service.status = 'unhealthy';
      service.lastHealthCheck = new Date();

      // Update in Redis
      await this.redis.hset(
        'swiftpayme:services',
        name,
        JSON.stringify(service)
      );

      this.logger.warn('Service health check failed', { 
        name, 
        url: service.url,
        error: error.message 
      });

      // Emit health check failure event
      this.emit('service-unhealthy', { 
        name, 
        service, 
        error: error.message 
      });

      return false;
    }
  }

  public async checkAllServices(): Promise<{ [name: string]: boolean }> {
    const results: { [name: string]: boolean } = {};
    
    const healthCheckPromises = Array.from(this.services.keys()).map(async (name) => {
      const isHealthy = await this.checkServiceHealth(name);
      results[name] = isHealthy;
      return { name, isHealthy };
    });

    await Promise.allSettled(healthCheckPromises);

    return results;
  }

  public async waitForService(
    name: string, 
    timeout: number = 30000
  ): Promise<ServiceInfo> {
    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        reject(new Error(`Timeout waiting for service: ${name}`));
      }, timeout);

      const checkService = () => {
        const service = this.services.get(name);
        
        if (service && service.status === 'healthy') {
          clearTimeout(timeoutTimer);
          resolve(service);
          return;
        }

        // Check again in 1 second
        setTimeout(checkService, 1000);
      };

      checkService();
    });
  }

  public async discoverServices(): Promise<void> {
    try {
      // Load services from Redis
      await this.loadServicesFromRedis();

      // Perform health checks on all services
      await this.checkAllServices();

      this.logger.info('Service discovery completed', {
        totalServices: this.services.size,
        healthyServices: this.getHealthyServices().length,
        unhealthyServices: this.getUnhealthyServices().length
      });

    } catch (error) {
      this.logger.error('Service discovery failed', { error });
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isRunning && this.redis.status === 'ready';
  }

  public getMetrics(): any {
    const services = Array.from(this.services.values());
    
    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      unknownServices: services.filter(s => s.status === 'unknown').length,
      lastHealthCheck: services.reduce((latest, service) => {
        return service.lastHealthCheck > latest ? service.lastHealthCheck : latest;
      }, new Date(0)),
      isRunning: this.isRunning,
      redisStatus: this.redis.status
    };
  }

  private async loadServicesFromRedis(): Promise<void> {
    try {
      const servicesData = await this.redis.hgetall('swiftpayme:services');
      
      for (const [name, data] of Object.entries(servicesData)) {
        try {
          const serviceInfo: ServiceInfo = JSON.parse(data);
          serviceInfo.lastHealthCheck = new Date(serviceInfo.lastHealthCheck);
          this.services.set(name, serviceInfo);
        } catch (parseError) {
          this.logger.warn('Failed to parse service data from Redis', { 
            name, 
            error: parseError 
          });
        }
      }

      this.logger.info('Loaded services from Redis', { 
        count: this.services.size 
      });

    } catch (error) {
      this.logger.error('Failed to load services from Redis', { error });
    }
  }

  private startHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.checkAllServices();
      } catch (error) {
        this.logger.error('Health check cycle failed', { error });
      }
    }, this.healthCheckInterval);

    this.logger.info('Health checking started', { 
      interval: this.healthCheckInterval 
    });
  }

  private setupEventHandlers(): void {
    // Redis connection events
    this.redis.on('connect', () => {
      this.logger.info('ServiceDiscovery Redis connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('ServiceDiscovery Redis error', { error });
    });

    this.redis.on('close', () => {
      this.logger.warn('ServiceDiscovery Redis connection closed');
    });

    // Service events
    this.on('service-healthy', (data) => {
      this.logger.debug('Service became healthy', { 
        name: data.name,
        responseTime: data.responseTime
      });
    });

    this.on('service-unhealthy', (data) => {
      this.logger.warn('Service became unhealthy', { 
        name: data.name,
        error: data.error
      });
    });

    this.on('service-registered', (data) => {
      this.logger.info('Service registered event', { 
        name: data.name,
        url: data.url
      });
    });

    this.on('service-unregistered', (data) => {
      this.logger.info('Service unregistered event', { 
        name: data.name
      });
    });
  }

  // Static method to create a singleton instance
  private static instance: ServiceDiscovery;

  public static getInstance(config?: Partial<ServiceDiscoveryConfig>): ServiceDiscovery {
    if (!ServiceDiscovery.instance) {
      ServiceDiscovery.instance = new ServiceDiscovery(config);
    }
    return ServiceDiscovery.instance;
  }
}

