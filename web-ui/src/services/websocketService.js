class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.messageQueue = [];
  }

  connect(token) {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
      this.socket = new WebSocket(`${wsUrl}?token=${token}`);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

      console.log('WebSocket connection initiated');
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  handleOpen(event) {
    console.log('WebSocket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.flushMessageQueue();
    
    // Notify listeners
    this.emit('connected', { timestamp: new Date() });
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      // Handle different message types
      switch (data.type) {
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
        case 'notification':
          this.handleNotification(data);
          break;
        case 'price_update':
          this.handlePriceUpdate(data);
          break;
        case 'transaction_update':
          this.handleTransactionUpdate(data);
          break;
        case 'asset_status_update':
          this.handleAssetStatusUpdate(data);
          break;
        case 'balance_update':
          this.handleBalanceUpdate(data);
          break;
        case 'market_alert':
          this.handleMarketAlert(data);
          break;
        default:
          console.warn('Unknown message type:', data.type);
          this.emit('message', data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  handleClose(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date()
    });

    // Attempt to reconnect unless it was a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    this.emit('error', { error, timestamp: new Date() });
  }

  handleHeartbeat(data) {
    // Respond to server heartbeat
    this.send({
      type: 'heartbeat_response',
      timestamp: new Date().toISOString()
    });
  }

  handleNotification(data) {
    console.log('New notification:', data.payload);
    this.emit('notification', {
      id: data.payload.id,
      type: data.payload.type,
      category: data.payload.category,
      title: data.payload.title,
      message: data.payload.message,
      timestamp: new Date(data.payload.timestamp),
      actionUrl: data.payload.actionUrl,
      read: false
    });
  }

  handlePriceUpdate(data) {
    console.log('Price update:', data.payload);
    this.emit('price_update', {
      asset: data.payload.asset,
      price: data.payload.price,
      change: data.payload.change,
      changePercent: data.payload.changePercent,
      timestamp: new Date(data.payload.timestamp)
    });
  }

  handleTransactionUpdate(data) {
    console.log('Transaction update:', data.payload);
    this.emit('transaction_update', {
      transactionId: data.payload.transactionId,
      status: data.payload.status,
      type: data.payload.type,
      amount: data.payload.amount,
      currency: data.payload.currency,
      timestamp: new Date(data.payload.timestamp)
    });
  }

  handleAssetStatusUpdate(data) {
    console.log('Asset status update:', data.payload);
    this.emit('asset_status_update', {
      assetId: data.payload.assetId,
      status: data.payload.status,
      stage: data.payload.stage,
      message: data.payload.message,
      timestamp: new Date(data.payload.timestamp)
    });
  }

  handleBalanceUpdate(data) {
    console.log('Balance update:', data.payload);
    this.emit('balance_update', {
      currency: data.payload.currency,
      balance: data.payload.balance,
      available: data.payload.available,
      pending: data.payload.pending,
      timestamp: new Date(data.payload.timestamp)
    });
  }

  handleMarketAlert(data) {
    console.log('Market alert:', data.payload);
    this.emit('market_alert', {
      asset: data.payload.asset,
      alertType: data.payload.alertType,
      threshold: data.payload.threshold,
      currentValue: data.payload.currentValue,
      message: data.payload.message,
      timestamp: new Date(data.payload.timestamp)
    });
  }

  send(data) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(data));
        console.log('WebSocket message sent:', data);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(data);
      }
    } else {
      console.warn('WebSocket not connected, queueing message');
      this.queueMessage(data);
    }
  }

  queueMessage(data) {
    this.messageQueue.push(data);
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  unsubscribe(eventType, callback) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  emit(eventType, data) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, error);
        }
      });
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.lastToken);
      }, delay);
    } else {
      console.error('Max WebSocket reconnect attempts reached');
      this.emit('max_reconnect_attempts_reached', {
        attempts: this.reconnectAttempts,
        timestamp: new Date()
      });
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket');
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket ? this.socket.readyState : WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  // Convenience methods for specific subscriptions
  subscribeToNotifications(callback) {
    return this.subscribe('notification', callback);
  }

  subscribeToPriceUpdates(callback) {
    return this.subscribe('price_update', callback);
  }

  subscribeToTransactionUpdates(callback) {
    return this.subscribe('transaction_update', callback);
  }

  subscribeToAssetUpdates(callback) {
    return this.subscribe('asset_status_update', callback);
  }

  subscribeToBalanceUpdates(callback) {
    return this.subscribe('balance_update', callback);
  }

  subscribeToMarketAlerts(callback) {
    return this.subscribe('market_alert', callback);
  }

  // Request specific data updates
  requestPriceUpdate(assets = []) {
    this.send({
      type: 'request_price_update',
      assets: assets,
      timestamp: new Date().toISOString()
    });
  }

  requestBalanceUpdate() {
    this.send({
      type: 'request_balance_update',
      timestamp: new Date().toISOString()
    });
  }

  requestTransactionUpdate(transactionId) {
    this.send({
      type: 'request_transaction_update',
      transactionId: transactionId,
      timestamp: new Date().toISOString()
    });
  }

  // Set user preferences
  setNotificationPreferences(preferences) {
    this.send({
      type: 'set_notification_preferences',
      preferences: preferences,
      timestamp: new Date().toISOString()
    });
  }

  setPriceAlerts(alerts) {
    this.send({
      type: 'set_price_alerts',
      alerts: alerts,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
