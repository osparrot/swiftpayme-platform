import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Try to refresh token
        try {
          await authService.refreshToken();
          config.headers = {
            ...config.headers,
            ...authService.getAuthHeaders(),
          };
          const retryResponse = await fetch(url, config);
          return await this.handleResponse(retryResponse);
        } catch (refreshError) {
          // Redirect to login
          localStorage.removeItem('swiftpayme_admin_token');
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }
      }

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Dashboard APIs
  async getDashboardStats() {
    return this.request('/admin/dashboard/stats');
  }

  async getSystemHealth() {
    return this.request('/admin/system/health');
  }

  async getRecentActivity() {
    return this.request('/admin/dashboard/activity');
  }

  // User Management APIs
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserById(userId) {
    return this.request(`/admin/users/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async suspendUser(userId, reason) {
    return this.request(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unsuspendUser(userId) {
    return this.request(`/admin/users/${userId}/unsuspend`, {
      method: 'POST',
    });
  }

  async approveKYC(userId, approvalData) {
    return this.request(`/admin/users/${userId}/kyc/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData),
    });
  }

  async rejectKYC(userId, rejectionData) {
    return this.request(`/admin/users/${userId}/kyc/reject`, {
      method: 'POST',
      body: JSON.stringify(rejectionData),
    });
  }

  // Asset Management APIs
  async getAssetDeposits(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/assets/deposits${queryString ? `?${queryString}` : ''}`);
  }

  async getAssetById(assetId) {
    return this.request(`/admin/assets/${assetId}`);
  }

  async approveAsset(assetId, approvalData) {
    return this.request(`/admin/assets/${assetId}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData),
    });
  }

  async rejectAsset(assetId, rejectionData) {
    return this.request(`/admin/assets/${assetId}/reject`, {
      method: 'POST',
      body: JSON.stringify(rejectionData),
    });
  }

  async updateAssetValuation(assetId, valuationData) {
    return this.request(`/admin/assets/${assetId}/valuation`, {
      method: 'PUT',
      body: JSON.stringify(valuationData),
    });
  }

  // Transaction Management APIs
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getTransactionById(transactionId) {
    return this.request(`/admin/transactions/${transactionId}`);
  }

  async flagTransaction(transactionId, flagData) {
    return this.request(`/admin/transactions/${transactionId}/flag`, {
      method: 'POST',
      body: JSON.stringify(flagData),
    });
  }

  async unflagTransaction(transactionId) {
    return this.request(`/admin/transactions/${transactionId}/unflag`, {
      method: 'POST',
    });
  }

  // Account Management APIs
  async getAccounts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/accounts${queryString ? `?${queryString}` : ''}`);
  }

  async getAccountById(accountId) {
    return this.request(`/admin/accounts/${accountId}`);
  }

  async freezeAccount(accountId, reason) {
    return this.request(`/admin/accounts/${accountId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unfreezeAccount(accountId) {
    return this.request(`/admin/accounts/${accountId}/unfreeze`, {
      method: 'POST',
    });
  }

  async adjustBalance(accountId, adjustmentData) {
    return this.request(`/admin/accounts/${accountId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });
  }

  // Crypto Operations APIs
  async getCryptoTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/crypto/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getCryptoWallets(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/crypto/wallets${queryString ? `?${queryString}` : ''}`);
  }

  async getBitcoinNodeStatus() {
    return this.request('/admin/crypto/bitcoin/status');
  }

  // Analytics APIs
  async getAnalytics(timeframe = '7d') {
    return this.request(`/admin/analytics?timeframe=${timeframe}`);
  }

  async getRevenueAnalytics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/analytics/revenue${queryString ? `?${queryString}` : ''}`);
  }

  async getUserAnalytics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/analytics/users${queryString ? `?${queryString}` : ''}`);
  }

  async getAssetAnalytics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/analytics/assets${queryString ? `?${queryString}` : ''}`);
  }

  // System Management APIs
  async getServiceHealth() {
    return this.request('/admin/system/services');
  }

  async getSystemMetrics() {
    return this.request('/admin/system/metrics');
  }

  async getSystemLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/system/logs${queryString ? `?${queryString}` : ''}`);
  }

  // Notification APIs
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async sendNotification(notificationData) {
    return this.request('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async getNotificationTemplates() {
    return this.request('/admin/notifications/templates');
  }

  async createNotificationTemplate(templateData) {
    return this.request('/admin/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  // Settings APIs
  async getSettings() {
    return this.request('/admin/settings');
  }

  async updateSettings(settingsData) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Reports APIs
  async generateReport(reportType, params = {}) {
    return this.request('/admin/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: reportType, params }),
    });
  }

  async getReports(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/reports${queryString ? `?${queryString}` : ''}`);
  }

  async downloadReport(reportId) {
    const response = await fetch(`${this.baseURL}/admin/reports/${reportId}/download`, {
      headers: authService.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to download report');
    }
    
    return response.blob();
  }
}

export const apiService = new ApiService();

