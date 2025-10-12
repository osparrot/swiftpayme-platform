import { Logger } from './Logger';

/**
 * Interface for metric data points
 */
export interface MetricDataPoint {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for business metrics
 */
export interface BusinessMetric {
  event: string;
  userId?: string;
  value?: number;
  timestamp: Date;
  properties?: Record<string, any>;
}

/**
 * Metrics collector for monitoring and analytics
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private logger: Logger;
  private metrics: Map<string, MetricDataPoint[]>;
  private performanceMetrics: PerformanceMetric[];
  private businessMetrics: BusinessMetric[];
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private histograms: Map<string, number[]>;

  private constructor() {
    this.logger = new Logger('MetricsCollector');
    this.metrics = new Map();
    this.performanceMetrics = [];
    this.businessMetrics = [];
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();

    // Start periodic cleanup and reporting
    this.startPeriodicTasks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a counter metric (incrementing value)
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    const currentValue = this.counters.get(key) || 0;
    this.counters.set(key, currentValue + value);

    this.recordMetric({
      name,
      value: currentValue + value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Record a gauge metric (current value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);

    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Record a histogram metric (distribution of values)
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Record a timing metric
   */
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.histogram(`${name}.duration`, duration, tags);
    
    this.recordPerformanceMetric({
      operation: name,
      duration,
      success: true,
      timestamp: new Date()
    });
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): () => void {
    const startTime = Date.now();
    
    return (success: boolean = true, tags?: Record<string, string>) => {
      const duration = Date.now() - startTime;
      this.timing(name, duration, tags);
      
      this.recordPerformanceMetric({
        operation: name,
        duration,
        success,
        timestamp: new Date()
      });
    };
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(params: {
    method: string;
    endpoint: string;
    statusCode: number;
    duration: number;
    userId?: string;
  }): void {
    const tags = {
      method: params.method,
      endpoint: params.endpoint,
      status_code: params.statusCode.toString(),
      status_class: `${Math.floor(params.statusCode / 100)}xx`
    };

    this.increment('api.requests.total', 1, tags);
    this.histogram('api.requests.duration', params.duration, tags);

    if (params.statusCode >= 400) {
      this.increment('api.requests.errors', 1, tags);
    }

    if (params.statusCode >= 500) {
      this.increment('api.requests.server_errors', 1, tags);
    }

    this.recordPerformanceMetric({
      operation: `${params.method} ${params.endpoint}`,
      duration: params.duration,
      success: params.statusCode < 400,
      timestamp: new Date(),
      metadata: {
        statusCode: params.statusCode,
        userId: params.userId
      }
    });
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(params: {
    operation: string;
    collection: string;
    duration: number;
    success: boolean;
    recordCount?: number;
  }): void {
    const tags = {
      operation: params.operation,
      collection: params.collection,
      success: params.success.toString()
    };

    this.increment('db.operations.total', 1, tags);
    this.histogram('db.operations.duration', params.duration, tags);

    if (!params.success) {
      this.increment('db.operations.errors', 1, tags);
    }

    if (params.recordCount !== undefined) {
      this.histogram('db.operations.record_count', params.recordCount, tags);
    }

    this.recordPerformanceMetric({
      operation: `db.${params.operation}`,
      duration: params.duration,
      success: params.success,
      timestamp: new Date(),
      metadata: {
        collection: params.collection,
        recordCount: params.recordCount
      }
    });
  }

  /**
   * Record authentication metrics
   */
  recordAuthentication(params: {
    action: 'login' | 'logout' | 'register' | 'password_reset';
    success: boolean;
    method?: string;
    userId?: string;
    duration?: number;
  }): void {
    const tags = {
      action: params.action,
      success: params.success.toString(),
      method: params.method || 'unknown'
    };

    this.increment('auth.attempts.total', 1, tags);

    if (params.success) {
      this.increment('auth.success.total', 1, tags);
    } else {
      this.increment('auth.failures.total', 1, tags);
    }

    this.recordBusinessMetric({
      event: `auth.${params.action}`,
      userId: params.userId,
      timestamp: new Date(),
      properties: {
        success: params.success,
        method: params.method,
        duration: params.duration
      }
    });
  }

  /**
   * Record user activity metrics
   */
  recordUserActivity(params: {
    userId: string;
    action: string;
    resource?: string;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    const tags = {
      action: params.action,
      resource: params.resource || 'unknown'
    };

    this.increment('user.activity.total', 1, tags);
    
    if (params.duration) {
      this.histogram('user.activity.duration', params.duration, tags);
    }

    this.recordBusinessMetric({
      event: 'user.activity',
      userId: params.userId,
      timestamp: new Date(),
      properties: {
        action: params.action,
        resource: params.resource,
        duration: params.duration,
        ...params.metadata
      }
    });
  }

  /**
   * Record business event metrics
   */
  recordBusinessEvent(params: {
    event: string;
    userId?: string;
    value?: number;
    properties?: Record<string, any>;
  }): void {
    this.increment(`business.events.${params.event}`, 1);
    
    if (params.value !== undefined) {
      this.histogram(`business.events.${params.event}.value`, params.value);
    }

    this.recordBusinessMetric({
      event: params.event,
      userId: params.userId,
      value: params.value,
      timestamp: new Date(),
      properties: params.properties
    });
  }

  /**
   * Get current metric values
   */
  getMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }>;
  } {
    const histogramStats: Record<string, any> = {};
    
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        histogramStats[key] = {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(minutes: number = 5): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        operationBreakdown: {}
      };
    }

    const totalOperations = recentMetrics.length;
    const successfulOperations = recentMetrics.filter(m => m.success).length;
    const successRate = (successfulOperations / totalOperations) * 100;
    const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;

    // Group by operation
    const operationGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);

    const operationBreakdown: Record<string, any> = {};
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const count = metrics.length;
      const successful = metrics.filter(m => m.success).length;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / count;
      
      operationBreakdown[operation] = {
        count,
        avgDuration: Math.round(avgDuration * 100) / 100,
        successRate: Math.round((successful / count) * 100 * 100) / 100
      };
    }

    return {
      totalOperations,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
      operationBreakdown
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${value}`);
    }

    // Export gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${key} ${value}`);
    }

    // Export histograms
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        lines.push(`# TYPE ${key} histogram`);
        lines.push(`${key}_count ${values.length}`);
        lines.push(`${key}_sum ${values.reduce((a, b) => a + b, 0)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Record a generic metric
   */
  private recordMetric(metric: MetricDataPoint): void {
    const key = metric.name;
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);
    
    // Keep only last 1000 data points per metric
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.metrics.set(key, metrics);
  }

  /**
   * Record a performance metric
   */
  private recordPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    
    // Keep only last 10000 performance metrics
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Record a business metric
   */
  private recordBusinessMetric(metric: BusinessMetric): void {
    this.businessMetrics.push(metric);
    
    // Keep only last 5000 business metrics
    if (this.businessMetrics.length > 5000) {
      this.businessMetrics.shift();
    }
  }

  /**
   * Generate metric key with tags
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');

    return `${name}{${tagString}}`;
  }

  /**
   * Start periodic tasks for cleanup and reporting
   */
  private startPeriodicTasks(): void {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);

    // Log performance summary every minute
    setInterval(() => {
      const summary = this.getPerformanceSummary(1);
      if (summary.totalOperations > 0) {
        this.logger.info('Performance summary', summary);
      }
    }, 60 * 1000);
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    // Clean up performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);

    // Clean up business metrics
    this.businessMetrics = this.businessMetrics.filter(m => m.timestamp >= cutoff);

    // Clean up histogram values older than 1 hour
    const histogramCutoff = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, values] of this.histograms.entries()) {
      // For histograms, we keep all values but limit the count
      if (values.length > 1000) {
        this.histograms.set(key, values.slice(-1000));
      }
    }
  }
}

export default MetricsCollector;
