import { CryptoHandler } from '../types';
import BitcoinCoreService from './BitcoinCoreService';
import LightningClient from './LightningClient';
import { Logger } from './Logger';
import { 
  BadRequestError, 
  InternalServerError, 
  InsufficientFundsError 
} from './Errors';
import { Counter, Gauge, Histogram } from 'prom-client';
import { FluentClient } from '@fluent-org/logger';

interface PayInvoiceResponse {
  payment_hash: string;
  payment_preimage: string;
  status: string;
  amount_msat: number;
}

interface CreateInvoiceResponse {
  payment_request: string;
  payment_hash: string;
}

interface BitcoinTransaction {
  txHash: string;
  amount: number;
  fee: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
}

// Prometheus Metrics
const bitcoinOperationCounter = new Counter({
  name: 'bitcoin_operations_total',
  help: 'Total number of Bitcoin operations',
  labelNames: ['operation', 'status', 'userId'],
});

const bitcoinTransactionLatencyHistogram = new Histogram({
  name: 'bitcoin_transaction_latency_seconds',
  help: 'Bitcoin transaction latency in seconds',
  labelNames: ['operation', 'userId'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

const bitcoinBalanceGauge = new Gauge({
  name: 'bitcoin_balance_btc',
  help: 'Bitcoin balance in BTC',
  labelNames: ['userId', 'address'],
});

const lightningLiquidityGauge = new Gauge({
  name: 'lightning_liquidity_msat',
  help: 'Lightning liquidity in millisatoshis',
  labelNames: ['userId'],
});

const fluentd = new FluentClient('bitcoin-handler', {
  socket: {
    host: process.env.FLUENTD_HOST || 'localhost',
    port: parseInt(process.env.FLUENTD_PORT || '24224'),
  },
});

export class BitcoinHandler implements CryptoHandler {
  private bitcoinClient: BitcoinCoreService;
  private lightningClient: LightningClient;
  private logger = new Logger('BitcoinHandler');

  constructor() {
    this.bitcoinClient = new BitcoinCoreService();
    this.lightningClient = LightningClient.getInstance();
    
    this.logger.info('BitcoinHandler initialized');
  }

  async createWallet(userId: string): Promise<{ address: string; walletName: string }> {
    const startTime = Date.now();
    
    try {
      const walletName = `user_${userId}`;
      
      // Ensure wallet exists
      await this.bitcoinClient.ensureDescriptorWallet(walletName);
      
      // Generate new address
      const address = await this.bitcoinClient.getNewAddress('', 'bech32');
      
      bitcoinOperationCounter.inc({ operation: 'createWallet', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'createWallet', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Bitcoin wallet created successfully', { 
        userId, 
        address, 
        walletName 
      });
      
      fluentd.emit('bitcoin.wallet.created', { 
        userId, 
        address, 
        walletName,
        timestamp: new Date().toISOString()
      });
      
      return { address, walletName };
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'createWallet', status: 'failure', userId });
      
      this.logger.error('Failed to create Bitcoin wallet', { 
        userId, 
        error: error.message 
      });
      
      fluentd.emit('bitcoin.wallet.creation_failed', { 
        userId, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw new InternalServerError('Failed to create Bitcoin wallet');
    }
  }

  async getBalance(userId: string, address: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Validate address first
      const isValid = await this.bitcoinClient.validateAddress(address);
      if (!isValid.isvalid) {
        throw new BadRequestError('Invalid Bitcoin address');
      }

      const walletName = `user_${userId}`;
      
      // Get unspent outputs for the address
      const unspent = await this.bitcoinClient.listUnspent(1, 9999999, [address]);
      const balance = unspent.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
      
      bitcoinBalanceGauge.set({ userId, address }, balance);
      bitcoinOperationCounter.inc({ operation: 'getBalance', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'getBalance', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Retrieved Bitcoin balance', { 
        userId, 
        address, 
        balance 
      });
      
      return balance;
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'getBalance', status: 'failure', userId });
      
      this.logger.error('Failed to get Bitcoin balance', { 
        userId, 
        address, 
        error: error.message 
      });
      
      if (error instanceof BadRequestError) {
        throw error;
      }
      
      throw new InternalServerError('Failed to retrieve Bitcoin balance');
    }
  }

  async sendTransaction(
    userId: string, 
    fromAddress: string, 
    toAddress: string, 
    amount: number
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Validate addresses
      const [fromValid, toValid] = await Promise.all([
        this.bitcoinClient.validateAddress(fromAddress),
        this.bitcoinClient.validateAddress(toAddress)
      ]);
      
      if (!fromValid.isvalid || !toValid.isvalid) {
        throw new BadRequestError('Invalid Bitcoin address');
      }
      
      if (amount <= 0) {
        throw new BadRequestError('Amount must be positive');
      }

      const walletName = `user_${userId}`;
      
      // Get unspent outputs
      const unspent = await this.bitcoinClient.listUnspent(1, 9999999, [fromAddress]);
      if (!unspent.length) {
        throw new InsufficientFundsError('No unspent outputs available');
      }

      // Select UTXOs
      let totalInput = 0;
      const inputs = [];
      for (const utxo of unspent) {
        inputs.push({ txid: utxo.txid, vout: utxo.vout });
        totalInput += utxo.amount;
        if (totalInput >= amount + 0.0001) break; // Include minimum fee
      }

      if (totalInput < amount + 0.0001) {
        throw new InsufficientFundsError(
          `Insufficient funds: available ${totalInput}, required ${amount + 0.0001}`
        );
      }

      // Estimate fee
      const feeEstimate = await this.bitcoinClient.estimateSmartFee(6);
      const feeRate = feeEstimate.feerate || 0.0001;
      const txSize = inputs.length * 180 + 34 * 2 + 10; // Approximate vbytes
      const fee = (feeRate * txSize) / 100000000; // Convert sat/vbyte to BTC
      
      // Create outputs
      const outputs: { [key: string]: number } = { 
        [toAddress]: Number(amount.toFixed(8)) 
      };
      
      const change = totalInput - amount - fee;
      if (change > 0.00001) {
        outputs[fromAddress] = Number(change.toFixed(8));
      }

      // Create, sign, and broadcast transaction
      const rawTx = await this.bitcoinClient.createRawTransaction(inputs, outputs);
      const signedTx = await this.bitcoinClient.signRawTransactionWithKey(
        rawTx, 
        unspent, 
        [] // Private keys would be managed securely
      );
      
      if (!signedTx.complete) {
        throw new InternalServerError('Transaction signing incomplete');
      }
      
      const txHash = await this.bitcoinClient.sendRawTransaction(signedTx.hex);

      bitcoinOperationCounter.inc({ operation: 'sendTransaction', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'sendTransaction', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Bitcoin transaction sent successfully', { 
        userId, 
        fromAddress, 
        toAddress, 
        amount, 
        txHash,
        fee
      });
      
      fluentd.emit('bitcoin.transaction.sent', { 
        userId, 
        fromAddress, 
        toAddress, 
        amount, 
        txHash,
        fee,
        timestamp: new Date().toISOString()
      });
      
      return txHash;
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'sendTransaction', status: 'failure', userId });
      
      this.logger.error('Failed to send Bitcoin transaction', {
        userId,
        fromAddress,
        toAddress,
        amount,
        error: error.message,
      });
      
      fluentd.emit('bitcoin.transaction.send_failed', {
        userId,
        fromAddress,
        toAddress,
        amount,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof BadRequestError || error instanceof InsufficientFundsError) {
        throw error;
      }
      
      throw new InternalServerError('Failed to send Bitcoin transaction');
    }
  }

  async createLightningInvoice(
    userId: string, 
    amount_msat: number, 
    memo?: string
  ): Promise<CreateInvoiceResponse> {
    const startTime = Date.now();
    
    try {
      if (amount_msat <= 0) {
        throw new BadRequestError('Amount must be positive');
      }

      const invoice = await this.lightningClient.createInvoice(userId, amount_msat, memo);
      
      bitcoinOperationCounter.inc({ operation: 'createLightningInvoice', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'createLightningInvoice', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Lightning invoice created successfully', { 
        userId, 
        amount_msat, 
        payment_hash: invoice.payment_hash 
      });
      
      fluentd.emit('lightning.invoice.created', { 
        userId, 
        amount_msat, 
        payment_hash: invoice.payment_hash,
        memo,
        timestamp: new Date().toISOString()
      });
      
      return invoice;
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'createLightningInvoice', status: 'failure', userId });
      
      this.logger.error('Failed to create Lightning invoice', { 
        userId, 
        amount_msat, 
        error: error.message 
      });
      
      fluentd.emit('lightning.invoice.creation_failed', { 
        userId, 
        amount_msat, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof BadRequestError) {
        throw error;
      }
      
      throw new InternalServerError('Failed to create Lightning invoice');
    }
  }

  async payLightningInvoice(
    userId: string, 
    invoice: string, 
    amount_msat?: number
  ): Promise<PayInvoiceResponse> {
    const startTime = Date.now();
    
    try {
      if (!invoice) {
        throw new BadRequestError('Invoice is required');
      }

      const response = await this.lightningClient.payInvoice(userId, invoice, amount_msat);
      
      bitcoinOperationCounter.inc({ operation: 'payLightningInvoice', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'payLightningInvoice', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Lightning invoice paid successfully', { 
        userId, 
        payment_hash: response.payment_hash, 
        amount_msat: response.amount_msat 
      });
      
      fluentd.emit('lightning.payment.completed', { 
        userId, 
        payment_hash: response.payment_hash, 
        amount_msat: response.amount_msat,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'payLightningInvoice', status: 'failure', userId });
      
      this.logger.error('Failed to pay Lightning invoice', { 
        userId, 
        invoice, 
        amount_msat, 
        error: error.message 
      });
      
      fluentd.emit('lightning.payment.failed', { 
        userId, 
        invoice, 
        amount_msat, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof BadRequestError) {
        throw error;
      }
      
      throw new InternalServerError('Failed to pay Lightning invoice');
    }
  }

  async getLightningLiquidity(userId: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const liquidity_msat = await this.lightningClient.getLiquidity();
      
      lightningLiquidityGauge.set({ userId }, liquidity_msat);
      bitcoinOperationCounter.inc({ operation: 'getLightningLiquidity', status: 'success', userId });
      bitcoinTransactionLatencyHistogram.observe(
        { operation: 'getLightningLiquidity', userId }, 
        (Date.now() - startTime) / 1000
      );
      
      this.logger.info('Retrieved Lightning liquidity', { 
        userId, 
        liquidity_msat 
      });
      
      return liquidity_msat;
    } catch (error: any) {
      bitcoinOperationCounter.inc({ operation: 'getLightningLiquidity', status: 'failure', userId });
      
      this.logger.error('Failed to get Lightning liquidity', { 
        userId, 
        error: error.message 
      });
      
      throw new InternalServerError('Failed to retrieve Lightning liquidity');
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      const result = await this.bitcoinClient.validateAddress(address);
      const isValid = result.isvalid || false;
      
      this.logger.debug('Validated Bitcoin address', { 
        address, 
        isValid 
      });
      
      return isValid;
    } catch (error: any) {
      this.logger.error('Failed to validate Bitcoin address', { 
        address, 
        error: error.message 
      });
      
      throw new InternalServerError('Failed to validate Bitcoin address');
    }
  }

  async getTransactionHistory(userId: string, address?: string): Promise<BitcoinTransaction[]> {
    try {
      const walletName = `user_${userId}`;
      
      // This would typically involve querying the wallet's transaction history
      // For now, return empty array as placeholder
      const transactions: BitcoinTransaction[] = [];
      
      this.logger.info('Retrieved Bitcoin transaction history', { 
        userId, 
        address, 
        count: transactions.length 
      });
      
      return transactions;
    } catch (error: any) {
      this.logger.error('Failed to get Bitcoin transaction history', { 
        userId, 
        address, 
        error: error.message 
      });
      
      throw new InternalServerError('Failed to retrieve transaction history');
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const [bitcoinHealth, lightningHealth] = await Promise.all([
        this.bitcoinClient.healthCheck(),
        this.lightningClient.healthCheck()
      ]);

      const overallStatus = bitcoinHealth.status === 'healthy' && lightningHealth.status === 'healthy' 
        ? 'healthy' 
        : 'degraded';

      return {
        status: overallStatus,
        details: {
          bitcoin: bitcoinHealth,
          lightning: lightningHealth,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      this.logger.error('Bitcoin handler health check failed', { 
        error: error.message 
      });
      
      return {
        status: 'unhealthy',
        details: { 
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

export default new BitcoinHandler();

