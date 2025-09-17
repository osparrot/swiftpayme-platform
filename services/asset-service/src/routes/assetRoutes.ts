import { Router } from 'express';
import assetController from '../controllers/assetController';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validationMiddleware } from '../middleware/validation';
import { loggingMiddleware } from '../middleware/logging';
import {
  createAssetSchema,
  updateAssetSchema,
  createWalletSchema,
  updateAssetPriceSchema,
  assetQuerySchema,
  walletQuerySchema
} from '../middleware/validation';

const router = Router();

// Apply common middleware
router.use(loggingMiddleware);
router.use(rateLimitMiddleware);

// Health check endpoint (no auth required)
router.get('/health', assetController.healthCheck);

// Asset management routes
router.post(
  '/assets',
  authMiddleware,
  validationMiddleware(createAssetSchema),
  assetController.createAsset
);

router.get(
  '/assets',
  authMiddleware,
  validationMiddleware(assetQuerySchema, 'query'),
  assetController.listAssets
);

router.get(
  '/assets/:assetId',
  authMiddleware,
  assetController.getAsset
);

router.put(
  '/assets/:assetId',
  authMiddleware,
  validationMiddleware(updateAssetSchema),
  assetController.updateAsset
);

router.delete(
  '/assets/:assetId',
  authMiddleware,
  assetController.deleteAsset
);

router.patch(
  '/assets/:assetId/price',
  authMiddleware,
  validationMiddleware(updateAssetPriceSchema),
  assetController.updateAssetPrice
);

// Wallet management routes
router.post(
  '/wallets',
  authMiddleware,
  validationMiddleware(createWalletSchema),
  assetController.createWallet
);

router.get(
  '/wallets',
  authMiddleware,
  validationMiddleware(walletQuerySchema, 'query'),
  assetController.listWallets
);

router.get(
  '/wallets/:walletId',
  authMiddleware,
  assetController.getWallet
);

// Portfolio routes
router.get(
  '/portfolio',
  authMiddleware,
  assetController.getPortfolio
);

export default router;

