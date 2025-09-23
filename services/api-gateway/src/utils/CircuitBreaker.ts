/**
 * SwiftPayMe API Gateway - Circuit Breaker Utility
 * Implements circuit breaker pattern for service reliability
 */

import { EventEmitter } from 'events';
import { Logger } from './Logger';

// ==================== INTERFACES ====================
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrorRate?: number;
  minimumRequests?: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  errorRate: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  averageResponseTime: number;
  lastResetTime: Date;
  stateChanges: Array<{
    from: string;
    to: string;
    timestamp: Date;
    reason: string;
  }>;
}

// ==================== CIRCUIT BREAKER CLASS ====================
export class CircuitBreaker extends EventEmitter {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;
  private metrics: CircuitBreakerMetrics;
  private logger: Logger;
  private monitoringTimer?: NodeJS.Timeout;
  private responseTimes: number[] = [];

  constructor(config: CircuitBreakerConfig) {
    super();
    
    this.config = {
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout,
      monitoringPeriod: config.monitoringPeriod,
      expectedErrorRate: config.expectedErrorRate || 0.5, // 50% error rate threshold
      minimumRequests: config.minimumRequests || 10
    };

    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      errorRate: 0
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastResetTime: new Date(),
      stateChanges: []
    };

    this.logger = new Logger('CircuitBreaker');
    this.startMonitoring();
  }

  // ==================== PUBLIC METHODS ====================
  
  /**
   * Check if the circuit breaker allows execution
   */
  public canExecute(): boolean {
    const now = new Date();

    switch (this.state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (this.state.nextAttemptTime && now >= this.state.nextAttemptTime) {
          this.changeState('HALF_OPEN', 'Recovery timeout reached');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  public recordSuccess(responseTime?: number): void {
    this.state.successCount++;
    this.state.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.totalRequests++;

    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }

    this.updateErrorRate();

    // Reset failure count on success in HALF_OPEN state
    if (this.state.state === 'HALF_OPEN') {
      this.state.failureCount = 0;
      
      // If we have enough successful requests, close the circuit
      if (this.state.successCount >= this.config.minimumRequests / 2) {
        this.changeState('CLOSED', 'Sufficient successful requests in HALF_OPEN state');
      }
    }

    this.emit('success', {
      state: this.state.state,
      responseTime,
      timestamp: new Date()
    });
  }

  /**
   * Record a failed execution
   */
  public recordFailure(error?: Error, responseTime?: number): void {
    this.state.failureCount++;
    this.state.totalRequests++;
    this.state.lastFailureTime = new Date();
    this.metrics.failedRequests++;
    this.metrics.totalRequests++;

    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }

    this.updateErrorRate();

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.openCircuit('Failure threshold exceeded');
    }

    this.emit('failure', {
      state: this.state.state,
      error: error?.message,
      responseTime,
      timestamp: new Date()
    });
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    return {
      ...this.metrics,
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  public reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      errorRate: 0
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastResetTime: new Date(),
      stateChanges: []
    };

    this.responseTimes = [];

    this.logger.info('Circuit breaker reset');
    this.emit('reset', { timestamp: new Date() });
  }

  /**
   * Manually open the circuit
   */
  public open(reason: string = 'Manual intervention'): void {
    this.openCircuit(reason);
  }

  /**
   * Manually close the circuit
   */
  public close(reason: string = 'Manual intervention'): void {
    this.changeState('CLOSED', reason);
  }

  /**
   * Destroy circuit breaker and cleanup resources
   */
  public destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    this.removeAllListeners();
  }

  // ==================== PRIVATE METHODS ====================

  private shouldOpenCircuit(): boolean {
    // Need minimum requests before considering opening
    if (this.state.totalRequests < this.config.minimumRequests) {
      return false;
    }

    // Check failure count threshold
    if (this.state.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check error rate threshold
    if (this.state.errorRate >= this.config.expectedErrorRate) {
      return true;
    }

    return false;
  }

  private openCircuit(reason: string): void {
    const nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.state.nextAttemptTime = nextAttemptTime;
    
    this.changeState('OPEN', reason);
    
    this.logger.warn('Circuit breaker opened', {
      reason,
      failureCount: this.state.failureCount,
      errorRate: this.state.errorRate,
      nextAttemptTime
    });
  }

  private changeState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN', reason: string): void {
    const oldState = this.state.state;
    
    if (oldState === newState) {
      return;
    }

    this.state.state = newState;

    // Reset counters on state change
    if (newState === 'CLOSED') {
      this.state.failureCount = 0;
      this.state.successCount = 0;
      this.state.nextAttemptTime = undefined;
    } else if (newState === 'HALF_OPEN') {
      this.state.successCount = 0;
    }

    // Record state change
    const stateChange = {
      from: oldState,
      to: newState,
      timestamp: new Date(),
      reason
    };

    this.metrics.stateChanges.push(stateChange);

    // Keep only last 100 state changes
    if (this.metrics.stateChanges.length > 100) {
      this.metrics.stateChanges = this.metrics.stateChanges.slice(-100);
    }

    this.logger.info('Circuit breaker state changed', stateChange);
    this.emit('stateChange', stateChange);
  }

  private updateErrorRate(): void {
    if (this.state.totalRequests === 0) {
      this.state.errorRate = 0;
      this.metrics.errorRate = 0;
      return;
    }

    this.state.errorRate = this.state.failureCount / this.state.totalRequests;
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }

    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimes.length;
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoringPeriod);
  }

  private performHealthCheck(): void {
    const now = new Date();
    const timeSinceLastReset = now.getTime() - this.metrics.lastResetTime.getTime();
    
    // Reset counters every hour to prevent stale data
    if (timeSinceLastReset > 60 * 60 * 1000) {
      this.resetCounters();
    }

    // Emit health check event
    this.emit('healthCheck', {
      state: this.getState(),
      metrics: this.getMetrics(),
      timestamp: now
    });
  }

  private resetCounters(): void {
    // Keep overall metrics but reset current window counters
    this.state.failureCount = 0;
    this.state.successCount = 0;
    this.state.totalRequests = 0;
    this.state.errorRate = 0;
    
    this.metrics.lastResetTime = new Date();
    
    this.logger.debug('Circuit breaker counters reset');
  }

  // ==================== STATIC FACTORY METHODS ====================

  /**
   * Create a circuit breaker with default configuration for HTTP services
   */
  public static forHttpService(serviceName: string): CircuitBreaker {
    return new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      expectedErrorRate: 0.5, // 50%
      minimumRequests: 10
    });
  }

  /**
   * Create a circuit breaker with configuration for database services
   */
  public static forDatabase(serviceName: string): CircuitBreaker {
    return new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 5000, // 5 seconds
      expectedErrorRate: 0.2, // 20%
      minimumRequests: 5
    });
  }

  /**
   * Create a circuit breaker with configuration for external APIs
   */
  public static forExternalApi(serviceName: string): CircuitBreaker {
    return new CircuitBreaker({
      failureThreshold: 10,
      recoveryTimeout: 120000, // 2 minutes
      monitoringPeriod: 15000, // 15 seconds
      expectedErrorRate: 0.3, // 30%
      minimumRequests: 20
    });
  }
}

export default CircuitBreaker;

