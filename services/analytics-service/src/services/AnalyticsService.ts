import { Logger } from '../utils/Logger';
import { AnalyticsReport } from '../models/AnalyticsReport';
import { UserMetrics } from '../models/UserMetrics';
import { TransactionMetrics } from '../models/TransactionMetrics';
import { AssetMetrics } from '../models/AssetMetrics';
import { RevenueMetrics } from '../models/RevenueMetrics';
import { 
  AnalyticsReportType, 
  MetricType, 
  TimeRange,
  AnalyticsQuery,
  DashboardMetrics,
  UserAnalytics,
  TransactionAnalytics,
  AssetAnalytics,
  RevenueAnalytics
} from '../types/analytics';
import axios from 'axios';

export class AnalyticsService {
  private readonly logger = new Logger('AnalyticsService');
  private readonly apiBaseUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';

  /**
   * Generate daily analytics report
   */
  async generateDailyReport(): Promise<void> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const report = await this.generateReport({
        type: AnalyticsReportType.DAILY,
        startDate: yesterday,
        endDate: today,
        includeComparisons: true
      });

      await this.saveReport(report);
      this.logger.info('Daily analytics report generated successfully');
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Generate weekly analytics report
   */
  async generateWeeklyReport(): Promise<void> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const report = await this.generateReport({
        type: AnalyticsReportType.WEEKLY,
        startDate: weekAgo,
        endDate: today,
        includeComparisons: true,
        includeTrends: true
      });

