#!/usr/bin/env ts-node

import axios, { AxiosResponse } from 'axios';
import { performance } from 'perf_hooks';
import { Logger } from '../../shared/utils/Logger';
import { TestUtils, TEST_CONFIG } from '../utils/setup';

const logger = new Logger('LoadTesting');

interface LoadTestConfig {
  baseUrl: string;
  duration: number; // Test duration in seconds
  concurrentUsers: number;
  rampUpTime: number; // Time to reach max users in seconds
  testScenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  weight: number; // Percentage of traffic (0-100)
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: { [key: string]: string };
  body?: any;
  expectedStatus?: number;
  requiresAuth?: boolean;
}

interface LoadTestResult {
  scenario: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: { [key: string]: number };
}

interface LoadTestReport {
  timestamp: string;
  config: LoadTestConfig;
  duration: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  overallRps: number;
  overallErrorRate: number;
  scenarios: LoadTestResult[];
  systemMetrics?: SystemMetrics;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  serviceHealth: { [service: string]: boolean };
}

class LoadTester {
  private config: LoadTestConfig;
  private results: Map<string, LoadTestResult> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private errors: Map<string, Map<string, number>> = new Map();
  private activeUsers: number = 0;
  private testStartTime: number = 0;
  private testEndTime: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.initializeResults();
  }

  // Initialize result tracking for each scenario
  private initializeResults(): void {
    this.config.testScenarios.forEach(scenario => {
      this.results.set(scenario.name, {
        scenario: scenario.name,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        errors: {}
      });
      
      this.responseTimes.set(scenario.name, []);
      this.errors.set(scenario.name, new Map());
    });
  }

  // Run load test
  public async runLoadTest(): Promise<LoadTestReport> {
    logger.info('Starting load test', {
      baseUrl: this.config.baseUrl,
      duration: this.config.duration,
      concurrentUsers: this.config.concurrentUsers,
      scenarios: this.config.testScenarios.length
    });

    this.testStartTime = performance.now();

    try {
      // Start user ramp-up
      await this.rampUpUsers();

      // Run test for specified duration
      await this.runTestDuration();

      // Ramp down users
      await this.rampDownUsers();

      this.testEndTime = performance.now();

      // Calculate final results
      this.calculateResults();

      return this.generateReport();

    } catch (error) {
      logger.error('Load test failed', { error: error.message });
      throw error;
    }
  }

  // Gradually increase number of concurrent users
  private async rampUpUsers(): Promise<void> {
    const rampUpInterval = (this.config.rampUpTime * 1000) / this.config.concurrentUsers;
    
    logger.info('Ramping up users', {
      targetUsers: this.config.concurrentUsers,
      rampUpTime: this.config.rampUpTime,
      interval: rampUpInterval
    });

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      this.startUser();
      this.activeUsers++;
      
      if (i < this.config.concurrentUsers - 1) {
        await this.sleep(rampUpInterval);
      }
    }

    logger.info('All users ramped up', { activeUsers: this.activeUsers });
  }

  // Run test for the specified duration
  private async runTestDuration(): Promise<void> {
    logger.info('Running load test', { duration: this.config.duration });
    
    await this.sleep(this.config.duration * 1000);
    
    logger.info('Load test duration completed');
  }

  // Gradually decrease number of concurrent users
  private async rampDownUsers(): Promise<void> {
    logger.info('Ramping down users');
    
    // In a real implementation, we would gracefully stop user threads
    this.activeUsers = 0;
    
    logger.info('All users ramped down');
  }

  // Start a virtual user
  private startUser(): void {
    // Simulate a user making requests
    this.simulateUser();
  }

  // Simulate user behavior
  private async simulateUser(): Promise<void> {
    const userStartTime = performance.now();
    const userEndTime = userStartTime + (this.config.duration * 1000);

    while (performance.now() < userEndTime) {
      try {
        // Select random scenario based on weights
        const scenario = this.selectScenario();
        
        // Execute request
        await this.executeRequest(scenario);
        
        // Wait between requests (simulate user think time)
        await this.sleep(Math.random() * 2000 + 500); // 0.5-2.5 seconds
        
      } catch (error) {
        // User simulation error - log but continue
        logger.debug('User simulation error', { error: error.message });
      }
    }
  }

  // Select scenario based on weights
  private selectScenario(): TestScenario {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const scenario of this.config.testScenarios) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }

    // Fallback to first scenario
    return this.config.testScenarios[0];
  }

  // Execute a request for a scenario
  private async executeRequest(scenario: TestScenario): Promise<void> {
    const startTime = performance.now();
    
    try {
      const headers = { ...scenario.headers };
      
      // Add authentication if required
      if (scenario.requiresAuth) {
        headers.Authorization = `Bearer ${TestUtils.generateUserToken()}`;
      }

      const response = await axios({
        method: scenario.method,
        url: `${this.config.baseUrl}${scenario.endpoint}`,
        headers,
        data: scenario.body,
        timeout: 30000,
        validateStatus: () => true // Don't throw on any status code
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Record results
      this.recordResult(scenario.name, response, responseTime);

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Record error
      this.recordError(scenario.name, error.message, responseTime);
    }
  }

  // Record successful/failed request result
  private recordResult(scenarioName: string, response: AxiosResponse, responseTime: number): void {
    const result = this.results.get(scenarioName)!;
    const responseTimes = this.responseTimes.get(scenarioName)!;

    result.totalRequests++;
    responseTimes.push(responseTime);

    if (response.status >= 200 && response.status < 400) {
      result.successfulRequests++;
    } else {
      result.failedRequests++;
      
      // Record error type
      const errorKey = `HTTP_${response.status}`;
      const errors = this.errors.get(scenarioName)!;
      errors.set(errorKey, (errors.get(errorKey) || 0) + 1);
    }

    // Update min/max response times
    result.minResponseTime = Math.min(result.minResponseTime, responseTime);
    result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);
  }

  // Record error result
  private recordError(scenarioName: string, errorMessage: string, responseTime: number): void {
    const result = this.results.get(scenarioName)!;
    const responseTimes = this.responseTimes.get(scenarioName)!;

    result.totalRequests++;
    result.failedRequests++;
    responseTimes.push(responseTime);

    // Record error type
    const errors = this.errors.get(scenarioName)!;
    const errorKey = errorMessage.includes('timeout') ? 'TIMEOUT' : 'NETWORK_ERROR';
    errors.set(errorKey, (errors.get(errorKey) || 0) + 1);

    // Update min/max response times
    result.minResponseTime = Math.min(result.minResponseTime, responseTime);
    result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);
  }

  // Calculate final results
  private calculateResults(): void {
    const testDurationMs = this.testEndTime - this.testStartTime;
    const testDurationSec = testDurationMs / 1000;

    this.results.forEach((result, scenarioName) => {
      const responseTimes = this.responseTimes.get(scenarioName)!;
      const errors = this.errors.get(scenarioName)!;

      if (responseTimes.length > 0) {
        // Calculate average response time
        result.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        // Calculate percentiles
        const sortedTimes = responseTimes.sort((a, b) => a - b);
        result.p95ResponseTime = this.calculatePercentile(sortedTimes, 95);
        result.p99ResponseTime = this.calculatePercentile(sortedTimes, 99);

        // Calculate requests per second
        result.requestsPerSecond = result.totalRequests / testDurationSec;

        // Calculate error rate
        result.errorRate = (result.failedRequests / result.totalRequests) * 100;

        // Convert error map to object
        result.errors = Object.fromEntries(errors);
      }

      // Handle case where minResponseTime is still Infinity
      if (result.minResponseTime === Infinity) {
        result.minResponseTime = 0;
      }
    });
  }

  // Calculate percentile from sorted array
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  // Generate load test report
  private generateReport(): LoadTestReport {
    const testDurationMs = this.testEndTime - this.testStartTime;
    const testDurationSec = testDurationMs / 1000;

    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    this.results.forEach(result => {
      totalRequests += result.totalRequests;
      totalSuccessful += result.successfulRequests;
      totalFailed += result.failedRequests;
    });

    const overallRps = totalRequests / testDurationSec;
    const overallErrorRate = totalRequests > 0 ? (totalFailed / totalRequests) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      duration: testDurationSec,
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallRps,
      overallErrorRate,
      scenarios: Array.from(this.results.values())
    };
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Collect system metrics
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, this would collect actual system metrics
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      networkLatency: Math.random() * 100,
      serviceHealth: {
        'user-service': true,
        'asset-service': true,
        'currency-service': true,
        'crypto-service': true,
        'payment-service': true,
        'admin-service': true,
        'notification-service': true
      }
    };
  }
}

