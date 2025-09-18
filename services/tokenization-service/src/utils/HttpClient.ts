import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from './Logger';

export interface IHttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface IServiceEndpoints {
  compliance: string;
  account: string;
  transaction: string;
  analytics: string;
  notification: string;
  currency: string;
  asset: string;
}

export class HttpClient {
  private client: AxiosInstance;
  private logger: Logger;
  private config: IHttpClientConfig;
  private serviceEndpoints: IServiceEndpoints;

  constructor(config?: IHttpClientConfig) {
    this.logger = new Logger('HttpClient');
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    this.serviceEndpoints = {
      compliance: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3000',
      account: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3000',
      transaction: process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3000',
      analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3000',
      notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
      currency: process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3000',
      asset: process.env.ASSET_SERVICE_URL || 'http://asset-service:3000'
    };

    this.client = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SwiftPay-TokenizationService/1.0.0',
        ...this.config.headers
      }
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const requestId = this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;
        config.headers['X-Service'] = 'tokenization-service';
        
        // Add authentication token if available
        const token = process.env.SERVICE_TOKEN || process.env.JWT_TOKEN;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        this.logger.info('HTTP request initiated', {
          requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });

        return config;
      },
      (error) => {
        this.logger.error('HTTP request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'];
        this.logger.info('HTTP response received', {
          requestId,
          status: response.status,
          statusText: response.statusText,
          url: response.config.url
        });
        return response;
      },
      async (error) => {
        const requestId = error.config?.headers['X-Request-ID'];
        this.logger.error('HTTP request failed', {
          requestId,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        });

        // Retry logic
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    if (!error.config || error.config.__retryCount >= this.config.retries!) {
      return false;
    }

    // Retry on network errors or 5xx status codes
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  }

  private async retryRequest(error: any): Promise<AxiosResponse> {
    error.config.__retryCount = error.config.__retryCount || 0;
    error.config.__retryCount++;

    const delay = this.config.retryDelay! * Math.pow(2, error.config.__retryCount - 1);
    
    this.logger.warn('Retrying HTTP request', {
      attempt: error.config.__retryCount,
      maxRetries: this.config.retries,
      delay,
      url: error.config.url
    });

    await this.sleep(delay);
    return this.client.request(error.config);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Service-specific methods
  async checkCompliance(entityId: string, entityType: string, checks: string[]): Promise<any> {
    const url = `${this.serviceEndpoints.compliance}/api/compliance/check`;
    return this.post(url, { entityId, entityType, checks });
  }

  async getAccountBalance(userId: string, currency: string): Promise<any> {
    const url = `${this.serviceEndpoints.account}/api/accounts/balance/${userId}/${currency}`;
    return this.get(url);
  }

  async updateAccountBalance(userId: string, currency: string, amount: string, operation: string): Promise<any> {
    const url = `${this.serviceEndpoints.account}/api/accounts/balance`;
    return this.post(url, { userId, currency, amount, operation });
  }

  async createTransaction(transactionData: any): Promise<any> {
    const url = `${this.serviceEndpoints.transaction}/api/transactions`;
    return this.post(url, transactionData);
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    const url = `${this.serviceEndpoints.transaction}/api/transactions/${transactionId}`;
    return this.get(url);
  }

  async reportFraudulentActivity(activityData: any): Promise<any> {
    const url = `${this.serviceEndpoints.analytics}/api/analytics/fraud-report`;
    return this.post(url, activityData);
  }

  async sendNotification(notificationData: any): Promise<any> {
    const url = `${this.serviceEndpoints.notification}/api/notifications/send`;
    return this.post(url, notificationData);
  }

  async convertCurrency(fromCurrency: string, toCurrency: string, amount: string): Promise<any> {
    const url = `${this.serviceEndpoints.currency}/api/currency/convert`;
    return this.post(url, { fromCurrency, toCurrency, amount });
  }

  async getAssetPrice(assetType: string, currency: string = 'USD'): Promise<any> {
    const url = `${this.serviceEndpoints.asset}/api/assets/price/${assetType}/${currency}`;
    return this.get(url);
  }

  async verifyAssetCustody(assetId: string, custodian: string): Promise<any> {
    const url = `${this.serviceEndpoints.asset}/api/assets/verify-custody`;
    return this.post(url, { assetId, custodian });
  }

  // Health check methods
  async healthCheck(service: keyof IServiceEndpoints): Promise<any> {
    const url = `${this.serviceEndpoints[service]}/health`;
    return this.get(url);
  }

  async healthCheckAll(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const [serviceName, serviceUrl] of Object.entries(this.serviceEndpoints)) {
      try {
        const result = await this.healthCheck(serviceName as keyof IServiceEndpoints);
        results[serviceName] = { status: 'healthy', ...result };
      } catch (error) {
        results[serviceName] = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }
    
    return results;
  }

  // Circuit breaker pattern
  private circuitBreakers: Map<string, any> = new Map();

  async callWithCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 10000
    } = options;

    let breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      breaker = {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        lastFailureTime: null,
        lastSuccessTime: null
      };
      this.circuitBreakers.set(key, breaker);
    }

    const now = Date.now();

    // Check if circuit should be reset
    if (breaker.state === 'OPEN' && 
        breaker.lastFailureTime && 
        (now - breaker.lastFailureTime) > resetTimeout) {
      breaker.state = 'HALF_OPEN';
      this.logger.info('Circuit breaker half-open', { key });
    }

    // Reject if circuit is open
    if (breaker.state === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN for ${key}`);
    }

    try {
      const result = await fn();
      
      // Success - reset circuit breaker
      breaker.failures = 0;
      breaker.lastSuccessTime = now;
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        this.logger.info('Circuit breaker closed', { key });
      }
      
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailureTime = now;
      
      // Open circuit if failure threshold reached
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'OPEN';
        this.logger.warn('Circuit breaker opened', { 
          key, 
          failures: breaker.failures,
          threshold: failureThreshold 
        });
      }
      
      throw error;
    }
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      status[key] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailureTime: breaker.lastFailureTime,
        lastSuccessTime: breaker.lastSuccessTime
      };
    }
    
    return status;
  }
}

