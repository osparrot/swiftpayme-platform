import { Decimal } from 'decimal.js';
import { Logger } from './utils/Logger';
import { 
  CurrencyCode, 
  FIAT_CURRENCIES, 
  CRYPTO_CURRENCIES, 
  MAJOR_CURRENCIES,
  CurrencyType
} from './enums/currencyEnums';
import { 
  ConversionRate, 
  HistoricalRate, 
  ExchangeRateProvider, 
  CurrencyInfo,
  ConversionRequest,
  ConversionResult,
  BatchConversionRequest,
  BatchConversionResult,
  RateUpdateEvent,
  CurrencyPair
} from './types';
import { 
  NotFoundError, 
  ValidationError, 
  InternalServerError, 
  ServiceUnavailableError,
  BadRequestError
} from './utils/Errors';
import { createHttpClient } from './utils/HttpClient';
import { EventBus } from './utils/EventBus';
import { RedisClient } from './utils/RedisClient';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import retry from 'async-retry';

// Prometheus Metrics
const conversionCounter = new Counter({
  name: 'currency_conversions_total',
  help: 'Total number of currency conversions',
  labelNames: ['from_currency', 'to_currency', 'status'],
});

const rateUpdateCounter = new Counter({
  name: 'currency_rate_updates_total',
  help: 'Total number of currency rate updates',
  labelNames: ['provider', 'status'],
});