// Predefined test scenarios
const DEFAULT_SCENARIOS: TestScenario[] = [
  {
    name: 'User Registration',
    weight: 10,
    endpoint: '/api/users/register',
    method: 'POST',
    body: {
      email: 'loadtest@example.com',
      password: 'LoadTest123!',
      firstName: 'Load',
      lastName: 'Test'
    },
    expectedStatus: 201
  },
  {
    name: 'User Login',
    weight: 15,
    endpoint: '/api/users/login',
    method: 'POST',
    body: {
      email: 'loadtest@example.com',
      password: 'LoadTest123!'
    },
    expectedStatus: 200
  },
  {
    name: 'Get User Profile',
    weight: 20,
    endpoint: '/api/users/profile',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Get Account Balances',
    weight: 15,
    endpoint: '/api/users/accounts/balances',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Get Currency Rates',
    weight: 10,
    endpoint: '/api/currency/rates',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Get Bitcoin Price',
    weight: 10,
    endpoint: '/api/currency/prices/crypto/bitcoin',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Submit Asset Deposit',
    weight: 8,
    endpoint: '/api/assets/deposits',
    method: 'POST',
    requiresAuth: true,
    body: {
      type: 'gold',
      weight: 10.0,
      purity: 0.999,
      description: 'Load test gold deposit'
    },
    expectedStatus: 201
  },
  {
    name: 'Get Transaction History',
    weight: 12,
    endpoint: '/api/users/transactions',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  }
];

