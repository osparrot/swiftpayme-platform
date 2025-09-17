import { TestUtils, TEST_CONFIG } from '../utils/setup';

describe('Complete Payment Flow End-to-End Tests', () => {
  let userClient: any;
  let assetClient: any;
  let currencyClient: any;
  let cryptoClient: any;
  let paymentClient: any;
  let adminClient: any;
  let notificationClient: any;
  
  let testUser: any;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Wait for all services to be ready
    const allReady = await TestUtils.waitForAllServices(120000); // 2 minutes timeout
    if (!allReady) {
      throw new Error('Not all services are ready for end-to-end testing');
    }

    // Setup clients for all services
    userClient = TestUtils.createTestClient(TEST_CONFIG.services.userService);
    assetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService);
    currencyClient = TestUtils.createTestClient(TEST_CONFIG.services.currencyService);
    cryptoClient = TestUtils.createTestClient(TEST_CONFIG.services.cryptoService);
    paymentClient = TestUtils.createTestClient(TEST_CONFIG.services.paymentService);
    adminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService);
    notificationClient = TestUtils.createTestClient(TEST_CONFIG.services.notificationService);
  });

  beforeEach(async () => {
    // Create test user with KYC approved
    const userData = {
      email: TestUtils.generateRandomEmail(),
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+1234567890'
    };

    const userResponse = await userClient.post('/api/users/register', userData);
    testUser = { ...userData, id: userResponse.data.data.user.id };
    userToken = userResponse.data.data.tokens.accessToken;

    // Create admin token
    adminToken = TestUtils.generateAdminToken();

    // Complete KYC for user (simulate admin approval)
    const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
    const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

    // Submit KYC
    await authUserClient.post('/api/users/kyc/submit', {
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
    });

    // Admin approves KYC
    await authAdminClient.post(`/api/admin/users/${testUser.id}/kyc/approve`, {
      approvedBy: 'admin-user-id',
      notes: 'KYC approved for testing'
    });
  });

  describe('Complete Asset-to-Bitcoin Flow', () => {
    it('should complete full flow: Asset Deposit → Fiat Credit → Bitcoin Purchase', async () => {
      const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authCryptoClient = TestUtils.createTestClient(TEST_CONFIG.services.cryptoService, userToken);
      const authPaymentClient = TestUtils.createTestClient(TEST_CONFIG.services.paymentService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // ========== PHASE 1: ASSET DEPOSIT ==========
      console.log('Phase 1: Asset Deposit');

      // Step 1: Submit gold deposit
      const assetData = {
        type: 'gold',
        weight: 31.1035, // 1 troy ounce
        purity: 0.999,
        description: 'One troy ounce gold coin - American Eagle',
        images: ['gold-coin-front.jpg', 'gold-coin-back.jpg'],
        certificates: ['authenticity-certificate.pdf']
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      TestUtils.expectValidResponse(depositResponse, 201);
      
      const depositId = depositResponse.data.data.deposit.id;
      const estimatedValue = depositResponse.data.data.deposit.estimatedValue;
      
      expect(estimatedValue).toBeGreaterThan(1500); // Gold should be worth more than $1500/oz
      console.log(`Asset deposited with ID: ${depositId}, Estimated value: $${estimatedValue}`);

      // Step 2: Admin processes the deposit
      // Receipt
      await authAdminClient.put(`/api/admin/assets/${depositId}/receipt`, {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id',
        condition: 'excellent',
        notes: 'Gold coin received in mint condition'
      });

      // Verification
      await authAdminClient.post(`/api/admin/assets/${depositId}/verify`, {
        method: 'xrf_analysis',
        result: 'passed',
        notes: 'XRF analysis confirms 99.9% gold purity',
        verifiedBy: 'admin-user-id'
      });

      // Professional appraisal
      const finalValue = estimatedValue * 0.98; // 2% below estimate (realistic)
      await authAdminClient.post(`/api/admin/assets/${depositId}/appraisal`, {
        appraiser: 'Certified Precious Metals Appraiser',
        appraisalValue: finalValue,
        currency: 'USD',
        confidence: 0.95,
        methodology: 'XRF analysis, weight verification, market price comparison'
      });

      // Final approval
      const approvalResponse = await authAdminClient.post(`/api/admin/assets/${depositId}/approve`, {
        finalValue: finalValue,
        currency: 'USD',
        approvedBy: 'admin-user-id',
        notes: 'Asset approved for fiat crediting'
      });

      TestUtils.expectValidResponse(approvalResponse, 200);
      console.log(`Asset approved with final value: $${finalValue}`);

      // ========== PHASE 2: VERIFY FIAT CREDIT ==========
      console.log('Phase 2: Verify Fiat Credit');

      // Check user balance
      const balanceResponse = await authUserClient.get('/api/users/accounts/balances');
      TestUtils.expectValidResponse(balanceResponse, 200);
      
      const usdAccount = balanceResponse.data.data.fiatAccounts.find(
        (account: any) => account.currency === 'USD'
      );
      
      expect(usdAccount).toBeDefined();
      expect(parseFloat(usdAccount.balance)).toBe(finalValue);
      console.log(`User USD balance: $${usdAccount.balance}`);

      // ========== PHASE 3: BITCOIN PURCHASE ==========
      console.log('Phase 3: Bitcoin Purchase');

      // Step 1: Get current Bitcoin price
      const btcPriceResponse = await currencyClient.get('/api/currency/prices/crypto/bitcoin');
      TestUtils.expectValidResponse(btcPriceResponse, 200);
      
      const btcPrice = btcPriceResponse.data.data.price;
      expect(btcPrice).toBeGreaterThan(10000); // Bitcoin should be worth more than $10k
      console.log(`Current Bitcoin price: $${btcPrice}`);

      // Step 2: Create Bitcoin wallet
      const walletResponse = await authCryptoClient.post('/api/crypto/wallets', {
        type: 'internal',
        label: 'My Bitcoin Wallet'
      });
      
      TestUtils.expectValidResponse(walletResponse, 201);
      const walletId = walletResponse.data.data.wallet.id;
      const walletAddress = walletResponse.data.data.wallet.address;
      console.log(`Bitcoin wallet created: ${walletAddress}`);

      // Step 3: Calculate Bitcoin purchase amount
      const purchaseAmountUSD = finalValue * 0.9; // Use 90% of balance (keep some for fees)
      const expectedBtcAmount = purchaseAmountUSD / btcPrice;

      // Step 4: Execute Bitcoin purchase
      const purchaseResponse = await authPaymentClient.post('/api/payments/bitcoin/buy', {
        amountUSD: purchaseAmountUSD,
        walletId: walletId,
        slippageTolerance: 0.02 // 2% slippage tolerance
      });

      TestUtils.expectValidResponse(purchaseResponse, 200);
      
      const transactionId = purchaseResponse.data.data.transaction.id;
      const actualBtcAmount = purchaseResponse.data.data.transaction.bitcoinAmount;
      const actualUsdAmount = purchaseResponse.data.data.transaction.usdAmount;
      
      expect(actualBtcAmount).toBeCloseTo(expectedBtcAmount, 6); // Within 0.000001 BTC
      expect(actualUsdAmount).toBeCloseTo(purchaseAmountUSD, 2); // Within $0.01
      
      console.log(`Bitcoin purchased: ${actualBtcAmount} BTC for $${actualUsdAmount}`);
      console.log(`Transaction ID: ${transactionId}`);

      // ========== PHASE 4: VERIFY FINAL STATE ==========
      console.log('Phase 4: Verify Final State');

      // Check updated balances
      const finalBalanceResponse = await authUserClient.get('/api/users/accounts/balances');
      TestUtils.expectValidResponse(finalBalanceResponse, 200);
      
      const finalUsdAccount = finalBalanceResponse.data.data.fiatAccounts.find(
        (account: any) => account.currency === 'USD'
      );
      const btcWallet = finalBalanceResponse.data.data.bitcoinWallets.find(
        (wallet: any) => wallet.id === walletId
      );
      
      expect(parseFloat(finalUsdAccount.balance)).toBeLessThan(finalValue);
      expect(parseFloat(btcWallet.balance)).toBe(actualBtcAmount);
      
      console.log(`Final USD balance: $${finalUsdAccount.balance}`);
      console.log(`Final BTC balance: ${btcWallet.balance} BTC`);

      // Check transaction history
      const transactionHistoryResponse = await authUserClient.get('/api/users/transactions');
      TestUtils.expectValidResponse(transactionHistoryResponse, 200);
      
      const transactions = transactionHistoryResponse.data.data.transactions;
      
      // Should have asset deposit transaction
      const assetTx = transactions.find((tx: any) => 
        tx.type === 'asset_deposit' && tx.assetDepositId === depositId
      );
      expect(assetTx).toBeDefined();
      expect(assetTx.amount).toBe(finalValue);
      expect(assetTx.status).toBe('completed');

      // Should have Bitcoin purchase transaction
      const btcTx = transactions.find((tx: any) => 
        tx.type === 'bitcoin_purchase' && tx.id === transactionId
      );
      expect(btcTx).toBeDefined();
      expect(btcTx.bitcoinAmount).toBe(actualBtcAmount);
      expect(btcTx.status).toBe('completed');

      console.log('✅ Complete Asset-to-Bitcoin flow completed successfully!');

    }, 180000); // 3 minutes timeout for complete flow
  });

  describe('Bitcoin Transfer to External Wallet', () => {
    it('should transfer Bitcoin to external wallet address', async () => {
      const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
      const authCryptoClient = TestUtils.createTestClient(TEST_CONFIG.services.cryptoService, userToken);
      const authPaymentClient = TestUtils.createTestClient(TEST_CONFIG.services.paymentService, userToken);

      // Setup: Create wallet and add some Bitcoin (simulate previous purchase)
      const walletResponse = await authCryptoClient.post('/api/crypto/wallets', {
        type: 'internal',
        label: 'Test Wallet'
      });
      
      const walletId = walletResponse.data.data.wallet.id;

      // Simulate Bitcoin balance (this would normally come from a purchase)
      // In a real test, we'd need to complete a purchase first
      const bitcoinAmount = 0.001; // 0.001 BTC

      // External wallet address (testnet address)
      const externalAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

      // Transfer Bitcoin to external wallet
      const transferResponse = await authPaymentClient.post('/api/payments/bitcoin/transfer', {
        fromWalletId: walletId,
        toAddress: externalAddress,
        amount: bitcoinAmount,
        feeRate: 'medium' // medium priority fee
      });

      TestUtils.expectValidResponse(transferResponse, 200);
      
      const transferTx = transferResponse.data.data.transaction;
      expect(transferTx.type).toBe('bitcoin_transfer');
      expect(transferTx.amount).toBe(bitcoinAmount);
      expect(transferTx.toAddress).toBe(externalAddress);
      expect(transferTx.status).toBe('pending'); // Initially pending
      expect(transferTx.txHash).toBeDefined();

      console.log(`Bitcoin transfer initiated: ${bitcoinAmount} BTC to ${externalAddress}`);
      console.log(`Transaction hash: ${transferTx.txHash}`);
    });
  });

  describe('Multi-Currency Asset Deposits', () => {
    it('should handle asset deposits in different currencies', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Submit asset deposit in EUR
      const assetData = {
        type: 'gold',
        weight: 10.0,
        purity: 0.999,
        description: 'Gold bar - 10 grams',
        currency: 'EUR'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      TestUtils.expectValidResponse(depositResponse, 201);
      
      const depositId = depositResponse.data.data.deposit.id;
      expect(depositResponse.data.data.deposit.currency).toBe('EUR');
      expect(depositResponse.data.data.deposit.estimatedValue).toBeGreaterThan(0);

      // Process the deposit
      await authAdminClient.put(`/api/admin/assets/${depositId}/receipt`, {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id'
      });

      const finalValue = 500.00; // €500
      await authAdminClient.post(`/api/admin/assets/${depositId}/approve`, {
        finalValue: finalValue,
        currency: 'EUR',
        approvedBy: 'admin-user-id'
      });

      // Verify EUR account balance
      const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
      const balanceResponse = await authUserClient.get('/api/users/accounts/balances');
      
      const eurAccount = balanceResponse.data.data.fiatAccounts.find(
        (account: any) => account.currency === 'EUR'
      );
      
      expect(eurAccount).toBeDefined();
      expect(parseFloat(eurAccount.balance)).toBe(finalValue);
    });
  });

  describe('Payment System Error Handling', () => {
    it('should handle insufficient balance for Bitcoin purchase', async () => {
      const authPaymentClient = TestUtils.createTestClient(TEST_CONFIG.services.paymentService, userToken);
      const authCryptoClient = TestUtils.createTestClient(TEST_CONFIG.services.cryptoService, userToken);

      // Create wallet
      const walletResponse = await authCryptoClient.post('/api/crypto/wallets', {
        type: 'internal',
        label: 'Test Wallet'
      });
      
      const walletId = walletResponse.data.data.wallet.id;

      // Try to purchase Bitcoin with more money than available
      const purchaseResponse = await authPaymentClient.post('/api/payments/bitcoin/buy', {
        amountUSD: 100000.00, // $100k (user has $0)
        walletId: walletId
      });

      TestUtils.expectErrorResponse(purchaseResponse, 400, 'INSUFFICIENT_BALANCE');
    });

    it('should handle invalid Bitcoin addresses', async () => {
      const authPaymentClient = TestUtils.createTestClient(TEST_CONFIG.services.paymentService, userToken);
      const authCryptoClient = TestUtils.createTestClient(TEST_CONFIG.services.cryptoService, userToken);

      // Create wallet
      const walletResponse = await authCryptoClient.post('/api/crypto/wallets', {
        type: 'internal',
        label: 'Test Wallet'
      });
      
      const walletId = walletResponse.data.data.wallet.id;

      // Try to transfer to invalid address
      const transferResponse = await authPaymentClient.post('/api/payments/bitcoin/transfer', {
        fromWalletId: walletId,
        toAddress: 'invalid-bitcoin-address',
        amount: 0.001
      });

      TestUtils.expectErrorResponse(transferResponse, 400, 'INVALID_ADDRESS');
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications throughout the payment flow', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);
      const authNotificationClient = TestUtils.createTestClient(TEST_CONFIG.services.notificationService, userToken);

      // Submit asset deposit (should trigger notification)
      const assetData = {
        type: 'silver',
        weight: 50.0,
        purity: 0.925,
        description: 'Silver coins'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      // Check notification history
      const notificationResponse = await authNotificationClient.get('/api/notifications/history');
      TestUtils.expectValidResponse(notificationResponse, 200);
      
      const notifications = notificationResponse.data.data.notifications;
      const depositNotification = notifications.find((n: any) => 
        n.type === 'asset_deposit_submitted' && 
        n.metadata?.depositId === depositId
      );
      
      expect(depositNotification).toBeDefined();
      expect(depositNotification.status).toBe('sent');

      // Admin approval should trigger another notification
      await authAdminClient.put(`/api/admin/assets/${depositId}/receipt`, {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id'
      });

      await authAdminClient.post(`/api/admin/assets/${depositId}/approve`, {
        finalValue: 1500.00,
        currency: 'USD',
        approvedBy: 'admin-user-id'
      });

      // Check for approval notification
      const updatedNotificationResponse = await authNotificationClient.get('/api/notifications/history');
      const updatedNotifications = updatedNotificationResponse.data.data.notifications;
      
      const approvalNotification = updatedNotifications.find((n: any) => 
        n.type === 'asset_deposit_approved' && 
        n.metadata?.depositId === depositId
      );
      
      expect(approvalNotification).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations efficiently', async () => {
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);

      const startTime = Date.now();
      
      // Submit multiple asset deposits concurrently
      const deposits = Array.from({ length: 5 }, (_, i) => ({
        type: 'gold',
        weight: 1.0 + i,
        purity: 0.999,
        description: `Concurrent test deposit ${i + 1}`
      }));

      const promises = deposits.map(deposit => 
        authAssetClient.post('/api/assets/deposits', deposit)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        TestUtils.expectValidResponse(response, 201);
      });

      // Should complete within reasonable time (less than 10 seconds)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000);

      console.log(`Concurrent operations completed in ${duration}ms`);
    }, 30000);
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across all services', async () => {
      const authUserClient = TestUtils.createTestClient(TEST_CONFIG.services.userService, userToken);
      const authAssetClient = TestUtils.createTestClient(TEST_CONFIG.services.assetService, userToken);
      const authAdminClient = TestUtils.createTestClient(TEST_CONFIG.services.adminService, adminToken);

      // Submit and approve asset deposit
      const assetData = {
        type: 'gold',
        weight: 5.0,
        purity: 0.999,
        description: 'Data consistency test'
      };

      const depositResponse = await authAssetClient.post('/api/assets/deposits', assetData);
      const depositId = depositResponse.data.data.deposit.id;

      await authAdminClient.put(`/api/admin/assets/${depositId}/receipt`, {
        receivedAt: new Date().toISOString(),
        receivedBy: 'admin-user-id'
      });

      const finalValue = 10000.00;
      await authAdminClient.post(`/api/admin/assets/${depositId}/approve`, {
        finalValue: finalValue,
        currency: 'USD',
        approvedBy: 'admin-user-id'
      });

      // Check data consistency across services
      
      // 1. Asset service should show approved status
      const assetStatusResponse = await authAssetClient.get(`/api/assets/deposits/${depositId}`);
      expect(assetStatusResponse.data.data.deposit.status).toBe('approved');
      expect(assetStatusResponse.data.data.deposit.finalValue).toBe(finalValue);

      // 2. User service should show updated balance
      const balanceResponse = await authUserClient.get('/api/users/accounts/balances');
      const usdAccount = balanceResponse.data.data.fiatAccounts.find(
        (account: any) => account.currency === 'USD'
      );
      expect(parseFloat(usdAccount.balance)).toBe(finalValue);

      // 3. Transaction history should be consistent
      const transactionResponse = await authUserClient.get('/api/users/transactions');
      const assetTransaction = transactionResponse.data.data.transactions.find(
        (tx: any) => tx.assetDepositId === depositId
      );
      expect(assetTransaction.amount).toBe(finalValue);
      expect(assetTransaction.status).toBe('completed');

      // 4. Admin service should show the same data
      const adminAssetResponse = await authAdminClient.get(`/api/admin/assets/${depositId}`);
      expect(adminAssetResponse.data.data.deposit.status).toBe('approved');
      expect(adminAssetResponse.data.data.deposit.finalValue).toBe(finalValue);
    });
  });
});

