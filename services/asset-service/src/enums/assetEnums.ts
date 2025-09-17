export enum AssetType {
  PRECIOUS_METAL = 'precious_metal',
  CRYPTOCURRENCY = 'cryptocurrency',
  COMMODITY = 'commodity',
  EQUITY = 'equity',
  BOND = 'bond',
  REAL_ESTATE = 'real_estate',
  COLLECTIBLE = 'collectible',
  OTHER = 'other'
}

export enum PreciousMetalType {
  GOLD = 'gold',
  SILVER = 'silver',
  PLATINUM = 'platinum',
  PALLADIUM = 'palladium',
  RHODIUM = 'rhodium',
  COPPER = 'copper',
  ALUMINUM = 'aluminum',
  NICKEL = 'nickel',
  ZINC = 'zinc',
  TIN = 'tin'
}

export enum AssetSymbol {
  // Precious Metals
  XAU = 'XAU', // Gold
  XAG = 'XAG', // Silver
  XPT = 'XPT', // Platinum
  XPD = 'XPD', // Palladium
  XRH = 'XRH', // Rhodium
  XCU = 'XCU', // Copper
  XAL = 'XAL', // Aluminum
  XNI = 'XNI', // Nickel
  XZN = 'XZN', // Zinc
  XTN = 'XTN', // Tin
  
  // Cryptocurrencies
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
  USDC = 'USDC',
  
  // Commodities
  OIL = 'OIL',
  GAS = 'GAS',
  WHEAT = 'WHEAT',
  CORN = 'CORN',
  
  // Custom tokens
  SPAY = 'SPAY' // Swiftpay native token
}

export enum AssetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELISTED = 'delisted',
  MAINTENANCE = 'maintenance',
  DEPRECATED = 'deprecated'
}

export enum WalletType {
  CUSTODIAL = 'custodial',
  NON_CUSTODIAL = 'non_custodial',
  MULTI_SIG = 'multi_sig',
  HARDWARE = 'hardware',
  PAPER = 'paper',
  COLD_STORAGE = 'cold_storage',
  HOT_WALLET = 'hot_wallet'
}

export enum WalletStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FROZEN = 'frozen',
  LOCKED = 'locked',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  PENDING_VERIFICATION = 'pending_verification',
  UNDER_REVIEW = 'under_review'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  EXCHANGE = 'exchange',
  MINT = 'mint',
  BURN = 'burn',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  REWARD = 'reward',
  FEE = 'fee',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVERSED = 'reversed'
}

export enum AssetClass {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SYNTHETIC = 'synthetic',
  DERIVATIVE = 'derivative',
  TOKENIZED = 'tokenized',
  FRACTIONAL = 'fractional'
}

export enum PriceSource {
  LONDON_METAL_EXCHANGE = 'lme',
  COMEX = 'comex',
  LBMA = 'lbma',
  SHANGHAI_GOLD_EXCHANGE = 'sge',
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  KRAKEN = 'kraken',
  REUTERS = 'reuters',
  BLOOMBERG = 'bloomberg',
  YAHOO_FINANCE = 'yahoo',
  ALPHA_VANTAGE = 'alpha_vantage',
  INTERNAL = 'internal',
  AGGREGATED = 'aggregated'
}

export enum AssetGrade {
  // Gold grades
  GOLD_999_9 = '999.9', // 24 karat
  GOLD_999 = '999',     // 24 karat
  GOLD_995 = '995',     // 23.8 karat
  GOLD_990 = '990',     // 23.76 karat
  GOLD_916 = '916',     // 22 karat
  GOLD_750 = '750',     // 18 karat
  GOLD_585 = '585',     // 14 karat
  GOLD_375 = '375',     // 9 karat
  
  // Silver grades
  SILVER_999_9 = '999.9',
  SILVER_999 = '999',
  SILVER_958 = '958',   // Britannia silver
  SILVER_925 = '925',   // Sterling silver
  SILVER_900 = '900',   // Coin silver
  SILVER_800 = '800',
  
  // Platinum grades
  PLATINUM_999_5 = '999.5',
  PLATINUM_999 = '999',
  PLATINUM_950 = '950',
  PLATINUM_900 = '900',
  PLATINUM_850 = '850',
  
  // Palladium grades
  PALLADIUM_999_5 = '999.5',
  PALLADIUM_999 = '999',
  PALLADIUM_950 = '950',
  PALLADIUM_900 = '900',
  
  // Standard grades for other metals
  STANDARD = 'standard',
  PREMIUM = 'premium',
  INVESTMENT_GRADE = 'investment_grade',
  INDUSTRIAL_GRADE = 'industrial_grade'
}

export enum AssetUnit {
  // Weight units
  TROY_OUNCE = 'troy_oz',
  GRAM = 'gram',
  KILOGRAM = 'kg',
  POUND = 'lb',
  TONNE = 'tonne',
  
