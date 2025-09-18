import { Router } from 'express';
import { TokenizationController } from '../controllers/tokenizationController';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validationMiddleware } from '../middleware/validation';
import { loggingMiddleware } from '../middleware/logging';

const router = Router();
const tokenizationController = new TokenizationController();

// Apply middleware to all routes
router.use(loggingMiddleware);

// Token routes
router.post('/tokens',
  authMiddleware,
  rateLimitMiddleware('createToken'),
  validationMiddleware('createToken'),
  tokenizationController.createToken
);

router.get('/tokens',
  authMiddleware,
  rateLimitMiddleware('listTokens'),
  validationMiddleware('listTokens'),
  tokenizationController.listTokens
);

router.get('/tokens/:tokenId',
  authMiddleware,
  rateLimitMiddleware('getToken'),
  validationMiddleware('getToken'),
  tokenizationController.getToken
);

router.patch('/tokens/:tokenId/status',
  authMiddleware,
  rateLimitMiddleware('updateTokenStatus'),
  validationMiddleware('updateTokenStatus'),
  tokenizationController.updateTokenStatus
);

router.get('/tokens/:tokenId/metrics',
  authMiddleware,
  rateLimitMiddleware('getTokenMetrics'),
  validationMiddleware('getTokenMetrics'),
  tokenizationController.getTokenMetrics
);

// Minting routes
router.post('/minting',
  authMiddleware,
  rateLimitMiddleware('createMintingRequest'),
  validationMiddleware('createMintingRequest'),
  tokenizationController.createMintingRequest
);

router.get('/minting',
  authMiddleware,
  rateLimitMiddleware('listMintingRequests'),
  validationMiddleware('listMintingRequests'),
  tokenizationController.listMintingRequests
);

router.get('/minting/:requestId',
  authMiddleware,
  rateLimitMiddleware('getMintingRequest'),
  validationMiddleware('getMintingRequest'),
  tokenizationController.getMintingRequest
);

// Burning routes
router.post('/burning',
  authMiddleware,
  rateLimitMiddleware('createBurningRequest'),
  validationMiddleware('createBurningRequest'),
  tokenizationController.createBurningRequest
);

router.get('/burning',
  authMiddleware,
  rateLimitMiddleware('listBurningRequests'),
  validationMiddleware('listBurningRequests'),
  tokenizationController.listBurningRequests
);

router.get('/burning/:requestId',
  authMiddleware,
  rateLimitMiddleware('getBurningRequest'),
  validationMiddleware('getBurningRequest'),
  tokenizationController.getBurningRequest
);

// Deposit routes
router.post('/deposits',
  authMiddleware,
  rateLimitMiddleware('createDeposit'),
  validationMiddleware('createDeposit'),
  tokenizationController.createDeposit
);

router.get('/deposits',
  authMiddleware,
  rateLimitMiddleware('listDeposits'),
  validationMiddleware('listDeposits'),
  tokenizationController.listDeposits
);

router.get('/deposits/:depositId',
  authMiddleware,
  rateLimitMiddleware('getDeposit'),
  validationMiddleware('getDeposit'),
  tokenizationController.getDeposit
);

// Withdrawal routes
router.post('/withdrawals',
  authMiddleware,
  rateLimitMiddleware('createWithdrawal'),
  validationMiddleware('createWithdrawal'),
  tokenizationController.createWithdrawal
);

router.get('/withdrawals/:withdrawalId',
  authMiddleware,
  rateLimitMiddleware('getWithdrawal'),
  validationMiddleware('getWithdrawal'),
  tokenizationController.getWithdrawal
);

// Reserve routes
router.get('/reserves/:tokenId',
  authMiddleware,
  rateLimitMiddleware('getReserveBalance'),
  validationMiddleware('getReserveBalance'),
  tokenizationController.getReserveBalance
);

router.post('/reserves/:tokenId/audit',
  authMiddleware,
  rateLimitMiddleware('auditReserves'),
  validationMiddleware('auditReserves'),
  tokenizationController.auditReserves
);

// Dashboard and statistics routes
router.get('/dashboard/stats',
  authMiddleware,
  rateLimitMiddleware('getDashboardStats'),
  tokenizationController.getDashboardStats
);

// Health check route (no auth required)
router.get('/health',
  rateLimitMiddleware('healthCheck'),
  tokenizationController.healthCheck
);

export default router;