// Main execution function
async function runLoadTest(): Promise<void> {
  const config: LoadTestConfig = {
    baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000',
    duration: parseInt(process.env.LOAD_TEST_DURATION || '60'), // 1 minute
    concurrentUsers: parseInt(process.env.LOAD_TEST_USERS || '50'),
    rampUpTime: parseInt(process.env.LOAD_TEST_RAMP_UP || '10'), // 10 seconds
    testScenarios: DEFAULT_SCENARIOS
  };

  const tester = new LoadTester(config);
  
  try {
    // Wait for services to be ready
    logger.info('Waiting for services to be ready...');
    const allReady = await TestUtils.waitForAllServices(60000);
    if (!allReady) {
      throw new Error('Not all services are ready for load testing');
    }

    // Run load test
    const report = await tester.runLoadTest();
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `./load-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.info('Load test completed', {
      reportPath,
      totalRequests: report.totalRequests,
      overallRps: report.overallRps,
      overallErrorRate: report.overallErrorRate
    });

    // Print summary
    console.log('\n=== LOAD TEST SUMMARY ===');
    console.log(`Duration: ${report.duration.toFixed(2)} seconds`);
    console.log(`Total Requests: ${report.totalRequests}`);
    console.log(`Successful Requests: ${report.totalSuccessful}`);
    console.log(`Failed Requests: ${report.totalFailed}`);
    console.log(`Overall RPS: ${report.overallRps.toFixed(2)}`);
    console.log(`Overall Error Rate: ${report.overallErrorRate.toFixed(2)}%`);
    
    console.log('\n=== SCENARIO RESULTS ===');
    report.scenarios.forEach(scenario => {
      console.log(`\n${scenario.scenario}:`);
      console.log(`  Requests: ${scenario.totalRequests}`);
      console.log(`  Success Rate: ${((scenario.successfulRequests / scenario.totalRequests) * 100).toFixed(2)}%`);
      console.log(`  Avg Response Time: ${scenario.averageResponseTime.toFixed(2)}ms`);
      console.log(`  P95 Response Time: ${scenario.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  RPS: ${scenario.requestsPerSecond.toFixed(2)}`);
    });

    // Exit with appropriate code
    const success = report.overallErrorRate < 5; // Less than 5% error rate
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logger.error('Load test failed', { error: error.message });
    process.exit(1);
  }
}

// Run load test if this script is executed directly
if (require.main === module) {
  runLoadTest();
}

export { LoadTester, LoadTestConfig, LoadTestResult, LoadTestReport };

