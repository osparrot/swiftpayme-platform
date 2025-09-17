export type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';

export interface BitcoinAddress {
  address: string;
  type: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  derivationPath: string;
  index: number;
  isChange: boolean;
  balance: number;
  transactions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface BitcoinWallet {
  id: string;
  userId: string;
  name: string;
  type: 'hd' | 'multisig' | 'watch-only';
  network: BitcoinNetwork;
  addresses: BitcoinAddress[];
  balance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  transactions: string[];
  derivationPath?: string;
  xpub?: string;
  encryptedSeed?: string;
  multiSig?: {
    requiredSignatures: number;
    totalSignatures: number;
    participants: string[];
    redeemScript?: string;
  };
  createdAt: Date;
  lastSyncAt: Date;
  isActive: boolean;
}

export interface BitcoinTransaction {
  id: string;
  txid?: string;
  walletId: string;
  type: 'send' | 'receive' | 'internal';
  amount: number;
  fee: number;
  toAddress?: string;
  fromAddresses: string[];
  status: 'pending' | 'signed' | 'partially_signed' | 'broadcast' | 'confirmed' | 'failed';
  confirmations: number;
  blockHeight?: number;
  blockHash?: string;
  psbt?: string;
  rawTransaction?: string;
  memo?: string;
  createdAt: Date;
  broadcastAt?: Date;
  confirmedAt?: Date;
}

export interface UTXOInput {
  txid: string;
  vout: number;
  value: number;
  address: string;
  scriptPubKey: string;
  confirmations: number;
}

export interface TransactionOutput {
  address: string;
  value: number;
  scriptPubKey?: string;
}

export interface FeeEstimate {
  fee: number;
  feeRate: number;
  estimatedSize: number;
  confirmationTarget: number;
}

export interface NetworkInfo {
  network: BitcoinNetwork;
  blockHeight: number;
  blockHash: string;
  difficulty: number;
  connections: number;
  version: number;
  protocolVersion: number;
  timeOffset: number;
  networkActive: boolean;
  initialBlockDownload: boolean;
  verificationProgress: number;
  memPoolSize: number;
  memPoolBytes: number;
}

export interface BlockInfo {
  hash: string;
  height: number;
  time: number;
  nTx: number;
  size: number;
  weight: number;
  version: number;
  merkleRoot: string;
  previousBlockHash: string;
  nextBlockHash?: string;
  difficulty: number;
  nonce: number;
  confirmations: number;
}

export interface MemPoolInfo {
  size: number;
  bytes: number;
  usage: number;
  maxMemPool: number;
  memPoolMinFee: number;
  minRelayTxFee: number;
}

export interface AddressInfo {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  unconfirmedBalance: number;
  transactionCount: number;
  transactions: string[];
}

export interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  witness?: string[];
  sequence: number;
}

export interface TransactionOutputDetailed {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    addresses?: string[];
  };
}

export interface RawTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutputDetailed[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
  immature?: number;
}

