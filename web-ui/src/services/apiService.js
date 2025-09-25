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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // User Profile Methods
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadKYCDocument(formData) {
    return this.request('/users/kyc/upload', {
      method: 'POST',
      headers: {
        ...authService.getAuthHeaders(),
      },
      body: formData,
    });
  }

  // Account Methods
  async getAccountBalances() {
    return this.request('/accounts/balances');
  }

  async getAccountHistory(accountId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/accounts/${accountId}/history${queryString ? `?${queryString}` : ''}`);
  }

  async convertCurrency(fromCurrency, toCurrency, amount) {
    return this.request('/accounts/convert', {
      method: 'POST',
      body: JSON.stringify({ fromCurrency, toCurrency, amount }),
    });
  }

  // Asset Methods
  async getAssetPrices() {
    return this.request('/assets/prices');
  }

  async submitAssetDeposit(assetData) {
    return this.request('/assets/deposit', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });
  }

  async uploadAssetImages(depositId, formData) {
    return this.request(`/assets/deposit/${depositId}/images`, {
      method: 'POST',
      headers: {
        ...authService.getAuthHeaders(),
      },
      body: formData,
    });
  }

  async getAssetDeposits(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/assets/deposits${queryString ? `?${queryString}` : ''}`);
  }

  async getAssetDeposit(depositId) {
    return this.request(`/assets/deposit/${depositId}`);
  }

  // Crypto/Bitcoin Methods
  async getBitcoinWallet() {
    return this.request('/crypto/wallet');
  }

  async createBitcoinWallet() {
    return this.request('/crypto/wallet', {
      method: 'POST',
    });
  }

  async getBitcoinBalance() {
    return this.request('/crypto/balance');
  }

  async getBitcoinTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/crypto/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async sendBitcoin(toAddress, amount, fee = 'medium') {
    return this.request('/crypto/send', {
      method: 'POST',
      body: JSON.stringify({ toAddress, amount, fee }),
    });
  }

  async buyBitcoin(amount, currency = 'USD') {
    return this.request('/crypto/buy', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  }

  async getBitcoinPrice() {
    return this.request('/crypto/price');
  }

  // Transaction Methods
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getTransaction(transactionId) {
    return this.request(`/transactions/${transactionId}`);
  }

  // Tokenization Methods
  async getTokens(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tokens${queryString ? `?${queryString}` : ''}`);
  }

  async getToken(tokenId) {
    return this.request(`/tokens/${tokenId}`);
  }

  async redeemToken(tokenId, amount) {
    return this.request(`/tokens/${tokenId}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Dashboard Methods
  async getDashboardData() {
    return this.request('/dashboard');
  }

  async getPortfolioSummary() {
    return this.request('/dashboard/portfolio');
  }

  async getRecentActivity(limit = 10) {
    return this.request(`/dashboard/activity?limit=${limit}`);
  }

  // Notification Methods
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Settings Methods
  async getNotificationSettings() {
    return this.request('/settings/notifications');
  }

  async updateNotificationSettings(settings) {
    return this.request('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/settings/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async enable2FA() {
    return this.request('/settings/2fa/enable', {
      method: 'POST',
    });
  }

  async verify2FA(token) {
    return this.request('/settings/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async disable2FA(token) {
    return this.request('/settings/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}

export const apiService = new ApiService();

