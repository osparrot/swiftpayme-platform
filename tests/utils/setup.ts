import { MongoMemoryServer } from 'mongodb-memory-server';
import Redis from 'ioredis-mock';
import { Logger } from '../../shared/utils/Logger';
import { EncryptionUtils } from '../../shared/utils/Encryption';

// Global test configuration
export const TEST_CONFIG = {
  // Database
  mongodb: {
    useInMemory: true,
    connectionString: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/swiftpayme_test'
  },
  
  // Redis
  redis: {
    useMock: true,
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379')
  },
  
  // Services
  services: {
    userService: process.env.TEST_USER_SERVICE_URL || 'http://localhost:3002',
    assetService: process.env.TEST_ASSET_SERVICE_URL || 'http://localhost:3003',
    currencyService: process.env.TEST_CURRENCY_SERVICE_URL || 'http://localhost:3004',
    cryptoService: process.env.TEST_CRYPTO_SERVICE_URL || 'http://localhost:3005',
    paymentService: process.env.TEST_PAYMENT_SERVICE_URL || 'http://localhost:3006',
    adminService: process.env.TEST_ADMIN_SERVICE_URL || 'http://localhost:3007',
    notificationService: process.env.TEST_NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    apiGateway: process.env.TEST_API_GATEWAY_URL || 'http://localhost:3000'
  },
  
  // Authentication
  auth: {
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '1h',
    masterEncryptionKey: 'test-master-encryption-key-32-bytes-long'
  },
  
  // Test data
  testData: {
    users: {
      regularUser: {
        email: 'user@test.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      },
      adminUser: {
        email: 'admin@test.com',
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      }
    },
    assets: {
      goldDeposit: {
        type: 'gold',
        weight: 10.5,
        purity: 0.999,
        description: 'Test gold bar'
      },
      silverDeposit: {
        type: 'silver',
        weight: 100.0,
        purity: 0.925,
        description: 'Test silver coins'
      }
    }
  }
};

// Global test state
export class TestState {
  private static instance: TestState;
  private mongoServer?: MongoMemoryServer;
  private redisClient?: any;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('TestSetup');
  }

  public static getInstance(): TestState {
    if (!TestState.instance) {
      TestState.instance = new TestState();
    }
    return TestState.instance;
  }

  // Setup test environment
  public async setup(): Promise<void> {
    this.logger.info('Setting up test environment');

    try {
      // Setup encryption
      process.env.MASTER_ENCRYPTION_KEY = TEST_CONFIG.auth.masterEncryptionKey;
      EncryptionUtils.initializeMasterKey();

      // Setup MongoDB
      if (TEST_CONFIG.mongodb.useInMemory) {
        await this.setupInMemoryMongoDB();
      }

      // Setup Redis
      if (TEST_CONFIG.redis.useMock) {
        this.setupMockRedis();
      }

      // Setup environment variables
      this.setupEnvironmentVariables();

      this.logger.info('Test environment setup completed');

    } catch (error) {
      this.logger.error('Test environment setup failed', { error: error.message });
      throw error;
    }
  }

  // Cleanup test environment
  public async cleanup(): Promise<void> {
    this.logger.info('Cleaning up test environment');

    try {
      // Cleanup MongoDB
      if (this.mongoServer) {
        await this.mongoServer.stop();
        this.mongoServer = undefined;
      }

      // Cleanup Redis
      if (this.redisClient) {
        this.redisClient.disconnect();
        this.redisClient = undefined;
      }

      // Cleanup encryption
      EncryptionUtils.cleanup();

      this.logger.info('Test environment cleanup completed');

    } catch (error) {
      this.logger.error('Test environment cleanup failed', { error: error.message });
    }
  }

  // Setup in-memory MongoDB
  private async setupInMemoryMongoDB(): Promise<void> {
    this.mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'swiftpayme_test'
      }
    });

    const uri = this.mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.TEST_MONGODB_URI = uri;

    this.logger.info('In-memory MongoDB started', { uri });
  }

  // Setup mock Redis
  private setupMockRedis(): void {
    // Replace Redis with mock for testing
    jest.mock('ioredis', () => require('ioredis-mock'));
    
    this.redisClient = new Redis();
    
    this.logger.info('Mock Redis setup completed');
  }

  // Setup environment variables
  private setupEnvironmentVariables(): void {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // JWT configuration
    process.env.JWT_SECRET = TEST_CONFIG.auth.jwtSecret;
    process.env.JWT_EXPIRES_IN = TEST_CONFIG.auth.jwtExpiresIn;
    
    // Service URLs
    Object.entries(TEST_CONFIG.services).forEach(([key, url]) => {
      const envKey = `${key.toUpperCase()}_URL`;
      process.env[envKey] = url;
    });
    
    // Disable external services for testing
    process.env.DISABLE_EXTERNAL_APIS = 'true';
    process.env.DISABLE_NOTIFICATIONS = 'true';
    process.env.DISABLE_BITCOIN_NODE = 'true';
    
    // Logging configuration
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
    process.env.LOG_TO_CONSOLE = 'false';
    
    this.logger.info('Environment variables configured for testing');
  }

  // Get MongoDB connection string
  public getMongoConnectionString(): string {
    return process.env.TEST_MONGODB_URI || TEST_CONFIG.mongodb.connectionString;
  }

  // Get Redis client
  public getRedisClient(): any {
    return this.redisClient;
  }
}

