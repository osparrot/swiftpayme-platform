import { createHttpClient } from './HttpClient';
import { RedisClient } from './RedisClient';
import { Logger } from './Logger';
import CircuitBreaker from 'opossum';
import Joi from 'joi';
import retry from 'async-retry';
import pLimit from 'p-limit';
import CoinGecko from 'coingecko-api';
import { FluentClient } from '@fluent-org/logger';
import { CurrencyCode, SUPPORTED_CURRENCIES } from '../enums/currencyEnums';
import { Counter, Gauge, Histogram, register } from 'prom-client';

// Logger instance
const logger = new Logger('ExternalSystemService');

// Fluentd Logger
const fluentd = new FluentClient('external-system-service', {
  socket: {
    host: process.env.FLUENTD_HOST || 'localhost',
    port: parseInt(process.env.FLUENTD_PORT || '24224'),
  },
});

// Environment variables
const apiKey = process.env.EXCHANGERATESAPI_KEY;
if (!apiKey) {
  logger.warn('EXCHANGERATESAPI_KEY not set. Some features may not work.');
}

const httpTimeout = parseInt(process.env.HTTP_TIMEOUT || '5000', 10);
const httpMaxRetries = parseInt(process.env.HTTP_MAX_RETRIES || '3', 10);
const httpRetryDelay = parseInt(process.env.HTTP_RETRY_DELAY || '1000', 10);

// HTTP Client
const httpClient = createHttpClient('https://api.apilayer.com', {
  timeout: httpTimeout,
  retries: httpMaxRetries,
  circuitBreaker: { threshold: 0.5, interval: 60000, timeout: 10000, enabled: true },
});

const redisClient = RedisClient.getInstance();
const coinGeckoClient = new CoinGecko();

// Prometheus Metrics
const externalRequestsCounter = new Counter({
  name: 'external_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['operation', 'status'],
});

const externalLatencyHistogram = new Histogram({
  name: 'external_operation_latency_seconds',
  help: 'External operation latency in seconds',
  labelNames: ['operation'],
  buckets: [0.05, 0.1, 0.5, 1, 2, 5],
});

const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open)',
  labelNames: ['operation'],
});

const cacheHitsCounter = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['type'],
});

const cacheErrorsCounter = new Counter({
  name: 'cache_errors_total',
  help: 'Total number of cache errors',
  labelNames: ['type'],
});

// Joi schemas
const exchangeRateSchema = Joi.object({
  rates: Joi.object().pattern(Joi.string(), Joi.number()).required(),
  base: Joi.string().required(),
  timestamp: Joi.number().required(),
});

const conversionSchema = Joi.object({
  success: Joi.boolean().required(),
  query: Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    amount: Joi.number().required(),
  }),
  result: Joi.number().required(),
});

const historicalRatesSchema = Joi.object({
  rates: Joi.object().pattern(Joi.string(), Joi.number()).required(),
  base: Joi.string().required(),
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).required(),
});

// Dynamic TTLs based on operation type
const TTL_CONFIG = {
  exchangeRates: { default: 600, volatile: 300 }, // 10 min default, 5 min for volatile (e.g., BTC)
  conversions: 600, // 10 min
  historicalRates: 86400, // 1 day
};

// Circuit Breaker Configurations
const breakerConfigs = {
  exchange: { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 10000, volumeThreshold: 10 },
  bitcoin: { timeout: 5000, errorThresholdPercentage: 60, resetTimeout: 15000, volumeThreshold: 8 },
  convert: { timeout: 5000, errorThresholdPercentage: 40, resetTimeout: 8000, volumeThreshold: 12 },
  historical: { timeout: 7000, errorThresholdPercentage: 70, resetTimeout: 20000, volumeThreshold: 5 },
};

