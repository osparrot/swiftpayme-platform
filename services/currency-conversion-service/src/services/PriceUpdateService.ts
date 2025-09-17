import axios, { AxiosResponse } from 'axios';
import retry from 'async-retry';
import CircuitBreaker from 'opossum';
import { Logger } from '../utils/Logger';
import { RedisClient } from '../utils/RedisClient';
import { ExchangeRate } from '../models/ExchangeRate';
import { PreciousMetalPrice } from '../models/PreciousMetalPrice';
import { CryptocurrencyPrice } from '../models/CryptocurrencyPrice';
import { 
  PriceSource, 
  CurrencyCode, 
  PreciousMetalType,
  CryptocurrencySymbol,
  PriceUpdateResult,
  ExternalPriceData,
  PriceValidationResult
} from '../types';

export class PriceUpdateService {
  private logger: Logger;
  private redisClient: RedisClient;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private updateIntervals: Map<string, NodeJS.Timeout>;
  private isInitialized: boolean = false;

  // API Configuration
  private readonly API_CONFIGS = {
    fiat: {
      primary: {
        name: 'ExchangeRatesAPI',
        url: 'https://api.exchangerate-api.com/v4/latest',
        key: process.env.EXCHANGE_RATES_API_KEY,
        timeout: 10000,
        retries: 3
      },
      fallback: [
        {
          name: 'Fixer',
          url: 'https://api.fixer.io/latest',
          key: process.env.FIXER_API_KEY,
          timeout: 10000,
          retries: 2
        },
        {
          name: 'CurrencyLayer',
          url: 'https://api.currencylayer.com/live',
          key: process.env.CURRENCY_LAYER_API_KEY,
          timeout: 10000,
          retries: 2
        }
      ]
    },
    precious_metals: {
      primary: {
        name: 'MetalsAPI',
        url: 'https://api.metals-api.com/v1/latest',
        key: process.env.METALS_API_KEY,
        timeout: 15000,
        retries: 3
      },
      fallback: [
        {
          name: 'PreciousMetalsAPI',
          url: 'https://api.preciousmetals-api.com/v1/latest',
          key: process.env.PRECIOUS_METALS_API_KEY,
          timeout: 15000,
          retries: 2
        }
      ]
    },
    cryptocurrency: {
      primary: {
        name: 'CoinGecko',
        url: 'https://api.coingecko.com/api/v3/simple/price',
        key: process.env.COINGECKO_API_KEY,
        timeout: 10000,
        retries: 3
      },
      fallback: [
        {
          name: 'CoinMarketCap',
          url: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
          key: process.env.COINMARKETCAP_API_KEY,
          timeout: 10000,
          retries: 2
        }
      ]
    }
  };

