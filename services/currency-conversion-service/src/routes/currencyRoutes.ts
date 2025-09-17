import { Router } from 'express';
import currencyController from '../controllers/currencyController';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validationMiddleware } from '../middleware/validation';
import { loggingMiddleware } from '../middleware/logging';

const router = Router();

// Apply logging middleware to all routes
router.use(loggingMiddleware);

// Currency conversion routes
router.post('/convert', 
  rateLimitMiddleware.conversion,
  authMiddleware.optional,
  validationMiddleware.convertCurrency,
  currencyController.convertCurrency
);

// Get current exchange rate
router.get('/rate',
  rateLimitMiddleware.standard,
  authMiddleware.optional,
  validationMiddleware.getRate,
  currencyController.getCurrentRate
);

// Get historical exchange rates
router.get('/historical',
  rateLimitMiddleware.standard,
  authMiddleware.optional,
  validationMiddleware.getHistoricalRates,
  currencyController.getHistoricalRates
);

// Batch currency conversion
router.post('/batch-convert',
  rateLimitMiddleware.batch,
  authMiddleware.required,
  validationMiddleware.batchConvert,
  currencyController.batchConvert
);

// Get currency information
router.get('/info/:currencyCode',
  rateLimitMiddleware.standard,
  authMiddleware.optional,
  validationMiddleware.getCurrencyInfo,
  currencyController.getCurrencyInfo
);

// Get supported currencies
router.get('/supported',
  rateLimitMiddleware.standard,
  authMiddleware.optional,
  currencyController.getSupportedCurrencies
);

// Update exchange rates (admin only)
router.post('/update-rates',
  rateLimitMiddleware.admin,
  authMiddleware.required,
  validationMiddleware.updateRates,
  currencyController.updateRates
);

// Health check endpoint
router.get('/health',
  currencyController.healthCheck
);

export default router;

