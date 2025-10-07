import { Decimal } from 'decimal.js';
import { Logger } from '../utils/Logger';
import { EventBus } from '../utils/EventBus';
import { RedisClient } from '../utils/RedisClient';
import { CryptoWallet, ICryptoWallet } from '../models/CryptoWallet';
import { CryptoTransaction } from '../models/CryptoTransaction';
import { 
  CryptoCurrency, 
  WalletType, 
  NetworkType,
  TransactionStatus 
} from '../enums/cryptoEnums';
import BitcoinHandler from '../utils/BitcoinHandler';

export class WalletService {
  private logger: Logger;
  private eventBus: EventBus;
  private redisClient: RedisClient;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('WalletService');
    this.eventBus = EventBus.getInstance();
    this.redisClient = RedisClient.getInstance();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing WalletService...');
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize wallet monitoring
      await this.initializeWalletMonitoring();
      
      this.isInitialized = true;
      this.logger.info('WalletService initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize WalletService', { error: error.message });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('Stopping WalletService...');
      this.isInitialized = false;
      this.logger.info('WalletService stopped');
    } catch (error: any) {
      this.logger.error('Error stopping WalletService', { error: error.message });
    }
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Create a new crypto wallet for a user
   */
  public async createWallet(
    userId: string,
    currency: CryptoCurrency,
    type: WalletType = WalletType.HOT,
    label?: string
  ): Promise<ICryptoWallet> {
    try {
      this.logger.info('Creating new wallet', { userId, currency, type });

      // Check if user already has a wallet for this currency
      const existingWallet = await CryptoWallet.findOne({
        userId,
        currency,
        isActive: true
      });

      if (existingWallet) {
        throw new Error(`User already has an active ${currency} wallet`);
      }

      let walletData: { address: string; walletName: string };

      // Create wallet based on currency
      switch (currency) {
        case CryptoCurrency.BTC:
          walletData = await BitcoinHandler.createWallet(userId);
          break;
        default:
          throw new Error(`Currency ${currency} not supported yet`);
      }

      // Create wallet record
      const wallet = new CryptoWallet({
        userId,
        currency,
        walletName: walletData.walletName,
        type,
        network: process.env.BITCOIN_NETWORK === 'mainnet' 
          ? NetworkType.MAINNET 
          : NetworkType.TESTNET,
        isActive: true
      });

      // Add initial address
      wallet.addAddress({
        address: walletData.address,
        label: label || 'Primary Address'
      });

      await wallet.save();

      // Cache wallet data
      await this.cacheWalletData(wallet);

      // Emit wallet created event
      await this.eventBus.publish('wallet.created', {
        userId,
        walletId: wallet._id.toString(),
        currency,
        address: walletData.address,
        type
      });

      this.logger.info('Wallet created successfully', {
        userId,
        walletId: wallet._id,
        currency,
        address: walletData.address
      });

      return wallet;
    } catch (error: any) {
      this.logger.error('Failed to create wallet', {
        userId,
        currency,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's wallets
   */
  public async getUserWallets(userId: string, currency?: CryptoCurrency): Promise<ICryptoWallet[]> {
    try {
      const query: any = { userId, isActive: true };
      
      if (currency) {
        query.currency = currency;
      }

      const wallets = await CryptoWallet.find(query).sort({ createdAt: -1 });

      // Update balances for all wallets
      for (const wallet of wallets) {
        await this.updateWalletBalance(wallet);
      }

      return wallets;
    } catch (error: any) {
      this.logger.error('Failed to get user wallets', {
        userId,
        currency,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get wallet by ID
   */
  public async getWallet(walletId: string, userId: string): Promise<ICryptoWallet | null> {
    try {
      const wallet = await CryptoWallet.findOne({
        _id: walletId,
        userId,
        isActive: true
      });

      if (wallet) {
        await this.updateWalletBalance(wallet);
      }

      return wallet;
    } catch (error: any) {
      this.logger.error('Failed to get wallet', {
        walletId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update wallet balance from blockchain
   */
  public async updateWalletBalance(wallet: ICryptoWallet): Promise<void> {
    try {
      const primaryAddress = wallet.addresses[0]?.address;
      if (!primaryAddress) {
        this.logger.warn('No primary address found for wallet', { walletId: wallet._id });
        return;
      }

      let balance = new Decimal(0);

      switch (wallet.currency) {
        case CryptoCurrency.BTC:
          const btcBalance = await BitcoinHandler.getBalance(wallet.userId, primaryAddress);
          balance = new Decimal(btcBalance);
          break;
        default:
          this.logger.warn('Balance update not supported for currency', { 
            currency: wallet.currency 
          });
          return;
      }

      // Update wallet balance
      const previousBalance = wallet.balance;
      wallet.updateBalance(balance);
      await wallet.save();

      // Cache updated balance
      await this.cacheWalletBalance(wallet._id.toString(), balance);

      // Emit balance update event if changed
      if (!previousBalance.equals(balance)) {
        await this.eventBus.publish('wallet.balance_updated', {
          userId: wallet.userId,
          walletId: wallet._id.toString(),
          currency: wallet.currency,
          previousBalance: previousBalance.toString(),
          newBalance: balance.toString()
        });
      }

      this.logger.debug('Wallet balance updated', {
        walletId: wallet._id,
        currency: wallet.currency,
        balance: balance.toString()
      });

    } catch (error: any) {
      this.logger.error('Failed to update wallet balance', {
        walletId: wallet._id,
        error: error.message
      });
    }
  }

  /**
   * Update all wallet balances (used by scheduled task)
   */
  public async updateWalletBalances(): Promise<void> {
    try {
      const activeWallets = await CryptoWallet.find({ isActive: true });
      
      this.logger.info('Updating balances for all wallets', { 
        count: activeWallets.length 
      });

      const updatePromises = activeWallets.map(wallet => 
        this.updateWalletBalance(wallet).catch(error => {
          this.logger.error('Failed to update individual wallet balance', {
            walletId: wallet._id,
            error: error.message
          });
        })
      );

      await Promise.all(updatePromises);
      
      this.logger.info('Wallet balance update completed');
    } catch (error: any) {
      this.logger.error('Failed to update wallet balances', { error: error.message });
    }
  }

  /**
   * Generate new address for wallet
   */
  public async generateNewAddress(
    walletId: string, 
    userId: string, 
    label?: string
  ): Promise<string> {
    try {
      const wallet = await this.getWallet(walletId, userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      let newAddress: string;

      switch (wallet.currency) {
        case CryptoCurrency.BTC:
          newAddress = await BitcoinHandler.generateNewAddress(userId, wallet.walletName);
          break;
        default:
          throw new Error(`Address generation not supported for ${wallet.currency}`);
      }

      // Add address to wallet
      wallet.addAddress({
        address: newAddress,
        label: label || `Address ${wallet.addresses.length + 1}`
      });

      await wallet.save();

      // Emit address generated event
      await this.eventBus.publish('wallet.address_generated', {
        userId,
        walletId: wallet._id.toString(),
        currency: wallet.currency,
        address: newAddress
      });

      this.logger.info('New address generated', {
        userId,
        walletId,
        currency: wallet.currency,
        address: newAddress
      });

      return newAddress;
    } catch (error: any) {
      this.logger.error('Failed to generate new address', {
        walletId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deactivate wallet
   */
  public async deactivateWallet(walletId: string, userId: string): Promise<void> {
    try {
      const wallet = await CryptoWallet.findOne({
        _id: walletId,
        userId,
        isActive: true
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if wallet has pending transactions
      const pendingTransactions = await CryptoTransaction.find({
        walletId,
        status: TransactionStatus.PENDING
      });

      if (pendingTransactions.length > 0) {
        throw new Error('Cannot deactivate wallet with pending transactions');
      }

      wallet.isActive = false;
      await wallet.save();

      // Remove from cache
      await this.removeCachedWalletData(walletId);

      // Emit wallet deactivated event
      await this.eventBus.publish('wallet.deactivated', {
        userId,
        walletId,
        currency: wallet.currency
      });

      this.logger.info('Wallet deactivated', { userId, walletId });
    } catch (error: any) {
      this.logger.error('Failed to deactivate wallet', {
        walletId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  public async getWalletStats(userId: string): Promise<any> {
    try {
      const stats = await CryptoWallet.aggregate([
        { $match: { userId, isActive: true } },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            totalBalance: { $sum: { $toDouble: '$balance' } },
            avgBalance: { $avg: { $toDouble: '$balance' } }
          }
        }
      ]);

      return stats;
    } catch (error: any) {
      this.logger.error('Failed to get wallet stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get total wallets count
   */
  public async getTotalWallets(): Promise<number> {
    return await CryptoWallet.countDocuments({ isActive: true });
  }

  /**
   * Get active wallets count
   */
  public async getActiveWallets(): Promise<number> {
    return await CryptoWallet.countDocuments({ 
      isActive: true,
      lastActivityAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
  }

  /**
   * Get multi-sig wallets count
   */
  public async getMultiSigWallets(): Promise<number> {
    return await CryptoWallet.countDocuments({ 
      isActive: true,
      type: WalletType.MULTISIG
    });
  }

  /**
   * Cache wallet data in Redis
   */
  private async cacheWalletData(wallet: ICryptoWallet): Promise<void> {
    try {
      const cacheKey = `wallet:${wallet._id}`;
      const walletData = {
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.balance.toString(),
        addresses: wallet.addresses,
        type: wallet.type,
        network: wallet.network
      };

      await this.redisClient.set(
        cacheKey, 
        JSON.stringify(walletData), 
        3600 // 1 hour TTL
      );
    } catch (error: any) {
      this.logger.warn('Failed to cache wallet data', {
        walletId: wallet._id,
        error: error.message
      });
    }
  }

  /**
   * Cache wallet balance
   */
  private async cacheWalletBalance(walletId: string, balance: Decimal): Promise<void> {
    try {
      const cacheKey = `wallet:balance:${walletId}`;
      await this.redisClient.set(cacheKey, balance.toString(), 300); // 5 minutes TTL
    } catch (error: any) {
      this.logger.warn('Failed to cache wallet balance', {
        walletId,
        error: error.message
      });
    }
  }

  /**
   * Remove cached wallet data
   */
  private async removeCachedWalletData(walletId: string): Promise<void> {
    try {
      await this.redisClient.del(`wallet:${walletId}`);
      await this.redisClient.del(`wallet:balance:${walletId}`);
    } catch (error: any) {
      this.logger.warn('Failed to remove cached wallet data', {
        walletId,
        error: error.message
      });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.eventBus.subscribe('transaction.confirmed', async (data) => {
      if (data.walletId) {
        const wallet = await CryptoWallet.findById(data.walletId);
        if (wallet) {
          await this.updateWalletBalance(wallet);
        }
      }
    });
  }

  /**
   * Initialize wallet monitoring
   */
  private async initializeWalletMonitoring(): Promise<void> {
    // This would set up blockchain monitoring for wallet addresses
    // Implementation would depend on specific blockchain integration
    this.logger.info('Wallet monitoring initialized');
  }
}

export default WalletService;
