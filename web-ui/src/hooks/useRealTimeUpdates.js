import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

export const useRealTimeUpdates = (options = {}) => {
  const {
    enableNotifications = true,
    enablePriceUpdates = true,
    enableTransactionUpdates = true,
    enableAssetUpdates = true,
    enableBalanceUpdates = true,
    enableMarketAlerts = true,
    autoConnect = true
  } = options;

  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const [notifications, setNotifications] = useState([]);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [balanceUpdates, setBalanceUpdates] = useState({});
  const [transactionUpdates, setTransactionUpdates] = useState([]);
  const [assetUpdates, setAssetUpdates] = useState([]);
  const [marketAlerts, setMarketAlerts] = useState([]);

  const unsubscribeRefs = useRef([]);

  // Connection management
  const connect = useCallback((token) => {
    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
    websocketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setConnectionState(prev => ({ ...prev, isConnecting: false }));
  }, []);

  // Event handlers
  const handleConnected = useCallback(() => {
    setConnectionState({
      isConnected: true,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0
    });
  }, []);

  const handleDisconnected = useCallback((data) => {
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: data.reason !== 'Client disconnect' ? data.reason : null
    }));
  }, []);

  const handleError = useCallback((data) => {
    setConnectionState(prev => ({
      ...prev,
      error: data.error.message || 'WebSocket error',
      isConnecting: false
    }));
  }, []);

  const handleMaxReconnectAttempts = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      error: 'Failed to reconnect after maximum attempts',
      isConnecting: false
    }));
  }, []);

  // Data handlers
  const handleNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100
  }, []);

  const handlePriceUpdate = useCallback((update) => {
    setPriceUpdates(prev => ({
      ...prev,
      [update.asset]: {
        ...update,
        previousPrice: prev[update.asset]?.price
      }
    }));
  }, []);

  const handleBalanceUpdate = useCallback((update) => {
    setBalanceUpdates(prev => ({
      ...prev,
      [update.currency]: {
        ...update,
        previousBalance: prev[update.currency]?.balance
      }
    }));
  }, []);

  const handleTransactionUpdate = useCallback((update) => {
    setTransactionUpdates(prev => {
      const existing = prev.find(t => t.transactionId === update.transactionId);
      if (existing) {
        return prev.map(t => 
          t.transactionId === update.transactionId 
            ? { ...t, ...update }
            : t
        );
      }
      return [update, ...prev.slice(0, 49)]; // Keep last 50
    });
  }, []);

  const handleAssetUpdate = useCallback((update) => {
    setAssetUpdates(prev => {
      const existing = prev.find(a => a.assetId === update.assetId);
      if (existing) {
        return prev.map(a => 
          a.assetId === update.assetId 
            ? { ...a, ...update }
            : a
        );
      }
      return [update, ...prev.slice(0, 49)]; // Keep last 50
    });
  }, []);

  const handleMarketAlert = useCallback((alert) => {
    setMarketAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20
  }, []);

  // Setup subscriptions
  useEffect(() => {
    const subscriptions = [];

    // Connection events
    subscriptions.push(websocketService.subscribe('connected', handleConnected));
    subscriptions.push(websocketService.subscribe('disconnected', handleDisconnected));
    subscriptions.push(websocketService.subscribe('error', handleError));
    subscriptions.push(websocketService.subscribe('max_reconnect_attempts_reached', handleMaxReconnectAttempts));

    // Data events
    if (enableNotifications) {
      subscriptions.push(websocketService.subscribeToNotifications(handleNotification));
    }

    if (enablePriceUpdates) {
      subscriptions.push(websocketService.subscribeToPriceUpdates(handlePriceUpdate));
    }

    if (enableBalanceUpdates) {
      subscriptions.push(websocketService.subscribeToBalanceUpdates(handleBalanceUpdate));
    }

    if (enableTransactionUpdates) {
      subscriptions.push(websocketService.subscribeToTransactionUpdates(handleTransactionUpdate));
    }

    if (enableAssetUpdates) {
      subscriptions.push(websocketService.subscribeToAssetUpdates(handleAssetUpdate));
    }

    if (enableMarketAlerts) {
      subscriptions.push(websocketService.subscribeToMarketAlerts(handleMarketAlert));
    }

    unsubscribeRefs.current = subscriptions;

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [
    enableNotifications,
    enablePriceUpdates,
    enableBalanceUpdates,
    enableTransactionUpdates,
    enableAssetUpdates,
    enableMarketAlerts,
    handleConnected,
    handleDisconnected,
    handleError,
    handleMaxReconnectAttempts,
    handleNotification,
    handlePriceUpdate,
    handleBalanceUpdate,
    handleTransactionUpdate,
    handleAssetUpdate,
    handleMarketAlert
  ]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      // Get token from auth context or localStorage
      const token = localStorage.getItem('authToken');
      if (token) {
        connect(token);
      }
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Utility functions
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, read: true }
          : n
      )
    );
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const requestPriceUpdate = useCallback((assets) => {
    websocketService.requestPriceUpdate(assets);
  }, []);

  const requestBalanceUpdate = useCallback(() => {
    websocketService.requestBalanceUpdate();
  }, []);

  const requestTransactionUpdate = useCallback((transactionId) => {
    websocketService.requestTransactionUpdate(transactionId);
  }, []);

  const setNotificationPreferences = useCallback((preferences) => {
    websocketService.setNotificationPreferences(preferences);
  }, []);

  const setPriceAlerts = useCallback((alerts) => {
    websocketService.setPriceAlerts(alerts);
  }, []);

  // Computed values
  const unreadNotifications = notifications.filter(n => !n.read);
  const latestPrices = Object.values(priceUpdates);
  const latestBalances = Object.values(balanceUpdates);

  return {
    // Connection state
    connectionState,
    connect,
    disconnect,

    // Data
    notifications,
    unreadNotifications,
    priceUpdates,
    latestPrices,
    balanceUpdates,
    latestBalances,
    transactionUpdates,
    assetUpdates,
    marketAlerts,

    // Actions
    clearNotifications,
    markNotificationAsRead,
    removeNotification,
    requestPriceUpdate,
    requestBalanceUpdate,
    requestTransactionUpdate,
    setNotificationPreferences,
    setPriceAlerts
  };
};

