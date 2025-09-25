import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, 
  Users, 
  Gem, 
  CreditCard, 
  Activity, 
  BarChart3, 
  Settings, 
  Shield,
  Bitcoin,
  Wallet,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permissions: ['dashboard_view']
  },
  {
    title: 'User Management',
    href: '/users',
    icon: Users,
    permissions: ['users_view']
  },
  {
    title: 'Asset Management',
    href: '/assets',
    icon: Gem,
    permissions: ['assets_view']
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: CreditCard,
    permissions: ['transactions_view']
  },
  {
    title: 'Accounts',
    href: '/accounts',
    icon: Wallet,
    permissions: ['accounts_view']
  },
  {
    title: 'Crypto Operations',
    href: '/crypto',
    icon: Bitcoin,
    permissions: ['crypto_view']
  },
  {
    title: 'System Health',
    href: '/system',
    icon: Activity,
    permissions: ['system_view']
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permissions: ['analytics_view']
  },
  {
    title: 'Compliance',
    href: '/compliance',
    icon: Shield,
    permissions: ['compliance_view']
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileText,
    permissions: ['reports_view']
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    permissions: ['notifications_view']
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permissions: ['settings_view']
  }
];

export const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { hasAnyPermission } = useAuth();

  const filteredItems = navigationItems.filter(item => 
    hasAnyPermission(item.permissions)
  );

  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
      isOpen ? "w-64" : "w-16"
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {isOpen && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">SwiftPayMe</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-10",
                      !isOpen && "justify-center px-2",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isOpen && "mr-3")} />
                    {isOpen && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {isOpen ? (
            <div className="text-xs text-muted-foreground text-center">
              <p>SwiftPayMe Admin v1.0</p>
              <p>© 2024 SwiftPayMe</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