export interface TransactionHistory {
  transactions: BitcoinTransaction[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AddressValidation {
  isValid: boolean;
  address?: string;
  scriptPubKey?: string;
  isScript?: boolean;
  isWitness?: boolean;
}

export interface SigningRequest {
  transactionId: string;
  walletId: string;
  userId: string;
  requiredSignatures?: number;
  currentSignatures?: number;
  expiresAt?: Date;
}

export interface MultiSigSignature {
  userId: string;
  signature: string;
  publicKey: string;
  signedAt: Date;
}

export interface WalletSyncStatus {
  walletId: string;
  lastSyncAt: Date;
  currentBlock: number;
  syncedBlock: number;
  isUpToDate: boolean;
  syncProgress: number;
}

export interface BitcoinServiceConfig {
  network: BitcoinNetwork;
  rpcHost: string;
  rpcPort: number;
  rpcUser: string;
  rpcPassword: string;
  rpcTimeout: number;
  walletPassphrase?: string;
  enableZmq: boolean;
  zmqHost?: string;
  zmqPort?: number;
}

export interface ZMQNotification {
  type: 'rawtx' | 'rawblock' | 'hashtx' | 'hashblock';
  data: Buffer;
  sequence: number;
}

export interface BitcoinMetrics {
  totalWallets: number;
  activeWallets: number;
  totalTransactions: number;
  pendingTransactions: number;
  confirmedTransactions: number;
  totalBalance: number;
  networkBlockHeight: number;
  networkConnections: number;
  memPoolSize: number;
}

export interface WalletExport {
  walletId: string;
  name: string;
  type: string;
  network: BitcoinNetwork;
  xpub?: string;
  addresses: {
    address: string;
    derivationPath: string;
    isChange: boolean;
  }[];
  exportedAt: Date;
}

export interface WalletImport {
  name: string;
  type: 'xpub' | 'seed' | 'private-key';
  data: string;
  network: BitcoinNetwork;
  derivationPath?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface TransactionBroadcast {
  txid: string;
  success: boolean;
  error?: string;
  broadcastAt: Date;
}

export interface FeeRecommendation {
  slow: FeeEstimate;
  standard: FeeEstimate;
  fast: FeeEstimate;
  custom?: FeeEstimate;
}

export interface BitcoinError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface WalletBackup {
  walletId: string;
  encryptedData: string;
  checksum: string;
  createdAt: Date;
  version: string;
}

export interface AddressLabel {
  address: string;
  label: string;
  category: 'receive' | 'send' | 'change' | 'multisig';
  createdAt: Date;
}

export interface TransactionNote {
  transactionId: string;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface WalletSettings {
  walletId: string;
  autoGenerateAddresses: boolean;
  addressGapLimit: number;
  defaultFeeRate: number;
  enableRBF: boolean;
  enableCoinControl: boolean;
  privacyLevel: 'low' | 'medium' | 'high';
  notifications: {
    incoming: boolean;
    outgoing: boolean;
    confirmations: boolean;
  };
}

export interface CoinSelection {
  algorithm: 'largest-first' | 'smallest-first' | 'random' | 'branch-and-bound';
  targetAmount: number;
  selectedUTXOs: UTXOInput[];
  totalValue: number;
  changeAmount: number;
  fee: number;
  efficiency: number;
}

export interface LightningInvoice {
  paymentRequest: string;
  paymentHash: string;
  amount: number;
  description: string;
  expiry: number;
  createdAt: Date;
  expiresAt: Date;
  isPaid: boolean;
  paidAt?: Date;
}

export interface LightningPayment {
  paymentHash: string;
  paymentRequest: string;
  amount: number;
  fee: number;
  status: 'pending' | 'succeeded' | 'failed';
  failureReason?: string;
  createdAt: Date;
  settledAt?: Date;
}

export interface LightningChannel {
  channelId: string;
  remotePubkey: string;
  capacity: number;
  localBalance: number;
  remoteBalance: number;
  isActive: boolean;
  isPrivate: boolean;
  fundingTxid: string;
  fundingOutput: number;
  createdAt: Date;
}

export interface LightningNode {
  pubkey: string;
  alias: string;
  color: string;
  addresses: string[];
  features: Record<string, any>;
  lastUpdate: Date;
}

export interface LightningRoute {
  totalTimeLock: number;
  totalFees: number;
  totalAmount: number;
  hops: {
    chanId: string;
    chanCapacity: number;
    amtToForward: number;
    fee: number;
    expiry: number;
    pubkey: string;
  }[];
}

export interface BitcoinServiceStatus {
  isInitialized: boolean;
  isConnected: boolean;
  isReady: boolean;
  lastHealthCheck: Date;
  version: string;
  network: BitcoinNetwork;
  blockHeight: number;
  connections: number;
  syncProgress: number;
}

export interface WalletActivity {
  walletId: string;
  activity: {
    type: 'transaction' | 'address_generated' | 'balance_updated' | 'sync_completed';
    data: any;
    timestamp: Date;
  }[];
  lastActivity: Date;
}

export interface BitcoinAlert {
  id: string;
  type: 'network' | 'wallet' | 'transaction' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

