import Redis from 'ioredis';
import { Logger } from './Logger';

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('RedisClient');
    
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    };

    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis connection established');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', { error: error.message });
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.info('Redis client connected successfully');
    } catch (error: any) {
      this.logger.error('Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      this.logger.info('Redis client disconnected');
    } catch (error: any) {
      this.logger.error('Error disconnecting from Redis', { error: error.message });
    }
  }

  public async ping(): Promise<string> {
    return await this.client.ping();
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error: any) {
      this.logger.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    try {
      if (ttl) {
        return await this.client.setex(key, ttl, value);
      }
      return await this.client.set(key, value);
    } catch (error: any) {
      this.logger.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error: any) {
      this.logger.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error: any) {
      this.logger.error('Redis EXISTS error', { key, error: error.message });
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error: any) {
      this.logger.error('Redis EXPIRE error', { key, seconds, error: error.message });
      throw error;
    }
  }

  public async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error: any) {
      this.logger.error('Redis HGET error', { key, field, error: error.message });
      throw error;
    }
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hset(key, field, value);
    } catch (error: any) {
      this.logger.error('Redis HSET error', { key, field, error: error.message });
      throw error;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error: any) {
      this.logger.error('Redis HGETALL error', { key, error: error.message });
      throw error;
    }
  }

  public async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.client.lpush(key, ...values);
    } catch (error: any) {
      this.logger.error('Redis LPUSH error', { key, error: error.message });
      throw error;
    }
  }

  public async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rpop(key);
    } catch (error: any) {
      this.logger.error('Redis RPOP error', { key, error: error.message });
      throw error;
    }
  }

  public async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error: any) {
      this.logger.error('Redis LLEN error', { key, error: error.message });
      throw error;
    }
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error: any) {
      this.logger.error('Redis SADD error', { key, error: error.message });
      throw error;
    }
  }

  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error: any) {
      this.logger.error('Redis SMEMBERS error', { key, error: error.message });
      throw error;
    }
  }

  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error: any) {
      this.logger.error('Redis INCR error', { key, error: error.message });
      throw error;
    }
  }

  public async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error: any) {
      this.logger.error('Redis DECR error', { key, error: error.message });
      throw error;
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  public isClientConnected(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }
}

export default RedisClient;
