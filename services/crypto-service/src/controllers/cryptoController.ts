import { Request, Response, NextFunction } from 'express';
import { Decimal } from 'decimal.js';
import { Logger } from '../utils/Logger';
import { 
  ValidationError, 
  NotFoundError, 
  InternalServerError, 
  BadRequestError,
  InsufficientFundsError 
} from '../utils/Errors';
import { 
  CryptoCurrency, 
  TransactionType, 
  TransactionStatus,
  WalletType,
  NetworkType 
} from '../enums/cryptoEnums';
import { 
  AuthenticatedRequest,
  CreateWalletRequest,
  CreateWalletResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  SendTransactionRequest,
  SendTransactionResponse,
  CreateLightningInvoiceRequest,
  CreateLightningInvoiceResponse,
  PayLightningInvoiceRequest,
  PayLightningInvoiceResponse,
  ValidateAddressRequest,
  ValidateAddressResponse,
  ListTransactionsRequest,
  ListTransactionsResponse,
  EstimateFeeRequest,
  EstimateFeeResponse
} from '../types';
import { CryptoWallet } from '../models/CryptoWallet';
import { CryptoTransaction } from '../models/CryptoTransaction';
import BitcoinHandler from '../utils/BitcoinHandler';
import { EventBus } from '../utils/EventBus';
import { Counter, Histogram, Gauge } from 'prom-client';

// Prometheus Metrics
const cryptoRequestsCounter = new Counter({
  name: 'crypto_requests_total',
  help: 'Total number of crypto service requests',
  labelNames: ['endpoint', 'status', 'currency'],
});

