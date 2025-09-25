import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Settings, 
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  DollarSign,
  Bitcoin,
  Gem,
  Shield,
  TrendingUp,
  Clock,
  Eye,
  Trash2,
  Archive
} from 'lucide-react';

export const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock notifications data
  const mockNotifications = [
    {
      id: 1,
      type: 'transaction',
      category: 'success',
      title: 'Bitcoin Purchase Completed',
      message: 'Your purchase of 0.0125 BTC for $550.25 has been completed successfully.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      icon: Bitcoin,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      actionUrl: '/transactions/btc-001'
    },
    {
      id: 2,
      type: 'asset',
      category: 'info',
      title: 'Asset Verification Update',
      message: 'Your gold deposit (2.5 oz) has passed physical inspection and is now being appraised.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      icon: Gem,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      actionUrl: '/assets/gold-dep-001'
    },
    {
      id: 3,
      type: 'security',
      category: 'warning',
      title: 'New Login Detected',
      message: 'A new login was detected from Chrome on Windows in New York, NY.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true,
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      actionUrl: '/profile/security'
    },
    {
      id: 4,
      type: 'market',
      category: 'info',
      title: 'Price Alert: Gold',
      message: 'Gold price has increased by 2.5% in the last 24 hours. Current price: $2,045/oz.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      read: true,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      actionUrl: '/portfolio'
    },
    {
      id: 5,
      type: 'account',
      category: 'success',
      title: 'Currency Conversion Completed',
      message: 'Successfully converted $1,000 USD to €920 EUR at rate 0.92.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      read: true,
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      actionUrl: '/wallet'
    },
    {
      id: 6,
      type: 'system',
      category: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance is scheduled for tonight from 2:00 AM to 4:00 AM EST.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      icon: Settings,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50'
    }
  ];

  useEffect(() => {
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (notification) => {
    const Icon = notification.icon;
    return <Icon className={`h-5 w-5 ${notification.color}`} />;
  };

  const getCategoryBadge = (category) => {
    const variants = {
      success: 'default',
      warning: 'destructive',
      info: 'secondary',
      error: 'destructive'
    };
    return variants[category] || 'secondary';
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const notificationTypes = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'transaction', label: 'Transactions', count: notifications.filter(n => n.type === 'transaction').length },
    { value: 'asset', label: 'Assets', count: notifications.filter(n => n.type === 'asset').length },
    { value: 'security', label: 'Security', count: notifications.filter(n => n.type === 'security').length },
    { value: 'market', label: 'Market', count: notifications.filter(n => n.type === 'market').length }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <DialogTitle>Notifications</DialogTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid w-full grid-cols-6">
              {notificationTypes.map(type => (
                <TabsTrigger key={type.value} value={type.value} className="text-xs">
                  {type.label}
                  {type.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {type.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No notifications found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filter === 'unread' 
                        ? "You're all caught up!" 
                        : "Check back later for updates"
                      }
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        !notification.read 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${notification.bgColor}`}>
                          {getNotificationIcon(notification)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{notification.title}</p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant={getCategoryBadge(notification.category)}>
                              {notification.type}
                            </Badge>
                            
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                              {notification.actionUrl && (
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Notification Toast Component
export const NotificationToast = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (notification.category) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className={`
      fixed top-4 right-4 z-50 w-96 p-4 bg-white border rounded-lg shadow-lg
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          {notification.actionUrl && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onAction?.(notification)}
            >
              View Details
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Notification Bell Icon Component
export const NotificationBell = ({ unreadCount = 0, onClick }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative"
      onClick={onClick}
    >
      <div className={`transition-transform duration-200 ${isAnimating ? 'animate-bounce' : ''}`}>
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </div>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
