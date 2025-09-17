import axios, { AxiosResponse } from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import retry from 'async-retry';
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

export class BitcoinService {
  private logger: Logger;
  private redisClient: RedisClient;
  private network: bitcoin.Network;
  private rpcConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    timeout: number;
  };
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('BitcoinService');
    this.redisClient = RedisClient.getInstance();
    
    // Configure network
    const networkType = process.env.BITCOIN_NETWORK || 'testnet';
    this.network = this.getNetworkConfig(networkType);
    
    // Configure RPC connection
    this.rpcConfig = {
      host: process.env.BITCOIN_RPC_HOST || 'localhost',
      port: parseInt(process.env.BITCOIN_RPC_PORT || '18332'),
      username: process.env.BITCOIN_RPC_USER || 'bitcoin',
      password: process.env.BITCOIN_RPC_PASSWORD || 'password',
      timeout: parseInt(process.env.BITCOIN_RPC_TIMEOUT || '30000')
    };
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Bitcoin service');

      // Test Bitcoin Core connection
      await this.testConnection();
      
      // Verify network configuration
      await this.verifyNetworkConfig();
      
      this.isInitialized = true;
      this.logger.info('Bitcoin service initialized successfully', {
        network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 
                this.network === bitcoin.networks.testnet ? 'testnet' : 'regtest',
        host: this.rpcConfig.host,
        port: this.rpcConfig.port
      });
    } catch (error) {
      this.logger.error('Failed to initialize Bitcoin service', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Bitcoin service');
    this.isInitialized = false;
    this.logger.info('Bitcoin service stopped');
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
      const info = await this.getNetworkInfo();
      return info.connections > 0 && !info.initialBlockDownload;
    } catch (error) {
      return false;
    }
  }

  // Wallet Management
  public async generateWallet(userId: string, walletName?: string): Promise<BitcoinWallet> {
    try {
      const mnemonic = bip39.generateMnemonic(256);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed, this.network);
      
      // Generate master key and first receiving address
      const account = root.derivePath("m/84'/0'/0'"); // BIP84 (native segwit)
      const firstAddress = this.deriveAddress(account, 0, 0);
      
      const wallet: BitcoinWallet = {
        id: `btc_${userId}_${Date.now()}`,
        userId,
        name: walletName || `Bitcoin Wallet ${Date.now()}`,
        type: 'hd',
        network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet',
        addresses: [firstAddress],
        balance: {
          confirmed: 0,
          unconfirmed: 0,
          total: 0
        },
        transactions: [],
        derivationPath: "m/84'/0'/0'",
        xpub: account.neutered().toBase58(),
        encryptedSeed: await this.encryptSeed(seed.toString('hex')),
        createdAt: new Date(),
        lastSyncAt: new Date(),
        isActive: true
      };

      // Cache wallet data
      await this.cacheWallet(wallet);
      
      this.logger.info('Bitcoin wallet generated', {
        walletId: wallet.id,
        userId,
        firstAddress: firstAddress.address
      });

      return wallet;
    } catch (error) {
      this.logger.error('Failed to generate Bitcoin wallet', { error, userId });
      throw error;
    }
  }

  public async generateMultiSigWallet(
    userIds: string[], 
    requiredSignatures: number,
    walletName?: string
  ): Promise<BitcoinWallet> {
    try {
      if (userIds.length < 2 || requiredSignatures > userIds.length) {
        throw new Error('Invalid multi-signature configuration');
      }

      const publicKeys: Buffer[] = [];
      const walletId = `btc_multisig_${Date.now()}`;

      // Generate public keys for each user
      for (const userId of userIds) {
        const mnemonic = bip39.generateMnemonic(256);
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const root = bip32.fromSeed(seed, this.network);
        const account = root.derivePath("m/84'/0'/0'");
        publicKeys.push(account.publicKey);
        
        // Store encrypted seed for each participant
        await this.storeMultiSigParticipant(walletId, userId, seed.toString('hex'));
      }

      // Create multi-signature address
      const { address, redeemScript } = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({
          m: requiredSignatures,
          pubkeys: publicKeys,
          network: this.network
        }),
        network: this.network
      });

      if (!address) {
        throw new Error('Failed to generate multi-signature address');
      }

      const multiSigAddress: BitcoinAddress = {
        address,
        type: 'p2wsh',
        derivationPath: "m/84'/0'/0'",
        index: 0,
        isChange: false,
        balance: 0,
        transactions: [],
        createdAt: new Date()
      };

      const wallet: BitcoinWallet = {
        id: walletId,
        userId: userIds[0], // Primary user
        name: walletName || `Multi-Sig Wallet ${Date.now()}`,
        type: 'multisig',
        network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet',
        addresses: [multiSigAddress],
        balance: {
          confirmed: 0,
          unconfirmed: 0,
          total: 0
        },
        transactions: [],
        multiSig: {
          requiredSignatures,
          totalSignatures: userIds.length,
          participants: userIds,
          redeemScript: redeemScript?.toString('hex')
        },
        createdAt: new Date(),
        lastSyncAt: new Date(),
        isActive: true
      };

      await this.cacheWallet(wallet);
      
      this.logger.info('Multi-signature Bitcoin wallet generated', {
        walletId: wallet.id,
        participants: userIds.length,
        requiredSignatures,
        address: address
      });

      return wallet;
    } catch (error) {
      this.logger.error('Failed to generate multi-signature wallet', { error, userIds });
      throw error;
    }
  }

  // Address Management
  public async generateNewAddress(walletId: string, isChange: boolean = false): Promise<BitcoinAddress> {
    try {
      const wallet = await this.getWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.type === 'multisig') {
        throw new Error('Cannot generate new addresses for multi-signature wallets');
      }

      const seed = await this.decryptSeed(wallet.encryptedSeed!);
      const root = bip32.fromSeed(Buffer.from(seed, 'hex'), this.network);
      const account = root.derivePath(wallet.derivationPath!);
      
      const addressIndex = wallet.addresses.filter(addr => addr.isChange === isChange).length;
      const newAddress = this.deriveAddress(account, isChange ? 1 : 0, addressIndex);
      
      // Update wallet with new address
      wallet.addresses.push(newAddress);
      await this.cacheWallet(wallet);
      
      this.logger.info('New Bitcoin address generated', {
        walletId,
        address: newAddress.address,
        isChange,
        index: addressIndex
      });

      return newAddress;
    } catch (error) {
      this.logger.error('Failed to generate new address', { error, walletId });
      throw error;
    }
  }

  public async validateAddress(address: string): Promise<boolean> {
    try {
      const result = await this.rpcCall('validateaddress', [address]);
      return result.isvalid;
    } catch (error) {
      this.logger.error('Failed to validate address', { error, address });
      return false;
    }
  }

  // Transaction Management
  public async createTransaction(
    fromWalletId: string,
    toAddress: string,
    amount: number,
    feeRate?: number
  ): Promise<BitcoinTransaction> {
    try {
      const wallet = await this.getWallet(fromWalletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Get UTXOs for the wallet
      const utxos = await this.getWalletUTXOs(wallet);
      
      // Calculate required amount including fees
      const estimatedFee = await this.estimateTransactionFee(utxos.length, 2, feeRate);
      const totalRequired = amount + estimatedFee.fee;
      
      // Select UTXOs
      const selectedUTXOs = this.selectUTXOs(utxos, totalRequired);
      if (selectedUTXOs.totalValue < totalRequired) {
        throw new Error('Insufficient funds');
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      // Add inputs
      for (const utxo of selectedUTXOs.utxos) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, 'hex'),
            value: utxo.value
          }
        });
      }

      // Add outputs
      psbt.addOutput({
        address: toAddress,
        value: amount
      });

      // Add change output if necessary
      const change = selectedUTXOs.totalValue - amount - estimatedFee.fee;
      if (change > 546) { // Dust threshold
        const changeAddress = await this.generateNewAddress(fromWalletId, true);
        psbt.addOutput({
          address: changeAddress.address,
          value: change
        });
      }

      const transaction: BitcoinTransaction = {
        id: psbt.extractTransaction().getId(),
        walletId: fromWalletId,
        type: 'send',
        amount,
        fee: estimatedFee.fee,
        toAddress,
        fromAddresses: selectedUTXOs.utxos.map(utxo => utxo.address),
        status: 'pending',
        confirmations: 0,
        psbt: psbt.toBase64(),
        createdAt: new Date(),
        broadcastAt: undefined,
        confirmedAt: undefined
      };

      this.logger.info('Bitcoin transaction created', {
        transactionId: transaction.id,
        walletId: fromWalletId,
        amount,
        fee: estimatedFee.fee,
        toAddress
      });

      return transaction;
    } catch (error) {
      this.logger.error('Failed to create transaction', { error, fromWalletId, toAddress, amount });
      throw error;
    }
  }

  public async signTransaction(
    transactionId: string,
    walletId: string,
    userId: string
  ): Promise<BitcoinTransaction> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const wallet = await this.getWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const psbt = bitcoin.Psbt.fromBase64(transaction.psbt!, { network: this.network });

      if (wallet.type === 'multisig') {
        // Multi-signature signing
        const participantSeed = await this.getMultiSigParticipantSeed(walletId, userId);
        const root = bip32.fromSeed(Buffer.from(participantSeed, 'hex'), this.network);
        const account = root.derivePath("m/84'/0'/0'");
        const keyPair = ECPair.fromPrivateKey(account.privateKey!, { network: this.network });
        
        psbt.signAllInputs(keyPair);
      } else {
        // Single signature signing
        const seed = await this.decryptSeed(wallet.encryptedSeed!);
        const root = bip32.fromSeed(Buffer.from(seed, 'hex'), this.network);
        const account = root.derivePath(wallet.derivationPath!);
        const keyPair = ECPair.fromPrivateKey(account.privateKey!, { network: this.network });
        
        psbt.signAllInputs(keyPair);
      }

      // Validate signatures
      if (!psbt.validateSignaturesOfAllInputs()) {
        throw new Error('Invalid signatures');
      }

      transaction.psbt = psbt.toBase64();
      transaction.status = wallet.type === 'multisig' ? 'partially_signed' : 'signed';
      
      await this.cacheTransaction(transaction);

      this.logger.info('Bitcoin transaction signed', {
        transactionId,
        walletId,
        userId,
        type: wallet.type
      });

      return transaction;
    } catch (error) {
      this.logger.error('Failed to sign transaction', { error, transactionId, walletId, userId });
      throw error;
    }
  }

  public async broadcastTransaction(transactionId: string): Promise<string> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const psbt = bitcoin.Psbt.fromBase64(transaction.psbt!, { network: this.network });
      
      // Finalize transaction
      psbt.finalizeAllInputs();
      const rawTransaction = psbt.extractTransaction().toHex();
      
      // Broadcast to network
      const txid = await this.rpcCall('sendrawtransaction', [rawTransaction]);
      
      // Update transaction status
      transaction.txid = txid;
      transaction.status = 'broadcast';
      transaction.broadcastAt = new Date();
      
      await this.cacheTransaction(transaction);

      this.logger.info('Bitcoin transaction broadcast', {
        transactionId,
        txid,
        rawTransaction: rawTransaction.substring(0, 100) + '...'
      });

      return txid;
    } catch (error) {
      this.logger.error('Failed to broadcast transaction', { error, transactionId });
      throw error;
    }
  }

  // Network Information
  public async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [blockchainInfo, networkInfo, mempoolInfo] = await Promise.all([
        this.rpcCall('getblockchaininfo'),
        this.rpcCall('getnetworkinfo'),
        this.rpcCall('getmempoolinfo')
      ]);

      return {
        network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet',
        blockHeight: blockchainInfo.blocks,
        blockHash: blockchainInfo.bestblockhash,
        difficulty: blockchainInfo.difficulty,
        connections: networkInfo.connections,
        version: networkInfo.version,
        protocolVersion: networkInfo.protocolversion,
        timeOffset: networkInfo.timeoffset,
        networkActive: networkInfo.networkactive,
        initialBlockDownload: blockchainInfo.initialblockdownload,
        verificationProgress: blockchainInfo.verificationprogress,
        memPoolSize: mempoolInfo.size,
        memPoolBytes: mempoolInfo.bytes
      };
    } catch (error) {
      this.logger.error('Failed to get network info', { error });
      throw error;
    }
  }

  public async getBlockHeight(): Promise<number> {
    try {
      const info = await this.rpcCall('getblockchaininfo');
      return info.blocks;
    } catch (error) {
      this.logger.error('Failed to get block height', { error });
      return 0;
    }
  }

  public async getNetworkHashRate(): Promise<number> {
    try {
      const hashRate = await this.rpcCall('getnetworkhashps');
      return hashRate;
    } catch (error) {
      this.logger.error('Failed to get network hash rate', { error });
      return 0;
    }
  }

  public async getDifficulty(): Promise<number> {
    try {
      const difficulty = await this.rpcCall('getdifficulty');
      return difficulty;
    } catch (error) {
      this.logger.error('Failed to get difficulty', { error });
      return 0;
    }
  }

  public async getMemPoolSize(): Promise<number> {
    try {
      const info = await this.rpcCall('getmempoolinfo');
      return info.size;
    } catch (error) {
      this.logger.error('Failed to get mempool size', { error });
      return 0;
    }
  }

  // Fee Estimation
  public async estimateTransactionFee(
    inputCount: number,
    outputCount: number,
    feeRate?: number
  ): Promise<FeeEstimate> {
    try {
      // Estimate transaction size (bytes)
      const inputSize = 148; // Average input size for P2WPKH
      const outputSize = 34; // Average output size for P2WPKH
      const overhead = 10; // Transaction overhead
      
      const estimatedSize = (inputCount * inputSize) + (outputCount * outputSize) + overhead;
      
      // Get fee rate if not provided
      let satPerByte = feeRate;
      if (!satPerByte) {
        const feeEstimate = await this.rpcCall('estimatesmartfee', [6]); // 6 blocks target
        satPerByte = feeEstimate.feerate ? Math.ceil(feeEstimate.feerate * 100000000 / 1000) : 10;
      }
      
      const fee = estimatedSize * satPerByte;
      
      return {
        fee,
        feeRate: satPerByte,
        estimatedSize,
        confirmationTarget: 6
      };
    } catch (error) {
      this.logger.error('Failed to estimate transaction fee', { error });
      return {
        fee: 10000, // Default fee
        feeRate: 10,
        estimatedSize: 250,
        confirmationTarget: 6
      };
    }
  }

  // Monitoring
  public async checkNetworkStatus(): Promise<void> {
    try {
      const networkInfo = await this.getNetworkInfo();
      
      // Cache network status
      await this.redisClient.setex(
        'bitcoin:network:status',
        300, // 5 minutes
        JSON.stringify(networkInfo)
      );
      
      this.logger.debug('Bitcoin network status updated', {
        blockHeight: networkInfo.blockHeight,
        connections: networkInfo.connections,
        memPoolSize: networkInfo.memPoolSize
      });
    } catch (error) {
      this.logger.error('Failed to check network status', { error });
    }
  }

  // Private helper methods
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

  private async testConnection(): Promise<void> {
    try {
      await this.rpcCall('getblockchaininfo');
      this.logger.info('Bitcoin Core connection successful');
    } catch (error) {
      this.logger.error('Bitcoin Core connection failed', { error });
      throw new Error('Failed to connect to Bitcoin Core');
    }
  }

  private async verifyNetworkConfig(): Promise<void> {
    try {
      const info = await this.rpcCall('getblockchaininfo');
      const expectedNetwork = process.env.BITCOIN_NETWORK || 'testnet';
      
      if (expectedNetwork === 'mainnet' && info.chain !== 'main') {
        throw new Error(`Network mismatch: expected mainnet, got ${info.chain}`);
      }
      
      if (expectedNetwork === 'testnet' && info.chain !== 'test') {
        throw new Error(`Network mismatch: expected testnet, got ${info.chain}`);
      }
      
      this.logger.info('Bitcoin network configuration verified', { chain: info.chain });
    } catch (error) {
      this.logger.error('Network configuration verification failed', { error });
      throw error;
    }
  }

  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response: AxiosResponse = await retry(
        async () => {
          return await axios.post(
            `http://${this.rpcConfig.host}:${this.rpcConfig.port}`,
            {
              jsonrpc: '1.0',
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
                'Content-Type': 'application/json'
              }
            }
          );
        },
        {
          retries: 3,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 5000
        }
      );

      if (response.data.error) {
        throw new Error(`Bitcoin RPC error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      this.logger.error('Bitcoin RPC call failed', { method, params, error });
      throw error;
    }
  }

  private deriveAddress(account: any, change: number, index: number): BitcoinAddress {
    const child = account.derive(change).derive(index);
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network
    });

    if (!address) {
      throw new Error('Failed to derive address');
    }

    return {
      address,
      type: 'p2wpkh',
      derivationPath: `m/84'/0'/0'/${change}/${index}`,
      index,
      isChange: change === 1,
      balance: 0,
      transactions: [],
      createdAt: new Date()
    };
  }

  private async encryptSeed(seed: string): Promise<string> {
    // This would use proper encryption in production
    // For now, return base64 encoded seed
    return Buffer.from(seed).toString('base64');
  }

  private async decryptSeed(encryptedSeed: string): Promise<string> {
    // This would use proper decryption in production
    // For now, return base64 decoded seed
    return Buffer.from(encryptedSeed, 'base64').toString();
  }

  private async cacheWallet(wallet: BitcoinWallet): Promise<void> {
    const cacheKey = `bitcoin:wallet:${wallet.id}`;
    await this.redisClient.setex(cacheKey, 3600, JSON.stringify(wallet));
  }

  private async getWallet(walletId: string): Promise<BitcoinWallet | null> {
    try {
      const cacheKey = `bitcoin:wallet:${walletId}`;
      const cached = await this.redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Failed to get wallet from cache', { error, walletId });
      return null;
    }
  }

  private async cacheTransaction(transaction: BitcoinTransaction): Promise<void> {
    const cacheKey = `bitcoin:transaction:${transaction.id}`;
    await this.redisClient.setex(cacheKey, 3600, JSON.stringify(transaction));
  }

  private async getTransaction(transactionId: string): Promise<BitcoinTransaction | null> {
    try {
      const cacheKey = `bitcoin:transaction:${transactionId}`;
      const cached = await this.redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Failed to get transaction from cache', { error, transactionId });
      return null;
    }
  }

  private async storeMultiSigParticipant(walletId: string, userId: string, seed: string): Promise<void> {
    const cacheKey = `bitcoin:multisig:${walletId}:${userId}`;
    const encryptedSeed = await this.encryptSeed(seed);
    await this.redisClient.setex(cacheKey, 86400, encryptedSeed); // 24 hours
  }

  private async getMultiSigParticipantSeed(walletId: string, userId: string): Promise<string> {
    const cacheKey = `bitcoin:multisig:${walletId}:${userId}`;
    const encryptedSeed = await this.redisClient.get(cacheKey);
    if (!encryptedSeed) {
      throw new Error('Participant seed not found');
    }
    return await this.decryptSeed(encryptedSeed);
  }

  private async getWalletUTXOs(wallet: BitcoinWallet): Promise<UTXOInput[]> {
    try {
      const utxos: UTXOInput[] = [];
      
      for (const address of wallet.addresses) {
        const addressUTXOs = await this.rpcCall('listunspent', [0, 9999999, [address.address]]);
        
        for (const utxo of addressUTXOs) {
          utxos.push({
            txid: utxo.txid,
            vout: utxo.vout,
            value: Math.round(utxo.amount * 100000000), // Convert to satoshis
            address: utxo.address,
            scriptPubKey: utxo.scriptPubKey,
            confirmations: utxo.confirmations
          });
        }
      }
      
      return utxos;
    } catch (error) {
      this.logger.error('Failed to get wallet UTXOs', { error, walletId: wallet.id });
      return [];
    }
  }

  private selectUTXOs(utxos: UTXOInput[], targetAmount: number): { utxos: UTXOInput[], totalValue: number } {
    // Simple UTXO selection algorithm (largest first)
    const sortedUTXOs = utxos.sort((a, b) => b.value - a.value);
    const selectedUTXOs: UTXOInput[] = [];
    let totalValue = 0;

    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalValue += utxo.value;
      
      if (totalValue >= targetAmount) {
        break;
      }
    }

    return { utxos: selectedUTXOs, totalValue };
  }
}

