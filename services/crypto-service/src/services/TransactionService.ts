import { Decimal } from 'decimal.js';
import { Logger } from '../utils/Logger';
import { EventBus } from '../utils/EventBus';
import { RedisClient } from '../utils/RedisClient';
import { CryptoTransaction, ICryptoTransaction } from '../models/CryptoTransaction';
import { CryptoWallet } from '../models/CryptoWallet';
import { 
  CryptoCurrency, 
  TransactionType, 
  TransactionStatus,
  NetworkType 
} from '../enums/cryptoEnums';
import BitcoinHandler from '../utils/BitcoinHandler';

export class TransactionService {
  private logger: Logger;
  private eventBus: EventBus;
  private redisClient: RedisClient;
  private isInitialized: boolean = false;
  private processingQueue: Set<string> = new Set();

  constructor() {
    this.logger = new Logger('TransactionService');
    this.eventBus = EventBus.getInstance();
    this.redisClient = RedisClient.getInstance();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing TransactionService...');
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize transaction monitoring
      await this.initializeTransactionMonitoring();
      
      this.isInitialized = true;
      this.logger.info('TransactionService initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize TransactionService', { error: error.message });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('Stopping TransactionService...');
      this.isInitialized = false;
      this.logger.info('TransactionService stopped');
    } catch (error: any) {
      this.logger.error('Error stopping TransactionService', { error: error.message });
    }
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Create and send a transaction
   */
  public async sendTransaction(
    userId: string,
    currency: CryptoCurrency,
    fromAddress: string,
    toAddress: string,
    amount: Decimal,
    memo?: string
  ): Promise<ICryptoTransaction> {
    try {
      this.logger.info('Creating transaction', {
        userId,
        currency,
        fromAddress,
        toAddress,
        amount: amount.toString()
      });

      // Find wallet
      const wallet = await CryptoWallet.findOne({
        userId,
        currency,
        'addresses.address': fromAddress,
        isActive: true
      });

      if (!wallet) {
        throw new Error('Wallet not found for the specified address');
      }

      // Validate amount
      if (amount.lte(0)) {
        throw new Error('Amount must be positive');
      }

      // Check wallet balance
      if (wallet.balance.lt(amount)) {
        throw new Error('Insufficient balance');
      }

      let txHash: string;
      let estimatedFee = new Decimal(0);

      // Send transaction based on currency
      switch (currency) {
        case CryptoCurrency.BTC:
          // Estimate fee first
          estimatedFee = await this.estimateTransactionFee(
            currency,
            fromAddress,
            toAddress,
            amount
          );

          // Check if balance covers amount + fee
          if (wallet.balance.lt(amount.plus(estimatedFee))) {
            throw new Error('Insufficient balance to cover transaction and fee');
          }

          txHash = await BitcoinHandler.sendTransaction(
            userId,
            fromAddress,
            toAddress,
            amount.toNumber()
          );
          break;
        default:
          throw new Error(`Currency ${currency} not supported yet`);
      }

      // Create transaction record
      const transaction = new CryptoTransaction({
        userId,
        walletId: wallet._id,
        currency,
        type: TransactionType.SEND,
        amount,
        fee: estimatedFee,
        fromAddress,
        toAddress,
        txHash,
        status: TransactionStatus.PENDING,
        memo,
        network: wallet.network
      });

      await transaction.save();

      // Cache transaction
      await this.cacheTransaction(transaction);

      // Emit transaction created event
      await this.eventBus.publish('transaction.created', {
        userId,
        transactionId: transaction._id.toString(),
        txHash,
        amount: amount.toString(),
        currency,
        type: TransactionType.SEND
      });

      this.logger.info('Transaction created successfully', {
        userId,
        transactionId: transaction._id,
        txHash,
        amount: amount.toString()
      });

      return transaction;
    } catch (error: any) {
      this.logger.error('Failed to send transaction', {
        userId,
        currency,
        fromAddress,
        toAddress,
        amount: amount.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  public async getTransaction(
    transactionId: string, 
    userId: string
  ): Promise<ICryptoTransaction | null> {
    try {
      // Try cache first
      const cachedTransaction = await this.getCachedTransaction(transactionId);
      if (cachedTransaction && cachedTransaction.userId === userId) {
        return cachedTransaction;
      }

      // Get from database
      const transaction = await CryptoTransaction.findOne({
        _id: transactionId,
        userId
      });

      if (transaction) {
        await this.cacheTransaction(transaction);
      }

      return transaction;
    } catch (error: any) {
      this.logger.error('Failed to get transaction', {
        transactionId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's transaction history
   */
  public async getTransactionHistory(
    userId: string,
    options: {
      currency?: CryptoCurrency;
      type?: TransactionType;
      status?: TransactionStatus;
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ICryptoTransaction[]> {
    try {
      const query: any = { userId };

      if (options.currency) {
        query.currency = options.currency;
      }

      if (options.type) {
        query.type = options.type;
      }

      if (options.status) {
        query.status = options.status;
      }

      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      const transactions = await CryptoTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return transactions;
    } catch (error: any) {
      this.logger.error('Failed to get transaction history', {
        userId,
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  public async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    blockHeight?: number,
    confirmations?: number
  ): Promise<void> {
    try {
      const transaction = await CryptoTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const previousStatus = transaction.status;
      transaction.updateStatus(status);

      if (blockHeight) {
        transaction.blockHeight = blockHeight;
      }

      if (confirmations !== undefined) {
        transaction.confirmations = confirmations;
      }

      await transaction.save();

      // Update cache
      await this.cacheTransaction(transaction);

      // Emit status update event
      await this.eventBus.publish('transaction.status_updated', {
        transactionId: transaction._id.toString(),
        userId: transaction.userId,
        previousStatus,
        newStatus: status,
        txHash: transaction.txHash,
        currency: transaction.currency
      });

      this.logger.info('Transaction status updated', {
        transactionId,
        previousStatus,
        newStatus: status,
        blockHeight,
        confirmations
      });
    } catch (error: any) {
      this.logger.error('Failed to update transaction status', {
        transactionId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process pending transactions (called by scheduled task)
   */
  public async processPendingTransactions(): Promise<void> {
    try {
      const pendingTransactions = await CryptoTransaction.find({
        status: TransactionStatus.PENDING,
        txHash: { $exists: true, $ne: null }
      }).limit(100);

      if (pendingTransactions.length === 0) {
        return;
      }

      this.logger.info('Processing pending transactions', {
        count: pendingTransactions.length
      });

      const processPromises = pendingTransactions.map(transaction =>
        this.processTransaction(transaction).catch(error => {
          this.logger.error('Failed to process individual transaction', {
            transactionId: transaction._id,
            error: error.message
          });
        })
      );

      await Promise.all(processPromises);
      
      this.logger.info('Pending transactions processing completed');
    } catch (error: any) {
      this.logger.error('Failed to process pending transactions', { error: error.message });
    }
  }

  /**
   * Process individual transaction
   */
  private async processTransaction(transaction: ICryptoTransaction): Promise<void> {
    const transactionId = transaction._id.toString();

    // Prevent duplicate processing
    if (this.processingQueue.has(transactionId)) {
      return;
    }

    this.processingQueue.add(transactionId);

    try {
      let transactionInfo: any;

      switch (transaction.currency) {
        case CryptoCurrency.BTC:
          transactionInfo = await BitcoinHandler.getTransactionInfo(
            transaction.userId,
            transaction.txHash!
          );
          break;
        default:
          this.logger.warn('Transaction processing not supported for currency', {
            currency: transaction.currency
          });
          return;
      }

      if (transactionInfo) {
        await this.updateTransactionStatus(
          transactionId,
          transactionInfo.confirmed ? TransactionStatus.CONFIRMED : TransactionStatus.PENDING,
          transactionInfo.blockHeight,
          transactionInfo.confirmations
        );
      }
    } catch (error: any) {
      this.logger.error('Failed to process transaction', {
        transactionId,
        error: error.message
      });
    } finally {
      this.processingQueue.delete(transactionId);
    }
  }

  /**
   * Estimate transaction fee
   */
  public async estimateTransactionFee(
    currency: CryptoCurrency,
    fromAddress: string,
    toAddress: string,
    amount: Decimal
  ): Promise<Decimal> {
    try {
      let fee = new Decimal(0);

      switch (currency) {
        case CryptoCurrency.BTC:
          const btcFee = await BitcoinHandler.estimateFee(
            fromAddress,
            toAddress,
            amount.toNumber()
          );
          fee = new Decimal(btcFee);
          break;
        default:
          throw new Error(`Fee estimation not supported for ${currency}`);
      }

      return fee;
    } catch (error: any) {
      this.logger.error('Failed to estimate transaction fee', {
        currency,
        fromAddress,
        toAddress,
        amount: amount.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  public async getTransactionStats(userId: string): Promise<any> {
    try {
      const stats = await CryptoTransaction.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: {
              currency: '$currency',
              status: '$status'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            totalFee: { $sum: { $toDouble: '$fee' } }
          }
        }
      ]);

      return stats;
    } catch (error: any) {
      this.logger.error('Failed to get transaction stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get total transactions count
   */
  public async getTotalTransactions(): Promise<number> {
    return await CryptoTransaction.countDocuments();
  }

  /**
   * Get pending transactions count
   */
  public async getPendingTransactions(): Promise<number> {
    return await CryptoTransaction.countDocuments({ status: TransactionStatus.PENDING });
  }

  /**
   * Get confirmed transactions count
   */
  public async getConfirmedTransactions(): Promise<number> {
    return await CryptoTransaction.countDocuments({ status: TransactionStatus.CONFIRMED });
  }

  /**
   * Get failed transactions count
   */
  public async getFailedTransactions(): Promise<number> {
    return await CryptoTransaction.countDocuments({ status: TransactionStatus.FAILED });
  }

  /**
   * Cleanup old transactions (called by scheduled task)
   */
  public async cleanupOldTransactions(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const result = await CryptoTransaction.deleteMany({
        status: { $in: [TransactionStatus.FAILED, TransactionStatus.CANCELLED] },
        createdAt: { $lt: cutoffDate }
      });

      this.logger.info('Old transactions cleanup completed', {
        deletedCount: result.deletedCount
      });
    } catch (error: any) {
      this.logger.error('Failed to cleanup old transactions', { error: error.message });
    }
  }

  /**
   * Cache transaction data
   */
  private async cacheTransaction(transaction: ICryptoTransaction): Promise<void> {
    try {
      const cacheKey = `transaction:${transaction._id}`;
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(transaction.toJSON()),
        1800 // 30 minutes TTL
      );
    } catch (error: any) {
      this.logger.warn('Failed to cache transaction', {
        transactionId: transaction._id,
        error: error.message
      });
    }
  }

  /**
   * Get cached transaction
   */
  private async getCachedTransaction(transactionId: string): Promise<ICryptoTransaction | null> {
    try {
      const cacheKey = `transaction:${transactionId}`;
      const cachedData = await this.redisClient.get(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData) as ICryptoTransaction;
      }
      
      return null;
    } catch (error: any) {
      this.logger.warn('Failed to get cached transaction', {
        transactionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.eventBus.subscribe('blockchain.transaction_confirmed', async (data) => {
      if (data.txHash) {
        const transaction = await CryptoTransaction.findOne({ txHash: data.txHash });
        if (transaction && transaction.status === TransactionStatus.PENDING) {
          await this.updateTransactionStatus(
            transaction._id.toString(),
            TransactionStatus.CONFIRMED,
            data.blockHeight,
            data.confirmations
          );
        }
      }
    });
  }

  /**
   * Initialize transaction monitoring
   */
  private async initializeTransactionMonitoring(): Promise<void> {
    // This would set up blockchain monitoring for transaction confirmations
    // Implementation would depend on specific blockchain integration
    this.logger.info('Transaction monitoring initialized');
  }
}

export default TransactionService;