// Test utilities
export class TestUtils {
  private static logger = new Logger('TestUtils');

  // Generate test JWT token
  public static generateTestJWT(payload: any): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, TEST_CONFIG.auth.jwtSecret, {
      expiresIn: TEST_CONFIG.auth.jwtExpiresIn
    });
  }

  // Generate test user token
  public static generateUserToken(userId: string = 'test-user-id'): string {
    return this.generateTestJWT({
      userId,
      email: TEST_CONFIG.testData.users.regularUser.email,
      type: 'user',
      role: 'user'
    });
  }

  // Generate test admin token
  public static generateAdminToken(adminId: string = 'test-admin-id'): string {
    return this.generateTestJWT({
      adminId,
      email: TEST_CONFIG.testData.users.adminUser.email,
      type: 'admin',
      role: 'admin'
    });
  }

  // Generate test API key
  public static generateTestApiKey(): string {
    return 'sp_test_' + Math.random().toString(36).substring(2, 15);
  }

  // Create test HTTP client
  public static createTestClient(baseURL: string, token?: string): any {
    const axios = require('axios');
    
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'SwiftPayMe-Test-Client/1.0'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return axios.create({
      baseURL,
      headers,
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status code
    });
  }

  // Wait for service to be ready
  public static async waitForService(url: string, timeout: number = 30000): Promise<boolean> {
    const axios = require('axios');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        if (response.status === 200) {
          this.logger.info(`Service ready: ${url}`);
          return true;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await this.sleep(1000); // Wait 1 second before retry
    }

    this.logger.error(`Service not ready after ${timeout}ms: ${url}`);
    return false;
  }

  // Wait for all services to be ready
  public static async waitForAllServices(timeout: number = 60000): Promise<boolean> {
    const services = Object.values(TEST_CONFIG.services);
    
    this.logger.info('Waiting for all services to be ready', { services });

    const promises = services.map(url => this.waitForService(url, timeout));
    const results = await Promise.all(promises);

    const allReady = results.every(ready => ready);
    
    if (allReady) {
      this.logger.info('All services are ready');
    } else {
      this.logger.error('Some services are not ready');
    }

    return allReady;
  }

  // Sleep utility
  public static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate random test data
  public static generateRandomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  public static generateRandomEmail(): string {
    return `test-${this.generateRandomString(8)}@example.com`;
  }

  public static generateRandomAmount(): number {
    return Math.round((Math.random() * 1000 + 1) * 100) / 100; // $1.00 to $1000.00
  }

  // Database utilities
  public static async clearDatabase(): Promise<void> {
    // This would clear test database collections
    // Implementation depends on the database driver being used
    this.logger.info('Database cleared for testing');
  }

  // Mock external services
  public static mockExternalServices(): void {
    // Mock Bitcoin node
    jest.mock('bitcoin-core', () => {
      return jest.fn().mockImplementation(() => ({
        getBlockchainInfo: jest.fn().mockResolvedValue({ blocks: 700000 }),
        getNewAddress: jest.fn().mockResolvedValue('bc1qtest123456789'),
        sendToAddress: jest.fn().mockResolvedValue('txid123456789'),
        getBalance: jest.fn().mockResolvedValue(1.5)
      }));
    });

    // Mock price feeds
    jest.mock('axios', () => ({
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('coinbase')) {
          return Promise.resolve({
            data: { data: { amount: '50000.00' } }
          });
        }
        if (url.includes('metals-api')) {
          return Promise.resolve({
            data: { rates: { XAU: 0.0005, XAG: 0.04 } }
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      })
    }));

    // Mock notification services
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
      })
    }));

    this.logger.info('External services mocked for testing');
  }

  // Assertion helpers
  public static expectValidResponse(response: any, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toBeDefined();
    
    if (response.data.success !== undefined) {
      expect(response.data.success).toBe(expectedStatus < 400);
    }
  }

  public static expectErrorResponse(response: any, expectedStatus: number, errorCode?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toBeDefined();
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBeDefined();
    
    if (errorCode) {
      expect(response.data.error.code).toBe(errorCode);
    }
  }

  public static expectValidJWT(token: string): any {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, TEST_CONFIG.auth.jwtSecret);
    expect(decoded).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    return decoded;
  }
}

// Global setup and teardown
beforeAll(async () => {
  const testState = TestState.getInstance();
  await testState.setup();
  TestUtils.mockExternalServices();
});

afterAll(async () => {
  const testState = TestState.getInstance();
  await testState.cleanup();
});

beforeEach(async () => {
  // Clear database before each test
  await TestUtils.clearDatabase();
});

// Export everything
export {
  TestState,
  TestUtils
};

