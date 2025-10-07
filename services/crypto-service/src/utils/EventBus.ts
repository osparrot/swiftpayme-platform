import { EventEmitter } from 'events';
import { Logger } from './Logger';
import { RedisClient } from './RedisClient';

export interface EventData {
  [key: string]: any;
  timestamp?: Date;
  source?: string;
  correlationId?: string;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private logger: Logger;
  private redisClient: RedisClient;
  private isRedisEnabled: boolean;

  private constructor() {
    super();
    this.logger = new Logger('EventBus');
    this.redisClient = RedisClient.getInstance();
    this.isRedisEnabled = process.env.REDIS_EVENTS_ENABLED === 'true';
    this.setMaxListeners(100); // Increase max listeners for high-throughput scenarios
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event locally and optionally to Redis for distributed systems
   */
  public async publish(eventName: string, data: EventData): Promise<void> {
    try {
      // Add metadata
      const eventData = {
        ...data,
        timestamp: data.timestamp || new Date(),
        source: data.source || 'crypto-service',
        correlationId: data.correlationId || this.generateCorrelationId()
      };

      // Emit locally
      this.emit(eventName, eventData);

      // Publish to Redis for distributed event handling
      if (this.isRedisEnabled && this.redisClient.isClientConnected()) {
        await this.publishToRedis(eventName, eventData);
      }

      this.logger.debug('Event published', {
        eventName,
        correlationId: eventData.correlationId,
        hasRedis: this.isRedisEnabled
      });

    } catch (error: any) {
      this.logger.error('Failed to publish event', {
        eventName,
        error: error.message,
        data
      });
    }
  }

  /**
   * Subscribe to an event with error handling
   */
  public subscribe(eventName: string, handler: (data: EventData) => void | Promise<void>): void {
    const wrappedHandler = async (data: EventData) => {
      try {
        await handler(data);
        this.logger.debug('Event handled successfully', {
          eventName,
          correlationId: data.correlationId
        });
      } catch (error: any) {
        this.logger.error('Event handler error', {
          eventName,
          correlationId: data.correlationId,
          error: error.message
        });
      }
    };

    this.on(eventName, wrappedHandler);

    // Also subscribe to Redis events if enabled
    if (this.isRedisEnabled) {
      this.subscribeToRedis(eventName, wrappedHandler);
    }
  }

  /**
   * Subscribe to multiple events with the same handler
   */
  public subscribeToMultiple(eventNames: string[], handler: (eventName: string, data: EventData) => void | Promise<void>): void {
    eventNames.forEach(eventName => {
      this.subscribe(eventName, (data) => handler(eventName, data));
    });
  }

  /**
   * Unsubscribe from an event
   */
  public unsubscribe(eventName: string, handler?: (data: EventData) => void): void {
    if (handler) {
      this.removeListener(eventName, handler);
    } else {
      this.removeAllListeners(eventName);
    }
  }

  /**
   * Publish event to Redis for distributed systems
   */
  private async publishToRedis(eventName: string, data: EventData): Promise<void> {
    try {
      const channel = `swiftpay:events:${eventName}`;
      const message = JSON.stringify(data);
      
      await this.redisClient.getClient().publish(channel, message);
      
      this.logger.debug('Event published to Redis', {
        channel,
        correlationId: data.correlationId
      });
    } catch (error: any) {
      this.logger.error('Failed to publish event to Redis', {
        eventName,
        error: error.message
      });
    }
  }

  /**
   * Subscribe to Redis events for distributed systems
   */
  private subscribeToRedis(eventName: string, handler: (data: EventData) => void | Promise<void>): void {
    try {
      const channel = `swiftpay:events:${eventName}`;
      const subscriber = this.redisClient.getClient().duplicate();
      
      subscriber.subscribe(channel, (err, count) => {
        if (err) {
          this.logger.error('Redis subscription error', {
            channel,
            error: err.message
          });
          return;
        }
        
        this.logger.debug('Subscribed to Redis channel', {
          channel,
          subscriptionCount: count
        });
      });

      subscriber.on('message', async (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            
            // Avoid processing our own events
            if (data.source !== 'crypto-service') {
              await handler(data);
            }
          } catch (error: any) {
            this.logger.error('Failed to process Redis event', {
              channel: receivedChannel,
              error: error.message
            });
          }
        }
      });

    } catch (error: any) {
      this.logger.error('Failed to subscribe to Redis events', {
        eventName,
        error: error.message
      });
    }
  }

  /**
   * Generate a unique correlation ID for event tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   */
  public getStats(): any {
    return {
      eventNames: this.eventNames(),
      listenerCounts: this.eventNames().reduce((acc: any, eventName) => {
        acc[eventName] = this.listenerCount(eventName);
        return acc;
      }, {}),
      maxListeners: this.getMaxListeners(),
      redisEnabled: this.isRedisEnabled,
      redisConnected: this.redisClient.isClientConnected()
    };
  }

  /**
   * Clear all event listeners (useful for testing)
   */
  public clearAll(): void {
    this.removeAllListeners();
    this.logger.info('All event listeners cleared');
  }
}

export default EventBus;