  // Volume units
  BARREL = 'barrel',
  GALLON = 'gallon',
  LITER = 'liter',
  CUBIC_METER = 'cubic_meter',
  
  // Digital units
  TOKEN = 'token',
  COIN = 'coin',
  SHARE = 'share',
  UNIT = 'unit',
  
  // Fractional units
  SATOSHI = 'satoshi',
  WEI = 'wei',
  GWEI = 'gwei'
}

export enum StorageType {
  VAULT = 'vault',
  SAFE_DEPOSIT_BOX = 'safe_deposit_box',
  ALLOCATED_STORAGE = 'allocated_storage',
  UNALLOCATED_STORAGE = 'unallocated_storage',
  SEGREGATED_STORAGE = 'segregated_storage',
  POOLED_STORAGE = 'pooled_storage',
  HOME_STORAGE = 'home_storage',
  THIRD_PARTY_STORAGE = 'third_party_storage',
  DIGITAL_WALLET = 'digital_wallet',
  COLD_STORAGE = 'cold_storage',
  HOT_STORAGE = 'hot_storage'
}

export enum CustodyType {
  SELF_CUSTODY = 'self_custody',
  THIRD_PARTY_CUSTODY = 'third_party_custody',
  INSTITUTIONAL_CUSTODY = 'institutional_custody',
  BANK_CUSTODY = 'bank_custody',
  EXCHANGE_CUSTODY = 'exchange_custody',
  MULTI_PARTY_CUSTODY = 'multi_party_custody',
  ESCROW = 'escrow'
}

export enum AssetOrigin {
  MINED = 'mined',
  RECYCLED = 'recycled',
  REFINED = 'refined',
  MINTED = 'minted',
  MANUFACTURED = 'manufactured',
  SYNTHETIC = 'synthetic',
  DERIVATIVE = 'derivative',
  TOKENIZED = 'tokenized'
}

export enum CertificationType {
  ASSAY_CERTIFICATE = 'assay_certificate',
  PURITY_CERTIFICATE = 'purity_certificate',
  AUTHENTICITY_CERTIFICATE = 'authenticity_certificate',
  ORIGIN_CERTIFICATE = 'origin_certificate',
  STORAGE_CERTIFICATE = 'storage_certificate',
  INSURANCE_CERTIFICATE = 'insurance_certificate',
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  AUDIT_CERTIFICATE = 'audit_certificate'
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  EXTREME = 'extreme'
}

export enum LiquidityLevel {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  VERY_LOW = 'very_low',
  ILLIQUID = 'illiquid'
}

export enum MarketStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PRE_MARKET = 'pre_market',
  AFTER_HOURS = 'after_hours',
  HOLIDAY = 'holiday',
  MAINTENANCE = 'maintenance',
  SUSPENDED = 'suspended'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit',
  TRAILING_STOP = 'trailing_stop',
  ICEBERG = 'iceberg',
  FILL_OR_KILL = 'fill_or_kill',
  IMMEDIATE_OR_CANCEL = 'immediate_or_cancel',
  GOOD_TILL_CANCELLED = 'good_till_cancelled',
  GOOD_TILL_DATE = 'good_till_date'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum FeeTier {
  MAKER = 'maker',
  TAKER = 'taker',
  VIP_1 = 'vip_1',
  VIP_2 = 'vip_2',
  VIP_3 = 'vip_3',
  VIP_4 = 'vip_4',
  VIP_5 = 'vip_5',
  INSTITUTIONAL = 'institutional'
}

export enum AuditStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  PENDING_DOCUMENTATION = 'pending_documentation',
  EXEMPTED = 'exempted',
  SUSPENDED = 'suspended'
}

export enum EventType {
  ASSET_CREATED = 'asset_created',
  ASSET_UPDATED = 'asset_updated',
  ASSET_DELETED = 'asset_deleted',
  WALLET_CREATED = 'wallet_created',
  WALLET_UPDATED = 'wallet_updated',
  WALLET_DELETED = 'wallet_deleted',
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_UPDATED = 'transaction_updated',
  TRANSACTION_COMPLETED = 'transaction_completed',
  TRANSACTION_FAILED = 'transaction_failed',
  PRICE_UPDATED = 'price_updated',
  BALANCE_UPDATED = 'balance_updated',
  AUDIT_COMPLETED = 'audit_completed',
  COMPLIANCE_CHECK = 'compliance_check',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

export default {
  AssetType,
  PreciousMetalType,
  AssetSymbol,
  AssetStatus,
  WalletType,
  WalletStatus,
  TransactionType,
  TransactionStatus,
  AssetClass,
  PriceSource,
  AssetGrade,
  AssetUnit,
  StorageType,
  CustodyType,
  AssetOrigin,
  CertificationType,
  RiskLevel,
  LiquidityLevel,
  MarketStatus,
  OrderType,
  OrderSide,
  OrderStatus,
  FeeTier,
  AuditStatus,
  ComplianceStatus,
  EventType
};

