import { Request, Response, NextFunction } from 'express';
import { Decimal } from 'decimal.js';
import { Logger } from '../utils/Logger';
import { 
  ValidationError, 
  NotFoundError, 
  InternalServerError, 
  ServiceUnavailableError,
  BadRequestError 
} from '../utils/Errors';
import { CurrencyCode, ConversionStatus } from '../enums/currencyEnums';
import { 
  ConversionRequest, 
  ConversionResult, 
  BatchConversionRequest, 
  BatchConversionResult,
  AuthenticatedRequest,
  ConvertCurrencyRequest,
  GetRateRequest,
  GetHistoricalRatesRequest,
  BatchConvertRequest,
  UpdateRatesRequest
} from '../types';
import CurrencyConversionService from '../CurrencyConversionService';
import { ExternalSystemService } from '../utils/ExternalSystemService';
import { EventBus } from '../utils/EventBus';
import { Counter, Histogram } from 'prom-client';

// Prometheus Metrics
const conversionRequestsCounter = new Counter({
  name: 'currency_conversion_requests_total',
  help: 'Total number of currency conversion requests',
  labelNames: ['endpoint', 'status'],
});

const conversionLatencyHistogram = new Histogram({
  name: 'currency_conversion_request_latency_seconds',
  help: 'Currency conversion request latency in seconds',
  labelNames: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

export class CurrencyController {
  private readonly logger = new Logger('CurrencyController');
  private readonly eventBus = EventBus.getInstance();
  private readonly externalSystemService = new ExternalSystemService();

  /**
   * Convert currency amount
   * POST /api/currency/convert
   */
  async convertCurrency(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'convertCurrency';
    
    try {
      const { amount, fromCurrency, toCurrency, userId, accountId }: ConvertCurrencyRequest = req.body;

      // Validate input
      if (!amount || !fromCurrency || !toCurrency) {
        throw new BadRequestError('Missing required fields: amount, fromCurrency, toCurrency');
      }

      if (!Object.values(CurrencyCode).includes(fromCurrency)) {
        throw new ValidationError(`Invalid fromCurrency: ${fromCurrency}`);
      }

      if (!Object.values(CurrencyCode).includes(toCurrency)) {
        throw new ValidationError(`Invalid toCurrency: ${toCurrency}`);
      }

      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lte(0)) {
        throw new ValidationError('Amount must be positive');
      }

      // Create conversion request
      const conversionRequest: ConversionRequest = {
        amount: amountDecimal,
        fromCurrency,
        toCurrency,
        userId: userId || req.user?.id,
        accountId,
        requestId: req.requestId
      };

      // Perform conversion
      const result = await CurrencyConversionService.convertCurrency(conversionRequest);

      // Log conversion event
      this.eventBus.publish('currency.conversion_completed', {
        userId: conversionRequest.userId,
        accountId: conversionRequest.accountId,
        fromCurrency,
        toCurrency,
        originalAmount: amountDecimal.toString(),
        convertedAmount: result.convertedAmount.toString(),
        exchangeRate: result.exchangeRate.toString(),
        timestamp: new Date(),
        status: ConversionStatus.SUCCESS,
        requestId: req.requestId
      });

      conversionRequestsCounter.inc({ endpoint, status: 'success' });
      
      this.logger.info('Currency conversion completed', {
        userId: conversionRequest.userId,
        fromCurrency,
        toCurrency,
        amount: amountDecimal.toString(),
        convertedAmount: result.convertedAmount.toString(),
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: {
          ...result,
          originalAmount: result.originalAmount.toString(),
          convertedAmount: result.convertedAmount.toString(),
          exchangeRate: result.exchangeRate.toString(),
          fees: result.fees?.toString() || '0'
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Currency conversion failed', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Get current exchange rate
   * GET /api/currency/rate
   */
  async getCurrentRate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'getCurrentRate';
    
    try {
      const { fromCurrency, toCurrency }: GetRateRequest = req.query as any;

      if (!fromCurrency || !toCurrency) {
        throw new BadRequestError('Missing required query parameters: fromCurrency, toCurrency');
      }

      if (!Object.values(CurrencyCode).includes(fromCurrency)) {
        throw new ValidationError(`Invalid fromCurrency: ${fromCurrency}`);
      }

      if (!Object.values(CurrencyCode).includes(toCurrency)) {
        throw new ValidationError(`Invalid toCurrency: ${toCurrency}`);
      }

      const rate = await CurrencyConversionService.getCurrentRate(fromCurrency, toCurrency);

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      this.logger.info('Exchange rate retrieved', {
        fromCurrency,
        toCurrency,
        rate: rate.rate.toString(),
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: {
          ...rate,
          rate: rate.rate.toString()
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Failed to get exchange rate', {
        error: error.message,
        requestId: req.requestId,
        query: req.query
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Get historical exchange rates
   * GET /api/currency/historical
   */
  async getHistoricalRates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'getHistoricalRates';
    
    try {
      const { fromCurrency, toCurrency, startDate, endDate, interval }: GetHistoricalRatesRequest = req.query as any;

      if (!fromCurrency || !toCurrency || !startDate || !endDate) {
        throw new BadRequestError('Missing required query parameters: fromCurrency, toCurrency, startDate, endDate');
      }

      if (!Object.values(CurrencyCode).includes(fromCurrency)) {
        throw new ValidationError(`Invalid fromCurrency: ${fromCurrency}`);
      }

      if (!Object.values(CurrencyCode).includes(toCurrency)) {
        throw new ValidationError(`Invalid toCurrency: ${toCurrency}`);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
      }

      if (start >= end) {
        throw new ValidationError('Start date must be before end date');
      }

      // For now, return a single historical rate (placeholder implementation)
      const historicalRate = await CurrencyConversionService.getHistoricalRates(fromCurrency, toCurrency, start);

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      this.logger.info('Historical rates retrieved', {
        fromCurrency,
        toCurrency,
        startDate,
        endDate,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: {
          ...historicalRate,
          rate: historicalRate.rate.toString()
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Failed to get historical rates', {
        error: error.message,
        requestId: req.requestId,
        query: req.query
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Batch convert currencies
   * POST /api/currency/batch-convert
   */
  async batchConvert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'batchConvert';
    
    try {
      const { conversions, userId }: BatchConvertRequest = req.body;

      if (!conversions || !Array.isArray(conversions) || conversions.length === 0) {
        throw new BadRequestError('Missing or empty conversions array');
      }

      if (conversions.length > 100) {
        throw new BadRequestError('Maximum 100 conversions allowed per batch');
      }

      // Validate each conversion request
      for (const conversion of conversions) {
        if (!conversion.amount || !conversion.fromCurrency || !conversion.toCurrency) {
          throw new BadRequestError('Each conversion must have amount, fromCurrency, and toCurrency');
        }

        if (!Object.values(CurrencyCode).includes(conversion.fromCurrency)) {
          throw new ValidationError(`Invalid fromCurrency: ${conversion.fromCurrency}`);
        }

        if (!Object.values(CurrencyCode).includes(conversion.toCurrency)) {
          throw new ValidationError(`Invalid toCurrency: ${conversion.toCurrency}`);
        }

        const amount = new Decimal(conversion.amount);
        if (amount.lte(0)) {
          throw new ValidationError('All amounts must be positive');
        }
      }

      // Perform batch conversion
      const results = await CurrencyConversionService.batchConvertCurrency(conversions);

      // Log batch conversion event
      this.eventBus.publish('currency.batch_conversion_completed', {
        userId: userId || req.user?.id,
        conversions: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        timestamp: new Date(),
        requestId: req.requestId
      });

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      this.logger.info('Batch conversion completed', {
        userId: userId || req.user?.id,
        totalConversions: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: results.map(result => ({
          ...result,
          originalAmount: result.originalAmount.toString(),
          convertedAmount: result.convertedAmount.toString(),
          exchangeRate: result.exchangeRate.toString(),
          fees: result.fees?.toString() || '0'
        })),
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Batch conversion failed', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Get currency information
   * GET /api/currency/info/:currencyCode
   */
  async getCurrencyInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'getCurrencyInfo';
    
    try {
      const { currencyCode } = req.params;

      if (!currencyCode) {
        throw new BadRequestError('Currency code is required');
      }

      if (!Object.values(CurrencyCode).includes(currencyCode as CurrencyCode)) {
        throw new NotFoundError(`Currency not found: ${currencyCode}`);
      }

      const currencyInfo = CurrencyConversionService.getCurrencyInfo(currencyCode as CurrencyCode);

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      this.logger.info('Currency info retrieved', {
        currencyCode,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: currencyInfo,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Failed to get currency info', {
        error: error.message,
        requestId: req.requestId,
        params: req.params
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Get supported currencies
   * GET /api/currency/supported
   */
  async getSupportedCurrencies(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'getSupportedCurrencies';
    
    try {
      const supportedCurrencies = Object.values(CurrencyCode).map(code => 
        CurrencyConversionService.getCurrencyInfo(code)
      );

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      this.logger.info('Supported currencies retrieved', {
        count: supportedCurrencies.length,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: {
          currencies: supportedCurrencies,
          count: supportedCurrencies.length
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Failed to get supported currencies', {
        error: error.message,
        requestId: req.requestId
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Update exchange rates manually (admin only)
   * POST /api/currency/update-rates
   */
  async updateRates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'updateRates';
    
    try {
      // Check if user has admin permissions
      if (!req.user || !req.user.permissions?.includes('admin')) {
        throw new ValidationError('Admin permissions required');
      }

      const { currencies, providers, force }: UpdateRatesRequest = req.body;

      this.logger.info('Manual rate update initiated', {
        userId: req.user.id,
        currencies: currencies?.length || 'all',
        providers: providers?.length || 'all',
        force: force || false,
        requestId: req.requestId
      });

      // Trigger rate update (this would typically be handled by a background job)
      // For now, we'll just return a success response
      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      res.status(200).json({
        success: true,
        message: 'Rate update initiated',
        data: {
          currencies: currencies || 'all',
          providers: providers || 'all',
          force: force || false,
          initiatedBy: req.user.id,
          initiatedAt: new Date().toISOString()
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Failed to update rates', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Health check endpoint
   * GET /api/currency/health
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'healthCheck';
    
    try {
      const [serviceHealth, externalHealth] = await Promise.all([
        CurrencyConversionService.healthCheck(),
        this.externalSystemService.healthCheck()
      ]);

      const overallStatus = serviceHealth.status === 'healthy' && externalHealth.status === 'healthy' 
        ? 'healthy' 
        : 'degraded';

      conversionRequestsCounter.inc({ endpoint, status: 'success' });

      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        success: true,
        status: overallStatus,
        data: {
          service: serviceHealth,
          external: externalHealth,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0'
        }
      });

    } catch (error: any) {
      conversionRequestsCounter.inc({ endpoint, status: 'error' });
      this.logger.error('Health check failed', {
        error: error.message
      });
      
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      conversionLatencyHistogram.observe({ endpoint }, (Date.now() - startTime) / 1000);
    }
  }
}

export default new CurrencyController();

