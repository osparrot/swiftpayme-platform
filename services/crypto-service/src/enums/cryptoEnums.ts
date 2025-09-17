export enum CryptoCurrency {
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
  VET = 'VET',
  FIL = 'FIL',
  TRX = 'TRX',
  ETC = 'ETC',
  XMR = 'XMR',
  DASH = 'DASH',
  ZEC = 'ZEC',
  DOGE = 'DOGE',
  SHIB = 'SHIB'
}

export enum TransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  LIGHTNING_SEND = 'lightning_send',
  LIGHTNING_RECEIVE = 'lightning_receive',
  SWAP = 'swap',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  REWARD = 'reward'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum WalletType {
  HOT = 'hot',
  COLD = 'cold',
  MULTISIG = 'multisig',
  HARDWARE = 'hardware',
  CUSTODIAL = 'custodial'
}

export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  REGTEST = 'regtest',
  SIGNET = 'signet'
}

export enum AddressType {
  LEGACY = 'legacy',
  P2SH_SEGWIT = 'p2sh-segwit',
  BECH32 = 'bech32',
  BECH32M = 'bech32m'
}

export enum CryptoServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DEGRADED = 'degraded'
}

export enum PaymentMethod {
  ONCHAIN = 'onchain',
  LIGHTNING = 'lightning',
  LIQUID = 'liquid',
  SIDECHAIN = 'sidechain'
}

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  REQUIRES_KYC = 'requires_kyc'
}

export enum FeeType {
  SLOW = 'slow',
  STANDARD = 'standard',
  FAST = 'fast',
  CUSTOM = 'custom'
}

export enum CryptoOperationType {
  CREATE_WALLET = 'create_wallet',
  GENERATE_ADDRESS = 'generate_address',
  GET_BALANCE = 'get_balance',
  SEND_TRANSACTION = 'send_transaction',
  RECEIVE_TRANSACTION = 'receive_transaction',
  VALIDATE_ADDRESS = 'validate_address',
  ESTIMATE_FEE = 'estimate_fee',
  GET_TRANSACTION = 'get_transaction',
  LIST_TRANSACTIONS = 'list_transactions',
  EXPORT_PRIVATE_KEY = 'export_private_key',
  IMPORT_PRIVATE_KEY = 'import_private_key',
  BACKUP_WALLET = 'backup_wallet',
  RESTORE_WALLET = 'restore_wallet'
}

export enum LightningOperationType {
  CREATE_INVOICE = 'create_invoice',
  PAY_INVOICE = 'pay_invoice',
  DECODE_INVOICE = 'decode_invoice',
  GET_LIQUIDITY = 'get_liquidity',
  OPEN_CHANNEL = 'open_channel',
  CLOSE_CHANNEL = 'close_channel',
  LIST_CHANNELS = 'list_channels',
  GET_NODE_INFO = 'get_node_info',
  CONNECT_PEER = 'connect_peer',
  DISCONNECT_PEER = 'disconnect_peer'
}

export enum CryptoEventType {
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_CONFIRMED = 'transaction_confirmed',
  TRANSACTION_FAILED = 'transaction_failed',
  WALLET_CREATED = 'wallet_created',
  ADDRESS_GENERATED = 'address_generated',
  BALANCE_UPDATED = 'balance_updated',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_SENT = 'payment_sent',
  LIGHTNING_INVOICE_CREATED = 'lightning_invoice_created',
  LIGHTNING_PAYMENT_COMPLETED = 'lightning_payment_completed',
  SECURITY_ALERT = 'security_alert',
  COMPLIANCE_CHECK = 'compliance_check'
}

export enum ErrorCode {
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION'
}

export enum CacheKey {
  BALANCE = 'balance',
  TRANSACTION = 'transaction',
  ADDRESS_INFO = 'address_info',
  FEE_ESTIMATE = 'fee_estimate',
  EXCHANGE_RATE = 'exchange_rate',
  WALLET_INFO = 'wallet_info',
  NODE_INFO = 'node_info',
  CHANNEL_INFO = 'channel_info'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export enum ConfigKey {
  BITCOIN_RPC_HOST = 'BITCOIN_RPC_HOST',
  BITCOIN_RPC_PORT = 'BITCOIN_RPC_PORT',
  BITCOIN_RPC_USERNAME = 'BITCOIN_RPC_USERNAME',
  BITCOIN_RPC_PASSWORD = 'BITCOIN_RPC_PASSWORD',
  LIGHTNING_HOST = 'LIGHTNING_HOST',
  LIGHTNING_PORT = 'LIGHTNING_PORT',
  LIGHTNING_MACAROON = 'LIGHTNING_MACAROON',
  LIGHTNING_TLS_CERT = 'LIGHTNING_TLS_CERT',
  NETWORK_TYPE = 'NETWORK_TYPE',
  WALLET_ENCRYPTION = 'WALLET_ENCRYPTION',
  SECURITY_LEVEL = 'SECURITY_LEVEL',
  COMPLIANCE_ENABLED = 'COMPLIANCE_ENABLED',
  MONITORING_ENABLED = 'MONITORING_ENABLED'
}

