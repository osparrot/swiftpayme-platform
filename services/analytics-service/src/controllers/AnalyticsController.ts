import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { Logger } from '../utils/Logger';
import { TimeRange, AnalyticsReportType } from '../types/analytics';
import { AnalyticsReport } from '../models/AnalyticsReport';

export class AnalyticsController {
  private readonly analyticsService = new AnalyticsService();
  private readonly logger = new Logger('AnalyticsController');

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      
      const metrics = await this.analyticsService.getDashboardMetrics(timeRange as TimeRange);
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard metrics'
      });
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      await this.analyticsService.updateRealTimeMetrics();
      
      // Get the latest metrics from database
      const today = new Date().toDateString();
      const [userMetrics, transactionMetrics, assetMetrics, revenueMetrics] = await Promise.all([
        this.analyticsService.getUserMetrics(new Date(), new Date()),
        this.analyticsService.getTransactionMetrics(new Date(), new Date()),
        this.analyticsService.getAssetMetrics(new Date(), new Date()),
        this.analyticsService.getRevenueMetrics(new Date(), new Date())
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: userMetrics,
          transactions: transactionMetrics,
          assets: assetMetrics,
          revenue: revenueMetrics,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Error getting real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics'
      });
    }
  }

  /**
   * Get all reports
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { 
        type, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const query: any = {};
      
      if (type) {
        query.type = type;
      }
      
      if (startDate || endDate) {
        query['period.startDate'] = {};
        if (startDate) query['period.startDate'].$gte = new Date(startDate as string);
        if (endDate) query['period.startDate'].$lte = new Date(endDate as string);
      }

      const reports = await AnalyticsReport
        .find(query)
        .sort({ generatedAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('type generatedAt period insights recommendations tags');

      const total = await AnalyticsReport.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          reports,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      this.logger.error('Error getting reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reports'
      });
    }
  }

  /**
   * Get specific report
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      const report = await AnalyticsReport.findById(reportId);
      
      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Error getting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report'
      });
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const { type, startDate, endDate, includeComparisons, includeTrends, includeForecasts } = req.body;
      
      const report = await this.analyticsService.generateReport({
        type: type as AnalyticsReportType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includeComparisons,
        includeTrends,
        includeForecasts
      });

      // Save the report
      const savedReport = new AnalyticsReport(report);
      await savedReport.save();

      res.status(201).json({
        success: true,
        data: savedReport
      });
    } catch (error) {
      this.logger.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate custom report'
      });
    }
  }

  /**
   * Delete report
   */
  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      const report = await AnalyticsReport.findByIdAndDelete(reportId);
      
      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      this.logger.error('Error deleting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete report'
      });
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getUserAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting user metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user metrics'
      });
    }
  }

  /**
   * Get user cohorts
   */
  async getUserCohorts(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for cohort analysis
      res.status(200).json({
        success: true,
        data: {
          cohorts: [],
          message: 'Cohort analysis implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting user cohorts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user cohorts'
      });
    }
  }

  /**
   * Get user retention
   */
  async getUserRetention(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for retention analysis
      res.status(200).json({
        success: true,
        data: {
          retention: {},
          message: 'Retention analysis implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting user retention:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user retention'
      });
    }
  }

  /**
   * Get user geographic distribution
   */
  async getUserGeographic(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getUserAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          countries: metrics.topCountries,
          totalUsers: metrics.totalUsers
        }
      });
    } catch (error) {
      this.logger.error('Error getting user geographic data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user geographic data'
      });
    }
  }

  /**
   * Get transaction metrics
   */
  async getTransactionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getTransactionAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting transaction metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction metrics'
      });
    }
  }

  /**
   * Get transaction trends
   */
  async getTransactionTrends(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for transaction trends
      res.status(200).json({
        success: true,
        data: {
          trends: [],
          message: 'Transaction trends implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting transaction trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction trends'
      });
    }
  }

  /**
   * Get transaction funnel
   */
  async getTransactionFunnel(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for transaction funnel analysis
      res.status(200).json({
        success: true,
        data: {
          funnel: [],
          message: 'Transaction funnel implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting transaction funnel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction funnel'
      });
    }
  }

  /**
   * Get currency analysis
   */
  async getCurrencyAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getTransactionAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          currencies: metrics.topCurrencies,
          totalVolume: metrics.totalVolume
        }
      });
    } catch (error) {
      this.logger.error('Error getting currency analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get currency analysis'
      });
    }
  }

  /**
   * Get asset metrics
   */
  async getAssetMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getAssetAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting asset metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get asset metrics'
      });
    }
  }

  /**
   * Get asset performance
   */
  async getAssetPerformance(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for asset performance analysis
      res.status(200).json({
        success: true,
        data: {
          performance: {},
          message: 'Asset performance implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting asset performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get asset performance'
      });
    }
  }

  /**
   * Get asset type analysis
   */
  async getAssetTypeAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getAssetAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          assetTypes: metrics.topAssetTypes,
          totalAssets: metrics.totalAssets,
          totalValue: metrics.totalValue
        }
      });
    } catch (error) {
      this.logger.error('Error getting asset type analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get asset type analysis'
      });
    }
  }

  /**
   * Get asset processing analytics
   */
  async getAssetProcessingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getAssetAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          approvalRate: metrics.approvalRate,
          rejectionRate: metrics.rejectionRate,
          averageProcessingTime: metrics.averageProcessingTime,
          assetsByStatus: metrics.assetsByStatus
        }
      });
    } catch (error) {
      this.logger.error('Error getting asset processing analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get asset processing analytics'
      });
    }
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getRevenueAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting revenue metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get revenue metrics'
      });
    }
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for revenue trends
      res.status(200).json({
        success: true,
        data: {
          trends: [],
          message: 'Revenue trends implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting revenue trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get revenue trends'
      });
    }
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for revenue forecasting
      res.status(200).json({
        success: true,
        data: {
          forecast: {},
          message: 'Revenue forecast implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting revenue forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get revenue forecast'
      });
    }
  }

  /**
   * Get customer lifetime value
   */
  async getCustomerLifetimeValue(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = TimeRange.LAST_30_DAYS } = req.query;
      const { startDate, endDate } = this.getDateRange(timeRange as TimeRange);
      
      const metrics = await this.analyticsService.getRevenueAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          customerLifetimeValue: metrics.customerLifetimeValue,
          averageRevenuePerUser: metrics.averageRevenuePerUser,
          churnRate: metrics.churnRate
        }
      });
    } catch (error) {
      this.logger.error('Error getting customer lifetime value:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get customer lifetime value'
      });
    }
  }

  /**
   * Get system performance
   */
  async getSystemPerformance(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for system performance metrics
      res.status(200).json({
        success: true,
        data: {
          performance: {},
          message: 'System performance implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting system performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system performance'
      });
    }
  }

  /**
   * Get API performance
   */
  async getApiPerformance(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for API performance metrics
      res.status(200).json({
        success: true,
        data: {
          performance: {},
          message: 'API performance implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting API performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get API performance'
      });
    }
  }

  /**
   * Get service health
   */
  async getServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for service health metrics
      res.status(200).json({
        success: true,
        data: {
          health: {},
          message: 'Service health implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting service health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service health'
      });
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for security metrics
      res.status(200).json({
        success: true,
        data: {
          security: {},
          message: 'Security metrics implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting security metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security metrics'
      });
    }
  }

  /**
   * Get threat analysis
   */
  async getThreatAnalysis(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for threat analysis
      res.status(200).json({
        success: true,
        data: {
          threats: {},
          message: 'Threat analysis implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting threat analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get threat analysis'
      });
    }
  }

  /**
   * Get authentication analytics
   */
  async getAuthenticationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for authentication analytics
      res.status(200).json({
        success: true,
        data: {
          authentication: {},
          message: 'Authentication analytics implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting authentication analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get authentication analytics'
      });
    }
  }

  /**
   * Export data
   */
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for data export
      res.status(200).json({
        success: true,
        data: {
          exportId: 'export_' + Date.now(),
          message: 'Data export implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      
      res.status(200).json({
        success: true,
        data: {
          exportId,
          status: 'pending',
          message: 'Export status implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting export status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get export status'
      });
    }
  }

  /**
   * Download export
   */
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      
      res.status(200).json({
        success: true,
        data: {
          exportId,
          message: 'Export download implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error downloading export:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download export'
      });
    }
  }

  /**
   * Refresh all metrics (admin only)
   */
  async refreshAllMetrics(req: Request, res: Response): Promise<void> {
    try {
      await this.analyticsService.updateRealTimeMetrics();
      
      res.status(200).json({
        success: true,
        message: 'All metrics refreshed successfully'
      });
    } catch (error) {
      this.logger.error('Error refreshing metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh metrics'
      });
    }
  }

  /**
   * Get system statistics (admin only)
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for system statistics
      res.status(200).json({
        success: true,
        data: {
          stats: {},
          message: 'System stats implementation pending'
        }
      });
    } catch (error) {
      this.logger.error('Error getting system stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system stats'
      });
    }
  }

  /**
   * Cleanup old data (admin only)
   */
  async cleanupOldData(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for data cleanup
      res.status(200).json({
        success: true,
        message: 'Data cleanup implementation pending'
      });
    } catch (error) {
      this.logger.error('Error cleaning up data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup data'
      });
    }
  }

  /**
   * Utility method to get date range
   */
  private getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case TimeRange.LAST_24_HOURS:
        startDate.setDate(startDate.getDate() - 1);
        break;
      case TimeRange.LAST_7_DAYS:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case TimeRange.LAST_30_DAYS:
        startDate.setDate(startDate.getDate() - 30);
        break;
      case TimeRange.LAST_90_DAYS:
        startDate.setDate(startDate.getDate() - 90);
        break;
      case TimeRange.LAST_YEAR:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }
}