// Create Circuit Breaker
const createCircuitBreaker = (fn: Function, options: typeof breakerConfigs['exchange']) => {
  const breaker = new CircuitBreaker(fn, options);
  breaker.on('success', () => {
    logger.info(`Circuit breaker success: ${fn.name}`, { tag: `external.${fn.name}_success` });
    fluentd.emit(`external.${fn.name}_success`, { tag: `external.${fn.name}_success` });
  });
  breaker.on('failure', (err) => {
    logger.warn(`Circuit breaker failure: ${fn.name}`, { error: err.message, tag: `external.${fn.name}_failure` });
    fluentd.emit(`external.${fn.name}_failure`, { error: err.message, tag: `external.${fn.name}_failure` });
  });
  breaker.on('open', () => {
    logger.warn(`Circuit breaker open: ${fn.name}`, { tag: `external.${fn.name}_open` });
    fluentd.emit(`external.${fn.name}_open`, { tag: `external.${fn.name}_open` });
  });
  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open: ${fn.name}`, { tag: `external.${fn.name}_half_open` });
    fluentd.emit(`external.${fn.name}_half_open`, { tag: `external.${fn.name}_half_open` });
  });
  breaker.on('close', () => {
    logger.info(`Circuit breaker close: ${fn.name}`, { tag: `external.${fn.name}_close` });
    fluentd.emit(`external.${fn.name}_close`, { tag: `external.${fn.name}_close` });
  });
  return breaker;
};

// Cached API Call with Dynamic TTL and Jittered Retry
async function cachedApiCall<T>(
  cache: RedisClient,
  hashKey: string,
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl: number = TTL_CONFIG.exchangeRates.default
): Promise<T> {
  const startTime = Date.now();
  try {
    const cached = await retry(
      () => cache.get(cacheKey),
      {
        retries: 3,
        factor: 2,
        minTimeout: 100 + Math.random() * 50, // Jitter
        maxTimeout: 1000,
        onRetry: (err) => logger.warn('Retrying cache read', { error: err.message, cacheKey, tag: 'external.cache_read_retry' }),
      }
    );
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`, { tag: 'external.cache_hit' });
      cacheHitsCounter.inc({ type: hashKey });
      externalLatencyHistogram.observe({ operation: 'cachedApiCall' }, (Date.now() - startTime) / 1000);
      return JSON.parse(cached) as T;
    }
  } catch (error: any) {
    logger.error('Cache read error', { error: error.message, cacheKey, tag: 'external.cache_read_failed' });
    await fluentd.emit('external.cache_read_failed', { cacheKey, error: error.message, tag: 'external.cache_read_failed' });
    cacheErrorsCounter.inc({ type: hashKey });
  }

  const result = await retry(apiCall, {
    retries: 3,
    factor: 2,
    minTimeout: 500 + Math.random() * 100, // Jitter
    maxTimeout: 2000,
    onRetry: (err) => logger.warn('Retrying API call', { error: err.message, cacheKey, tag: 'external.api_retry' }),
  });

  try {
    await retry(
      () => cache.set(cacheKey, JSON.stringify(result), ttl),
      {
        retries: 3,
        factor: 2,
        minTimeout: 100 + Math.random() * 50, // Jitter
        maxTimeout: 1000,
        onRetry: (err) => logger.warn('Retrying cache write', { error: err.message, cacheKey, tag: 'external.cache_write_retry' }),
      }
    );
  } catch (error: any) {
    logger.error('Cache write error', { error: error.message, cacheKey, tag: 'external.cache_write_failed' });
    await fluentd.emit('external.cache_write_failed', { cacheKey, error: error.message, tag: 'external.cache_write_failed' });
    cacheErrorsCounter.inc({ type: hashKey });
  }

  externalLatencyHistogram.observe({ operation: 'cachedApiCall' }, (Date.now() - startTime) / 1000);
  return result;
}

export class ExternalSystemService {
  private readonly requestLimiter = pLimit(5); // Adjustable dynamically in future
  private readonly exchangeBreaker;
  private readonly bitcoinBreaker;
  private readonly convertBreaker;
  private readonly historicalBreaker;

  constructor() {
    this.exchangeBreaker = createCircuitBreaker(this.fetchExchangeRate.bind(this), breakerConfigs.exchange);
    this.bitcoinBreaker = createCircuitBreaker(this.fetchBitcoinRate.bind(this), breakerConfigs.bitcoin);
    this.convertBreaker = createCircuitBreaker(this.convertAmount.bind(this), breakerConfigs.convert);
    this.historicalBreaker = createCircuitBreaker(this.fetchHistoricalRates.bind(this), breakerConfigs.historical);

    logger.info('ExternalSystemService initialized');
  }

