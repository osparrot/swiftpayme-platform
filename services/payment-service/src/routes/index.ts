/**
 * SwiftPayMe Payment Service - Routes
 * Comprehensive REST API routes for payment processing
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import PaymentController from '../controllers/PaymentController';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { PaymentType, PaymentStatus, PaymentPriority, CurrencyType, TransactionDirection } from '../types/payment';

const router = Router();

// ==================== VALIDATION RULES ====================

const createPaymentValidation = [
  body('type')
    .isIn(Object.values(PaymentType))
    .withMessage('Invalid payment type'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  body('currencyType')
    .isIn(Object.values(CurrencyType))
    .withMessage('Invalid currency type'),
  body('direction')
    .isIn(Object.values(TransactionDirection))
    .withMessage('Invalid transaction direction'),
  body('priority')
    .optional()
    .isIn(Object.values(PaymentPriority))
    .withMessage('Invalid payment priority'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled date'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date')
];

const assetDepositValidation = [
  body('assetType')
    .isIn(['gold', 'silver', 'platinum', 'palladium', 'diamond'])
    .withMessage('Invalid asset type'),
  body('assetDetails')
    .isObject()
    .withMessage('Asset details must be an object'),
  body('assetDetails.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be positive'),
  body('assetDetails.purity')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Purity must be between 0 and 100'),
  body('targetCurrency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Target currency must be 3 characters'),
  body('estimatedValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated value must be positive')
];

const bitcoinPurchaseValidation = [
  body('purchaseAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Purchase amount must be greater than 0'),
  body('purchaseCurrency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Purchase currency must be 3 characters'),
  body('destinationWallet')
    .optional()
    .isString()
    .withMessage('Destination wallet must be a string')
];

const fiatTransferValidation = [
  body('toUserId')
    .isString()
    .notEmpty()
    .withMessage('To user ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  body('memo')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Memo too long')
];

const cryptoTransferValidation = [
  body('toAddress')
    .isString()
    .notEmpty()
    .withMessage('To address is required'),
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isIn(['BTC', 'ETH', 'LTC'])
    .withMessage('Invalid cryptocurrency'),
  body('fromWalletId')
    .optional()
    .isString()
    .withMessage('From wallet ID must be a string')
];

const updateStatusValidation = [
  body('status')
    .isIn(Object.values(PaymentStatus))
    .withMessage('Invalid payment status'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes too long')
];

const paymentIdValidation = [
  param('paymentId')
    .isString()
    .notEmpty()
    .withMessage('Payment ID is required')
];

const workflowIdValidation = [
  param('workflowId')
    .isString()
    .notEmpty()
    .withMessage('Workflow ID is required')
];

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'amount', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// ==================== ROUTES ====================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  });
});

// ==================== PAYMENT ROUTES ====================

// Create payment
router.post('/payments',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 requests per minute
  createPaymentValidation,
  validationMiddleware,
  PaymentController.createPayment
);

// Get payments list
router.get('/payments',
  authMiddleware,
  paginationValidation,
  validationMiddleware,
  PaymentController.getPayments
);

// Get payment by ID
router.get('/payments/:paymentId',
  authMiddleware,
  paymentIdValidation,
  validationMiddleware,
  PaymentController.getPayment
);

// Update payment status
router.patch('/payments/:paymentId/status',
  authMiddleware,
  paymentIdValidation,
  updateStatusValidation,
  validationMiddleware,
  PaymentController.updatePaymentStatus
);

// Cancel payment
router.post('/payments/:paymentId/cancel',
  authMiddleware,
  paymentIdValidation,
  body('reason').optional().isLength({ max: 500 }),
  validationMiddleware,
  PaymentController.cancelPayment
);

// Retry payment
router.post('/payments/:paymentId/retry',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 300000, max: 3 }), // 3 retries per 5 minutes
  paymentIdValidation,
  validationMiddleware,
  PaymentController.retryPayment
);

// Get payment workflow
router.get('/payments/:paymentId/workflow',
  authMiddleware,
  paymentIdValidation,
  validationMiddleware,
  PaymentController.getPaymentWorkflow
);

// Get payment analytics
router.get('/payments/analytics',
  authMiddleware,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validationMiddleware,
  PaymentController.getPaymentAnalytics
);

// ==================== WORKFLOW ROUTES ====================

// Asset deposit workflow
router.post('/workflows/asset-deposit',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 60000, max: 5 }), // 5 requests per minute
  assetDepositValidation,
  validationMiddleware,
  PaymentController.processAssetDeposit
);

// Bitcoin purchase workflow
router.post('/workflows/bitcoin-purchase',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 requests per minute
  bitcoinPurchaseValidation,
  validationMiddleware,
  PaymentController.processBitcoinPurchase
);

// Fiat transfer workflow
router.post('/workflows/fiat-transfer',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }), // 20 requests per minute
  fiatTransferValidation,
  validationMiddleware,
  PaymentController.processFiatTransfer
);

// Crypto transfer workflow
router.post('/workflows/crypto-transfer',
  authMiddleware,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 requests per minute
  cryptoTransferValidation,
  validationMiddleware,
  PaymentController.processCryptoTransfer
);

// Get workflow by ID
router.get('/workflows/:workflowId',
  authMiddleware,
  workflowIdValidation,
  validationMiddleware,
  PaymentController.getWorkflow
);

// Get workflows list
router.get('/workflows',
  authMiddleware,
  paginationValidation,
  query('status').optional().isIn(Object.values(PaymentStatus)),
  query('type').optional().isIn(Object.values(PaymentType)),
  validationMiddleware,
  PaymentController.getWorkflows
);

// Get workflow analytics
router.get('/workflows/analytics',
  authMiddleware,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validationMiddleware,
  PaymentController.getWorkflowAnalytics
);

// ==================== ADMIN ROUTES ====================

// Admin routes would go here with additional authorization middleware
// For now, keeping them separate for security

// ==================== ERROR HANDLING ====================

router.use((error: any, req: any, res: any, next: any) => {
  console.error('Payment Service Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: error.message
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.correlationId
  });
});

export default router;

