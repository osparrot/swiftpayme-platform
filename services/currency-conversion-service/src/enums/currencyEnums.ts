export enum CurrencyCode {
  // Major Fiat Currencies
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD',
  CHF = 'CHF',
  CNY = 'CNY',
  
  // Additional Fiat Currencies
  SEK = 'SEK',
  NOK = 'NOK',
  DKK = 'DKK',
  PLN = 'PLN',
  CZK = 'CZK',
  HUF = 'HUF',
  RUB = 'RUB',
  BRL = 'BRL',
  MXN = 'MXN',
  INR = 'INR',
  KRW = 'KRW',
  SGD = 'SGD',
  HKD = 'HKD',
  NZD = 'NZD',
  ZAR = 'ZAR',
  TRY = 'TRY',
  THB = 'THB',
  MYR = 'MYR',
  IDR = 'IDR',
  PHP = 'PHP',
  VND = 'VND',
  
  // Cryptocurrencies
  BTC = 'BTC',
  ETH = 'ETH',
  LTC = 'LTC',
  BCH = 'BCH',
  XRP = 'XRP',
  ADA = 'ADA',
  DOT = 'DOT',
  LINK = 'LINK',
  BNB = 'BNB',
  SOL = 'SOL',
  MATIC = 'MATIC',
  AVAX = 'AVAX',
  UNI = 'UNI',
  ATOM = 'ATOM',
  XLM = 'XLM',
  
  // Precious Metals
  XAU = 'XAU', // Gold
  XAG = 'XAG', // Silver
  XPT = 'XPT', // Platinum
  XPD = 'XPD', // Palladium
  
  // Stablecoins
  USDT = 'USDT',
  USDC = 'USDC',
  BUSD = 'BUSD',
  DAI = 'DAI',
  
  // Commodities (Extended)
  XCU = 'XCU', // Copper
  XOI = 'XOI', // Oil
  XNG = 'XNG', // Natural Gas
  XWH = 'XWH', // Wheat
  XCO = 'XCO', // Corn
  XSO = 'XSO', // Soybeans
}

export enum CurrencyType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
  STABLECOIN = 'stablecoin',
  PRECIOUS_METAL = 'precious_metal',
  COMMODITY = 'commodity'
}

export enum CurrencyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  MAINTENANCE = 'maintenance',
  SUSPENDED = 'suspended'
}

export enum ExchangeRateProvider {
  EXCHANGE_RATE_HOST = 'exchange_rate_host',
  COINGECKO = 'coingecko',
  GOLD_API = 'gold_api',
  ALPHA_VANTAGE = 'alpha_vantage',
  FIXER_IO = 'fixer_io',
  CURRENCYLAYER = 'currencylayer',
  OPENEXCHANGERATES = 'openexchangerates',
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  KRAKEN = 'kraken',
  INTERNAL = 'internal'
}

export enum ConversionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  RATE_NOT_AVAILABLE = 'rate_not_available',
  AMOUNT_TOO_LARGE = 'amount_too_large',
  AMOUNT_TOO_SMALL = 'amount_too_small',
  CURRENCY_NOT_SUPPORTED = 'currency_not_supported'
}

// Currency groupings for easier management
export const FIAT_CURRENCIES = [
  CurrencyCode.USD, CurrencyCode.EUR, CurrencyCode.GBP, CurrencyCode.JPY,
  CurrencyCode.CAD, CurrencyCode.AUD, CurrencyCode.CHF, CurrencyCode.CNY,
  CurrencyCode.SEK, CurrencyCode.NOK, CurrencyCode.DKK, CurrencyCode.PLN,
  CurrencyCode.CZK, CurrencyCode.HUF, CurrencyCode.RUB, CurrencyCode.BRL,
  CurrencyCode.MXN, CurrencyCode.INR, CurrencyCode.KRW, CurrencyCode.SGD,
  CurrencyCode.HKD, CurrencyCode.NZD, CurrencyCode.ZAR, CurrencyCode.TRY,
  CurrencyCode.THB, CurrencyCode.MYR, CurrencyCode.IDR, CurrencyCode.PHP,
  CurrencyCode.VND
];

export const CRYPTO_CURRENCIES = [
  CurrencyCode.BTC, CurrencyCode.ETH, CurrencyCode.LTC, CurrencyCode.BCH,
  CurrencyCode.XRP, CurrencyCode.ADA, CurrencyCode.DOT, CurrencyCode.LINK,
  CurrencyCode.BNB, CurrencyCode.SOL, CurrencyCode.MATIC, CurrencyCode.AVAX,
  CurrencyCode.UNI, CurrencyCode.ATOM, CurrencyCode.XLM
];

export const STABLECOIN_CURRENCIES = [
  CurrencyCode.USDT, CurrencyCode.USDC, CurrencyCode.BUSD, CurrencyCode.DAI
];

export const PRECIOUS_METAL_CURRENCIES = [
  CurrencyCode.XAU, CurrencyCode.XAG, CurrencyCode.XPT, CurrencyCode.XPD
];

export const COMMODITY_CURRENCIES = [
  CurrencyCode.XCU, CurrencyCode.XOI, CurrencyCode.XNG, 
  CurrencyCode.XWH, CurrencyCode.XCO, CurrencyCode.XSO
];