      await this.saveReport(report);
      this.logger.info('Weekly analytics report generated successfully');
    } catch (error) {
      this.logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  /**
   * Generate monthly analytics report
   */
  async generateMonthlyReport(): Promise<void> {
    try {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const report = await this.generateReport({
        type: AnalyticsReportType.MONTHLY,
        startDate: monthAgo,
        endDate: today,
        includeComparisons: true,
        includeTrends: true,
        includeForecasts: true
      });

      await this.saveReport(report);
      this.logger.info('Monthly analytics report generated successfully');
    } catch (error) {
      this.logger.error('Error generating monthly report:', error);
      throw error;
    }
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics(): Promise<void> {
    try {
      const metrics = await this.collectRealTimeMetrics();
      
      // Update user metrics
      await this.updateUserMetrics(metrics.users);
      
      // Update transaction metrics
      await this.updateTransactionMetrics(metrics.transactions);
      
      // Update asset metrics
      await this.updateAssetMetrics(metrics.assets);
      
      // Update revenue metrics
      await this.updateRevenueMetrics(metrics.revenue);

      this.logger.debug('Real-time metrics updated successfully');
    } catch (error) {
      this.logger.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(query: AnalyticsQuery): Promise<any> {
    try {
      const report = {
        id: this.generateReportId(),
        type: query.type,
        generatedAt: new Date(),
        period: {
          startDate: query.startDate,
          endDate: query.endDate
        },
        metrics: {},
        insights: [],
        recommendations: []
      };

      // Collect user analytics
      report.metrics.users = await this.getUserAnalytics(query.startDate, query.endDate);
      
      // Collect transaction analytics
      report.metrics.transactions = await this.getTransactionAnalytics(query.startDate, query.endDate);
      
      // Collect asset analytics
      report.metrics.assets = await this.getAssetAnalytics(query.startDate, query.endDate);
      
      // Collect revenue analytics
      report.metrics.revenue = await this.getRevenueAnalytics(query.startDate, query.endDate);

      // Generate insights
      if (query.includeComparisons) {
        report.insights.push(...await this.generateComparativeInsights(report.metrics, query));
      }

      if (query.includeTrends) {
        report.insights.push(...await this.generateTrendInsights(report.metrics, query));
      }

      if (query.includeForecasts) {
        report.recommendations.push(...await this.generateForecasts(report.metrics, query));
      }

      return report;
    } catch (error) {
      this.logger.error('Error generating analytics report:', error);
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Promise<DashboardMetrics> {
    try {
      const { startDate, endDate } = this.getDateRange(timeRange);

      const [users, transactions, assets, revenue] = await Promise.all([
        this.getUserAnalytics(startDate, endDate),
        this.getTransactionAnalytics(startDate, endDate),
        this.getAssetAnalytics(startDate, endDate),
        this.getRevenueAnalytics(startDate, endDate)
      ]);

      return {
        users,
        transactions,
        assets,
        revenue,
        generatedAt: new Date(),
        timeRange
      };
    } catch (error) {
      this.logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Collect real-time metrics from all services
   */
  private async collectRealTimeMetrics(): Promise<any> {
    try {
      const [userStats, transactionStats, assetStats, revenueStats] = await Promise.all([
        this.fetchServiceMetrics('/api/users/stats'),
        this.fetchServiceMetrics('/api/transactions/stats'),
        this.fetchServiceMetrics('/api/assets/stats'),
        this.fetchServiceMetrics('/api/payments/revenue-stats')
      ]);

      return {
        users: userStats,
        transactions: transactionStats,
        assets: assetStats,
        revenue: revenueStats
      };
    } catch (error) {
      this.logger.error('Error collecting real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  private async getUserAnalytics(startDate: Date, endDate: Date): Promise<UserAnalytics> {
    try {
      const userStats = await this.fetchServiceMetrics('/api/users/analytics', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return {
        totalUsers: userStats.totalUsers || 0,
        newUsers: userStats.newUsers || 0,
        activeUsers: userStats.activeUsers || 0,
        verifiedUsers: userStats.verifiedUsers || 0,
        userGrowthRate: userStats.userGrowthRate || 0,
        averageSessionDuration: userStats.averageSessionDuration || 0,
        userRetentionRate: userStats.userRetentionRate || 0,
        topCountries: userStats.topCountries || [],
        userSegments: userStats.userSegments || {}
      };
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
      return this.getDefaultUserAnalytics();
    }
  }

  /**
   * Get transaction analytics
   */
  private async getTransactionAnalytics(startDate: Date, endDate: Date): Promise<TransactionAnalytics> {
    try {
      const transactionStats = await this.fetchServiceMetrics('/api/transactions/analytics', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return {
        totalTransactions: transactionStats.totalTransactions || 0,
        totalVolume: transactionStats.totalVolume || 0,
        averageTransactionValue: transactionStats.averageTransactionValue || 0,
        successRate: transactionStats.successRate || 0,
        failureRate: transactionStats.failureRate || 0,
        transactionGrowthRate: transactionStats.transactionGrowthRate || 0,
        topCurrencies: transactionStats.topCurrencies || [],
        transactionsByType: transactionStats.transactionsByType || {},
        hourlyDistribution: transactionStats.hourlyDistribution || []
      };
    } catch (error) {
      this.logger.error('Error getting transaction analytics:', error);
      return this.getDefaultTransactionAnalytics();
    }
  }

  /**
   * Get asset analytics
   */
  private async getAssetAnalytics(startDate: Date, endDate: Date): Promise<AssetAnalytics> {
    try {
      const assetStats = await this.fetchServiceMetrics('/api/assets/analytics', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return {
        totalAssets: assetStats.totalAssets || 0,
        totalValue: assetStats.totalValue || 0,
        averageAssetValue: assetStats.averageAssetValue || 0,
        approvalRate: assetStats.approvalRate || 0,
        rejectionRate: assetStats.rejectionRate || 0,
        assetGrowthRate: assetStats.assetGrowthRate || 0,
        topAssetTypes: assetStats.topAssetTypes || [],
        assetsByStatus: assetStats.assetsByStatus || {},
        averageProcessingTime: assetStats.averageProcessingTime || 0
      };
    } catch (error) {
      this.logger.error('Error getting asset analytics:', error);
      return this.getDefaultAssetAnalytics();
    }
  }

  /**
   * Get revenue analytics
   */
  private async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<RevenueAnalytics> {
    try {
      const revenueStats = await this.fetchServiceMetrics('/api/payments/revenue-analytics', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return {
        totalRevenue: revenueStats.totalRevenue || 0,
        revenueGrowthRate: revenueStats.revenueGrowthRate || 0,
        averageRevenuePerUser: revenueStats.averageRevenuePerUser || 0,
        revenueBySource: revenueStats.revenueBySource || {},
        revenueByCurrency: revenueStats.revenueByCurrency || {},
        monthlyRecurringRevenue: revenueStats.monthlyRecurringRevenue || 0,
        customerLifetimeValue: revenueStats.customerLifetimeValue || 0,
        churnRate: revenueStats.churnRate || 0
      };
    } catch (error) {
      this.logger.error('Error getting revenue analytics:', error);
      return this.getDefaultRevenueAnalytics();
    }
  }

  /**
   * Fetch metrics from a service endpoint
   */
  private async fetchServiceMetrics(endpoint: string, params?: any): Promise<any> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}${endpoint}`, {
        params,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch metrics from ${endpoint}:`, error.message);
      return {};
    }
  }

  /**
   * Update user metrics in database
   */
  private async updateUserMetrics(metrics: UserAnalytics): Promise<void> {
    try {
      await UserMetrics.findOneAndUpdate(
        { date: new Date().toDateString() },
        { ...metrics, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error updating user metrics:', error);
    }
  }

  /**
   * Update transaction metrics in database
   */
  private async updateTransactionMetrics(metrics: TransactionAnalytics): Promise<void> {
    try {
      await TransactionMetrics.findOneAndUpdate(
        { date: new Date().toDateString() },
        { ...metrics, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error updating transaction metrics:', error);
    }
  }

  /**
   * Update asset metrics in database
   */
  private async updateAssetMetrics(metrics: AssetAnalytics): Promise<void> {
    try {
      await AssetMetrics.findOneAndUpdate(
        { date: new Date().toDateString() },
        { ...metrics, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error updating asset metrics:', error);
    }
  }

  /**
   * Update revenue metrics in database
   */
  private async updateRevenueMetrics(metrics: RevenueAnalytics): Promise<void> {
    try {
      await RevenueMetrics.findOneAndUpdate(
        { date: new Date().toDateString() },
        { ...metrics, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error('Error updating revenue metrics:', error);
    }
  }

  /**
   * Save analytics report to database
   */
  private async saveReport(report: any): Promise<void> {
    try {
      const analyticsReport = new AnalyticsReport(report);
      await analyticsReport.save();
      this.logger.info(`Analytics report ${report.id} saved successfully`);
    } catch (error) {
      this.logger.error('Error saving analytics report:', error);
      throw error;
    }
  }

  /**
   * Generate comparative insights
   */
  private async generateComparativeInsights(metrics: any, query: AnalyticsQuery): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Compare with previous period
      const previousPeriod = this.getPreviousPeriod(query.startDate, query.endDate);
      const previousMetrics = await this.getMetricsForPeriod(previousPeriod.start, previousPeriod.end);

      // User growth insights
      if (metrics.users.userGrowthRate > 0) {
        insights.push(`User base grew by ${metrics.users.userGrowthRate.toFixed(1)}% compared to the previous period`);
      }

      // Transaction volume insights
      if (metrics.transactions.totalVolume > previousMetrics.transactions?.totalVolume) {
        const growth = ((metrics.transactions.totalVolume - previousMetrics.transactions.totalVolume) / previousMetrics.transactions.totalVolume * 100);
        insights.push(`Transaction volume increased by ${growth.toFixed(1)}% compared to the previous period`);
      }

      // Revenue insights
      if (metrics.revenue.revenueGrowthRate > 0) {
        insights.push(`Revenue grew by ${metrics.revenue.revenueGrowthRate.toFixed(1)}% compared to the previous period`);
      }

    } catch (error) {
      this.logger.error('Error generating comparative insights:', error);
    }

    return insights;
  }

  /**
   * Generate trend insights
   */
  private async generateTrendInsights(metrics: any, query: AnalyticsQuery): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Analyze trends based on historical data
      if (metrics.users.userGrowthRate > 10) {
        insights.push('Strong user acquisition trend detected');
      }

      if (metrics.transactions.successRate > 95) {
        insights.push('Excellent transaction success rate maintained');
      }

      if (metrics.assets.approvalRate > 80) {
        insights.push('High asset approval rate indicates quality submissions');
      }

    } catch (error) {
      this.logger.error('Error generating trend insights:', error);
    }

    return insights;
  }

  /**
   * Generate forecasts and recommendations
   */
  private async generateForecasts(metrics: any, query: AnalyticsQuery): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Revenue forecasting
      if (metrics.revenue.revenueGrowthRate > 0) {
        const projectedRevenue = metrics.revenue.totalRevenue * (1 + metrics.revenue.revenueGrowthRate / 100);
        recommendations.push(`Projected revenue for next period: $${projectedRevenue.toFixed(2)}`);
      }

      // User growth recommendations
      if (metrics.users.userGrowthRate < 5) {
        recommendations.push('Consider implementing user acquisition campaigns to boost growth');
      }

      // Transaction optimization
      if (metrics.transactions.failureRate > 5) {
        recommendations.push('Review transaction failure causes to improve success rate');
      }

    } catch (error) {
      this.logger.error('Error generating forecasts:', error);
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
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

  private getPreviousPeriod(startDate: Date, endDate: Date): { start: Date; end: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    const end = new Date(startDate.getTime() - 1);
    const start = new Date(end.getTime() - duration);
    return { start, end };
  }

  private async getMetricsForPeriod(startDate: Date, endDate: Date): Promise<any> {
    // Implementation would fetch historical metrics for comparison
    return {
      users: this.getDefaultUserAnalytics(),
      transactions: this.getDefaultTransactionAnalytics(),
      assets: this.getDefaultAssetAnalytics(),
      revenue: this.getDefaultRevenueAnalytics()
    };
  }

  private getDefaultUserAnalytics(): UserAnalytics {
    return {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      userGrowthRate: 0,
      averageSessionDuration: 0,
      userRetentionRate: 0,
      topCountries: [],
      userSegments: {}
    };
  }

  private getDefaultTransactionAnalytics(): TransactionAnalytics {
    return {
      totalTransactions: 0,
      totalVolume: 0,
      averageTransactionValue: 0,
      successRate: 0,
      failureRate: 0,
      transactionGrowthRate: 0,
      topCurrencies: [],
      transactionsByType: {},
      hourlyDistribution: []
    };
  }

  private getDefaultAssetAnalytics(): AssetAnalytics {
    return {
      totalAssets: 0,
      totalValue: 0,
      averageAssetValue: 0,
      approvalRate: 0,
      rejectionRate: 0,
      assetGrowthRate: 0,
      topAssetTypes: [],
      assetsByStatus: {},
      averageProcessingTime: 0
    };
  }

  private getDefaultRevenueAnalytics(): RevenueAnalytics {
    return {
      totalRevenue: 0,
      revenueGrowthRate: 0,
      averageRevenuePerUser: 0,
      revenueBySource: {},
      revenueByCurrency: {},
      monthlyRecurringRevenue: 0,
      customerLifetimeValue: 0,
      churnRate: 0
    };
  }
}
