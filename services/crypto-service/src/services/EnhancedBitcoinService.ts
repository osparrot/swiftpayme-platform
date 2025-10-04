/**
 * Enhanced Bitcoin Core Service with Improved Efficiency
 * Optimized for production-grade Bitcoin operations
 */

import axios, { AxiosResponse } from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import retry from 'async-retry';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { RedisClient } from '../utils/RedisClient';
import { 
  BitcoinNetwork,
  BitcoinAddress,
  BitcoinTransaction,
  BitcoinWallet,
  UTXOInput,
  TransactionOutput,
  FeeEstimate,
  NetworkInfo,
  BlockInfo,
  MemPoolInfo
} from '../types/bitcoin';

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

interface ConnectionPool {
  active: number;
  idle: number;
  max: number;
}

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  lastUpdated: Date;
}

export class EnhancedBitcoinService extends EventEmitter {
  private logger: Logger;
  private redisClient: RedisClient;
  private network: bitcoin.Network;
  private rpcConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  private connectionPool: ConnectionPool;
  private performanceMetrics: PerformanceMetrics;
  private isInitialized: boolean = false;
  private blockchainSyncStatus: {
    isSync: boolean;
    currentBlock: number;
    targetBlock: number;
    progress: number;
  };
  private memPoolMonitor: {
    size: number;
    bytes: number;
    feeRates: number[];
    lastUpdate: Date;
  };

  constructor() {
    super();
    this.logger = new Logger('EnhancedBitcoinService');
    this.redisClient = RedisClient.getInstance();
    
    // Configure network with enhanced settings
    const networkType = process.env.BITCOIN_NETWORK || 'testnet';
    this.network = this.getNetworkConfig(networkType);
    
    // Enhanced RPC configuration
    this.rpcConfig = {
      host: process.env.BITCOIN_RPC_HOST || 'localhost',
      port: parseInt(process.env.BITCOIN_RPC_PORT || '18332'),
      username: process.env.BITCOIN_RPC_USER || 'bitcoin',
      password: process.env.BITCOIN_RPC_PASSWORD || 'password',
      timeout: parseInt(process.env.BITCOIN_RPC_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.BITCOIN_RPC_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.BITCOIN_RPC_RETRY_DELAY || '1000')
    };

    // Initialize connection pool
    this.connectionPool = {
      active: 0,
      idle: 0,
      max: parseInt(process.env.BITCOIN_RPC_POOL_SIZE || '10')
    };

    // Initialize performance metrics
    this.performanceMetrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      lastUpdated: new Date()
    };

    // Initialize blockchain sync status
    this.blockchainSyncStatus = {
      isSync: false,
      currentBlock: 0,
      targetBlock: 0,
      progress: 0
    };

    // Initialize mempool monitor
    this.memPoolMonitor = {
      size: 0,
      bytes: 0,
      feeRates: [],
      lastUpdate: new Date()
    };
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Enhanced Bitcoin service');

      // Test Bitcoin Core connection with retry logic
      await this.testConnectionWithRetry();
      
      // Verify network configuration
      await this.verifyNetworkConfig();
      
      // Initialize blockchain monitoring
      await this.initializeBlockchainMonitoring();
      
