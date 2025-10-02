import { Router } from 'express';
import { CryptoController } from '../controllers/cryptoController';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { 
  createWalletSchema,
  sendTransactionSchema,
  createLightningInvoiceSchema,
  payLightningInvoiceSchema,
  validateAddressSchema,
  estimateFeeSchema
} from '../schemas/cryptoSchemas';

const router = Router();
const cryptoController = new CryptoController();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'crypto-service',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  });
});

// Public endpoints (no authentication required)
router.get('/bitcoin/price', cryptoController.getBitcoinPrice.bind(cryptoController));
router.get('/bitcoin/network-info', cryptoController.getNetworkInfo.bind(cryptoController));
router.get('/bitcoin/block-height', cryptoController.getBlockHeight.bind(cryptoController));

// Wallet management endpoints (authentication required)
router.use(authMiddleware);

// Create wallet
router.post('/wallets', 
  rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
  validationMiddleware(createWalletSchema),
  cryptoController.createWallet.bind(cryptoController)
);

// Get user wallets
router.get('/wallets', 
  cryptoController.getUserWallets.bind(cryptoController)
);

// Get wallet by ID
router.get('/wallets/:walletId', 
  cryptoController.getWallet.bind(cryptoController)
);

// Get wallet balance
router.get('/wallets/:walletId/balance', 
  cryptoController.getWalletBalance.bind(cryptoController)
);

// Update wallet
router.put('/wallets/:walletId', 
  validationMiddleware(createWalletSchema),
  cryptoController.updateWallet.bind(cryptoController)
);

// Deactivate wallet
router.delete('/wallets/:walletId', 
  cryptoController.deactivateWallet.bind(cryptoController)
);

// Transaction endpoints
router.post('/transactions/send', 
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 10 }), // 10 transactions per 5 minutes
  validationMiddleware(sendTransactionSchema),
  cryptoController.sendTransaction.bind(cryptoController)
);

// Get transaction history
router.get('/transactions', 
  cryptoController.getTransactionHistory.bind(cryptoController)
);

// Get transaction by ID
router.get('/transactions/:transactionId', 
  cryptoController.getTransaction.bind(cryptoController)
);

// Get transaction status
router.get('/transactions/:transactionId/status', 
  cryptoController.getTransactionStatus.bind(cryptoController)
);

// Address management endpoints
router.post('/addresses/validate', 
  validationMiddleware(validateAddressSchema),
  cryptoController.validateAddress.bind(cryptoController)
);

router.get('/addresses/generate', 
  cryptoController.generateAddress.bind(cryptoController)
);

// Fee estimation endpoints
router.post('/fees/estimate', 
  validationMiddleware(estimateFeeSchema),
  cryptoController.estimateFee.bind(cryptoController)
);

// Lightning Network endpoints (if supported)
router.post('/lightning/invoices', 
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 20 }), // 20 invoices per minute
  validationMiddleware(createLightningInvoiceSchema),
  cryptoController.createLightningInvoice.bind(cryptoController)
);

router.post('/lightning/pay', 
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }), // 10 payments per minute
  validationMiddleware(payLightningInvoiceSchema),
  cryptoController.payLightningInvoice.bind(cryptoController)
);

router.get('/lightning/channels', 
  cryptoController.getLightningChannels.bind(cryptoController)
);

router.get('/lightning/balance', 
  cryptoController.getLightningBalance.bind(cryptoController)
);

// Backup and recovery endpoints
router.post('/wallets/:walletId/backup', 
  cryptoController.backupWallet.bind(cryptoController)
);

router.post('/wallets/restore', 
  cryptoController.restoreWallet.bind(cryptoController)
);

// Monitoring and analytics endpoints
router.get('/metrics', 
  cryptoController.getMetrics.bind(cryptoController)
);

router.get('/statistics', 
  cryptoController.getStatistics.bind(cryptoController)
);

// Webhook endpoints for external services
router.post('/webhooks/blockchain', 
  cryptoController.handleBlockchainWebhook.bind(cryptoController)
);

router.post('/webhooks/exchange', 
  cryptoController.handleExchangeWebhook.bind(cryptoController)
);

export default router;
