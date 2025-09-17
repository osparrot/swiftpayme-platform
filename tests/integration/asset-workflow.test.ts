import { TestUtils, TEST_CONFIG } from '../utils/setup';

describe('Asset Workflow Integration Tests', () => {
  let userClient: any;
  let assetClient: any;
  let adminClient: any;
  let testUser: any;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Wait for all services to be ready
    const allReady = await TestUtils.waitForAllServices();
    if (!allReady) {
      throw new Error('Not all services are ready for integration testing');
    }

    // Setup clients
    userClient = TestUtils.createTestClient(TEST_CONFIG.services.userService);
    assetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService);
    adminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService);
  });

  beforeEach(async () => {
    // Create test user
    const userData = {
      email: TestUtils.generateRandomEmail(),
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const userResponse = await userClient.post('/api/users/register', userData);
    testUser = { ...userData, id: userResponse.data.data.user.id };
    userToken = userResponse.data.data.tokens.accessToken;

    // Create admin token
    adminToken = TestUtils.generateAdminToken();
  });

  describe('Complete Asset Deposit Workflow', () => {
    it('should complete full asset deposit to fiat credit workflow', async () => {
      const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Step 1: Submit asset deposit
      const assetData = {
        type: 'gold',
        weight: 10.5,
        purity: 0.999,
        description: 'Test gold bar for integration testing',
        estimatedValue: 21000.00,
        currency: 'USD',
        images: ['test-image-1.jpg', 'test-image-2.jpg'],
        certificates: ['test-certificate.pdf']
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectValidResponse(depositResponse, 201);
      expect(depositResponse.data.data.deposit).toBeDefined();
      expect(depositResponse.data.data.deposit.status).toBe('submitted');
      expect(depositResponse.data.data.deposit.userId).toBe(testUser.id);
      
      const depositId = depositResponse.data.data.deposit.id;

      // Step 2: Admin acknowledges receipt
      const receiptData = {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id',
        condition: 'excellent',
        notes: 'Asset received in good condition'
      };

      const receiptResponse = await authAdminClient.put(
        `/api/admin/assets/${depositId}/receipt`, 
        receiptData
      );
      
      TestUtils.expectValidResponse(receiptResponse, 200);
      expect(receiptResponse.data.data.deposit.status).toBe('received');

      // Step 3: Initial verification
      const verificationData = {
        method: 'visual_inspection',
        result: 'passed',
        notes: 'Visual inspection completed successfully',
        verifiedBy: 'admin-user-id'
      };

      const verificationResponse = await authAdminClient.post(
        `/api/admin/assets/${depositId}/verify`, 
        verificationData
      );
      
      TestUtils.expectValidResponse(verificationResponse, 200);
      expect(verificationResponse.data.data.verification).toBeDefined();

      // Step 4: Professional appraisal
      const appraisalData = {
        appraiser: 'Certified Gold Appraiser Inc.',
        appraisalValue: 20850.00,
        currency: 'USD',
        confidence: 0.95,
        methodology: 'XRF analysis and weight verification',
        certificateUrl: 'https://example.com/appraisal-cert.pdf',
        appraisedAt: new Date().toISOString()
      };

      const appraisalResponse = await authAdminClient.post(
        `/api/admin/assets/${depositId}/appraisal`, 
        appraisalData
      );
      
      TestUtils.expectValidResponse(appraisalResponse, 200);
      expect(appraisalResponse.data.data.appraisal).toBeDefined();

      // Step 5: Final approval and fiat crediting
      const approvalData = {
        finalValue: 20850.00,
        currency: 'USD',
        approvedBy: 'admin-user-id',
        notes: 'Asset approved for fiat crediting'
      };

      const approvalResponse = await authAdminClient.post(
        `/api/admin/assets/${depositId}/approve`, 
        approvalData
      );
      
      TestUtils.expectValidResponse(approvalResponse, 200);
      expect(approvalResponse.data.data.deposit.status).toBe('approved');
      expect(approvalResponse.data.data.deposit.finalValue).toBe(approvalData.finalValue);

      // Step 6: Verify user account balance updated
      const balanceResponse = await authUserClient.get('/api/users/accounts/balances');
      
      TestUtils.expectValidResponse(balanceResponse, 200);
      const usdAccount = balanceResponse.data.data.fiatAccounts.find(
        (account: any) => account.currency === 'USD'
      );
      
      expect(usdAccount).toBeDefined();
      expect(parseFloat(usdAccount.balance)).toBe(approvalData.finalValue);

      // Step 7: Verify transaction history
      const transactionResponse = await authUserClient.get('/api/users/transactions');
      
      TestUtils.expectValidResponse(transactionResponse, 200);
      const assetTransaction = transactionResponse.data.data.transactions.find(
        (tx: any) => tx.type === 'asset_deposit' && tx.assetDepositId === depositId
      );
      
      expect(assetTransaction).toBeDefined();
      expect(assetTransaction.amount).toBe(approvalData.finalValue);
      expect(assetTransaction.currency).toBe('USD');
      expect(assetTransaction.status).toBe('completed');
    }, 60000); // Increase timeout for complex workflow

    it('should handle asset deposit rejection workflow', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Submit asset deposit
      const assetData = {
        type: 'silver',
        weight: 50.0,
        purity: 0.800, // Lower purity
        description: 'Test silver coins',
        estimatedValue: 1500.00,
        currency: 'USD'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      // Admin rejects the asset
      const rejectionData = {
        reason: 'purity_below_minimum',
        notes: 'Silver purity is below our minimum requirement of 0.925',
        rejectedBy: 'admin-user-id'
      };

      const rejectionResponse = await authAdminClient.post(
        `/api/admin/assets/${depositId}/reject`, 
        rejectionData
      );
      
      TestUtils.expectValidResponse(rejectionResponse, 200);
      expect(rejectionResponse.data.data.deposit.status).toBe('rejected');
      expect(rejectionResponse.data.data.deposit.rejectionReason).toBe(rejectionData.reason);
    });
  });

  describe('Asset Valuation Integration', () => {
    it('should integrate with currency service for real-time pricing', async () => {
      const currencyClient = TestUtils.createTestClient(TEST_CONFIG.services.currencyService);
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      // Get current gold price
      const priceResponse = await currencyClient.get('/api/currency/prices/precious-metals/gold');
      TestUtils.expectValidResponse(priceResponse, 200);
      
      const goldPricePerOz = priceResponse.data.data.price;
      expect(goldPricePerOz).toBeGreaterThan(0);

      // Submit gold deposit
      const assetData = {
        type: 'gold',
        weight: 31.1035, // 1 troy ounce
        purity: 0.999,
        description: 'One troy ounce gold coin'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectValidResponse(depositResponse, 201);
      
      // Check that estimated value is calculated correctly
      const estimatedValue = depositResponse.data.data.deposit.estimatedValue;
      const expectedValue = goldPricePerOz * assetData.weight * assetData.purity / 31.1035;
      
      // Allow for small variance due to fees and spreads
      expect(estimatedValue).toBeCloseTo(expectedValue, -2); // Within $100
    });

    it('should handle multiple currency valuations', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      // Submit asset with EUR valuation
      const assetData = {
        type: 'gold',
        weight: 10.0,
        purity: 0.999,
        description: 'Gold bar',
        currency: 'EUR'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectValidResponse(depositResponse, 201);
      expect(depositResponse.data.data.deposit.currency).toBe('EUR');
      expect(depositResponse.data.data.deposit.estimatedValue).toBeGreaterThan(0);
    });
  });

  describe('Asset Storage and Tracking', () => {
    it('should track asset location and storage details', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Submit asset deposit
      const assetData = {
        type: 'gold',
        weight: 5.0,
        purity: 0.999,
        description: 'Small gold bar'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      // Admin updates storage location
      const storageData = {
        facility: 'Secure Vault A',
        location: 'Section 3, Shelf 15, Box 42',
        storageDate: new Date().toISOString(),
        securityLevel: 'high',
        insurance: {
          provider: 'Asset Insurance Corp',
          policyNumber: 'AIC-123456789',
          coverage: 25000.00
        }
      };

      const storageResponse = await authAdminClient.put(
        `/api/admin/assets/${depositId}/storage`, 
        storageData
      );
      
      TestUtils.expectValidResponse(storageResponse, 200);
      expect(storageResponse.data.data.storage).toBeDefined();
      expect(storageResponse.data.data.storage.facility).toBe(storageData.facility);
      expect(storageResponse.data.data.storage.location).toBe(storageData.location);
    });

    it('should generate asset audit trail', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Submit and process asset
      const assetData = {
        type: 'silver',
        weight: 100.0,
        purity: 0.925,
        description: 'Silver coins collection'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      // Perform multiple operations
      await authAdminClient.put(`/api/admin/assets/${depositId}/receipt`, {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id'
      });

      await authAdminClient.post(`/api/admin/assets/${depositId}/verify`, {
        method: 'visual_inspection',
        result: 'passed',
        verifiedBy: 'admin-user-id'
      });

      // Get audit trail
      const auditResponse = await authAdminClient.get(`/api/admin/assets/${depositId}/audit`);
      
      TestUtils.expectValidResponse(auditResponse, 200);
      expect(auditResponse.data.data.auditTrail).toBeDefined();
      expect(Array.isArray(auditResponse.data.data.auditTrail)).toBe(true);
      expect(auditResponse.data.data.auditTrail.length).toBeGreaterThan(2);

      // Check audit events
      const events = auditResponse.data.data.auditTrail;
      expect(events.some((e: any) => e.action === 'deposit_submitted')).toBe(true);
      expect(events.some((e: any) => e.action === 'asset_received')).toBe(true);
      expect(events.some((e: any) => e.action === 'verification_completed')).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid asset types', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      const assetData = {
        type: 'invalid_metal',
        weight: 10.0,
        purity: 0.999,
        description: 'Invalid asset type'
      };

      const response = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle negative weights', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      const assetData = {
        type: 'gold',
        weight: -5.0,
        purity: 0.999,
        description: 'Negative weight test'
      };

      const response = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle purity values outside valid range', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      const assetData = {
        type: 'gold',
        weight: 10.0,
        purity: 1.5, // Invalid purity > 1.0
        description: 'Invalid purity test'
      };

      const response = await authAssetClient.post('/api/assets/deposits', assetData);
      
      TestUtils.expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should handle unauthorized access to admin endpoints', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      // Submit asset deposit
      const assetData = {
        type: 'gold',
        weight: 5.0,
        purity: 0.999,
        description: 'Test asset'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      // Try to approve with user token (should fail)
      const userAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, userToken);
      const approvalResponse = await userAdminClient.post(`/api/admin/assets/${depositId}/approve`, {
        finalValue: 10000.00,
        currency: 'USD'
      });
      
      TestUtils.expectErrorResponse(approvalResponse, 403, 'INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent asset deposits from same user', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      const assetData1 = {
        type: 'gold',
        weight: 5.0,
        purity: 0.999,
        description: 'First gold deposit'
      };

      const assetData2 = {
        type: 'silver',
        weight: 50.0,
        purity: 0.925,
        description: 'First silver deposit'
      };

      // Submit both deposits concurrently
      const [response1, response2] = await Promise.all([
        authAssetClient.post('/api/assets/deposits', assetData1),
        authAssetClient.post('/api/assets/deposits', assetData2)
      ]);

      TestUtils.expectValidResponse(response1, 201);
      TestUtils.expectValidResponse(response2, 201);
      
      expect(response1.data.data.deposit.id).not.toBe(response2.data.data.deposit.id);
      expect(response1.data.data.deposit.type).toBe('gold');
      expect(response2.data.data.deposit.type).toBe('silver');
    });
  });
});