const conversionLatencySeconds = new Histogram({
  name: 'currency_conversion_latency_seconds',
  help: 'Latency of currency conversion requests',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

const currentExchangeRateGauge = new Gauge({
  name: 'current_exchange_rate',
  help: 'Current exchange rate between two currencies',
  labelNames: ['from_currency', 'to_currency'],
});

const externalApiCallCounter = new Counter({
  name: 'external_api_calls_total',
  help: 'Total number of calls to external exchange rate APIs',
  labelNames: ['api_name', 'status'],
});

export class CurrencyConversionService {
  private readonly logger = new Logger('CurrencyConversionService');
  private readonly eventBus = EventBus.getInstance();
  private readonly redisClient = RedisClient.getInstance();
  private readonly CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10); // 5 minutes
  private readonly EXTERNAL_API_TIMEOUT_MS = parseInt(process.env.EXTERNAL_API_TIMEOUT_MS || '5000', 10);
  private readonly EXTERNAL_API_RETRIES = parseInt(process.env.EXTERNAL_API_RETRIES || '3', 10);

  // External API clients (example placeholders)
  private readonly fiatExchangeApiClient = createHttpClient(process.env.FIAT_EXCHANGE_API_URL || 'https://api.exchangerate.host', {
    timeout: this.EXTERNAL_API_TIMEOUT_MS,
    retries: this.EXTERNAL_API_RETRIES,
    circuitBreaker: { threshold: 0.5, interval: 60000, timeout: 10000, enabled: true },
  });

  private readonly cryptoExchangeApiClient = createHttpClient(process.env.CRYPTO_EXCHANGE_API_URL || 'https://api.coingecko.com/api/v3', {
    timeout: this.EXTERNAL_API_TIMEOUT_MS,
    retries: this.EXTERNAL_API_RETRIES,
    circuitBreaker: { threshold: 0.5, interval: 60000, timeout: 10000, enabled: true },
  });

  private readonly preciousMetalApiClient = createHttpClient(process.env.PRECIOUS_METAL_API_URL || 'https://www.goldapi.io/api', {
    timeout: this.EXTERNAL_API_TIMEOUT_MS,
    retries: this.EXTERNAL_API_RETRIES,
    circuitBreaker: { threshold: 0.5, interval: 60000, timeout: 10000, enabled: true },
  });

  constructor() {
    this.logger.info('CurrencyConversionService initialized', { cacheTTL: this.CACHE_TTL_SECONDS });
    this.scheduleRateUpdates();
  }

  /**
   * Schedules periodic updates for exchange rates.
   * In a real-world scenario, this would be more sophisticated, potentially using a message queue
   * or a dedicated scheduler service to trigger updates.
   */
  private scheduleRateUpdates() {
    const updateInterval = parseInt(process.env.RATE_UPDATE_INTERVAL_SECONDS || '300', 10); // Default 5 minutes
    setInterval(() => this.updateAllExchangeRates(), updateInterval * 1000);
    this.logger.info(`Scheduled rate updates every ${updateInterval} seconds`);
    // Initial update on startup
    this.updateAllExchangeRates();
  }

  /**
   * Fetches and updates exchange rates from all configured providers.
   */
  private async updateAllExchangeRates(): Promise<void> {
    this.logger.info('Starting all exchange rate updates...');
    try {
      await this.updateFiatExchangeRates();
      await this.updateCryptoExchangeRates();
      await this.updatePreciousMetalRates();
      this.logger.info('All exchange rates updated successfully.');
    } catch (error: any) {
      this.logger.error('Failed to update all exchange rates', { error: error.message });
    }
  }

  /**
   * Fetches and updates fiat currency exchange rates.
   */
  private async updateFiatExchangeRates(): Promise<void> {
    const providerName = 'ExchangeRateHost';
    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      const response = await this.fiatExchangeApiClient.get('/latest', {
        params: { base: CurrencyCode.USD, symbols: FIAT_CURRENCIES.join(',') },
      });

      if (response && response.rates) {
        for (const targetCurrency of FIAT_CURRENCIES) {
          if (response.rates[targetCurrency]) {
            const rate = new Decimal(response.rates[targetCurrency]);
            await this.setExchangeRate(CurrencyCode.USD, targetCurrency, rate, providerName);
            currentExchangeRateGauge.set({ from_currency: CurrencyCode.USD, to_currency: targetCurrency }, rate.toNumber());
          }
        }
        rateUpdateCounter.inc({ provider: providerName, status: 'success' });
        externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
        this.logger.info(`Fiat rates updated from ${providerName}`);
      } else {
        throw new InternalServerError(`Invalid response from ${providerName}`);
      }
    } catch (error: any) {
      rateUpdateCounter.inc({ provider: providerName, status: 'failure' });
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to update fiat rates from ${providerName}`, { error: error.message });
    }
  }

  /**
   * Fetches and updates cryptocurrency exchange rates.
   */
  private async updateCryptoExchangeRates(): Promise<void> {
    const providerName = 'CoinGecko';
    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      const ids = CRYPTO_CURRENCIES.map(c => c.toLowerCase()).join(',');
      const vsCurrencies = MAJOR_CURRENCIES.map(c => c.toLowerCase()).join(',');
      const response = await this.cryptoExchangeApiClient.get('/simple/price', {
        params: { ids, vs_currencies: vsCurrencies },
      });

      if (response) {
        for (const crypto of CRYPTO_CURRENCIES) {
          const cryptoLower = crypto.toLowerCase();
          if (response[cryptoLower]) {
            for (const fiat of MAJOR_CURRENCIES) {
              const fiatLower = fiat.toLowerCase();
              if (response[cryptoLower][fiatLower]) {
                const rate = new Decimal(response[cryptoLower][fiatLower]);
                await this.setExchangeRate(crypto, fiat, rate, providerName);
                currentExchangeRateGauge.set({ from_currency: crypto, to_currency: fiat }, rate.toNumber());
              }
            }
          }
        }
        rateUpdateCounter.inc({ provider: providerName, status: 'success' });
        externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
        this.logger.info(`Crypto rates updated from ${providerName}`);
      } else {
        throw new InternalServerError(`Invalid response from ${providerName}`);
      }
    } catch (error: any) {
      rateUpdateCounter.inc({ provider: providerName, status: 'failure' });
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to update crypto rates from ${providerName}`, { error: error.message });
    }
  }

  /**
   * Fetches and updates precious metal exchange rates (Gold, Silver).
   */
  private async updatePreciousMetalRates(): Promise<void> {
    const providerName = 'GoldAPI.io';
    const apiKey = process.env.GOLD_API_KEY; // Ensure you have an API key for GoldAPI.io
    if (!apiKey) {
      this.logger.warn('GOLD_API_KEY not set. Skipping precious metal rate updates.');
      return;
    }

    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      // Example for Gold (XAU) to USD
      const goldResponse = await this.preciousMetalApiClient.get('/XAU/USD', {
        headers: { 'x-access-token': apiKey },
      });
      if (goldResponse && goldResponse.price) {
        const rate = new Decimal(goldResponse.price);
        await this.setExchangeRate(CurrencyCode.XAU, CurrencyCode.USD, rate, providerName);
        currentExchangeRateGauge.set({ from_currency: CurrencyCode.XAU, to_currency: CurrencyCode.USD }, rate.toNumber());
        this.logger.info(`Gold (XAU) rate updated from ${providerName}`);
      }

      // Example for Silver (XAG) to USD
      const silverResponse = await this.preciousMetalApiClient.get('/XAG/USD', {
        headers: { 'x-access-token': apiKey },
      });
      if (silverResponse && silverResponse.price) {
        const rate = new Decimal(silverResponse.price);
        await this.setExchangeRate(CurrencyCode.XAG, CurrencyCode.USD, rate, providerName);
        currentExchangeRateGauge.set({ from_currency: CurrencyCode.XAG, to_currency: CurrencyCode.USD }, rate.toNumber());
        this.logger.info(`Silver (XAG) rate updated from ${providerName}`);
      }

      rateUpdateCounter.inc({ provider: providerName, status: 'success' });
      externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
    } catch (error: any) {
      rateUpdateCounter.inc({ provider: providerName, status: 'failure' });
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to update precious metal rates from ${providerName}`, { error: error.message });
    }
  }

  /**
   * Stores an exchange rate in Redis cache and publishes an event.
   */
  private async setExchangeRate(from: CurrencyCode, to: CurrencyCode, rate: Decimal, provider: string): Promise<void> {
    const key = `exchange_rate:${from}:${to}`;
    const invertedKey = `exchange_rate:${to}:${from}`;
    const rateString = rate.toString();
    const invertedRateString = (new Decimal(1).div(rate)).toString();

    await this.redisClient.set(key, rateString, this.CACHE_TTL_SECONDS);
    await this.redisClient.set(invertedKey, invertedRateString, this.CACHE_TTL_SECONDS);

    this.logger.debug(`Set rate ${from} to ${to}: ${rateString} (Provider: ${provider})`);
    this.eventBus.publish('currency.rate_updated', { from, to, rate: rateString, provider } as RateUpdateEvent);
  }

  /**
   * Retrieves an exchange rate from cache or external API.
   */
  private async getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<Decimal> {
    if (from === to) {
      return new Decimal(1);
    }

    const key = `exchange_rate:${from}:${to}`;
    const invertedKey = `exchange_rate:${to}:${from}`;

    // Try cache first
    let rateString = await this.redisClient.get(key);
    if (rateString) {
      this.logger.debug(`Cache hit for ${from} to ${to}`);
      return new Decimal(rateString);
    }

    // Try inverted cache key
    rateString = await this.redisClient.get(invertedKey);
    if (rateString) {
      this.logger.debug(`Cache hit for ${to} to ${from} (inverted)`);
      return new Decimal(1).div(new Decimal(rateString));
    }

    this.logger.warn(`Cache miss for ${from} to ${to}. Attempting real-time fetch.`);

    // Fallback to real-time fetch if not in cache
    try {
      // Prioritize direct conversion if available
      let rate: Decimal | null = null;

      if (FIAT_CURRENCIES.includes(from) && FIAT_CURRENCIES.includes(to)) {
        rate = await this.fetchFiatRate(from, to);
      } else if (CRYPTO_CURRENCIES.includes(from) && FIAT_CURRENCIES.includes(to)) {
        rate = await this.fetchCryptoToFiatRate(from, to);
      } else if (FIAT_CURRENCIES.includes(from) && CRYPTO_CURRENCIES.includes(to)) {
        const invertedRate = await this.fetchCryptoToFiatRate(to, from);
        rate = invertedRate ? new Decimal(1).div(invertedRate) : null;
      } else if (this.isPreciousMetal(from) && to === CurrencyCode.USD) {
        rate = await this.fetchPreciousMetalRate(from);
      } else if (from === CurrencyCode.USD && this.isPreciousMetal(to)) {
        const invertedRate = await this.fetchPreciousMetalRate(to);
        rate = invertedRate ? new Decimal(1).div(invertedRate) : null;
      } else if (CRYPTO_CURRENCIES.includes(from) && CRYPTO_CURRENCIES.includes(to)) {
        // Convert crypto to USD, then USD to target crypto
        const fromUSD = await this.fetchCryptoToFiatRate(from, CurrencyCode.USD);
        const toUSD = await this.fetchCryptoToFiatRate(to, CurrencyCode.USD);
        if (fromUSD && toUSD) {
          rate = fromUSD.div(toUSD);
        }
      } else if (this.isPreciousMetal(from) && FIAT_CURRENCIES.includes(to)) {
        // Convert metal to USD, then USD to target fiat
        const metalToUSD = await this.fetchPreciousMetalRate(from);
        const USDToFiat = await this.fetchFiatRate(CurrencyCode.USD, to);
        if (metalToUSD && USDToFiat) {
          rate = metalToUSD.mul(USDToFiat);
        }
      } else if (FIAT_CURRENCIES.includes(from) && this.isPreciousMetal(to)) {
        // Convert fiat to USD, then USD to target metal
        const fiatToUSD = await this.fetchFiatRate(from, CurrencyCode.USD);
        const USDToMetal = await this.fetchPreciousMetalRate(to);
        if (fiatToUSD && USDToMetal) {
          rate = fiatToUSD.div(USDToMetal);
        }
      }

      if (rate) {
        await this.setExchangeRate(from, to, rate, 'Real-time Fetch');
        currentExchangeRateGauge.set({ from_currency: from, to_currency: to }, rate.toNumber());
        return rate;
      } else {
        throw new NotFoundError(`Exchange rate for ${from} to ${to} not found via real-time fetch.`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch real-time rate for ${from} to ${to}`, { error: error.message });
      throw new ServiceUnavailableError(`Could not retrieve exchange rate for ${from} to ${to}.`);
    }
  }

  private async fetchFiatRate(from: CurrencyCode, to: CurrencyCode): Promise<Decimal | null> {
    const providerName = 'ExchangeRateHost_Realtime';
    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      const response = await this.fiatExchangeApiClient.get('/latest', {
        params: { base: from, symbols: to },
      });
      if (response && response.rates && response.rates[to]) {
        externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
        return new Decimal(response.rates[to]);
      }
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      return null;
    } catch (error) {
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to fetch fiat rate from ${providerName} for ${from}-${to}`, { error });
      return null;
    }
  }

  private async fetchCryptoToFiatRate(crypto: CurrencyCode, fiat: CurrencyCode): Promise<Decimal | null> {
    const providerName = 'CoinGecko_Realtime';
    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      const response = await this.cryptoExchangeApiClient.get('/simple/price', {
        params: { ids: crypto.toLowerCase(), vs_currencies: fiat.toLowerCase() },
      });
      if (response && response[crypto.toLowerCase()] && response[crypto.toLowerCase()][fiat.toLowerCase()]) {
        externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
        return new Decimal(response[crypto.toLowerCase()][fiat.toLowerCase()]);
      }
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      return null;
    } catch (error) {
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to fetch crypto rate from ${providerName} for ${crypto}-${fiat}`, { error });
      return null;
    }
  }

  private async fetchPreciousMetalRate(metal: CurrencyCode): Promise<Decimal | null> {
    const providerName = 'GoldAPI.io_Realtime';
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) return null;

    try {
      externalApiCallCounter.inc({ api_name: providerName, status: 'attempt' });
      const response = await this.preciousMetalApiClient.get(`/${metal}/USD`, {
        headers: { 'x-access-token': apiKey },
      });
      if (response && response.price) {
        externalApiCallCounter.inc({ api_name: providerName, status: 'success' });
        return new Decimal(response.price);
      }
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      return null;
    } catch (error) {
      externalApiCallCounter.inc({ api_name: providerName, status: 'failure' });
      this.logger.error(`Failed to fetch precious metal rate from ${providerName} for ${metal}-USD`, { error });
      return null;
    }
  }

  private isPreciousMetal(currency: CurrencyCode): boolean {
    return currency === CurrencyCode.XAU || currency === CurrencyCode.XAG;
  }

  /**
   * Converts an amount from one currency to another.
   */
  async convertCurrency(request: ConversionRequest): Promise<ConversionResult> {
    const startTime = Date.now();
    const { amount, fromCurrency, toCurrency } = request;

    try {
      if (amount.lte(0)) {
        throw new ValidationError('Amount must be positive');
      }
      if (!Object.values(CurrencyCode).includes(fromCurrency)) {
        throw new ValidationError(`Invalid fromCurrency: ${fromCurrency}`);
      }
      if (!Object.values(CurrencyCode).includes(toCurrency)) {
        throw new ValidationError(`Invalid toCurrency: ${toCurrency}`);
      }

      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount.mul(rate);

      conversionCounter.inc({ from_currency: fromCurrency, to_currency: toCurrency, status: 'success' });
      this.logger.info(`Converted ${amount} ${fromCurrency} to ${convertedAmount} ${toCurrency}`, {
        from: fromCurrency, to: toCurrency, amount: amount.toString(), convertedAmount: convertedAmount.toString(), rate: rate.toString(),
      });

      return {
        fromCurrency,
        toCurrency,
        originalAmount: amount,
        convertedAmount,
        exchangeRate: rate,
        timestamp: new Date(),
      };
    } catch (error: any) {
      conversionCounter.inc({ from_currency: fromCurrency, to_currency: toCurrency, status: 'failure' });
      this.logger.error(`Failed to convert currency from ${fromCurrency} to ${toCurrency}`, { error: error.message, amount: amount.toString() });
      throw this.handleServiceError(error, `Failed to convert currency: ${error.message}`);
    } finally {
      conversionLatencySeconds.observe(Date.now() - startTime / 1000);
    }
  }

  /**
   * Performs batch currency conversions.
   */
  async batchConvertCurrency(requests: BatchConversionRequest[]): Promise<BatchConversionResult[]> {
    const results: BatchConversionResult[] = [];
    for (const req of requests) {
      try {
        const conversionResult = await this.convertCurrency(new Decimal(req.amount), req.fromCurrency, req.toCurrency);
        results.push({ ...conversionResult, success: true });
      } catch (error: any) {
        this.logger.error(`Batch conversion failed for ${req.fromCurrency} to ${req.toCurrency} amount ${req.amount}`, { error: error.message });
        results.push({
          fromCurrency: req.fromCurrency,
          toCurrency: req.toCurrency,
          originalAmount: new Decimal(req.amount),
          convertedAmount: new Decimal(0),
          exchangeRate: new Decimal(0),
          timestamp: new Date(),
          success: false,
          error: error.message,
        });
      }
    }
    return results;
  }

  /**
   * Retrieves the current exchange rate for a given pair.
   */
  async getCurrentRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<ConversionRate> {
    try {
      if (!Object.values(CurrencyCode).includes(fromCurrency)) {
        throw new ValidationError(`Invalid fromCurrency: ${fromCurrency}`);
      }
      if (!Object.values(CurrencyCode).includes(toCurrency)) {
        throw new ValidationError(`Invalid toCurrency: ${toCurrency}`);
      }

      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      return {
        fromCurrency,
        toCurrency,
        rate,
        timestamp: new Date(),
        provider: 'Real-time/Cache',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get current rate for ${fromCurrency} to ${toCurrency}`, { error: error.message });
      throw this.handleServiceError(error, `Failed to get current rate: ${error.message}`);
    }
  }

  /**
   * Retrieves historical exchange rates (placeholder - would integrate with a historical data API).
   */
  async getHistoricalRates(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, date: Date): Promise<HistoricalRate> {
    this.logger.warn('Historical rate lookup is a placeholder and not fully implemented.');
    // In a real system, this would query a historical data provider or a local time-series database.
    // For now, it returns the current rate as a placeholder.
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      return {
        fromCurrency,
        toCurrency,
        rate,
        timestamp: date,
        provider: 'Simulated Historical',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get historical rate for ${fromCurrency} to ${toCurrency} on ${date.toISOString()}`, { error: error.message });
      throw this.handleServiceError(error, `Failed to get historical rate: ${error.message}`);
    }
  }

  /**
   * Provides information about supported currencies.
   */
  getCurrencyInfo(currencyCode: CurrencyCode): CurrencyInfo {
    if (!Object.values(CurrencyCode).includes(currencyCode)) {
      throw new NotFoundError(`Currency info not found for: ${currencyCode}`);
    }

    let type: CurrencyType;
    if (FIAT_CURRENCIES.includes(currencyCode)) {
      type = CurrencyType.FIAT;
    } else if (CRYPTO_CURRENCIES.includes(currencyCode)) {
      type = CurrencyType.CRYPTO;
    } else if (this.isPreciousMetal(currencyCode)) {
      type = CurrencyType.FIAT; // Treating precious metals as fiat for simplicity in this context
    } else {
      type = CurrencyType.FIAT; // Default or handle unknown
    }

    return {
      code: currencyCode,
      name: this.getCurrencyName(currencyCode),
      symbol: this.getCurrencySymbol(currencyCode),
      type,
      decimalPlaces: this.getCurrencyDecimalPlaces(currencyCode),
      isSupported: true,
    };
  }

  /**
   * Health check for the service.
   */
  async healthCheck(): Promise<any> {
    try {
      const redisHealth = await this.redisClient.healthCheck();
      // Attempt to fetch a common rate to check external API connectivity
      let externalApiStatus = 'healthy';
      try {
        await this.fiatExchangeApiClient.get('/latest', { params: { base: 'USD', symbols: 'EUR' } });
      } catch (error) {
        externalApiStatus = 'unhealthy';
      }

      return {
        status: redisHealth.status === 'healthy' && externalApiStatus === 'healthy' ? 'healthy' : 'degraded',
        components: {
          redis: redisHealth.status,
          externalExchangeApi: externalApiStatus,
        },
        metrics: await register.metrics(),
      };
    } catch (error: any) {
      this.logger.error('Health check failed', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }

  private getCurrencyName(code: CurrencyCode): string {
    switch (code) {
      case CurrencyCode.USD: return 'United States Dollar';
      case CurrencyCode.EUR: return 'Euro';
      case CurrencyCode.GBP: return 'British Pound Sterling';
      case CurrencyCode.JPY: return 'Japanese Yen';
      case CurrencyCode.CAD: return 'Canadian Dollar';
      case CurrencyCode.AUD: return 'Australian Dollar';
      case CurrencyCode.CHF: return 'Swiss Franc';
      case CurrencyCode.CNY: return 'Chinese Yuan';
      case CurrencyCode.BTC: return 'Bitcoin';
      case CurrencyCode.ETH: return 'Ethereum';
      case CurrencyCode.XAU: return 'Gold Ounce';
      case CurrencyCode.XAG: return 'Silver Ounce';
      default: return code;
    }
  }

  private getCurrencySymbol(code: CurrencyCode): string {
    switch (code) {
      case CurrencyCode.USD: return '$';
      case CurrencyCode.EUR: return '€';
      case CurrencyCode.GBP: return '£';
      case CurrencyCode.JPY: return '¥';
      case CurrencyCode.CAD: return 'C$';
      case CurrencyCode.AUD: return 'A$';
      case CurrencyCode.CHF: return 'CHF';
      case CurrencyCode.CNY: return '¥';
      case CurrencyCode.BTC: return '₿';
      case CurrencyCode.ETH: return 'Ξ';
      case CurrencyCode.XAU: return 'XAU'; // ISO 4217 code for Gold
      case CurrencyCode.XAG: return 'XAG'; // ISO 4217 code for Silver
      default: return code;
    }
  }

  private getCurrencyDecimalPlaces(code: CurrencyCode): number {
    switch (code) {
      case CurrencyCode.JPY: return 0;
      case CurrencyCode.BTC: return 8;
      case CurrencyCode.ETH: return 18;
      case CurrencyCode.XAU: return 2; // Gold is typically quoted with 2 decimal places
      case CurrencyCode.XAG: return 2; // Silver is typically quoted with 2 decimal places
      default: return 2;
    }
  }

  private handleServiceError(error: unknown, defaultMessage: string): never {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof NotFoundError) {
      throw error;
    }
    if (error instanceof BadRequestError) {
      throw error;
    }
    if (error instanceof ServiceUnavailableError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new InternalServerError(error.message);
    }
    throw new InternalServerError(defaultMessage);
  }
}

export default new CurrencyConversionService();


