/**
 * SwiftPayMe Account Service - Routes
 * Comprehensive routing for account management
 */

import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();
const accountController = new AccountController();

// ==================== HEALTH CHECK ====================
router.get('/health', accountController.healthCheck);

// ==================== ACCOUNT MANAGEMENT ====================

// Create account
router.post('/accounts',
  rateLimitMiddleware('create_account'),
  authMiddleware,
  validationMiddleware('createAccount'),
  accountController.createAccount
);

// Get account by ID
router.get('/accounts/:accountId',
  rateLimitMiddleware('get_account'),
  authMiddleware,
  validationMiddleware('getAccount'),
  accountController.getAccount
);

// Get account by user ID
router.get('/users/:userId/account',
  rateLimitMiddleware('get_account'),
  authMiddleware,
  validationMiddleware('getUserAccount'),
  accountController.getAccountByUserId
);

// Update account status
router.patch('/accounts/:accountId/status',
  rateLimitMiddleware('update_account'),
  authMiddleware,
  validationMiddleware('updateAccountStatus'),
  accountController.updateAccountStatus
);

// ==================== BALANCE OPERATIONS ====================

// Deposit funds
router.post('/accounts/deposit',
  rateLimitMiddleware('deposit'),
  authMiddleware,
  validationMiddleware('deposit'),
  accountController.deposit
);

// Withdraw funds
router.post('/accounts/withdraw',
  rateLimitMiddleware('withdraw'),
  authMiddleware,
  validationMiddleware('withdraw'),
  accountController.withdraw
);

// Transfer funds
router.post('/accounts/transfer',
  rateLimitMiddleware('transfer'),
  authMiddleware,
  validationMiddleware('transfer'),
  accountController.transfer
);

// ==================== CURRENCY CONVERSION ====================

// Convert currency
router.post('/accounts/convert',
  rateLimitMiddleware('convert'),
  authMiddleware,
  validationMiddleware('convertCurrency'),
  accountController.convertCurrency
);

// Convert asset tokens to fiat
router.post('/accounts/convert-tokens',
  rateLimitMiddleware('convert'),
  authMiddleware,
  validationMiddleware('convertAssetTokens'),
  accountController.convertAssetTokenToFiat
);

// ==================== CRYPTO PURCHASE ====================

// Charge fiat for crypto purchase
router.post('/accounts/charge-crypto',
  rateLimitMiddleware('crypto_charge'),
  authMiddleware,
  validationMiddleware('chargeCrypto'),
  accountController.chargeFiatForCrypto
);

// ==================== ANALYTICS ====================

// Get account analytics
router.get('/analytics/accounts',
  rateLimitMiddleware('analytics'),
  authMiddleware,
  accountController.getAccountAnalytics
);

// Get transaction analytics
router.get('/analytics/transactions',
  rateLimitMiddleware('analytics'),
  authMiddleware,
  accountController.getTransactionAnalytics
);

// Get conversion analytics
router.get('/analytics/conversions',
  rateLimitMiddleware('analytics'),
  authMiddleware,
  accountController.getConversionAnalytics
);

export default router;

