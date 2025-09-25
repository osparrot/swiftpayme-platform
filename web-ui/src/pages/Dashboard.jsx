import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Bitcoin, 
  Gem, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  EyeOff,
  Bell,
  Settings,
  Activity,
  PieChart,
  BarChart3,
  Coins
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    accounts: {
      usd: { balance: 12450.75, change: 2.5 },
      gbp: { balance: 9876.32, change: -1.2 },
      eur: { balance: 11234.56, change: 3.1 }
    },
    assets: {
      gold: { value: 25000, weight: 15.5, unit: 'oz' },
      silver: { value: 3200, weight: 120, unit: 'oz' },
      diamonds: { value: 18500, count: 3, unit: 'stones' }
    },
    bitcoin: {
      balance: 0.2456,
      value: 10890.45,
      change: 5.7
    },
    recentTransactions: [
      { id: 1, type: 'deposit', asset: 'Gold', amount: 5000, date: '2024-01-15', status: 'completed' },
      { id: 2, type: 'purchase', asset: 'Bitcoin', amount: 2500, date: '2024-01-14', status: 'completed' },
      { id: 3, type: 'withdrawal', asset: 'USD', amount: 1000, date: '2024-01-13', status: 'pending' },
      { id: 4, type: 'deposit', asset: 'Silver', amount: 800, date: '2024-01-12', status: 'completed' }
    ],
    portfolioValue: 71275.08,
    portfolioChange: 4.2
  });

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatBalance = (balance) => {
    return balanceVisible ? formatCurrency(balance) : '••••••';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'purchase':
        return <Bitcoin className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your portfolio today.
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBalanceVisible(!balanceVisible)}
              >
                {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBalance(dashboardData.portfolioValue)}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">+{dashboardData.portfolioChange}%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/assets">
                  <Plus className="h-4 w-4 mr-2" />
                  Deposit Assets
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/wallet">
                  <Bitcoin className="h-4 w-4 mr-2" />
                  Buy Bitcoin
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USD Account</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBalance(dashboardData.accounts.usd.balance)}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+{dashboardData.accounts.usd.change}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GBP Account</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBalance(dashboardData.accounts.gbp.balance, 'GBP')}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500">{dashboardData.accounts.gbp.change}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">EUR Account</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBalance(dashboardData.accounts.eur.balance, 'EUR')}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+{dashboardData.accounts.eur.change}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Asset Distribution
                  </CardTitle>
                  <CardDescription>
                    Your portfolio breakdown by asset type
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Gold</span>
                      <span className="text-sm text-muted-foreground">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fiat Currencies</span>
                      <span className="text-sm text-muted-foreground">40%</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bitcoin</span>
                      <span className="text-sm text-muted-foreground">15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Other Assets</span>
                      <span className="text-sm text-muted-foreground">10%</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your latest transactions and activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentTransactions.slice(0, 4).map((transaction) => (
                      <div key={transaction.id} className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {transaction.type === 'deposit' ? 'Deposited' : 
                             transaction.type === 'withdrawal' ? 'Withdrew' : 'Purchased'} {transaction.asset}
                          </p>
                          <p className="text-sm text-gray-500">{transaction.date}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" asChild>
                    <Link to="/transactions">View All Transactions</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gold Holdings</CardTitle>
                  <Gem className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.assets.gold.weight} oz
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Value: {formatCurrency(dashboardData.assets.gold.value)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Silver Holdings</CardTitle>
                  <Coins className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.assets.silver.weight} oz
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Value: {formatCurrency(dashboardData.assets.silver.value)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Diamond Holdings</CardTitle>
                  <Gem className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.assets.diamonds.count} stones
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Value: {formatCurrency(dashboardData.assets.diamonds.value)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Asset Management</CardTitle>
                <CardDescription>
                  Manage your physical asset deposits and tokenization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1">
                    <Link to="/assets">
                      <Plus className="h-4 w-4 mr-2" />
                      Deposit New Assets
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Asset History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bitcoin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-orange-500" />
                  Bitcoin Holdings
                </CardTitle>
                <CardDescription>
                  Your Bitcoin balance and recent performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold mb-2">
                      ₿ {dashboardData.bitcoin.balance}
                    </div>
                    <div className="text-lg text-muted-foreground mb-4">
                      {formatCurrency(dashboardData.bitcoin.value)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-green-500 font-medium">
                        +{dashboardData.bitcoin.change}%
                      </span>
                      <span className="text-muted-foreground">24h</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Buy Bitcoin
                    </Button>
                    <Button variant="outline" className="w-full">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Send Bitcoin
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your transaction history across all accounts and assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">
                            {transaction.type === 'deposit' ? 'Asset Deposit' : 
                             transaction.type === 'withdrawal' ? 'Withdrawal' : 'Bitcoin Purchase'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.asset} • {transaction.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/transactions">View All Transactions</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
