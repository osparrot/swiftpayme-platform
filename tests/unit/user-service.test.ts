import { TestUtils, TEST_CONFIG } from '../utils/setup';
import axios from 'axios';

describe('User Service Unit Tests', () => {
  let client: any;
  const baseURL = TEST_CONFIG.services.userService;

  beforeAll(async () => {
    client = TestUtils.createTestClient(baseURL);
    
    // Wait for service to be ready
    const isReady = await TestUtils.waitForService(baseURL);
    if (!isReady) {
      throw new Error('User Service is not ready for testing');
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await client.get('/health');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.status).toBe('healthy');
      expect(response.data.service).toBe('user-service');
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890'
      };

      const response = await client.post('/api/users/register', userData);
      
      TestUtils.expectValidResponse(response, 201);
      expect(response.data.data.user).toBeDefined();
      expect(response.data.data.user.email).toBe(userData.email);
      expect(response.data.data.user.firstName).toBe(userData.firstName);
      expect(response.data.data.user.lastName).toBe(userData.lastName);
      expect(response.data.data.user.password).toBeUndefined(); // Password should not be returned
      expect(response.data.data.tokens).toBeDefined();
      expect(response.data.data.tokens.accessToken).toBeDefined();
      expect(response.data.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await client.post('/api/users/register', userData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(response.data.error.details).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await client.post('/api/users/register', userData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(response.data.error.details).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // First registration
      const firstResponse = await client.post('/api/users/register', userData);
      TestUtils.expectValidResponse(firstResponse, 201);

      // Second registration with same email
      const secondResponse = await client.post('/api/users/register', userData);
      TestUtils.expectErrorResponse(secondResponse, 409, 'EMAIL_ALREADY_EXISTS');
    });
  });

  describe('User Authentication', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await client.post('/api/users/register', userData);
      testUser = { ...userData, id: response.data.data.user.id };
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await client.post('/api/users/login', loginData);
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.user).toBeDefined();
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.tokens).toBeDefined();
      expect(response.data.data.tokens.accessToken).toBeDefined();
      expect(response.data.data.tokens.refreshToken).toBeDefined();

      // Validate JWT token
      const decoded = TestUtils.expectValidJWT(response.data.data.tokens.accessToken);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.type).toBe('user');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const response = await client.post('/api/users/login', loginData);
      
      TestUtils.expectErrorResponse(response, 401, 'INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await client.post('/api/users/login', loginData);
      
      TestUtils.expectErrorResponse(response, 401, 'INVALID_CREDENTIALS');
    });

    it('should refresh access token with valid refresh token', async () => {
      // Login to get tokens
      const loginResponse = await client.post('/api/users/login', {
        email: testUser.email,
        password: testUser.password
      });

      const refreshToken = loginResponse.data.data.tokens.refreshToken;

      // Refresh token
      const refreshResponse = await client.post('/api/users/refresh', {
        refreshToken
      });

      TestUtils.expectValidResponse(refreshResponse, 200);
      expect(refreshResponse.data.data.tokens).toBeDefined();
      expect(refreshResponse.data.data.tokens.accessToken).toBeDefined();
      expect(refreshResponse.data.data.tokens.refreshToken).toBeDefined();

      // New tokens should be different
      expect(refreshResponse.data.data.tokens.accessToken).not.toBe(loginResponse.data.data.tokens.accessToken);
    });
  });

  describe('User Profile Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await client.post('/api/users/register', userData);
      testUser = { ...userData, id: registerResponse.data.data.user.id };
      authToken = registerResponse.data.data.tokens.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      const response = await authClient.get('/api/users/profile');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.user).toBeDefined();
      expect(response.data.data.user.id).toBe(testUser.id);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.user.firstName).toBe(testUser.firstName);
      expect(response.data.data.user.lastName).toBe(testUser.lastName);
    });

    it('should reject profile access without token', async () => {
      const response = await client.get('/api/users/profile');
      
      TestUtils.expectErrorResponse(response, 401, 'MISSING_TOKEN');
    });

    it('should update user profile successfully', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1987654321'
      };

      const response = await authClient.put('/api/users/profile', updateData);
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.user.firstName).toBe(updateData.firstName);
      expect(response.data.data.user.lastName).toBe(updateData.lastName);
      expect(response.data.data.user.phoneNumber).toBe(updateData.phoneNumber);
    });

    it('should reject profile update with invalid data', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      const updateData = {
        email: 'invalid-email-format'
      };

      const response = await authClient.put('/api/users/profile', updateData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('KYC Verification', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await client.post('/api/users/register', userData);
      testUser = { ...userData, id: registerResponse.data.data.user.id };
      authToken = registerResponse.data.data.tokens.accessToken;
    });

    it('should submit KYC documents successfully', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        }
      };

      const response = await authClient.post('/api/users/kyc/submit', kycData);
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.kycStatus).toBe('pending');
      expect(response.data.data.submittedAt).toBeDefined();
    });

    it('should get KYC status', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      
      const response = await authClient.get('/api/users/kyc/status');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.kycStatus).toBeDefined();
      expect(['not_started', 'pending', 'approved', 'rejected']).toContain(response.data.data.kycStatus);
    });
  });

  describe('Account Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await client.post('/api/users/register', userData);
      testUser = { ...userData, id: registerResponse.data.data.user.id };
      authToken = registerResponse.data.data.tokens.accessToken;
    });

    it('should get account balances', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      
      const response = await authClient.get('/api/users/accounts/balances');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.fiatAccounts).toBeDefined();
      expect(response.data.data.bitcoinWallets).toBeDefined();
      expect(Array.isArray(response.data.data.fiatAccounts)).toBe(true);
      expect(Array.isArray(response.data.data.bitcoinWallets)).toBe(true);
    });

    it('should get transaction history', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      
      const response = await authClient.get('/api/users/transactions');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.data.transactions).toBeDefined();
      expect(Array.isArray(response.data.data.transactions)).toBe(true);
      expect(response.data.data.pagination).toBeDefined();
    });

    it('should create Bitcoin wallet', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      const walletData = {
        type: 'internal',
        label: 'My Bitcoin Wallet'
      };

      const response = await authClient.post('/api/users/wallets/bitcoin', walletData);
      
      TestUtils.expectValidResponse(response, 201);
      expect(response.data.data.wallet).toBeDefined();
      expect(response.data.data.wallet.type).toBe(walletData.type);
      expect(response.data.data.wallet.label).toBe(walletData.label);
      expect(response.data.data.wallet.address).toBeDefined();
    });
  });

  describe('User Logout', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: TestUtils.generateRandomEmail(),
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await client.post('/api/users/register', userData);
      testUser = { ...userData, id: registerResponse.data.data.user.id };
      authToken = registerResponse.data.data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      
      const response = await authClient.post('/api/users/logout');
      
      TestUtils.expectValidResponse(response, 200);
      expect(response.data.message).toContain('logged out');
    });

    it('should reject requests with logged out token', async () => {
      const authClient = TestUtils.createTestClient(baseURL, authToken);
      
      // Logout
      await authClient.post('/api/users/logout');
      
      // Try to access profile with logged out token
      const response = await authClient.get('/api/users/profile');
      
      TestUtils.expectErrorResponse(response, 401, 'INVALID_TOKEN');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await axios.post(`${baseURL}/api/users/register`, 'invalid-json', {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });
      
      TestUtils.expectErrorResponse(response, 400);
    });

    it('should handle missing required fields', async () => {
      const response = await client.post('/api/users/register', {
        email: TestUtils.generateRandomEmail()
        // Missing password, firstName, lastName
      });
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await client.delete('/api/users/register');
      
      TestUtils.expectErrorResponse(response, 405);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const requests = [];
      
      // Send multiple failed login requests
      for (let i = 0; i < 20; i++) {
        requests.push(client.post('/api/users/login', loginData));
      }

      const responses = await Promise.allSettled(requests);
      
      // At least some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && 
        result.value.status === 429
      );

      expect(rateLimited).toBe(true);
    }, 30000); // Increase timeout for this test
  });
});