  /**
   * Fetch currency symbols.
   */
  public async fetchSymbols(): Promise<Record<string, string>> {
    const startTime = Date.now();
    return this.requestLimiter(async () => {
      try {
        const response = await retry(
          () => httpClient.get('/exchangerates_data/symbols', { headers: { apikey: apiKey } }),
          {
            retries: httpMaxRetries,
            factor: 2,
            minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
            maxTimeout: httpRetryDelay * 4,
            onRetry: (err) => logger.warn('Retrying fetch symbols', { error: err.message, tag: 'external.symbols_retry' }),
          }
        );
        if (!response.success) throw new Error('Failed to fetch symbols');
        logger.info('Fetched currency symbols', { tag: 'external.symbols_fetched' });
        await fluentd.emit('external.symbols_fetched', { tag: 'external.symbols_fetched' });
        externalRequestsCounter.inc({ operation: 'fetchSymbols', status: 'success' });
        externalLatencyHistogram.observe({ operation: 'fetchSymbols' }, (Date.now() - startTime) / 1000);
        return response.symbols;
      } catch (error: any) {
        logger.error('Error fetching currency symbols', { error: error.message, tag: 'external.symbols_failed' });
        await fluentd.emit('external.symbols_failed', { error: error.message, tag: 'external.symbols_failed' });
        externalRequestsCounter.inc({ operation: 'fetchSymbols', status: 'failure' });
        externalLatencyHistogram.observe({ operation: 'fetchSymbols' }, (Date.now() - startTime) / 1000);
        throw error;
      }
    });
  }

