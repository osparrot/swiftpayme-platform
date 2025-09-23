/**
 * SwiftPayMe API Gateway - Gateway Controller
 * Comprehensive request handling and service orchestration
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { ApiRequest, ApiMetrics, RateLimitEntry } from '../models/ApiRequest';
import { Logger } from '../utils/Logger';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { ServiceRegistry } from '../utils/ServiceRegistry';
import { MetricsCollector } from '../utils/MetricsCollector';
import { SecurityValidator } from '../validators/SecurityValidator';

// ==================== INTERFACES ====================
interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
  circuitBreaker: CircuitBreaker;
  healthEndpoint: string;
}

interface ProxyRequest extends Request {
  requestId?: string;
  correlationId?: string;
  startTime?: number;
  userId?: string;
  userRole?: string;
  serviceTarget?: string;
}

interface ProxyResponse {
  data: any;
  status: number;
  headers: any;
  responseTime: number;
  service: string;
}

// ==================== GATEWAY CONTROLLER ====================
export class GatewayController {
  private services: Map<string, ServiceConfig>;
  private logger: Logger;
  private serviceRegistry: ServiceRegistry;
  private metricsCollector: MetricsCollector;
  private securityValidator: SecurityValidator;

  constructor() {
    this.services = new Map();
    this.logger = new Logger('GatewayController');
    this.serviceRegistry = new ServiceRegistry();
    this.metricsCollector = new MetricsCollector();
    this.securityValidator = new SecurityValidator();
    
    this.initializeServices();
  }

  // ==================== SERVICE INITIALIZATION ====================
  private initializeServices(): void {
    const serviceConfigs = [
      {
        name: 'user-service',
        url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
        timeout: 30000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'asset-service',
        url: process.env.ASSET_SERVICE_URL || 'http://asset-service:3003',
        timeout: 45000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'currency-service',
        url: process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3004',
        timeout: 15000,
        retries: 2,
        healthEndpoint: '/health'
      },
      {
        name: 'crypto-service',
        url: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3005',
        timeout: 60000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'payment-service',
        url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3006',
        timeout: 45000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'admin-service',
        url: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3007',
        timeout: 30000,
        retries: 2,
        healthEndpoint: '/health'
      },
      {
        name: 'notification-service',
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008',
        timeout: 20000,
        retries: 2,
        healthEndpoint: '/health'
      },
      {
        name: 'tokenization-service',
        url: process.env.TOKENIZATION_SERVICE_URL || 'http://tokenization-service:3009',
        timeout: 30000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'ledger-service',
        url: process.env.LEDGER_SERVICE_URL || 'http://ledger-service:3010',
        timeout: 30000,
        retries: 3,
        healthEndpoint: '/health'
      },
      {
        name: 'account-service',
        url: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3011',
        timeout: 30000,
        retries: 3,
        healthEndpoint: '/health'
      }
    ];

    serviceConfigs.forEach(config => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000
      });

      this.services.set(config.name, {
        ...config,
        circuitBreaker
      });

      this.logger.info(`Initialized service: ${config.name} at ${config.url}`);
    });
  }

  // ==================== MAIN PROXY HANDLER ====================
  public proxyRequest = async (req: ProxyRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Enhance request with tracking information
    req.requestId = requestId;
    req.correlationId = correlationId;
    req.startTime = startTime;

    try {
      // 1. Security validation
      await this.securityValidator.validateRequest(req);

      // 2. Determine target service
      const serviceName = this.determineTargetService(req.path);
      if (!serviceName) {
        return this.handleError(req, res, new Error('Service not found'), 404);
      }

      req.serviceTarget = serviceName;
      const serviceConfig = this.services.get(serviceName);
      if (!serviceConfig) {
        return this.handleError(req, res, new Error('Service configuration not found'), 500);
      }

      // 3. Check circuit breaker
      if (!serviceConfig.circuitBreaker.canExecute()) {
        return this.handleError(req, res, new Error('Service temporarily unavailable'), 503);
      }

      // 4. Log request
      await this.logRequest(req);

      // 5. Proxy request with retry logic
      const response = await this.executeWithRetry(req, serviceConfig);

      // 6. Process and send response
      await this.processResponse(req, res, response);

      // 7. Record success metrics
      serviceConfig.circuitBreaker.recordSuccess();
      await this.recordMetrics(req, response.status, Date.now() - startTime);

    } catch (error) {
      this.logger.error('Proxy request failed', {
        requestId,
        correlationId,
        error: error.message,
        stack: error.stack
      });

      // Record failure in circuit breaker
      const serviceConfig = this.services.get(req.serviceTarget || '');
      if (serviceConfig) {
        serviceConfig.circuitBreaker.recordFailure();
      }

      await this.handleError(req, res, error, this.getErrorStatusCode(error));
    }
  };

  // ==================== SERVICE DETERMINATION ====================
  private determineTargetService(path: string): string | null {
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length === 0) {
      return null;
    }

    const serviceMap: { [key: string]: string } = {
      'api': 'api-gateway',
      'users': 'user-service',
      'auth': 'user-service',
      'assets': 'asset-service',
      'deposits': 'asset-service',
      'currency': 'currency-service',
      'rates': 'currency-service',
      'crypto': 'crypto-service',
      'bitcoin': 'crypto-service',
      'payments': 'payment-service',
      'transactions': 'payment-service',
      'admin': 'admin-service',
      'notifications': 'notification-service',
      'tokens': 'tokenization-service',
      'tokenization': 'tokenization-service',
      'ledger': 'ledger-service',
      'accounts': 'account-service',
      'balances': 'account-service'
    };

    const firstSegment = pathSegments[0].toLowerCase();
    return serviceMap[firstSegment] || null;
  }

  // ==================== REQUEST EXECUTION ====================
  private async executeWithRetry(req: ProxyRequest, serviceConfig: ServiceConfig): Promise<ProxyResponse> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= serviceConfig.retries; attempt++) {
      try {
        const response = await this.executeRequest(req, serviceConfig);
        return response;
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Request attempt ${attempt} failed`, {
          requestId: req.requestId,
          service: serviceConfig.name,
          error: error.message,
          attempt
        });

        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < serviceConfig.retries) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError;
  }

  private async executeRequest(req: ProxyRequest, serviceConfig: ServiceConfig): Promise<ProxyResponse> {
    const targetUrl = `${serviceConfig.url}${req.path}`;
    const startTime = Date.now();

    const axiosConfig = {
      method: req.method.toLowerCase() as any,
      url: targetUrl,
      params: req.query,
      data: req.body,
      headers: this.prepareHeaders(req),
      timeout: serviceConfig.timeout,
      validateStatus: () => true // Don't throw on HTTP error status codes
    };

    this.logger.debug('Executing request', {
      requestId: req.requestId,
      method: req.method,
      url: targetUrl,
      service: serviceConfig.name
    });

    const response: AxiosResponse = await axios(axiosConfig);
    const responseTime = Date.now() - startTime;

    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      responseTime,
      service: serviceConfig.name
    };
  }

  // ==================== HEADER PREPARATION ====================
  private prepareHeaders(req: ProxyRequest): any {
    const headers = { ...req.headers };
    
    // Remove hop-by-hop headers
    delete headers.host;
    delete headers.connection;
    delete headers['proxy-connection'];
    delete headers['transfer-encoding'];
    delete headers.upgrade;
    
    // Add tracking headers
    headers['x-request-id'] = req.requestId;
    headers['x-correlation-id'] = req.correlationId;
    headers['x-forwarded-for'] = req.ip;
    headers['x-forwarded-proto'] = req.protocol;
    headers['x-gateway-timestamp'] = new Date().toISOString();
    
    // Add user context if available
    if (req.userId) {
      headers['x-user-id'] = req.userId;
    }
    if (req.userRole) {
      headers['x-user-role'] = req.userRole;
    }

    return headers;
  }

  // ==================== RESPONSE PROCESSING ====================
  private async processResponse(req: ProxyRequest, res: Response, proxyResponse: ProxyResponse): Promise<void> {
    // Set response headers
    Object.keys(proxyResponse.headers).forEach(key => {
      if (!this.isHopByHopHeader(key)) {
        res.set(key, proxyResponse.headers[key]);
      }
    });

    // Add gateway headers
    res.set('x-request-id', req.requestId);
    res.set('x-correlation-id', req.correlationId);
    res.set('x-response-time', `${proxyResponse.responseTime}ms`);
    res.set('x-service', proxyResponse.service);

    // Send response
    res.status(proxyResponse.status).json(proxyResponse.data);

    // Log response
    await this.logResponse(req, proxyResponse);
  }

  private isHopByHopHeader(header: string): boolean {
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade'
    ];
    return hopByHopHeaders.includes(header.toLowerCase());
  }

  // ==================== LOGGING ====================
  private async logRequest(req: ProxyRequest): Promise<void> {
    try {
      const apiRequest = new ApiRequest({
        requestId: req.requestId,
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body,
        userAgent: req.get('user-agent') || '',
        ipAddress: req.ip,
        userId: req.userId,
        serviceTarget: req.serviceTarget,
        timestamp: new Date(req.startTime),
        metadata: {
          userRole: req.userRole
        }
      });

      await apiRequest.save();
    } catch (error) {
      this.logger.error('Failed to log request', { error: error.message });
    }
  }

  private async logResponse(req: ProxyRequest, response: ProxyResponse): Promise<void> {
    try {
      await ApiRequest.findOneAndUpdate(
        { requestId: req.requestId },
        {
          responseTime: response.responseTime,
          statusCode: response.status,
          responseSize: JSON.stringify(response.data).length
        }
      );
    } catch (error) {
      this.logger.error('Failed to log response', { error: error.message });
    }
  }

  // ==================== METRICS ====================
  private async recordMetrics(req: ProxyRequest, statusCode: number, responseTime: number): Promise<void> {
    try {
      await this.metricsCollector.recordRequest({
        service: req.serviceTarget,
        endpoint: req.path,
        method: req.method,
        statusCode,
        responseTime,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to record metrics', { error: error.message });
    }
  }

  // ==================== ERROR HANDLING ====================
  private async handleError(req: ProxyRequest, res: Response, error: any, statusCode: number): Promise<void> {
    const errorResponse = {
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'GATEWAY_ERROR',
        requestId: req.requestId,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      }
    };

    // Log error
    this.logger.error('Gateway error', {
      requestId: req.requestId,
      correlationId: req.correlationId,
      error: error.message,
      statusCode,
      stack: error.stack
    });

    // Update request log with error
    try {
      await ApiRequest.findOneAndUpdate(
        { requestId: req.requestId },
        {
          statusCode,
          errorMessage: error.message,
          responseTime: Date.now() - req.startTime
        }
      );
    } catch (logError) {
      this.logger.error('Failed to log error', { error: logError.message });
    }

    res.status(statusCode).json(errorResponse);
  }

  private getErrorStatusCode(error: any): number {
    if (error.response && error.response.status) {
      return error.response.status;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 503; // Service Unavailable
    }
    
    if (error.code === 'ECONNABORTED') {
      return 504; // Gateway Timeout
    }
    
    return 500; // Internal Server Error
  }

  // ==================== HEALTH CHECK ====================
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Check service health
    for (const [name, config] of this.services.entries()) {
      try {
        const response = await axios.get(`${config.url}${config.healthEndpoint}`, {
          timeout: 5000
        });
        health.services[name] = {
          status: response.status === 200 ? 'healthy' : 'unhealthy',
          responseTime: response.headers['x-response-time'] || 'unknown',
          circuitBreaker: config.circuitBreaker.getState()
        };
      } catch (error) {
        health.services[name] = {
          status: 'unhealthy',
          error: error.message,
          circuitBreaker: config.circuitBreaker.getState()
        };
      }
    }

    // Determine overall health
    const unhealthyServices = Object.values(health.services).filter(
      (service: any) => service.status === 'unhealthy'
    );
    
    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  };

  // ==================== METRICS ENDPOINT ====================
  public getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { service, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const metrics = await ApiRequest.getMetricsByService(service as string, start, end);
      const topEndpoints = await ApiRequest.getTopEndpoints(start, end, 10);

      res.json({
        metrics,
        topEndpoints,
        period: { start, end }
      });
    } catch (error) {
      this.logger.error('Failed to get metrics', { error: error.message });
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  };

  // ==================== UTILITY METHODS ====================
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GatewayController;

