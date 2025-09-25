import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationToast } from '../components/notifications/NotificationCenter';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [localNotifications, setLocalNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [preferences, setPreferences] = useState({
    enableToasts: true,
    enableSound: true,
    enableDesktop: true,
    categories: {
      transaction: true,
      asset: true,
      security: true,
      market: true,
      system: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  // Use real-time updates hook
  const {
    notifications: realtimeNotifications,
    unreadNotifications,
    connectionState,
    markNotificationAsRead,
    removeNotification: removeRealtimeNotification,
    clearNotifications: clearRealtimeNotifications,
    setNotificationPreferences
  } = useRealTimeUpdates({
    enableNotifications: true,
    enablePriceUpdates: false,
    enableTransactionUpdates: false,
    enableAssetUpdates: false,
    enableBalanceUpdates: false,
    enableMarketAlerts: false
  });

  // Combine local and real-time notifications
  const allNotifications = [...realtimeNotifications, ...localNotifications];

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage and send to server
  const updatePreferences = useCallback((newPreferences) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);
    localStorage.setItem('notificationPreferences', JSON.stringify(updatedPreferences));
    setNotificationPreferences(updatedPreferences);
  }, [preferences, setNotificationPreferences]);

  // Check if notifications should be shown based on preferences
  const shouldShowNotification = useCallback((notification) => {
    if (!preferences.enableToasts) return false;
    if (!preferences.categories[notification.type]) return false;

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = parseInt(preferences.quietHours.start.replace(':', ''));
      const endTime = parseInt(preferences.quietHours.end.replace(':', ''));

      if (startTime > endTime) {
        // Quiet hours span midnight
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      } else {
        // Quiet hours within same day
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      }
    }

    return true;
  }, [preferences]);

  // Handle new real-time notifications
  useEffect(() => {
    if (unreadNotifications.length > 0) {
      const latestNotification = unreadNotifications[0];
      
      if (shouldShowNotification(latestNotification)) {
        // Show toast notification
        showToast(latestNotification);

        // Play sound if enabled
        if (preferences.enableSound) {
          playNotificationSound(latestNotification.category);
        }

        // Show desktop notification if enabled and permitted
        if (preferences.enableDesktop && 'Notification' in window) {
          showDesktopNotification(latestNotification);
        }
      }
    }
  }, [unreadNotifications, shouldShowNotification, preferences.enableSound, preferences.enableDesktop]);

  // Request desktop notification permission
  useEffect(() => {
    if (preferences.enableDesktop && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [preferences.enableDesktop]);

  // Local notification management (for backward compatibility)
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      category: 'info',
      duration: 5000,
      ...notification,
      timestamp: new Date(),
      read: false
    };

    setLocalNotifications(prev => [...prev, newNotification]);

    // Show toast if enabled
    if (shouldShowNotification(newNotification)) {
      showToast(newNotification);
    }

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [shouldShowNotification]);

  const removeNotification = useCallback((id) => {
    // Try to remove from local notifications first
    const localNotification = localNotifications.find(n => n.id === id);
    if (localNotification) {
      setLocalNotifications(prev => prev.filter(notification => notification.id !== id));
    } else {
      // Remove from real-time notifications
      removeRealtimeNotification(id);
    }
  }, [localNotifications, removeRealtimeNotification]);

  const clearAllNotifications = useCallback(() => {
    setLocalNotifications([]);
    clearRealtimeNotifications();
  }, [clearRealtimeNotifications]);

  const showToast = useCallback((notification) => {
    const toastId = `toast-${notification.id}-${Date.now()}`;
    const toast = {
      id: toastId,
      notification,
      timestamp: new Date()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      removeToast(toastId);
    }, 5000);
  }, []);

  const removeToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  const playNotificationSound = useCallback((category) => {
    try {
      const audio = new Audio();
      
      // Different sounds for different categories
      switch (category) {
        case 'success':
          audio.src = '/sounds/success.mp3';
          break;
        case 'warning':
          audio.src = '/sounds/warning.mp3';
          break;
        case 'error':
          audio.src = '/sounds/error.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }

      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Notification sound not available:', error);
    }
  }, []);

  const showDesktopNotification = useCallback((notification) => {
    if (Notification.permission === 'granted') {
      try {
        const desktopNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: notification.id,
          requireInteraction: notification.category === 'error' || notification.category === 'warning'
        });

        desktopNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          desktopNotification.close();
        };

        // Auto-close after 5 seconds for non-critical notifications
        if (notification.category !== 'error' && notification.category !== 'warning') {
          setTimeout(() => {
            desktopNotification.close();
          }, 5000);
        }
      } catch (error) {
        console.warn('Failed to show desktop notification:', error);
      }
    }
  }, []);

  // Convenience methods (backward compatibility)
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      category: 'success',
      title: 'Success',
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      category: 'error',
      title: 'Error',
      message,
      duration: 7000, // Longer duration for errors
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      category: 'warning',
      title: 'Warning',
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      category: 'info',
      title: 'Information',
      message,
      ...options
    });
  }, [addNotification]);

  const handleToastAction = useCallback((notification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    markNotificationAsRead(notification.id);
  }, [markNotificationAsRead]);

  const value = {
    // Notification data (combined local and real-time)
    notifications: allNotifications,
    unreadNotifications,
    unreadCount: unreadNotifications.length,
    
    // Connection state
    connectionState,
    
    // Preferences
    preferences,
    updatePreferences,
    
    // Actions
    addNotification,
    removeNotification,
    clearAllNotifications,
    markNotificationAsRead,
    
    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Utility
    shouldShowNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <NotificationToast
            key={toast.id}
            notification={toast.notification}
            onClose={() => removeToast(toast.id)}
            onAction={handleToastAction}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