export const MAJOR_CURRENCIES = [
  CurrencyCode.USD, CurrencyCode.EUR, CurrencyCode.GBP, CurrencyCode.JPY,
  CurrencyCode.CAD, CurrencyCode.AUD, CurrencyCode.CHF, CurrencyCode.CNY
];

export const SUPPORTED_CURRENCIES = [
  ...FIAT_CURRENCIES, 
  ...CRYPTO_CURRENCIES, 
  ...STABLECOIN_CURRENCIES,
  ...PRECIOUS_METAL_CURRENCIES,
  ...COMMODITY_CURRENCIES
];

// Currency metadata
export interface CurrencyMetadata {
  code: CurrencyCode;
  name: string;
  symbol: string;
  type: CurrencyType;
  decimalPlaces: number;
  minAmount: string;
  maxAmount: string;
  isActive: boolean;
  region?: string;
  country?: string;
}

export const CURRENCY_METADATA: Record<CurrencyCode, CurrencyMetadata> = {
  [CurrencyCode.USD]: {
    code: CurrencyCode.USD,
    name: 'United States Dollar',
    symbol: '$',
    type: CurrencyType.FIAT,
    decimalPlaces: 2,
    minAmount: '0.01',
    maxAmount: '1000000000',
    isActive: true,
    region: 'North America',
    country: 'United States'
  },
  [CurrencyCode.EUR]: {
    code: CurrencyCode.EUR,
    name: 'Euro',
    symbol: '€',
    type: CurrencyType.FIAT,
    decimalPlaces: 2,
    minAmount: '0.01',
    maxAmount: '1000000000',
    isActive: true,
    region: 'Europe',
    country: 'European Union'
  },
  [CurrencyCode.GBP]: {
    code: CurrencyCode.GBP,
    name: 'British Pound Sterling',
    symbol: '£',
    type: CurrencyType.FIAT,
    decimalPlaces: 2,
    minAmount: '0.01',
    maxAmount: '1000000000',
    isActive: true,
    region: 'Europe',
    country: 'United Kingdom'
  },
  [CurrencyCode.JPY]: {
    code: CurrencyCode.JPY,
    name: 'Japanese Yen',
    symbol: '¥',
    type: CurrencyType.FIAT,
    decimalPlaces: 0,
    minAmount: '1',
    maxAmount: '1000000000',
    isActive: true,
    region: 'Asia',
    country: 'Japan'
  },
  [CurrencyCode.BTC]: {
    code: CurrencyCode.BTC,
    name: 'Bitcoin',
    symbol: '₿',
    type: CurrencyType.CRYPTO,
    decimalPlaces: 8,
    minAmount: '0.00000001',
    maxAmount: '21000000',
    isActive: true
  },
  [CurrencyCode.ETH]: {
    code: CurrencyCode.ETH,
    name: 'Ethereum',
    symbol: 'Ξ',
    type: CurrencyType.CRYPTO,
    decimalPlaces: 18,
    minAmount: '0.000000000000000001',
    maxAmount: '1000000000',
    isActive: true
  },
  [CurrencyCode.XAU]: {
    code: CurrencyCode.XAU,
    name: 'Gold Ounce',
    symbol: 'XAU',
    type: CurrencyType.PRECIOUS_METAL,
    decimalPlaces: 4,
    minAmount: '0.0001',
    maxAmount: '1000000',
    isActive: true
  },
  [CurrencyCode.XAG]: {
    code: CurrencyCode.XAG,
    name: 'Silver Ounce',
    symbol: 'XAG',
    type: CurrencyType.PRECIOUS_METAL,
    decimalPlaces: 4,
    minAmount: '0.0001',
    maxAmount: '1000000',
    isActive: true
  },
  // Add more metadata as needed...
} as any; // Type assertion to avoid having to define all currencies

// Exchange rate update frequencies
export enum UpdateFrequency {
  REAL_TIME = 'real_time',
  EVERY_MINUTE = 'every_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_HOUR = 'every_hour',
  DAILY = 'daily'
}

// Rate source priorities
export const RATE_SOURCE_PRIORITY: Record<CurrencyType, ExchangeRateProvider[]> = {
  [CurrencyType.FIAT]: [
    ExchangeRateProvider.EXCHANGE_RATE_HOST,
    ExchangeRateProvider.FIXER_IO,
    ExchangeRateProvider.OPENEXCHANGERATES
  ],
  [CurrencyType.CRYPTO]: [
    ExchangeRateProvider.COINGECKO,
    ExchangeRateProvider.BINANCE,
    ExchangeRateProvider.COINBASE
  ],
  [CurrencyType.STABLECOIN]: [
    ExchangeRateProvider.COINGECKO,
    ExchangeRateProvider.BINANCE
  ],
  [CurrencyType.PRECIOUS_METAL]: [
    ExchangeRateProvider.GOLD_API,
    ExchangeRateProvider.ALPHA_VANTAGE
  ],
  [CurrencyType.COMMODITY]: [
    ExchangeRateProvider.ALPHA_VANTAGE,
    ExchangeRateProvider.INTERNAL
  ]
};

