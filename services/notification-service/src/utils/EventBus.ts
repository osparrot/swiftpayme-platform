/**
 * SwiftPayMe Notification Service - Event Bus Utility
 * Redis-based event bus for inter-service communication
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { INotificationEvent, EventType, NotificationType } from '../types/notificationTypes';

class NotificationEventBus extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
    this.publisher = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.subscriber.on('connect', () => {
      this.isConnected = true;
      console.log('Event bus connected to Redis');
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);
        this.emit('notification:event', event);
      } catch (error) {
        console.error('Error parsing event message:', error);
      }
    });

    // Subscribe to notification events
    this.subscriber.subscribe('swiftpayme:notifications');
  }

  async publishEvent(event: INotificationEvent): Promise<void> {
    await this.publisher.publish('swiftpayme:notifications', JSON.stringify(event));
  }

  async close(): Promise<void> {
    await this.redis.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}

export default new NotificationEventBus();

