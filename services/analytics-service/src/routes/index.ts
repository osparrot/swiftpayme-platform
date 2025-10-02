import express from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { 
  dashboardQuerySchema,
  reportQuerySchema,
  customReportSchema,
  exportRequestSchema
} from '../schemas/analyticsSchemas';

const router = express.Router();
const analyticsController = new AnalyticsController();

// ==================== PUBLIC ROUTES ====================

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Analytics Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ==================== PROTECTED ROUTES ====================

// Dashboard metrics
router.get('/dashboard',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getDashboardMetrics.bind(analyticsController)
);

// Real-time metrics
router.get('/realtime',
  authMiddleware,
  analyticsController.getRealTimeMetrics.bind(analyticsController)
);

// ==================== REPORTS ====================

// Get all reports
router.get('/reports',
  authMiddleware,
  validationMiddleware(reportQuerySchema, 'query'),
  analyticsController.getReports.bind(analyticsController)
);

// Get specific report
router.get('/reports/:reportId',
  authMiddleware,
  analyticsController.getReport.bind(analyticsController)
);

// Generate custom report
router.post('/reports',
  authMiddleware,
  validationMiddleware(customReportSchema, 'body'),
  analyticsController.generateCustomReport.bind(analyticsController)
);

// Delete report
router.delete('/reports/:reportId',
  authMiddleware,
  analyticsController.deleteReport.bind(analyticsController)
);

// ==================== USER ANALYTICS ====================

// User metrics
router.get('/users/metrics',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getUserMetrics.bind(analyticsController)
);

// User cohort analysis
router.get('/users/cohorts',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getUserCohorts.bind(analyticsController)
);

// User retention analysis
router.get('/users/retention',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getUserRetention.bind(analyticsController)
);

// User geographic distribution
router.get('/users/geographic',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getUserGeographic.bind(analyticsController)
);

// ==================== TRANSACTION ANALYTICS ====================

// Transaction metrics
router.get('/transactions/metrics',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getTransactionMetrics.bind(analyticsController)
);

// Transaction trends
router.get('/transactions/trends',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getTransactionTrends.bind(analyticsController)
);

// Transaction funnel analysis
router.get('/transactions/funnel',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getTransactionFunnel.bind(analyticsController)
);

// Currency analysis
router.get('/transactions/currencies',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getCurrencyAnalysis.bind(analyticsController)
);

// ==================== ASSET ANALYTICS ====================

// Asset metrics
router.get('/assets/metrics',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getAssetMetrics.bind(analyticsController)
);

// Asset performance
router.get('/assets/performance',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getAssetPerformance.bind(analyticsController)
);

// Asset type analysis
router.get('/assets/types',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getAssetTypeAnalysis.bind(analyticsController)
);

// Asset processing analytics
router.get('/assets/processing',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getAssetProcessingAnalytics.bind(analyticsController)
);

// ==================== REVENUE ANALYTICS ====================

// Revenue metrics
router.get('/revenue/metrics',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getRevenueMetrics.bind(analyticsController)
);

// Revenue trends
router.get('/revenue/trends',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getRevenueTrends.bind(analyticsController)
);

// Revenue forecasting
router.get('/revenue/forecast',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getRevenueForecast.bind(analyticsController)
);

// Customer lifetime value
router.get('/revenue/clv',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getCustomerLifetimeValue.bind(analyticsController)
);

// ==================== PERFORMANCE ANALYTICS ====================

// System performance metrics
router.get('/performance/system',
  authMiddleware,
  analyticsController.getSystemPerformance.bind(analyticsController)
);

// API performance metrics
router.get('/performance/api',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getApiPerformance.bind(analyticsController)
);

// Service health metrics
router.get('/performance/health',
  authMiddleware,
  analyticsController.getServiceHealth.bind(analyticsController)
);

// ==================== SECURITY ANALYTICS ====================

// Security metrics
router.get('/security/metrics',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getSecurityMetrics.bind(analyticsController)
);

// Threat analysis
router.get('/security/threats',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getThreatAnalysis.bind(analyticsController)
);

// Authentication analytics
router.get('/security/authentication',
  authMiddleware,
  validationMiddleware(dashboardQuerySchema, 'query'),
  analyticsController.getAuthenticationAnalytics.bind(analyticsController)
);

// ==================== EXPORT & INTEGRATION ====================

// Export data
router.post('/export',
  authMiddleware,
  validationMiddleware(exportRequestSchema, 'body'),
  analyticsController.exportData.bind(analyticsController)
);

// Get export status
router.get('/export/:exportId',
  authMiddleware,
  analyticsController.getExportStatus.bind(analyticsController)
);

// Download exported data
router.get('/export/:exportId/download',
  authMiddleware,
  analyticsController.downloadExport.bind(analyticsController)
);

// ==================== ADMIN ROUTES ====================

// Refresh all metrics (admin only)
router.post('/admin/refresh',
  authMiddleware,
  analyticsController.refreshAllMetrics.bind(analyticsController)
);

// System statistics (admin only)
router.get('/admin/stats',
  authMiddleware,
  analyticsController.getSystemStats.bind(analyticsController)
);

// Data cleanup (admin only)
router.post('/admin/cleanup',
  authMiddleware,
  analyticsController.cleanupOldData.bind(analyticsController)
);

export default router;
