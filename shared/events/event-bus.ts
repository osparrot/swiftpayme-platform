import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';
import { EventContracts } from '../contracts/service-contracts';

export interface EventBusConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  serviceName: string;
  retryAttempts: number;
  retryDelay: number;
}

export class EventBus extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private logger: Logger;
  private serviceName: string;
  private retryAttempts: number;
  private retryDelay: number;
  private isConnected: boolean = false;

  constructor(config: EventBusConfig) {
    super();
    this.serviceName = config.serviceName;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryDelay;
    this.logger = new Logger(`EventBus:${this.serviceName}`);

    // Create Redis connections
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  public async connect(): Promise<void> {
    try {
      await Promise.all([
        this.redis.connect(),
        this.subscriber.connect()
      ]);

      this.isConnected = true;
      this.logger.info('EventBus connected to Redis');

      // Subscribe to service-specific and global channels
      await this.subscriber.subscribe(
        'swiftpayme:events:global',
        `swiftpayme:events:${this.serviceName}`,
        'swiftpayme:events:system'
      );

      this.logger.info('EventBus subscribed to channels', {
        channels: [
          'swiftpayme:events:global',
          `swiftpayme:events:${this.serviceName}`,
          'swiftpayme:events:system'
        ]
      });

    } catch (error) {
      this.logger.error('Failed to connect EventBus to Redis', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await Promise.all([
          this.redis.disconnect(),
          this.subscriber.disconnect()
        ]);
        this.isConnected = false;
        this.logger.info('EventBus disconnected from Redis');
      }
    } catch (error) {
      this.logger.error('Error disconnecting EventBus from Redis', { error });
    }
  }

  public async publish(event: EventContracts.BaseEvent, targetService?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('EventBus is not connected');
    }

    try {
      const eventData = {
        ...event,
        source: this.serviceName,
        timestamp: new Date().toISOString()
      };

      const channel = targetService 
        ? `swiftpayme:events:${targetService}`
        : 'swiftpayme:events:global';

      await this.redis.publish(channel, JSON.stringify(eventData));

      this.logger.debug('Event published', {
        eventType: event.type,
        eventId: event.id,
        channel,
        targetService
      });

      // Emit locally as well
      this.emit(event.type, eventData);

    } catch (error) {
      this.logger.error('Failed to publish event', {
        error,
        eventType: event.type,
        eventId: event.id
      });
      throw error;
    }
  }

  public async publishWithRetry(
    event: EventContracts.BaseEvent, 
    targetService?: string
  ): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        await this.publish(event, targetService);
        return;
      } catch (error) {
        attempts++;
        
        if (attempts >= this.retryAttempts) {
          this.logger.error('Failed to publish event after all retries', {
            error,
            eventType: event.type,
            eventId: event.id,
            attempts
          });
          throw error;
        }

        this.logger.warn('Event publish failed, retrying', {
          error,
          eventType: event.type,
          eventId: event.id,
          attempt: attempts,
          maxAttempts: this.retryAttempts
        });

        await this.delay(this.retryDelay * attempts);
      }
    }
  }

  public subscribe(eventType: string, handler: (event: any) => void | Promise<void>): void {
    this.on(eventType, async (event) => {
      try {
        await handler(event);
        this.logger.debug('Event handled successfully', {
          eventType,
          eventId: event.id,
          handler: handler.name
        });
      } catch (error) {
        this.logger.error('Event handler failed', {
          error,
          eventType,
          eventId: event.id,
          handler: handler.name
        });
      }
    });

    this.logger.debug('Event handler subscribed', {
      eventType,
      handler: handler.name
    });
  }

  public unsubscribe(eventType: string, handler?: Function): void {
    if (handler) {
      this.removeListener(eventType, handler as any);
    } else {
      this.removeAllListeners(eventType);
    }

    this.logger.debug('Event handler unsubscribed', {
      eventType,
      handler: handler?.name
    });
  }

  // Convenience methods for common events
  public async publishUserEvent(event: EventContracts.UserCreatedEvent | EventContracts.UserKycUpdatedEvent): Promise<void> {
    await this.publishWithRetry(event, 'notification-service');
    await this.publishWithRetry(event, 'admin-service');
  }

  public async publishAssetEvent(
    event: EventContracts.AssetDepositCreatedEvent | 
           EventContracts.AssetDepositVerifiedEvent | 
           EventContracts.AssetDepositCreditedEvent
  ): Promise<void> {
    await this.publishWithRetry(event, 'user-service');
    await this.publishWithRetry(event, 'payment-service');
    await this.publishWithRetry(event, 'notification-service');
    await this.publishWithRetry(event, 'admin-service');
  }

  public async publishTransactionEvent(
    event: EventContracts.TransactionCreatedEvent | EventContracts.TransactionCompletedEvent
  ): Promise<void> {
    await this.publishWithRetry(event, 'user-service');
    await this.publishWithRetry(event, 'notification-service');
    await this.publishWithRetry(event, 'admin-service');
  }

  public async publishBitcoinEvent(
    event: EventContracts.BitcoinTransactionCreatedEvent | EventContracts.BitcoinTransactionConfirmedEvent
  ): Promise<void> {
    await this.publishWithRetry(event, 'user-service');
    await this.publishWithRetry(event, 'payment-service');
    await this.publishWithRetry(event, 'notification-service');
    await this.publishWithRetry(event, 'admin-service');
  }

  public async publishPriceEvent(event: EventContracts.PriceUpdateEvent): Promise<void> {
    await this.publishWithRetry(event); // Broadcast to all services
  }

  public async publishSystemAlert(event: EventContracts.SystemAlertEvent): Promise<void> {
    await this.publishWithRetry(event, 'admin-service');
    await this.publishWithRetry(event, 'notification-service');
  }

  public async publishComplianceAlert(event: EventContracts.ComplianceAlertEvent): Promise<void> {
    await this.publishWithRetry(event, 'admin-service');
    await this.publishWithRetry(event, 'notification-service');
  }

  // Event creation helpers
  public createUserCreatedEvent(data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): EventContracts.UserCreatedEvent {
    return {
      id: this.generateEventId(),
      type: 'user.created',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createUserKycUpdatedEvent(data: {
    userId: string;
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    previousStatus: string;
  }): EventContracts.UserKycUpdatedEvent {
    return {
      id: this.generateEventId(),
      type: 'user.kyc.updated',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createAssetDepositCreatedEvent(data: {
    assetDepositId: string;
    userId: string;
    assetType: string;
    estimatedValue: number;
    currency: string;
  }): EventContracts.AssetDepositCreatedEvent {
    return {
      id: this.generateEventId(),
      type: 'asset.deposit.created',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createAssetDepositVerifiedEvent(data: {
    assetDepositId: string;
    userId: string;
    finalValue: number;
    currency: string;
    verificationResults: any[];
  }): EventContracts.AssetDepositVerifiedEvent {
    return {
      id: this.generateEventId(),
      type: 'asset.deposit.verified',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createAssetDepositCreditedEvent(data: {
    assetDepositId: string;
    userId: string;
    amount: number;
    currency: string;
    transactionId: string;
  }): EventContracts.AssetDepositCreditedEvent {
    return {
      id: this.generateEventId(),
      type: 'asset.deposit.credited',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createTransactionCreatedEvent(data: {
    transactionId: string;
    userId: string;
    type: string;
    amount: number;
    currency: string;
  }): EventContracts.TransactionCreatedEvent {
    return {
      id: this.generateEventId(),
      type: 'transaction.created',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createTransactionCompletedEvent(data: {
    transactionId: string;
    userId: string;
    type: string;
    amount: number;
    currency: string;
    finalStatus: string;
  }): EventContracts.TransactionCompletedEvent {
    return {
      id: this.generateEventId(),
      type: 'transaction.completed',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createBitcoinTransactionCreatedEvent(data: {
    transactionId: string;
    userId: string;
    walletId: string;
    amount: number;
    txHash: string;
    type: 'send' | 'receive';
  }): EventContracts.BitcoinTransactionCreatedEvent {
    return {
      id: this.generateEventId(),
      type: 'bitcoin.transaction.created',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createBitcoinTransactionConfirmedEvent(data: {
    transactionId: string;
    userId: string;
    txHash: string;
    confirmations: number;
    blockHeight: number;
  }): EventContracts.BitcoinTransactionConfirmedEvent {
    return {
      id: this.generateEventId(),
      type: 'bitcoin.transaction.confirmed',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  public createPriceUpdateEvent(data: {
    asset: string;
    price: number;
    currency: string;
    change: number;
    timestamp: string;
  }): EventContracts.PriceUpdateEvent {
    return {
      id: this.generateEventId(),
      type: 'price.updated',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      data
    };
  }

  public createSystemAlertEvent(data: {
    alertId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    service: string;
  }): EventContracts.SystemAlertEvent {
    return {
      id: this.generateEventId(),
      type: 'system.alert',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      data
    };
  }

  public createComplianceAlertEvent(data: {
    alertId: string;
    type: 'aml' | 'kyc' | 'sanctions' | 'pep';
    userId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
  }): EventContracts.ComplianceAlertEvent {
    return {
      id: this.generateEventId(),
      type: 'compliance.alert',
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      userId: data.userId,
      data
    };
  }

  private setupEventHandlers(): void {
    // Redis connection events
    this.redis.on('connect', () => {
      this.logger.info('EventBus Redis publisher connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('EventBus Redis publisher error', { error });
    });

    this.subscriber.on('connect', () => {
      this.logger.info('EventBus Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('EventBus Redis subscriber error', { error });
    });

    // Message handling
    this.subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message);
        
        // Don't process events from the same service
        if (event.source === this.serviceName) {
          return;
        }

        this.logger.debug('Event received', {
          eventType: event.type,
          eventId: event.id,
          source: event.source,
          channel
        });

        // Emit the event locally
        this.emit(event.type, event);
        this.emit('*', event); // Wildcard listener

      } catch (error) {
        this.logger.error('Failed to process received event', {
          error,
          channel,
          message
        });
      }
    });
  }

  private generateEventId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public isHealthy(): boolean {
    return this.isConnected && 
           this.redis.status === 'ready' && 
           this.subscriber.status === 'ready';
  }

  public getMetrics(): any {
    return {
      connected: this.isConnected,
      publisherStatus: this.redis.status,
      subscriberStatus: this.subscriber.status,
      eventListeners: this.eventNames().length,
      maxListeners: this.getMaxListeners()
    };
  }
}