// Hook for notifications only
export const useNotifications = () => {
  return useRealTimeUpdates({
    enablePriceUpdates: false,
    enableTransactionUpdates: false,
    enableAssetUpdates: false,
    enableBalanceUpdates: false,
    enableMarketAlerts: false
  });
};

// Hook for price updates only
export const usePriceUpdates = (assets = []) => {
  const { priceUpdates, requestPriceUpdate, connectionState } = useRealTimeUpdates({
    enableNotifications: false,
    enableTransactionUpdates: false,
    enableAssetUpdates: false,
    enableBalanceUpdates: false,
    enableMarketAlerts: false
  });

  useEffect(() => {
    if (connectionState.isConnected && assets.length > 0) {
      requestPriceUpdate(assets);
    }
  }, [connectionState.isConnected, assets, requestPriceUpdate]);

  return {
    priceUpdates,
    requestPriceUpdate,
    isConnected: connectionState.isConnected
  };
};

// Hook for balance updates only
export const useBalanceUpdates = () => {
  return useRealTimeUpdates({
    enableNotifications: false,
    enablePriceUpdates: false,
    enableTransactionUpdates: false,
    enableAssetUpdates: false,
    enableMarketAlerts: false
  });
};

// Hook for transaction updates only
export const useTransactionUpdates = () => {
  return useRealTimeUpdates({
    enableNotifications: false,
    enablePriceUpdates: false,
    enableAssetUpdates: false,
    enableBalanceUpdates: false,
    enableMarketAlerts: false
  });
};

export default useRealTimeUpdates;