  /**
   * Fetch exchange rate with caching.
   */
  private async fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number }> {
    const startTime = Date.now();
    if (!SUPPORTED_CURRENCIES.includes(fromCurrency as CurrencyCode) || !SUPPORTED_CURRENCIES.includes(toCurrency as CurrencyCode)) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }
    const isVolatile = fromCurrency === 'BTC' || toCurrency === 'BTC';
    const ttl = isVolatile ? TTL_CONFIG.exchangeRates.volatile : TTL_CONFIG.exchangeRates.default;
    const cacheKey = `external:exchange_rate:${fromCurrency}_${toCurrency}`;
    return cachedApiCall<{ rate: number }>(
      redisClient,
      'exchange_rates',
      cacheKey,
      async () => {
        const url = `/exchangerates_data/latest?base=${fromCurrency}&symbols=${toCurrency}`;
        const response = await retry(
          () => httpClient.get(url, { headers: { apikey: apiKey } }),
          {
            retries: httpMaxRetries,
            factor: 2,
            minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
            maxTimeout: httpRetryDelay * 4,
            onRetry: (err) => logger.warn('Retrying exchange rate fetch', { error: err.message, tag: 'external.exchange_rate_retry' }),
          }
        );
        const { error } = exchangeRateSchema.validate(response);
        if (error) throw new Error(`Invalid response schema: ${error.message}`);
        const rate = response.rates[toCurrency];
        if (!rate) throw new Error(`Rate for ${toCurrency} not found`);
        await fluentd.emit('external.rate_fetched', { fromCurrency, toCurrency, rate, tag: 'external.rate_fetched' });
        externalRequestsCounter.inc({ operation: 'fetchExchangeRate', status: 'success' });
        return { rate };
      },
      ttl
    ).finally(() => {
      externalLatencyHistogram.observe({ operation: 'fetchExchangeRate' }, (Date.now() - startTime) / 1000);
      circuitBreakerStateGauge.set({ operation: 'fetchExchangeRate' }, this.exchangeBreaker.isOpen() ? 1 : 0);
    });
  }

  /**
   * Fetch Bitcoin rate using CoinGecko with caching.
   */
  private async fetchBitcoinRate(toCurrency: string): Promise<{ rate: number }> {
    const startTime = Date.now();
    if (!SUPPORTED_CURRENCIES.includes(toCurrency as CurrencyCode)) {
      throw new Error(`Unsupported currency: ${toCurrency}`);
    }
    const cacheKey = `external:bitcoin_rate:${toCurrency}`;
    return cachedApiCall<{ rate: number }>(
      redisClient,
      'bitcoin_rates',
      cacheKey,
      async () => {
        const response = await retry(
          () =>
            coinGeckoClient.simple.price({
              ids: 'bitcoin',
              vs_currencies: toCurrency.toLowerCase(),
            }),
          {
            retries: httpMaxRetries,
            factor: 2,
            minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
            maxTimeout: httpRetryDelay * 4,
            onRetry: (err) => logger.warn('Retrying Bitcoin rate fetch', { error: err.message, tag: 'external.bitcoin_rate_retry' }),
          }
        );
        if (!response.success) throw new Error('Failed to fetch Bitcoin rate');
        const rate = response.data.bitcoin[toCurrency.toLowerCase()];
        if (!rate) throw new Error(`Rate for ${toCurrency} not found`);
        await fluentd.emit('external.bitcoin_rate_fetched', { toCurrency, rate, tag: 'external.bitcoin_rate_fetched' });
        externalRequestsCounter.inc({ operation: 'fetchBitcoinRate', status: 'success' });
        return { rate };
      },
      TTL_CONFIG.exchangeRates.volatile
    ).finally(() => {
      externalLatencyHistogram.observe({ operation: 'fetchBitcoinRate' }, (Date.now() - startTime) / 1000);
      circuitBreakerStateGauge.set({ operation: 'fetchBitcoinRate' }, this.bitcoinBreaker.isOpen() ? 1 : 0);
    });
  }

  /**
   * Convert currency with caching.
   */
  private async convertAmount(fromCurrency: string, toCurrency: string, amount: number): Promise<number> {
    const startTime = Date.now();
    if (!SUPPORTED_CURRENCIES.includes(fromCurrency as CurrencyCode) || !SUPPORTED_CURRENCIES.includes(toCurrency as CurrencyCode)) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }
    if (amount <= 0) throw new Error('Amount must be positive');
    const cacheKey = `external:conversion:${fromCurrency}_${toCurrency}_${amount.toFixed(fromCurrency === 'BTC' ? 8 : 2)}`;
    return cachedApiCall<number>(
      redisClient,
      'conversions',
      cacheKey,
      async () => {
        const url = `/exchangerates_data/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`;
        const response = await retry(
          () => httpClient.get(url, { headers: { apikey: apiKey } }),
          {
            retries: httpMaxRetries,
            factor: 2,
            minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
            maxTimeout: httpRetryDelay * 4,
            onRetry: (err) => logger.warn('Retrying currency conversion', { error: err.message, tag: 'external.convert_retry' }),
          }
        );
        const { error } = conversionSchema.validate(response);
        if (error) throw new Error(`Invalid conversion response: ${error.message}`);
        if (!response.success) throw new Error('Failed to convert currency');
        await fluentd.emit('external.conversion', {
          fromCurrency,
          toCurrency,
          amount,
          result: response.result,
          tag: 'external.conversion',
        });
        externalRequestsCounter.inc({ operation: 'convertAmount', status: 'success' });
        return response.result;
      },
      TTL_CONFIG.conversions
    ).finally(() => {
      externalLatencyHistogram.observe({ operation: 'convertAmount' }, (Date.now() - startTime) / 1000);
      circuitBreakerStateGauge.set({ operation: 'convertAmount' }, this.convertBreaker.isOpen() ? 1 : 0);
    });
  }

  /**
   * Fetch historical exchange rates for analytics.
   */
  public async fetchHistoricalRates(fromCurrency: string, toCurrency: string, date: string): Promise<{ rate: number }> {
    const startTime = Date.now();
    if (!SUPPORTED_CURRENCIES.includes(fromCurrency as CurrencyCode) || !SUPPORTED_CURRENCIES.includes(toCurrency as CurrencyCode)) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }
    const cacheKey = `external:historical_rate:${fromCurrency}_${toCurrency}_${date}`;
    return this.requestLimiter(() =>
      cachedApiCall<{ rate: number }>(
        redisClient,
        'historical_rates',
        cacheKey,
        async () => {
          const url = `/exchangerates_data/${date}?base=${fromCurrency}&symbols=${toCurrency}`;
          const response = await retry(
            () => httpClient.get(url, { headers: { apikey: apiKey } }),
            {
              retries: httpMaxRetries,
              factor: 2,
              minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
              maxTimeout: httpRetryDelay * 4,
              onRetry: (err) => logger.warn('Retrying historical rate fetch', { error: err.message, tag: 'external.historical_rate_retry' }),
            }
          );
          const { error } = historicalRatesSchema.validate(response);
          if (error) throw new Error(`Invalid historical rate response: ${error.message}`);
          const rate = response.rates[toCurrency];
          if (!rate) throw new Error(`Rate for ${toCurrency} on ${date} not found`);
          await fluentd.emit('external.historical_rate_fetched', {
            fromCurrency,
            toCurrency,
            date,
            rate,
            tag: 'external.historical_rate_fetched',
          });
          externalRequestsCounter.inc({ operation: 'fetchHistoricalRates', status: 'success' });
          return { rate };
        },
        TTL_CONFIG.historicalRates
      ).finally(() => {
        externalLatencyHistogram.observe({ operation: 'fetchHistoricalRates' }, (Date.now() - startTime) / 1000);
        circuitBreakerStateGauge.set({ operation: 'fetchHistoricalRates' }, this.historicalBreaker.isOpen() ? 1 : 0);
      })
    );
  }

  /**
   * Public API - Get exchange rate.
   */
  public async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number }> {
    return this.requestLimiter(() => this.exchangeBreaker.fire(fromCurrency, toCurrency));
  }

  /**
   * Public API - Convert currency.
   */
  public async convertCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<number> {
    return this.requestLimiter(() => this.convertBreaker.fire(fromCurrency, toCurrency, amount));
  }

  /**
   * Health check with enhanced details.
   */
  public async healthCheck(): Promise<{ status: string; details: Record<string, any> }> {
    const startTime = Date.now();
    try {
      const [redisPing, coinGeckoHealth] = await Promise.all([
        retry(
          () => redisClient.ping(),
          {
            retries: 3,
            factor: 2,
            minTimeout: 100 + Math.random() * 50, // Jitter
            maxTimeout: 1000,
            onRetry: (err) => logger.warn('Retrying Redis ping', { error: err.message, tag: 'external.redis_ping_retry' }),
          }
        ),
        retry(
          () => coinGeckoClient.ping(),
          {
            retries: httpMaxRetries,
            factor: 2,
            minTimeout: httpRetryDelay + Math.random() * 100, // Jitter
            maxTimeout: httpRetryDelay * 4,
            onRetry: (err) => logger.warn('Retrying CoinGecko ping', { error: err.message, tag: 'external.coingecko_ping_retry' }),
          }
        ),
      ]);

      const status =
        redisPing &&
        coinGeckoHealth.data.gecko_says.includes('CoinGecko')
          ? 'healthy'
          : 'degraded';
      const details = {
        redis: redisPing ? 'healthy' : 'unhealthy',
        coinGecko: coinGeckoHealth.data.gecko_says.includes('CoinGecko') ? 'healthy' : 'unhealthy',
        circuitBreakers: {
          exchange: this.exchangeBreaker.isOpen() ? 'open' : 'closed',
          bitcoin: this.bitcoinBreaker.isOpen() ? 'open' : 'closed',
          convert: this.convertBreaker.isOpen() ? 'open' : 'closed',
          historical: this.historicalBreaker.isOpen() ? 'open' : 'closed',
        },
      };
      await fluentd.emit('external.health_check', { status, details, tag: 'external.health_check' });
      logger.info('Health check completed', { status, details, tag: 'external.health_check' });
      externalLatencyHistogram.observe({ operation: 'healthCheck' }, (Date.now() - startTime) / 1000);
      return { status, details };
    } catch (error: any) {
      logger.error('Health check failed', { error: error.message, tag: 'external.health_check_failed' });
      await fluentd.emit('external.health_check_failed', { error: error.message, tag: 'external.health_check_failed' });
      externalLatencyHistogram.observe({ operation: 'healthCheck' }, (Date.now() - startTime) / 1000);
      return {
        status: 'unhealthy',
        details: {
          redis: 'unreachable',
          coinGecko: 'unreachable',
          circuitBreakers: 'unknown',
        },
      };
    }
  }
}

// Create and export instance
export default new ExternalSystemService();