  // Supported currencies and assets
  private readonly SUPPORTED_FIAT_CURRENCIES: CurrencyCode[] = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
    'KRW', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
    'RUB', 'ZAR', 'TRY', 'ILS', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'EGP'
  ];

  private readonly SUPPORTED_PRECIOUS_METALS: PreciousMetalType[] = [
    'XAU', 'XAG', 'XPD', 'XPT'
  ];

  private readonly SUPPORTED_CRYPTOCURRENCIES: CryptocurrencySymbol[] = [
    'BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'ADA', 'DOT', 'LINK', 'BNB', 'SOL'
  ];

  constructor() {
    this.logger = new Logger('PriceUpdateService');
    this.redisClient = RedisClient.getInstance();
    this.circuitBreakers = new Map();
    this.updateIntervals = new Map();
    
    this.initializeCircuitBreakers();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing PriceUpdateService');

      // Perform initial price updates
      await this.performInitialUpdates();

      this.isInitialized = true;
      this.logger.info('PriceUpdateService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PriceUpdateService', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping PriceUpdateService');

    // Clear all intervals
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();

    // Close circuit breakers
    this.circuitBreakers.forEach((breaker) => {
      breaker.shutdown();
    });
    this.circuitBreakers.clear();

    this.isInitialized = false;
    this.logger.info('PriceUpdateService stopped');
  }

  private initializeCircuitBreakers(): void {
    const breakerOptions = {
      timeout: 15000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10
    };

    // Create circuit breakers for each API
    Object.keys(this.API_CONFIGS).forEach(category => {
      const config = this.API_CONFIGS[category as keyof typeof this.API_CONFIGS];
      
      // Primary API breaker
      const primaryBreaker = new CircuitBreaker(
        this.makeApiCall.bind(this),
        {
          ...breakerOptions,
          name: `${category}-primary`
        }
      );

      primaryBreaker.on('open', () => {
        this.logger.warn(`Circuit breaker opened for ${category} primary API`);
      });

      primaryBreaker.on('halfOpen', () => {
        this.logger.info(`Circuit breaker half-open for ${category} primary API`);
      });

      primaryBreaker.on('close', () => {
        this.logger.info(`Circuit breaker closed for ${category} primary API`);
      });

      this.circuitBreakers.set(`${category}-primary`, primaryBreaker);

      // Fallback API breakers
      config.fallback.forEach((fallbackConfig, index) => {
        const fallbackBreaker = new CircuitBreaker(
          this.makeApiCall.bind(this),
          {
            ...breakerOptions,
            name: `${category}-fallback-${index}`
          }
        );

        this.circuitBreakers.set(`${category}-fallback-${index}`, fallbackBreaker);
      });
    });
  }

  private async performInitialUpdates(): Promise<void> {
    const updatePromises = [
      this.updateCurrencyRates(),
      this.updatePreciousMetalsPrices(),
      this.updateCryptocurrencyPrices()
    ];

    const results = await Promise.allSettled(updatePromises);
    
    results.forEach((result, index) => {
      const updateType = ['currency rates', 'precious metals', 'cryptocurrency'][index];
      if (result.status === 'rejected') {
        this.logger.warn(`Initial ${updateType} update failed`, { 
          error: result.reason 
        });
      } else {
        this.logger.info(`Initial ${updateType} update completed`);
      }
    });
  }

  public async updateCurrencyRates(): Promise<PriceUpdateResult> {
    const startTime = Date.now();
    const result: PriceUpdateResult = {
      success: false,
      source: PriceSource.EXCHANGE_RATES_API,
      updatedCount: 0,
      errors: [],
      timestamp: new Date(),
      processingTime: 0
    };

    try {
      this.logger.info('Starting currency rates update');

      // Try primary API first
      let priceData: ExternalPriceData | null = null;
      const primaryBreaker = this.circuitBreakers.get('fiat-primary');

      if (primaryBreaker && !primaryBreaker.opened) {
        try {
          priceData = await primaryBreaker.fire(this.API_CONFIGS.fiat.primary);
          result.source = PriceSource.EXCHANGE_RATES_API;
        } catch (error) {
          this.logger.warn('Primary fiat API failed, trying fallbacks', { error });
        }
      }

      // Try fallback APIs if primary failed
      if (!priceData) {
        for (let i = 0; i < this.API_CONFIGS.fiat.fallback.length; i++) {
          const fallbackBreaker = this.circuitBreakers.get(`fiat-fallback-${i}`);
          if (fallbackBreaker && !fallbackBreaker.opened) {
            try {
              priceData = await fallbackBreaker.fire(this.API_CONFIGS.fiat.fallback[i]);
              result.source = this.API_CONFIGS.fiat.fallback[i].name as PriceSource;
              break;
            } catch (error) {
              this.logger.warn(`Fallback fiat API ${i} failed`, { error });
            }
          }
        }
      }

      if (!priceData) {
        throw new Error('All fiat currency APIs are unavailable');
      }

      // Validate and process the data
      const validationResult = this.validateFiatRatesData(priceData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid fiat rates data: ${validationResult.errors.join(', ')}`);
      }

      // Update database and cache
      const updateCount = await this.processFiatRatesUpdate(priceData, result.source);
      
      result.success = true;
      result.updatedCount = updateCount;
      result.processingTime = Date.now() - startTime;

      this.logger.info('Currency rates update completed', {
        source: result.source,
        updatedCount: updateCount,
        processingTime: result.processingTime
      });

    } catch (error) {
      result.errors.push(error.message);
      result.processingTime = Date.now() - startTime;
      
      this.logger.error('Currency rates update failed', {
        error: error.message,
        processingTime: result.processingTime
      });
    }

    return result;
  }

  public async updatePreciousMetalsPrices(): Promise<PriceUpdateResult> {
    const startTime = Date.now();
    const result: PriceUpdateResult = {
      success: false,
      source: PriceSource.METALS_API,
      updatedCount: 0,
      errors: [],
      timestamp: new Date(),
      processingTime: 0
    };

    try {
      this.logger.info('Starting precious metals prices update');

      // Try primary API first
      let priceData: ExternalPriceData | null = null;
      const primaryBreaker = this.circuitBreakers.get('precious_metals-primary');

      if (primaryBreaker && !primaryBreaker.opened) {
        try {
          priceData = await primaryBreaker.fire(this.API_CONFIGS.precious_metals.primary);
          result.source = PriceSource.METALS_API;
        } catch (error) {
          this.logger.warn('Primary precious metals API failed, trying fallbacks', { error });
        }
      }

      // Try fallback APIs if primary failed
      if (!priceData) {
        for (let i = 0; i < this.API_CONFIGS.precious_metals.fallback.length; i++) {
          const fallbackBreaker = this.circuitBreakers.get(`precious_metals-fallback-${i}`);
          if (fallbackBreaker && !fallbackBreaker.opened) {
            try {
              priceData = await fallbackBreaker.fire(this.API_CONFIGS.precious_metals.fallback[i]);
              result.source = this.API_CONFIGS.precious_metals.fallback[i].name as PriceSource;
              break;
            } catch (error) {
              this.logger.warn(`Fallback precious metals API ${i} failed`, { error });
            }
          }
        }
      }

      if (!priceData) {
        throw new Error('All precious metals APIs are unavailable');
      }

      // Validate and process the data
      const validationResult = this.validatePreciousMetalsData(priceData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid precious metals data: ${validationResult.errors.join(', ')}`);
      }

      // Update database and cache
      const updateCount = await this.processPreciousMetalsUpdate(priceData, result.source);
      
      result.success = true;
      result.updatedCount = updateCount;
      result.processingTime = Date.now() - startTime;

      this.logger.info('Precious metals prices update completed', {
        source: result.source,
        updatedCount: updateCount,
        processingTime: result.processingTime
      });

    } catch (error) {
      result.errors.push(error.message);
      result.processingTime = Date.now() - startTime;
      
      this.logger.error('Precious metals prices update failed', {
        error: error.message,
        processingTime: result.processingTime
      });
    }

    return result;
  }

  public async updateCryptocurrencyPrices(): Promise<PriceUpdateResult> {
    const startTime = Date.now();
    const result: PriceUpdateResult = {
      success: false,
      source: PriceSource.COINGECKO,
      updatedCount: 0,
      errors: [],
      timestamp: new Date(),
      processingTime: 0
    };

    try {
      this.logger.info('Starting cryptocurrency prices update');

      // Try primary API first
      let priceData: ExternalPriceData | null = null;
      const primaryBreaker = this.circuitBreakers.get('cryptocurrency-primary');

      if (primaryBreaker && !primaryBreaker.opened) {
        try {
          priceData = await primaryBreaker.fire(this.API_CONFIGS.cryptocurrency.primary);
          result.source = PriceSource.COINGECKO;
        } catch (error) {
          this.logger.warn('Primary cryptocurrency API failed, trying fallbacks', { error });
        }
      }

      // Try fallback APIs if primary failed
      if (!priceData) {
        for (let i = 0; i < this.API_CONFIGS.cryptocurrency.fallback.length; i++) {
          const fallbackBreaker = this.circuitBreakers.get(`cryptocurrency-fallback-${i}`);
          if (fallbackBreaker && !fallbackBreaker.opened) {
            try {
              priceData = await fallbackBreaker.fire(this.API_CONFIGS.cryptocurrency.fallback[i]);
              result.source = this.API_CONFIGS.cryptocurrency.fallback[i].name as PriceSource;
              break;
            } catch (error) {
              this.logger.warn(`Fallback cryptocurrency API ${i} failed`, { error });
            }
          }
        }
      }

      if (!priceData) {
        throw new Error('All cryptocurrency APIs are unavailable');
      }

      // Validate and process the data
      const validationResult = this.validateCryptocurrencyData(priceData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid cryptocurrency data: ${validationResult.errors.join(', ')}`);
      }

      // Update database and cache
      const updateCount = await this.processCryptocurrencyUpdate(priceData, result.source);
      
      result.success = true;
      result.updatedCount = updateCount;
      result.processingTime = Date.now() - startTime;

      this.logger.info('Cryptocurrency prices update completed', {
        source: result.source,
        updatedCount: updateCount,
        processingTime: result.processingTime
      });

    } catch (error) {
      result.errors.push(error.message);
      result.processingTime = Date.now() - startTime;
      
      this.logger.error('Cryptocurrency prices update failed', {
        error: error.message,
        processingTime: result.processingTime
      });
    }

    return result;
  }

  private async makeApiCall(apiConfig: any): Promise<ExternalPriceData> {
    const { url, key, timeout, retries } = apiConfig;

    return await retry(
      async () => {
        const headers: any = {
          'User-Agent': 'SwiftPayMe-Currency-Service/1.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
        }

        const response: AxiosResponse = await axios.get(url, {
          headers,
          timeout,
          validateStatus: (status) => status < 500 // Retry on 5xx errors
        });

        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}: ${response.statusText}`);
        }

        return response.data;
      },
      {
        retries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          this.logger.warn(`API call retry attempt ${attempt}`, {
            url,
            error: error.message
          });
        }
      }
    );
  }

  private validateFiatRatesData(data: ExternalPriceData): PriceValidationResult {
    const result: PriceValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if data has rates
      if (!data.rates && !data.quotes) {
        result.isValid = false;
        result.errors.push('No rates data found');
        return result;
      }

      const rates = data.rates || data.quotes || {};
      
      // Check if we have rates for supported currencies
      const availableCurrencies = Object.keys(rates);
      const supportedFound = this.SUPPORTED_FIAT_CURRENCIES.filter(
        currency => availableCurrencies.includes(currency)
      );

      if (supportedFound.length === 0) {
        result.isValid = false;
        result.errors.push('No supported currencies found in rates data');
        return result;
      }

      if (supportedFound.length < this.SUPPORTED_FIAT_CURRENCIES.length * 0.8) {
        result.warnings.push(`Only ${supportedFound.length} of ${this.SUPPORTED_FIAT_CURRENCIES.length} supported currencies found`);
      }

      // Validate rate values
      for (const [currency, rate] of Object.entries(rates)) {
        if (typeof rate !== 'number' || rate <= 0 || !isFinite(rate)) {
          result.warnings.push(`Invalid rate for ${currency}: ${rate}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Data validation error: ${error.message}`);
    }

    return result;
  }

  private validatePreciousMetalsData(data: ExternalPriceData): PriceValidationResult {
    const result: PriceValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if data has rates for precious metals
      if (!data.rates && !data.prices) {
        result.isValid = false;
        result.errors.push('No precious metals price data found');
        return result;
      }

      const prices = data.rates || data.prices || {};
      
      // Check if we have prices for supported metals
      const availableMetals = Object.keys(prices);
      const supportedFound = this.SUPPORTED_PRECIOUS_METALS.filter(
        metal => availableMetals.includes(metal)
      );

      if (supportedFound.length === 0) {
        result.isValid = false;
        result.errors.push('No supported precious metals found in price data');
        return result;
      }

      // Validate price values
      for (const [metal, price] of Object.entries(prices)) {
        if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
          result.warnings.push(`Invalid price for ${metal}: ${price}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Data validation error: ${error.message}`);
    }

    return result;
  }

  private validateCryptocurrencyData(data: ExternalPriceData): PriceValidationResult {
    const result: PriceValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if data has cryptocurrency prices
      if (!data.data && !data.prices && !Object.keys(data).length) {
        result.isValid = false;
        result.errors.push('No cryptocurrency price data found');
        return result;
      }

      const prices = data.data || data.prices || data;
      
      // Check if we have prices for supported cryptocurrencies
      const availableCryptos = Object.keys(prices);
      const supportedFound = this.SUPPORTED_CRYPTOCURRENCIES.filter(
        crypto => availableCryptos.includes(crypto.toLowerCase()) || 
                 availableCryptos.includes(crypto)
      );

      if (supportedFound.length === 0) {
        result.isValid = false;
        result.errors.push('No supported cryptocurrencies found in price data');
        return result;
      }

      // Validate price values
      for (const [crypto, priceData] of Object.entries(prices)) {
        const price = typeof priceData === 'object' ? priceData.usd || priceData.price : priceData;
        if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
          result.warnings.push(`Invalid price for ${crypto}: ${price}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Data validation error: ${error.message}`);
    }

    return result;
  }

  private async processFiatRatesUpdate(data: ExternalPriceData, source: PriceSource): Promise<number> {
    const rates = data.rates || data.quotes || {};
    const baseCurrency = data.base || 'USD';
    const timestamp = new Date(data.timestamp || Date.now());
    let updateCount = 0;

    for (const [currency, rate] of Object.entries(rates)) {
      if (!this.SUPPORTED_FIAT_CURRENCIES.includes(currency as CurrencyCode)) {
        continue;
      }

      try {
        // Update database
        await ExchangeRate.findOneAndUpdate(
          { 
            fromCurrency: baseCurrency,
            toCurrency: currency,
            source 
          },
          {
            rate: Number(rate),
            timestamp,
            lastUpdated: new Date(),
            isActive: true
          },
          { 
            upsert: true,
            new: true 
          }
        );

        // Update cache
        const cacheKey = `exchange_rate:${baseCurrency}:${currency}`;
        await this.redisClient.setex(cacheKey, 900, JSON.stringify({
          rate: Number(rate),
          timestamp: timestamp.toISOString(),
          source
        }));

        updateCount++;
      } catch (error) {
        this.logger.warn(`Failed to update rate for ${currency}`, { error });
      }
    }

    return updateCount;
  }

  private async processPreciousMetalsUpdate(data: ExternalPriceData, source: PriceSource): Promise<number> {
    const prices = data.rates || data.prices || {};
    const timestamp = new Date(data.timestamp || Date.now());
    let updateCount = 0;

    for (const [metal, price] of Object.entries(prices)) {
      if (!this.SUPPORTED_PRECIOUS_METALS.includes(metal as PreciousMetalType)) {
        continue;
      }

      try {
        // Update database
        await PreciousMetalPrice.findOneAndUpdate(
          { 
            metal: metal as PreciousMetalType,
            source 
          },
          {
            price: Number(price),
            currency: 'USD',
            unit: 'oz',
            timestamp,
            lastUpdated: new Date(),
            isActive: true
          },
          { 
            upsert: true,
            new: true 
          }
        );

        // Update cache
        const cacheKey = `precious_metal:${metal}:USD`;
        await this.redisClient.setex(cacheKey, 300, JSON.stringify({
          price: Number(price),
          timestamp: timestamp.toISOString(),
          source,
          unit: 'oz'
        }));

        updateCount++;
      } catch (error) {
        this.logger.warn(`Failed to update price for ${metal}`, { error });
      }
    }

    return updateCount;
  }

  private async processCryptocurrencyUpdate(data: ExternalPriceData, source: PriceSource): Promise<number> {
    const prices = data.data || data.prices || data;
    const timestamp = new Date(data.timestamp || Date.now());
    let updateCount = 0;

    for (const [crypto, priceData] of Object.entries(prices)) {
      const cryptoSymbol = crypto.toUpperCase();
      if (!this.SUPPORTED_CRYPTOCURRENCIES.includes(cryptoSymbol as CryptocurrencySymbol)) {
        continue;
      }

      try {
        const price = typeof priceData === 'object' ? priceData.usd || priceData.price : priceData;
        
        // Update database
        await CryptocurrencyPrice.findOneAndUpdate(
          { 
            symbol: cryptoSymbol as CryptocurrencySymbol,
            source 
          },
          {
            price: Number(price),
            currency: 'USD',
            timestamp,
            lastUpdated: new Date(),
            isActive: true,
            marketData: typeof priceData === 'object' ? {
              marketCap: priceData.market_cap,
              volume24h: priceData.total_volume,
              change24h: priceData.price_change_24h,
              changePercent24h: priceData.price_change_percentage_24h
            } : undefined
          },
          { 
            upsert: true,
            new: true 
          }
        );

        // Update cache
        const cacheKey = `cryptocurrency:${cryptoSymbol}:USD`;
        await this.redisClient.setex(cacheKey, 120, JSON.stringify({
          price: Number(price),
          timestamp: timestamp.toISOString(),
          source
        }));

        updateCount++;
      } catch (error) {
        this.logger.warn(`Failed to update price for ${crypto}`, { error });
      }
    }

    return updateCount;
  }

  // Health check methods
  public async checkFiatRatesHealth(): Promise<string> {
    try {
      const recentRate = await ExchangeRate.findOne({
        lastUpdated: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
      });
      return recentRate ? 'healthy' : 'stale';
    } catch (error) {
      return 'unhealthy';
    }
  }

  public async checkPreciousMetalsHealth(): Promise<string> {
    try {
      const recentPrice = await PreciousMetalPrice.findOne({
        lastUpdated: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // 10 minutes
      });
      return recentPrice ? 'healthy' : 'stale';
    } catch (error) {
      return 'unhealthy';
    }
  }

  public async checkCryptocurrencyHealth(): Promise<string> {
    try {
      const recentPrice = await CryptocurrencyPrice.findOne({
        lastUpdated: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
      });
      return recentPrice ? 'healthy' : 'stale';
    } catch (error) {
      return 'unhealthy';
    }
  }

  public async hasRecentData(): Promise<boolean> {
    try {
      const [fiatHealth, metalsHealth, cryptoHealth] = await Promise.all([
        this.checkFiatRatesHealth(),
        this.checkPreciousMetalsHealth(),
        this.checkCryptocurrencyHealth()
      ]);

      return fiatHealth === 'healthy' && 
             metalsHealth === 'healthy' && 
             cryptoHealth === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

