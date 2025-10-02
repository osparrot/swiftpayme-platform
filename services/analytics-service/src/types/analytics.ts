export enum AnalyticsReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum MetricType {
  USER = 'user',
  TRANSACTION = 'transaction',
  ASSET = 'asset',
  REVENUE = 'revenue',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

export enum TimeRange {
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

export interface AnalyticsQuery {
  type: AnalyticsReportType;
  startDate: Date;
  endDate: Date;
  includeComparisons?: boolean;
  includeTrends?: boolean;
  includeForecasts?: boolean;
  filters?: {
    userSegments?: string[];
    currencies?: string[];
    assetTypes?: string[];
    transactionTypes?: string[];
  };
}

export interface DashboardMetrics {
  users: UserAnalytics;
  transactions: TransactionAnalytics;
  assets: AssetAnalytics;
  revenue: RevenueAnalytics;
  generatedAt: Date;
  timeRange: TimeRange;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  userRetentionRate: number;
  topCountries: CountryMetric[];
  userSegments: { [key: string]: number };
}

export interface TransactionAnalytics {
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  successRate: number;
  failureRate: number;
  transactionGrowthRate: number;
  topCurrencies: CurrencyMetric[];
  transactionsByType: { [key: string]: number };
  hourlyDistribution: HourlyMetric[];
}

export interface AssetAnalytics {
  totalAssets: number;
  totalValue: number;
  averageAssetValue: number;
  approvalRate: number;
  rejectionRate: number;
  assetGrowthRate: number;
  topAssetTypes: AssetTypeMetric[];
  assetsByStatus: { [key: string]: number };
  averageProcessingTime: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowthRate: number;
  averageRevenuePerUser: number;
  revenueBySource: { [key: string]: number };
  revenueByCurrency: { [key: string]: number };
  monthlyRecurringRevenue: number;
  customerLifetimeValue: number;
  churnRate: number;
}

export interface CountryMetric {
  country: string;
  countryCode: string;
  userCount: number;
  percentage: number;
}

export interface CurrencyMetric {
  currency: string;
  transactionCount: number;
  totalVolume: number;
  percentage: number;
}

export interface AssetTypeMetric {
  assetType: string;
  assetCount: number;
  totalValue: number;
  percentage: number;
}

export interface HourlyMetric {
  hour: number;
  transactionCount: number;
  totalVolume: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SecurityMetrics {
  loginAttempts: number;
  failedLogins: number;
  suspiciousActivities: number;
  blockedIPs: number;
  securityAlerts: number;
  twoFactorAdoption: number;
}

export interface AnalyticsReport {
  id: string;
  type: AnalyticsReportType;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    users?: UserAnalytics;
    transactions?: TransactionAnalytics;
    assets?: AssetAnalytics;
    revenue?: RevenueAnalytics;
    performance?: PerformanceMetrics;
    security?: SecurityMetrics;
  };
  insights: string[];
  recommendations: string[];
  charts?: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  categories?: string[];
}

export interface KPIMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface Cohort {
  cohortDate: Date;
  userCount: number;
  retentionRates: { [period: string]: number };
}

export interface FunnelStep {
  step: string;
  userCount: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface GeographicData {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  userCount: number;
  transactionVolume: number;
  revenue: number;
  coordinates?: [number, number];
}

export interface TrendData {
  date: Date;
  value: number;
  metric: string;
}

export interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  period: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  isActive: boolean;
  recipients: string[];
  lastTriggered?: Date;
}

export interface AnalyticsAlert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  formula: string;
  unit: string;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataExport {
  id: string;
  type: 'csv' | 'xlsx' | 'json' | 'pdf';
  query: AnalyticsQuery;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface AnalyticsPermission {
  userId: string;
  permissions: {
    viewDashboard: boolean;
    viewReports: boolean;
    createReports: boolean;
    exportData: boolean;
    manageAlerts: boolean;
    viewSensitiveData: boolean;
  };
  dataAccess: {
    userMetrics: boolean;
    transactionMetrics: boolean;
    assetMetrics: boolean;
    revenueMetrics: boolean;
    performanceMetrics: boolean;
    securityMetrics: boolean;
  };
}

export interface AnalyticsConfiguration {
  dataRetentionDays: number;
  reportGenerationSchedule: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  realTimeUpdates: {
    enabled: boolean;
    intervalMinutes: number;
  };
  alerting: {
    enabled: boolean;
    channels: string[];
  };
  dataPrivacy: {
    anonymizeUserData: boolean;
    excludeSensitiveFields: string[];
  };
}
