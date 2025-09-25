import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bitcoin, 
  DollarSign,
  Gem,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  Wallet,
  ArrowLeftRight
} from 'lucide-react';

export const Transactions = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalVolume: 125430.50,
    totalTransactions: 247,
    successRate: 99.2,
    avgAmount: 507.85
  });

  // Mock transaction data
  const mockTransactions = [
    {
      id: 'TXN-001',
      type: 'deposit',
      subType: 'asset_deposit',
      asset: 'Gold',
      amount: 5000.00,
      currency: 'USD',
      status: 'completed',
      date: '2024-01-15T10:30:00Z',
      description: 'Gold deposit - 2.5 oz',
      fee: 100.00,
      reference: 'DEP-GLD-001'
    },
    {
      id: 'TXN-002',
      type: 'purchase',
      subType: 'bitcoin_purchase',
      asset: 'Bitcoin',
      amount: 2500.00,
      currency: 'USD',
      btcAmount: 0.0567,
      status: 'completed',
      date: '2024-01-14T15:45:00Z',
      description: 'Bitcoin purchase',
      fee: 25.00,
      reference: 'BTC-PUR-002'
    },
    {
      id: 'TXN-003',
      type: 'withdrawal',
      subType: 'fiat_withdrawal',
      asset: 'USD',
      amount: 1000.00,
      currency: 'USD',
      status: 'pending',
      date: '2024-01-13T09:15:00Z',
      description: 'Bank withdrawal',
      fee: 10.00,
      reference: 'WTH-USD-003'
    },
    {
      id: 'TXN-004',
      type: 'transfer',
      subType: 'currency_conversion',
      asset: 'EUR',
      amount: 800.00,
      currency: 'EUR',
      convertedAmount: 875.20,
      convertedCurrency: 'USD',
      status: 'completed',
      date: '2024-01-12T14:20:00Z',
      description: 'EUR to USD conversion',
      fee: 8.00,
      reference: 'CNV-EUR-004'
    },
    {
      id: 'TXN-005',
      type: 'deposit',
      subType: 'asset_deposit',
      asset: 'Silver',
      amount: 800.00,
      currency: 'USD',
      status: 'completed',
      date: '2024-01-11T11:00:00Z',
      description: 'Silver deposit - 32 oz',
      fee: 16.00,
      reference: 'DEP-SLV-005'
    }
  ];

  useEffect(() => {
    setTransactions(mockTransactions);
  }, []);

  const getTransactionIcon = (type, subType) => {
    switch (type) {
      case 'deposit':
        return subType === 'asset_deposit' ? 
          <Gem className="h-4 w-4 text-green-500" /> : 
          <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'purchase':
        return <Bitcoin className="h-4 w-4 text-orange-500" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: { variant: 'default', icon: CheckCircle, text: 'Completed' },
      pending: { variant: 'secondary', icon: Clock, text: 'Pending' },
      processing: { variant: 'secondary', icon: RefreshCw, text: 'Processing' },
      failed: { variant: 'destructive', icon: AlertCircle, text: 'Failed' },
      cancelled: { variant: 'outline', icon: AlertCircle, text: 'Cancelled' }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type, subType) => {
    const labels = {
      'deposit-asset_deposit': 'Asset Deposit',
      'deposit-fiat_deposit': 'Fiat Deposit',
      'withdrawal-fiat_withdrawal': 'Fiat Withdrawal',
      'withdrawal-asset_withdrawal': 'Asset Withdrawal',
      'purchase-bitcoin_purchase': 'Bitcoin Purchase',
      'purchase-asset_purchase': 'Asset Purchase',
      'transfer-currency_conversion': 'Currency Conversion',
      'transfer-internal_transfer': 'Internal Transfer'
    };
    return labels[`${type}-${subType}`] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      matchesDate = new Date(tx.date) >= cutoff;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const handleExport = () => {
    // Export functionality
    console.log('Exporting transactions...');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">
              View and manage all your transaction history
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+12.5%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+8.2%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+0.3%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Amount</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgAmount)}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500">-2.1%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="purchase">Purchases</SelectItem>
                    <SelectItem value="transfer">Transfers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your filters or search criteria
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(transaction.type, transaction.subType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getTypeLabel(transaction.type, transaction.subType)}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-sm text-gray-500">{transaction.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(transaction.date)}
                          </span>
                          <span>ID: {transaction.reference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.type === 'withdrawal' ? '-' : '+'}
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          {transaction.btcAmount && (
                            <p className="text-xs text-gray-500">
                              ₿ {transaction.btcAmount}
                            </p>
                          )}
                          {transaction.convertedAmount && (
                            <p className="text-xs text-gray-500">
                              → {formatCurrency(transaction.convertedAmount, transaction.convertedCurrency)}
                            </p>
                          )}
                          {transaction.fee > 0 && (
                            <p className="text-xs text-red-500">
                              Fee: {formatCurrency(transaction.fee)}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
