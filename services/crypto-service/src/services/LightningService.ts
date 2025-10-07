import { Logger } from '../utils/Logger';
import { EventBus } from '../utils/EventBus';
import { RedisClient } from '../utils/RedisClient';
import { LightningClient } from '../utils/LightningClient';

export class LightningService {
  private logger: Logger;
  private eventBus: EventBus;
  private redisClient: RedisClient;
  private lightningClient: LightningClient;
  private isInitialized: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    this.logger = new Logger('LightningService');
    this.eventBus = EventBus.getInstance();
    this.redisClient = RedisClient.getInstance();
    this.lightningClient = new LightningClient();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing LightningService...');
      
      // Check if Lightning Network is enabled
      if (process.env.LIGHTNING_ENABLED !== 'true') {
        this.logger.info('Lightning Network is disabled');
        this.isInitialized = true;
        return;
      }

      // Initialize Lightning client
      await this.lightningClient.initialize();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Check connection
      await this.checkConnection();
      
      this.isInitialized = true;
      this.logger.info('LightningService initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize LightningService', { error: error.message });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('Stopping LightningService...');
      
      if (this.lightningClient) {
        await this.lightningClient.disconnect();
      }
      
      this.isInitialized = false;
      this.isConnected = false;
      this.logger.info('LightningService stopped');
    } catch (error: any) {
      this.logger.error('Error stopping LightningService', { error: error.message });
    }
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  public async isConnected(): Promise<boolean> {
    if (!this.isInitialized || process.env.LIGHTNING_ENABLED !== 'true') {
      return false;
    }

    try {
      return await this.lightningClient.isConnected();
    } catch (error: any) {
      this.logger.error('Failed to check Lightning connection', { error: error.message });
      return false;
    }
  }

  public async isReady(): Promise<boolean> {
    if (!this.isInitialized || process.env.LIGHTNING_ENABLED !== 'true') {
      return false;
    }

    try {
      return await this.lightningClient.isReady();
    } catch (error: any) {
      this.logger.error('Failed to check Lightning readiness', { error: error.message });
      return false;
    }
  }

  /**
   * Check network status
   */
  public async checkNetworkStatus(): Promise<void> {
    if (!this.isInitialized || process.env.LIGHTNING_ENABLED !== 'true') {
      return;
    }

    try {
      const info = await this.lightningClient.getInfo();
      
      this.logger.debug('Lightning network status', {
        alias: info.alias,
        blockHeight: info.block_height,
        synced: info.synced_to_chain,
        channels: info.num_active_channels,
        peers: info.num_peers
      });

      // Update connection status
      this.isConnected = info.synced_to_chain;

      // Cache network info
      await this.cacheNetworkInfo(info);

    } catch (error: any) {
      this.logger.error('Failed to check Lightning network status', { error: error.message });
      this.isConnected = false;
    }
  }

  /**
   * Create Lightning invoice
   */
  public async createInvoice(
    userId: string,
    amountMsat: number,
    memo?: string,
    expirySeconds?: number
  ): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      const invoice = await this.lightningClient.createInvoice({
        value_msat: amountMsat,
        memo: memo || '',
        expiry: expirySeconds || 3600
      });

      // Cache invoice
      await this.cacheInvoice(invoice.payment_hash, {
        userId,
        paymentRequest: invoice.payment_request,
        paymentHash: invoice.payment_hash,
        amountMsat,
        memo,
        createdAt: new Date()
      });

      // Emit invoice created event
      await this.eventBus.publish('lightning.invoice_created', {
        userId,
        paymentHash: invoice.payment_hash,
        paymentRequest: invoice.payment_request,
        amountMsat
      });

      this.logger.info('Lightning invoice created', {
        userId,
        paymentHash: invoice.payment_hash,
        amountMsat
      });

      return invoice;
    } catch (error: any) {
      this.logger.error('Failed to create Lightning invoice', {
        userId,
        amountMsat,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Pay Lightning invoice
   */
  public async payInvoice(
    userId: string,
    paymentRequest: string,
    amountMsat?: number
  ): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      // Decode invoice first
      const decodedInvoice = await this.lightningClient.decodeInvoice(paymentRequest);
      
      // Validate amount if specified
      if (amountMsat && decodedInvoice.num_msat && 
          parseInt(decodedInvoice.num_msat) !== amountMsat) {
        throw new Error('Amount mismatch');
      }

      const payment = await this.lightningClient.payInvoice({
        payment_request: paymentRequest,
        amt_msat: amountMsat
      });

      // Emit payment sent event
      await this.eventBus.publish('lightning.payment_sent', {
        userId,
        paymentHash: payment.payment_hash,
        paymentPreimage: payment.payment_preimage,
        amountMsat: amountMsat || parseInt(decodedInvoice.num_msat || '0'),
        feeMsat: payment.fee_msat
      });

      this.logger.info('Lightning payment sent', {
        userId,
        paymentHash: payment.payment_hash,
        amountMsat: amountMsat || decodedInvoice.num_msat
      });

      return payment;
    } catch (error: any) {
      this.logger.error('Failed to pay Lightning invoice', {
        userId,
        paymentRequest,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Lightning balance
   */
  public async getBalance(userId: string): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      const balance = await this.lightningClient.getBalance();

      this.logger.debug('Lightning balance retrieved', {
        userId,
        balance: balance.balance,
        pendingOpenBalance: balance.pending_open_balance
      });

      return balance;
    } catch (error: any) {
      this.logger.error('Failed to get Lightning balance', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Lightning channels
   */
  public async getChannels(userId: string): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      const channels = await this.lightningClient.getChannels();

      this.logger.debug('Lightning channels retrieved', {
        userId,
        channelCount: channels.channels?.length || 0
      });

      return channels;
    } catch (error: any) {
      this.logger.error('Failed to get Lightning channels', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Open Lightning channel
   */
  public async openChannel(
    userId: string,
    nodePubkey: string,
    localFundingAmount: number,
    pushSat?: number
  ): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      const channel = await this.lightningClient.openChannel({
        node_pubkey: nodePubkey,
        local_funding_amount: localFundingAmount,
        push_sat: pushSat || 0
      });

      // Emit channel opened event
      await this.eventBus.publish('lightning.channel_opened', {
        userId,
        channelId: channel.funding_txid,
        nodePubkey,
        localFundingAmount,
        pushSat
      });

      this.logger.info('Lightning channel opened', {
        userId,
        channelId: channel.funding_txid,
        nodePubkey,
        localFundingAmount
      });

      return channel;
    } catch (error: any) {
      this.logger.error('Failed to open Lightning channel', {
        userId,
        nodePubkey,
        localFundingAmount,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Close Lightning channel
   */
  public async closeChannel(
    userId: string,
    channelId: string,
    force?: boolean
  ): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Lightning Network not connected');
      }

      const result = await this.lightningClient.closeChannel({
        channel_id: channelId,
        force: force || false
      });

      // Emit channel closed event
      await this.eventBus.publish('lightning.channel_closed', {
        userId,
        channelId,
        force: force || false
      });

      this.logger.info('Lightning channel closed', {
        userId,
        channelId,
        force: force || false
      });

      return result;
    } catch (error: any) {
      this.logger.error('Failed to close Lightning channel', {
        userId,
        channelId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get channel count
   */
  public async getChannelCount(): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const channels = await this.lightningClient.getChannels();
      return channels.channels?.length || 0;
    } catch (error: any) {
      this.logger.error('Failed to get channel count', { error: error.message });
      return 0;
    }
  }

  /**
   * Get total capacity
   */
  public async getTotalCapacity(): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const channels = await this.lightningClient.getChannels();
      return channels.channels?.reduce((total: number, channel: any) => {
        return total + parseInt(channel.capacity || '0');
      }, 0) || 0;
    } catch (error: any) {
      this.logger.error('Failed to get total capacity', { error: error.message });
      return 0;
    }
  }

  /**
   * Get payment count
   */
  public async getPaymentCount(): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const payments = await this.lightningClient.getPayments();
      return payments.payments?.length || 0;
    } catch (error: any) {
      this.logger.error('Failed to get payment count', { error: error.message });
      return 0;
    }
  }

  /**
   * Check connection
   */
  private async checkConnection(): Promise<void> {
    try {
      const info = await this.lightningClient.getInfo();
      this.isConnected = info.synced_to_chain;
      
      this.logger.info('Lightning connection established', {
        alias: info.alias,
        synced: info.synced_to_chain
      });
    } catch (error: any) {
      this.logger.warn('Lightning connection check failed', { error: error.message });
      this.isConnected = false;
    }
  }

  /**
   * Cache network info
   */
  private async cacheNetworkInfo(info: any): Promise<void> {
    try {
      const cacheKey = 'lightning:network_info';
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(info),
        300 // 5 minutes TTL
      );
    } catch (error: any) {
      this.logger.warn('Failed to cache Lightning network info', { error: error.message });
    }
  }

  /**
   * Cache invoice
   */
  private async cacheInvoice(paymentHash: string, invoiceData: any): Promise<void> {
    try {
      const cacheKey = `lightning:invoice:${paymentHash}`;
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(invoiceData),
        3600 // 1 hour TTL
      );
    } catch (error: any) {
      this.logger.warn('Failed to cache Lightning invoice', {
        paymentHash,
        error: error.message
      });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for Bitcoin confirmations that might affect Lightning channels
    this.eventBus.subscribe('bitcoin.block_confirmed', async (data) => {
      // Handle channel confirmations, etc.
      this.logger.debug('Bitcoin block confirmed, checking Lightning channels', {
        blockHeight: data.blockHeight
      });
    });
  }
}

export default LightningService;