      // Initialize mempool monitoring
      await this.initializeMemPoolMonitoring();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      this.isInitialized = true;
      this.logger.info('Enhanced Bitcoin service initialized successfully', {
        network: this.getNetworkName(),
        host: this.rpcConfig.host,
        port: this.rpcConfig.port,
        poolSize: this.connectionPool.max
      });

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Enhanced Bitcoin service', { error });
      throw error;
    }
  }

  // Enhanced Connection Management
  private async testConnectionWithRetry(): Promise<void> {
    const maxAttempts = this.rpcConfig.maxRetries;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const startTime = Date.now();
        const result = await this.rpcCall('getblockchaininfo');
        const responseTime = Date.now() - startTime;
        
        this.updatePerformanceMetrics(responseTime, true);
        this.logger.info('Bitcoin Core connection established', {
          attempt: attempt + 1,
          responseTime,
          blockHeight: result.blocks
        });
        return;
      } catch (error) {
        attempt++;
        this.updatePerformanceMetrics(0, false);
        
        if (attempt >= maxAttempts) {
          this.logger.error('Failed to connect to Bitcoin Core after all attempts', {
            attempts: maxAttempts,
            error: error.message
          });
          throw error;
        }
        
        this.logger.warn(`Bitcoin Core connection attempt ${attempt} failed, retrying...`, {
          error: error.message,
          nextAttemptIn: this.rpcConfig.retryDelay
        });
        
        await new Promise(resolve => setTimeout(resolve, this.rpcConfig.retryDelay));
      }
    }
  }

  // Enhanced RPC Call with Connection Pooling
  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check connection pool availability
      if (this.connectionPool.active >= this.connectionPool.max) {
        await this.waitForAvailableConnection();
      }

      this.connectionPool.active++;
      
      const response = await retry(
        async () => {
          const result = await axios.post(
            `http://${this.rpcConfig.host}:${this.rpcConfig.port}`,
            {
              jsonrpc: '2.0',
              id: Date.now(),
              method,
              params
            },
            {
              auth: {
                username: this.rpcConfig.username,
                password: this.rpcConfig.password
              },
              timeout: this.rpcConfig.timeout,
              headers: {
                'Content-Type': 'application/json',
                'Connection': 'keep-alive'
              }
            }
          );

          if (result.data.error) {
            throw new Error(`Bitcoin RPC Error: ${result.data.error.message}`);
          }

          return result.data.result;
        },
        {
          retries: this.rpcConfig.maxRetries,
          minTimeout: this.rpcConfig.retryDelay,
          maxTimeout: this.rpcConfig.retryDelay * 3,
          onRetry: (error, attempt) => {
            this.logger.warn(`RPC call retry attempt ${attempt}`, {
              method,
              error: error.message
            });
          }
        }
      );

      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, true);
      this.performanceMetrics.requestCount++;

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, false);
      this.logger.error('RPC call failed', {
        method,
        params,
        error: error.message,
        responseTime
      });
      throw error;
    } finally {
      this.connectionPool.active--;
    }
  }

  // Enhanced Caching with Redis
  private async getCachedData<T>(key: string, ttl: number = 300): Promise<T | null> {
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.performanceMetrics.cacheHitRate = 
          (this.performanceMetrics.cacheHitRate * 0.9) + (1 * 0.1);
        return JSON.parse(cached);
      }
      this.performanceMetrics.cacheHitRate = 
        (this.performanceMetrics.cacheHitRate * 0.9) + (0 * 0.1);
      return null;
    } catch (error) {
      this.logger.warn('Cache read failed', { key, error: error.message });
      return null;
    }
  }

  private async setCachedData(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.warn('Cache write failed', { key, error: error.message });
    }
  }

  // Enhanced Wallet Generation with HD Derivation
  public async generateEnhancedWallet(
    userId: string, 
    walletName?: string,
    options?: {
      derivationPath?: string;
      addressType?: 'legacy' | 'segwit' | 'native_segwit';
      generateAddresses?: number;
    }
  ): Promise<BitcoinWallet> {
    try {
      const derivationPath = options?.derivationPath || "m/84'/0'/0'"; // Default to native segwit
      const addressType = options?.addressType || 'native_segwit';
      const generateAddresses = options?.generateAddresses || 5;

      // Generate high-entropy mnemonic
      const mnemonic = bip39.generateMnemonic(256);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed, this.network);
      const account = root.derivePath(derivationPath);
      
      // Generate multiple addresses for better privacy
      const addresses: BitcoinAddress[] = [];
      for (let i = 0; i < generateAddresses; i++) {
        const address = this.deriveEnhancedAddress(account, 0, i, addressType);
        addresses.push(address);
      }

      const wallet: BitcoinWallet = {
        id: `btc_${userId}_${Date.now()}`,
        userId,
        name: walletName || `Enhanced Bitcoin Wallet ${Date.now()}`,
        type: 'hd_enhanced',
        network: this.getNetworkName(),
        addresses,
        balance: {
          confirmed: 0,
          unconfirmed: 0,
          total: 0
        },
        transactions: [],
        derivationPath,
        xpub: account.neutered().toBase58(),
        encryptedSeed: await this.encryptSeed(seed.toString('hex')),
        addressType,
        gapLimit: 20,
        createdAt: new Date(),
        lastSyncAt: new Date(),
        isActive: true,
        metadata: {
          version: '2.0',
          features: ['rbf', 'segwit', 'hd_derivation'],
          securityLevel: 'high'
        }
      };

      // Cache wallet with extended TTL
      await this.setCachedData(`wallet:${wallet.id}`, wallet, 3600);
      
      this.logger.info('Enhanced Bitcoin wallet generated', {
        walletId: wallet.id,
        userId,
        addressType,
        addressCount: addresses.length,
        derivationPath
      });

      this.emit('walletGenerated', wallet);
      return wallet;
    } catch (error) {
      this.logger.error('Failed to generate enhanced Bitcoin wallet', { error, userId });
      throw error;
    }
  }

  // Enhanced Address Derivation
  private deriveEnhancedAddress(
    account: any, 
    change: number, 
    index: number, 
    type: 'legacy' | 'segwit' | 'native_segwit'
  ): BitcoinAddress {
    const child = account.derive(change).derive(index);
    let address: string;
    let scriptType: string;

    switch (type) {
      case 'legacy':
        address = bitcoin.payments.p2pkh({
          pubkey: child.publicKey,
          network: this.network
        }).address!;
        scriptType = 'p2pkh';
        break;
      
      case 'segwit':
        address = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: this.network
          }),
          network: this.network
        }).address!;
        scriptType = 'p2sh-p2wpkh';
        break;
      
      case 'native_segwit':
      default:
        address = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network: this.network
        }).address!;
        scriptType = 'p2wpkh';
        break;
    }

    return {
      address,
      type: scriptType,
      derivationPath: `m/84'/0'/0'/${change}/${index}`,
      index,
      isChange: change === 1,
      balance: 0,
      transactions: [],
      publicKey: child.publicKey.toString('hex'),
      createdAt: new Date(),
      metadata: {
        addressType: type,
        compressed: true
      }
    };
  }

  // Enhanced Fee Estimation with Dynamic Rates
  public async getEnhancedFeeEstimate(
    targetBlocks: number = 6,
    mode: 'economical' | 'conservative' = 'conservative'
  ): Promise<FeeEstimate> {
    try {
      const cacheKey = `fee_estimate:${targetBlocks}:${mode}`;
      const cached = await this.getCachedData<FeeEstimate>(cacheKey, 60);
      
      if (cached) {
        return cached;
      }

      // Get multiple fee estimates for better accuracy
      const [estimate, smartFee, memPoolInfo] = await Promise.all([
        this.rpcCall('estimatesmartfee', [targetBlocks, mode]),
        this.rpcCall('estimatesmartfee', [1, mode]), // Next block
        this.rpcCall('getmempoolinfo')
      ]);

      // Calculate dynamic fee based on mempool congestion
      const baseFeeRate = estimate.feerate || 0.00001; // 1 sat/byte minimum
      const urgentFeeRate = smartFee.feerate || baseFeeRate * 2;
      
      // Adjust for mempool congestion
      const congestionMultiplier = Math.min(
        1 + (memPoolInfo.size / 100000), // Increase fee based on mempool size
        3 // Cap at 3x
      );

      const feeEstimate: FeeEstimate = {
        targetBlocks,
        feeRate: baseFeeRate * congestionMultiplier,
        fee: Math.ceil(baseFeeRate * congestionMultiplier * 250), // Assume 250 byte tx
        priority: targetBlocks <= 2 ? 'high' : targetBlocks <= 6 ? 'medium' : 'low',
        estimatedTime: targetBlocks * 10, // minutes
        confidence: estimate.errors ? 0.5 : 0.9,
        alternatives: {
          economical: baseFeeRate,
          standard: baseFeeRate * 1.5,
          priority: urgentFeeRate,
          urgent: urgentFeeRate * 1.5
        },
        memPoolStatus: {
          size: memPoolInfo.size,
          bytes: memPoolInfo.bytes,
          congestion: congestionMultiplier > 1.5 ? 'high' : 
                     congestionMultiplier > 1.2 ? 'medium' : 'low'
        }
      };

      await this.setCachedData(cacheKey, feeEstimate, 60);
      return feeEstimate;
    } catch (error) {
      this.logger.error('Failed to get enhanced fee estimate', { error, targetBlocks });
      
      // Return fallback fee estimate
      return {
        targetBlocks,
        feeRate: 0.00001,
        fee: 2500, // 10 sat/byte for 250 byte tx
        priority: 'medium',
        estimatedTime: targetBlocks * 10,
        confidence: 0.3,
        alternatives: {
          economical: 0.000005,
          standard: 0.00001,
          priority: 0.00002,
          urgent: 0.00005
        },
        memPoolStatus: {
          size: 0,
          bytes: 0,
          congestion: 'unknown'
        }
      };
    }
  }

  // Enhanced Transaction Broadcasting with RBF Support
  public async broadcastEnhancedTransaction(
    transactionId: string,
    options?: {
      enableRBF?: boolean;
      maxFeeRate?: number;
      broadcastRetries?: number;
    }
  ): Promise<{
    txid: string;
    broadcastTime: Date;
    networkResponse: any;
    rbfEnabled: boolean;
  }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const psbt = bitcoin.Psbt.fromBase64(transaction.psbt!, { network: this.network });
      
      // Enable RBF if requested
      if (options?.enableRBF) {
        // Set sequence number to enable RBF
        for (let i = 0; i < psbt.inputCount; i++) {
          psbt.updateInput(i, { sequence: 0xfffffffd });
        }
      }
      
      psbt.finalizeAllInputs();
      const rawTransaction = psbt.extractTransaction().toHex();
      
      // Validate transaction before broadcasting
      await this.validateTransaction(rawTransaction);
      
      // Broadcast with retry logic
      const maxRetries = options?.broadcastRetries || 3;
      let txid: string;
      let networkResponse: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          txid = await this.rpcCall('sendrawtransaction', [rawTransaction]);
          networkResponse = await this.rpcCall('gettransaction', [txid]);
          break;
        } catch (error) {
          if (attempt === maxRetries) {
            throw error;
          }
          this.logger.warn(`Broadcast attempt ${attempt} failed, retrying...`, {
            error: error.message,
            transactionId
          });
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      const broadcastTime = new Date();
      
      // Update transaction status
      transaction.txid = txid!;
      transaction.status = 'broadcast';
      transaction.broadcastAt = broadcastTime;
      transaction.rbfEnabled = options?.enableRBF || false;
      
      await this.setCachedData(`transaction:${transactionId}`, transaction, 3600);

      this.logger.info('Enhanced Bitcoin transaction broadcast', {
        transactionId,
        txid: txid!,
        rbfEnabled: options?.enableRBF || false,
        broadcastTime
      });

      this.emit('transactionBroadcast', {
        transactionId,
        txid: txid!,
        broadcastTime
      });

      return {
        txid: txid!,
        broadcastTime,
        networkResponse,
        rbfEnabled: options?.enableRBF || false
      };
    } catch (error) {
      this.logger.error('Failed to broadcast enhanced transaction', { error, transactionId });
      throw error;
    }
  }

  // Performance Monitoring
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceReport();
    }, 60000); // Update every minute

    setInterval(() => {
      this.logPerformanceMetrics();
    }, 300000); // Log every 5 minutes
  }

  private updatePerformanceMetrics(responseTime: number, success: boolean): void {
    if (success) {
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
    
    this.performanceMetrics.errorRate = 
      (this.performanceMetrics.errorRate * 0.9) + (success ? 0 : 0.1);
    
    this.performanceMetrics.lastUpdated = new Date();
  }

  private updatePerformanceReport(): void {
    const report = {
      service: 'enhanced-bitcoin-service',
      timestamp: new Date(),
      metrics: this.performanceMetrics,
      connectionPool: this.connectionPool,
      blockchainSync: this.blockchainSyncStatus,
      memPool: this.memPoolMonitor
    };

    this.emit('performanceReport', report);
  }

  private logPerformanceMetrics(): void {
    this.logger.info('Enhanced Bitcoin Service Performance Metrics', {
      requestCount: this.performanceMetrics.requestCount,
      averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime),
      errorRate: Math.round(this.performanceMetrics.errorRate * 100) / 100,
      cacheHitRate: Math.round(this.performanceMetrics.cacheHitRate * 100) / 100,
      activeConnections: this.connectionPool.active,
      blockHeight: this.blockchainSyncStatus.currentBlock,
      memPoolSize: this.memPoolMonitor.size
    });
  }

  // Blockchain Monitoring
  private async initializeBlockchainMonitoring(): Promise<void> {
    try {
      const info = await this.rpcCall('getblockchaininfo');
      this.blockchainSyncStatus = {
        isSync: !info.initialblockdownload,
        currentBlock: info.blocks,
        targetBlock: info.headers,
        progress: info.verificationprogress
      };

      // Monitor new blocks
      setInterval(async () => {
        try {
          const newInfo = await this.rpcCall('getblockchaininfo');
          const previousBlock = this.blockchainSyncStatus.currentBlock;
          
          this.blockchainSyncStatus = {
            isSync: !newInfo.initialblockdownload,
            currentBlock: newInfo.blocks,
            targetBlock: newInfo.headers,
            progress: newInfo.verificationprogress
          };

          if (newInfo.blocks > previousBlock) {
            this.emit('newBlock', {
              height: newInfo.blocks,
              hash: newInfo.bestblockhash,
              previousHeight: previousBlock
            });
          }
        } catch (error) {
          this.logger.warn('Blockchain monitoring update failed', { error: error.message });
        }
      }, 30000); // Check every 30 seconds

    } catch (error) {
      this.logger.error('Failed to initialize blockchain monitoring', { error });
    }
  }

  // MemPool Monitoring
  private async initializeMemPoolMonitoring(): Promise<void> {
    try {
      const memPoolInfo = await this.rpcCall('getmempoolinfo');
      this.memPoolMonitor = {
        size: memPoolInfo.size,
        bytes: memPoolInfo.bytes,
        feeRates: [],
        lastUpdate: new Date()
      };

      // Monitor mempool changes
      setInterval(async () => {
        try {
          const newMemPoolInfo = await this.rpcCall('getmempoolinfo');
          const previousSize = this.memPoolMonitor.size;
          
          this.memPoolMonitor = {
            size: newMemPoolInfo.size,
            bytes: newMemPoolInfo.bytes,
            feeRates: await this.getMemPoolFeeRates(),
            lastUpdate: new Date()
          };

          if (Math.abs(newMemPoolInfo.size - previousSize) > 100) {
            this.emit('memPoolChange', {
              size: newMemPoolInfo.size,
              bytes: newMemPoolInfo.bytes,
              previousSize,
              change: newMemPoolInfo.size - previousSize
            });
          }
        } catch (error) {
          this.logger.warn('MemPool monitoring update failed', { error: error.message });
        }
      }, 60000); // Check every minute

    } catch (error) {
      this.logger.error('Failed to initialize mempool monitoring', { error });
    }
  }

  private async getMemPoolFeeRates(): Promise<number[]> {
    try {
      const rawMemPool = await this.rpcCall('getrawmempool', [true]);
      const feeRates = Object.values(rawMemPool)
        .map((tx: any) => tx.fee / tx.size * 100000000) // Convert to sat/byte
        .sort((a, b) => b - a);
      
      return feeRates.slice(0, 100); // Top 100 fee rates
    } catch (error) {
      return [];
    }
  }

  // Utility Methods
  private getNetworkConfig(networkType: string): bitcoin.Network {
    switch (networkType.toLowerCase()) {
      case 'mainnet':
        return bitcoin.networks.bitcoin;
      case 'testnet':
        return bitcoin.networks.testnet;
      case 'regtest':
        return bitcoin.networks.regtest;
      default:
        return bitcoin.networks.testnet;
    }
  }

  private getNetworkName(): string {
    if (this.network === bitcoin.networks.bitcoin) return 'mainnet';
    if (this.network === bitcoin.networks.testnet) return 'testnet';
    if (this.network === bitcoin.networks.regtest) return 'regtest';
    return 'unknown';
  }

  private async waitForAvailableConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.connectionPool.active < this.connectionPool.max) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  private async validateTransaction(rawTransaction: string): Promise<void> {
    try {
      const result = await this.rpcCall('testmempoolaccept', [[rawTransaction]]);
      if (!result[0].allowed) {
        throw new Error(`Transaction validation failed: ${result[0].reject_reason}`);
      }
    } catch (error) {
      this.logger.error('Transaction validation failed', { error: error.message });
      throw error;
    }
  }

  // Public API Methods
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public getBlockchainStatus() {
    return { ...this.blockchainSyncStatus };
  }

  public getMemPoolStatus() {
    return { ...this.memPoolMonitor };
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Enhanced Bitcoin service');
    this.isInitialized = false;
    this.emit('stopped');
    this.logger.info('Enhanced Bitcoin service stopped');
  }

  public isInitialized(): boolean {
    return this.isInitialized;
  }

  public async isConnected(): Promise<boolean> {
    try {
      await this.rpcCall('getblockchaininfo');
      return true;
    } catch (error) {
      return false;
    }
  }

  public async isReady(): Promise<boolean> {
    try {
      return this.isInitialized && 
             this.blockchainSyncStatus.isSync && 
             this.connectionPool.active < this.connectionPool.max;
    } catch (error) {
      return false;
    }
  }

  // Placeholder methods that need to be implemented
  private async encryptSeed(seed: string): Promise<string> {
    // Implement seed encryption
    return Buffer.from(seed).toString('base64');
  }

  private async getTransaction(transactionId: string): Promise<BitcoinTransaction | null> {
    return await this.getCachedData<BitcoinTransaction>(`transaction:${transactionId}`);
  }

  public async checkNetworkStatus(): Promise<void> {
    // Implement network status check
  }

  public async getBlockHeight(): Promise<number> {
    const info = await this.rpcCall('getblockchaininfo');
    return info.blocks;
  }

  public async getNetworkHashRate(): Promise<number> {
    return await this.rpcCall('getnetworkhashps');
  }

  public async getDifficulty(): Promise<number> {
    const info = await this.rpcCall('getblockchaininfo');
    return info.difficulty;
  }

  public async getMemPoolSize(): Promise<number> {
    const info = await this.rpcCall('getmempoolinfo');
    return info.size;
  }
}