const cryptoLatencyHistogram = new Histogram({
  name: 'crypto_request_latency_seconds',
  help: 'Crypto service request latency in seconds',
  labelNames: ['endpoint', 'currency'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const activeWalletsGauge = new Gauge({
  name: 'crypto_active_wallets_total',
  help: 'Total number of active crypto wallets',
  labelNames: ['currency', 'type'],
});

const totalBalanceGauge = new Gauge({
  name: 'crypto_total_balance',
  help: 'Total balance across all wallets',
  labelNames: ['currency'],
});

export class CryptoController {
  private readonly logger = new Logger('CryptoController');
  private readonly eventBus = EventBus.getInstance();
  private readonly bitcoinHandler = BitcoinHandler;

  /**
   * Create a new crypto wallet
   * POST /api/crypto/wallets
   */
  async createWallet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'createWallet';
    
    try {
      const { currency, type, label }: CreateWalletRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!currency || !Object.values(CryptoCurrency).includes(currency)) {
        throw new ValidationError('Valid currency is required');
      }

      // Check if user already has a wallet for this currency
      const existingWallet = await CryptoWallet.findOne({ 
        userId, 
        currency, 
        isActive: true 
      });

      if (existingWallet) {
        throw new ValidationError(`Wallet for ${currency} already exists`);
      }

      let walletResult: { address: string; walletName: string };

      // Create wallet based on currency type
      switch (currency) {
        case CryptoCurrency.BTC:
          walletResult = await this.bitcoinHandler.createWallet(userId);
          break;
        default:
          throw new ValidationError(`Currency ${currency} not supported yet`);
      }

      // Create wallet record in database
      const wallet = new CryptoWallet({
        userId,
        currency,
        walletName: walletResult.walletName,
        type: type || WalletType.HOT,
        network: NetworkType.MAINNET,
        isActive: true
      });

      // Add the initial address
      wallet.addAddress({
        address: walletResult.address,
        label: label || 'Primary Address'
      });

      await wallet.save();

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency });
      activeWalletsGauge.inc({ currency, type: wallet.type });

      // Emit wallet created event
      this.eventBus.publish('crypto.wallet_created', {
        userId,
        walletId: wallet._id,
        currency,
        address: walletResult.address,
        timestamp: new Date()
      });

      const response: CreateWalletResponse = {
        walletId: wallet._id.toString(),
        address: walletResult.address,
        walletName: walletResult.walletName,
        currency,
        type: wallet.type
      };

      this.logger.info('Crypto wallet created successfully', {
        userId,
        currency,
        walletId: wallet._id,
        address: walletResult.address,
        requestId: req.requestId
      });

      res.status(201).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: req.body.currency || 'unknown' });
      this.logger.error('Failed to create crypto wallet', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe(
        { endpoint, currency: req.body.currency || 'unknown' }, 
        (Date.now() - startTime) / 1000
      );
    }
  }

  /**
   * Get wallet balance
   * GET /api/crypto/wallets/:walletId/balance
   */
  async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'getBalance';
    
    try {
      const { walletId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const wallet = await CryptoWallet.findOne({ 
        _id: walletId, 
        userId, 
        isActive: true 
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      let balance = new Decimal(0);
      let confirmedBalance = new Decimal(0);
      let unconfirmedBalance = new Decimal(0);

      // Get balance from blockchain
      switch (wallet.currency) {
        case CryptoCurrency.BTC:
          const primaryAddress = wallet.addresses[0]?.address;
          if (primaryAddress) {
            const blockchainBalance = await this.bitcoinHandler.getBalance(userId, primaryAddress);
            balance = new Decimal(blockchainBalance);
            confirmedBalance = balance; // For simplicity, treating all as confirmed
          }
          break;
        default:
          throw new ValidationError(`Currency ${wallet.currency} not supported yet`);
      }

      // Update wallet balance
      wallet.updateBalance(balance);
      wallet.confirmedBalance = confirmedBalance;
      wallet.unconfirmedBalance = unconfirmedBalance;
      await wallet.save();

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency: wallet.currency });
      totalBalanceGauge.set({ currency: wallet.currency }, balance.toNumber());

      const response: GetBalanceResponse = {
        balance: balance.toString(),
        confirmedBalance: confirmedBalance.toString(),
        unconfirmedBalance: unconfirmedBalance.toString(),
        currency: wallet.currency
      };

      this.logger.info('Wallet balance retrieved', {
        userId,
        walletId,
        currency: wallet.currency,
        balance: balance.toString(),
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: 'unknown' });
      this.logger.error('Failed to get wallet balance', {
        error: error.message,
        requestId: req.requestId,
        params: req.params
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe({ endpoint, currency: 'unknown' }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Send transaction
   * POST /api/crypto/transactions/send
   */
  async sendTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'sendTransaction';
    
    try {
      const { 
        currency, 
        fromAddress, 
        toAddress, 
        amount, 
        memo 
      }: SendTransactionRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!currency || !fromAddress || !toAddress || !amount) {
        throw new BadRequestError('Missing required fields');
      }

      if (!Object.values(CryptoCurrency).includes(currency)) {
        throw new ValidationError('Invalid currency');
      }

      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lte(0)) {
        throw new ValidationError('Amount must be positive');
      }

      // Find wallet
      const wallet = await CryptoWallet.findOne({ 
        userId, 
        currency, 
        'addresses.address': fromAddress,
        isActive: true 
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found for the specified address');
      }

      let txHash: string;
      let fee = new Decimal(0);

      // Send transaction based on currency
      switch (currency) {
        case CryptoCurrency.BTC:
          txHash = await this.bitcoinHandler.sendTransaction(
            userId, 
            fromAddress, 
            toAddress, 
            amountDecimal.toNumber()
          );
          fee = new Decimal(0.0001); // Estimated fee
          break;
        default:
          throw new ValidationError(`Currency ${currency} not supported yet`);
      }

      // Create transaction record
      const transaction = new CryptoTransaction({
        userId,
        walletId: wallet._id,
        currency,
        type: TransactionType.SEND,
        amount: amountDecimal,
        fee,
        fromAddress,
        toAddress,
        txHash,
        status: TransactionStatus.PENDING,
        memo
      });

      await transaction.save();

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency });

      // Emit transaction event
      this.eventBus.publish('crypto.transaction_created', {
        userId,
        transactionId: transaction._id,
        txHash,
        amount: amountDecimal.toString(),
        currency,
        type: TransactionType.SEND,
        timestamp: new Date()
      });

      const response: SendTransactionResponse = {
        txHash,
        amount: amountDecimal.toString(),
        fee: fee.toString(),
        status: TransactionStatus.PENDING
      };

      this.logger.info('Transaction sent successfully', {
        userId,
        currency,
        txHash,
        amount: amountDecimal.toString(),
        fromAddress,
        toAddress,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: req.body.currency || 'unknown' });
      this.logger.error('Failed to send transaction', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe(
        { endpoint, currency: req.body.currency || 'unknown' }, 
        (Date.now() - startTime) / 1000
      );
    }
  }

  /**
   * Create Lightning invoice
   * POST /api/crypto/lightning/invoices
   */
  async createLightningInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'createLightningInvoice';
    
    try {
      const { amount, memo, expirySeconds }: CreateLightningInvoiceRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!amount) {
        throw new BadRequestError('Amount is required');
      }

      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lte(0)) {
        throw new ValidationError('Amount must be positive');
      }

      // Convert to millisatoshis
      const amountMsat = amountDecimal.mul(1000).toNumber();

      const invoice = await this.bitcoinHandler.createLightningInvoice(
        userId, 
        amountMsat, 
        memo
      );

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency: 'BTC' });

      const response: CreateLightningInvoiceResponse = {
        paymentRequest: invoice.payment_request,
        paymentHash: invoice.payment_hash,
        amount: amountDecimal.toString(),
        expiresAt: new Date(Date.now() + (expirySeconds || 3600) * 1000).toISOString()
      };

      this.logger.info('Lightning invoice created', {
        userId,
        paymentHash: invoice.payment_hash,
        amount: amountDecimal.toString(),
        requestId: req.requestId
      });

      res.status(201).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: 'BTC' });
      this.logger.error('Failed to create Lightning invoice', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe({ endpoint, currency: 'BTC' }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Pay Lightning invoice
   * POST /api/crypto/lightning/pay
   */
  async payLightningInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'payLightningInvoice';
    
    try {
      const { invoice, amount }: PayLightningInvoiceRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!invoice) {
        throw new BadRequestError('Invoice is required');
      }

      let amountMsat: number | undefined;
      if (amount) {
        const amountDecimal = new Decimal(amount);
        amountMsat = amountDecimal.mul(1000).toNumber();
      }

      const payment = await this.bitcoinHandler.payLightningInvoice(
        userId, 
        invoice, 
        amountMsat
      );

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency: 'BTC' });

      const response: PayLightningInvoiceResponse = {
        paymentHash: payment.payment_hash,
        paymentPreimage: payment.payment_preimage,
        amount: new Decimal(payment.amount_msat).div(1000).toString(),
        fee: '0', // Lightning fees are typically very small
        status: payment.status
      };

      this.logger.info('Lightning invoice paid', {
        userId,
        paymentHash: payment.payment_hash,
        amount: response.amount,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: 'BTC' });
      this.logger.error('Failed to pay Lightning invoice', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe({ endpoint, currency: 'BTC' }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Validate address
   * POST /api/crypto/validate-address
   */
  async validateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'validateAddress';
    
    try {
      const { address, currency }: ValidateAddressRequest = req.body;

      if (!address || !currency) {
        throw new BadRequestError('Address and currency are required');
      }

      if (!Object.values(CryptoCurrency).includes(currency)) {
        throw new ValidationError('Invalid currency');
      }

      let isValid = false;

      switch (currency) {
        case CryptoCurrency.BTC:
          isValid = await this.bitcoinHandler.validateAddress(address);
          break;
        default:
          throw new ValidationError(`Currency ${currency} not supported yet`);
      }

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency });

      const response: ValidateAddressResponse = {
        isValid,
        address,
        currency
      };

      this.logger.info('Address validated', {
        address,
        currency,
        isValid,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: response,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: req.body.currency || 'unknown' });
      this.logger.error('Failed to validate address', {
        error: error.message,
        requestId: req.requestId,
        body: req.body
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe(
        { endpoint, currency: req.body.currency || 'unknown' }, 
        (Date.now() - startTime) / 1000
      );
    }
  }

  /**
   * List user wallets
   * GET /api/crypto/wallets
   */
  async listWallets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'listWallets';
    
    try {
      const userId = req.user?.id;
      const { currency } = req.query;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const wallets = await CryptoWallet.findByUserId(
        userId, 
        currency as CryptoCurrency
      );

      // Update metrics
      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency: currency as string || 'all' });

      this.logger.info('Wallets listed', {
        userId,
        count: wallets.length,
        currency: currency || 'all',
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        data: wallets,
        count: wallets.length,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: 'unknown' });
      this.logger.error('Failed to list wallets', {
        error: error.message,
        requestId: req.requestId,
        query: req.query
      });
      next(error);
    } finally {
      cryptoLatencyHistogram.observe({ endpoint, currency: 'unknown' }, (Date.now() - startTime) / 1000);
    }
  }

  /**
   * Health check endpoint
   * GET /api/crypto/health
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const endpoint = 'healthCheck';
    
    try {
      const bitcoinHealth = await this.bitcoinHandler.healthCheck();
      
      const overallStatus = bitcoinHealth.status === 'healthy' ? 'healthy' : 'degraded';

      cryptoRequestsCounter.inc({ endpoint, status: 'success', currency: 'all' });

      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        success: true,
        status: overallStatus,
        data: {
          bitcoin: bitcoinHealth,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0'
        }
      });

    } catch (error: any) {
      cryptoRequestsCounter.inc({ endpoint, status: 'error', currency: 'all' });
      this.logger.error('Health check failed', {
        error: error.message
      });
      
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      cryptoLatencyHistogram.observe({ endpoint, currency: 'all' }, (Date.now() - startTime) / 1000);
    }
  }
}

export default new CryptoController();

