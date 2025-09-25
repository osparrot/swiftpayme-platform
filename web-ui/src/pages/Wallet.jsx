import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Bitcoin, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight,
  Copy,
  QrCode,
  Eye,
  EyeOff,
  Plus,
  Minus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  CreditCard,
  Send,
  Download,
  History,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export const Wallet = () => {
  const [loading, setLoading] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const [walletData, setWalletData] = useState({
    accounts: {
      usd: { 
        balance: 12450.75, 
        change: 2.5, 
        available: 12450.75,
        pending: 0,
        frozen: 0
      },
      eur: { 
        balance: 9876.32, 
        change: -1.2, 
        available: 9876.32,
        pending: 0,
        frozen: 0
      },
      gbp: { 
        balance: 7234.56, 
        change: 3.1, 
        available: 7234.56,
        pending: 0,
        frozen: 0
      }
    },
    bitcoin: {
      balance: 0.2456,
      value: 10890.45,
      change: 5.7,
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      pending: 0.0012,
      confirmed: 0.2444
    },
    recentTransactions: [
      {
        id: 1,
        type: 'receive',
        currency: 'BTC',
        amount: 0.0125,
        value: 550.25,
        date: '2024-01-15T14:30:00Z',
        status: 'confirmed',
        txHash: '0x1234...5678'
      },
      {
        id: 2,
        type: 'send',
        currency: 'USD',
        amount: 500,
        date: '2024-01-14T10:15:00Z',
        status: 'completed'
      },
      {
        id: 3,
        type: 'convert',
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 800,
        toAmount: 875.20,
        date: '2024-01-13T16:45:00Z',
        status: 'completed'
      }
    ]
  });

  const [sendForm, setSendForm] = useState({
    currency: 'BTC',
    amount: '',
    address: '',
    memo: ''
  });

  const [convertForm, setConvertForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    amount: '',
    estimatedReceive: 0
  });

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', flag: '₿' }
  ];

  const exchangeRates = {
    'USD-EUR': 0.92,
    'USD-GBP': 0.79,
    'EUR-USD': 1.09,
    'EUR-GBP': 0.86,
    'GBP-USD': 1.27,
    'GBP-EUR': 1.16
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (currency === 'BTC') {
      return `₿ ${amount.toFixed(8)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatBalance = (balance, currency) => {
    return balanceVisible ? formatCurrency(balance, currency) : '••••••';
  };

  const calculateConversion = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    const rate = exchangeRates[`${fromCurrency}-${toCurrency}`] || 1;
    return amount * rate;
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      // API call to send funds
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowSendDialog(false);
      setSendForm({ currency: 'BTC', amount: '', address: '', memo: '' });
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    setLoading(true);
    try {
      // API call to convert currencies
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowConvertDialog(false);
      setConvertForm({ fromCurrency: 'USD', toCurrency: 'EUR', amount: '', estimatedReceive: 0 });
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (convertForm.amount && convertForm.fromCurrency !== convertForm.toCurrency) {
      const estimated = calculateConversion(
        parseFloat(convertForm.amount) || 0,
        convertForm.fromCurrency,
        convertForm.toCurrency
      );
      setConvertForm(prev => ({ ...prev, estimatedReceive: estimated }));
    }
  }, [convertForm.amount, convertForm.fromCurrency, convertForm.toCurrency]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Digital Wallet</h1>
            <p className="text-gray-600 mt-1">
              Manage your multi-currency accounts and Bitcoin wallet
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBalanceVisible(!balanceVisible)}
            >
              {balanceVisible ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {balanceVisible ? 'Hide' : 'Show'} Balances
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Account Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Fiat Accounts */}
          {Object.entries(walletData.accounts).map(([currency, account]) => (
            <Card key={currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase">{currency} Account</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBalance(account.balance, currency.toUpperCase())}
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {account.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={account.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {account.change >= 0 ? '+' : ''}{account.change}%
                  </span>
                </div>
                {account.pending > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Pending: {formatCurrency(account.pending, currency.toUpperCase())}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Bitcoin Account */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bitcoin Wallet</CardTitle>
              <Bitcoin className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balanceVisible ? `₿ ${walletData.bitcoin.balance}` : '••••••'}
              </div>
              <div className="text-sm text-muted-foreground">
                {balanceVisible ? formatCurrency(walletData.bitcoin.value) : '••••••'}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+{walletData.bitcoin.change}%</span>
              </div>
              {walletData.bitcoin.pending > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Pending: ₿ {walletData.bitcoin.pending}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button className="h-20 flex flex-col gap-2">
                <Send className="h-6 w-6" />
                Send
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Funds</DialogTitle>
                <DialogDescription>
                  Send cryptocurrency or fiat currency to another wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={sendForm.currency} onValueChange={(value) => 
                    setSendForm(prev => ({ ...prev, currency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.flag} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={sendForm.amount}
                    onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recipient Address</Label>
                  <Input
                    placeholder={sendForm.currency === 'BTC' ? 'Bitcoin address' : 'Account number'}
                    value={sendForm.address}
                    onChange={(e) => setSendForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Memo (Optional)</Label>
                  <Input
                    placeholder="Transaction note"
                    value={sendForm.memo}
                    onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSendDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSend} disabled={loading} className="flex-1">
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Download className="h-6 w-6" />
                Receive
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Receive Bitcoin</DialogTitle>
                <DialogDescription>
                  Share your Bitcoin address to receive payments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="h-24 w-24 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Bitcoin Address</p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <code className="text-sm flex-1 break-all">{walletData.bitcoin.address}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(walletData.bitcoin.address)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Only send Bitcoin to this address. Sending other cryptocurrencies may result in permanent loss.
                  </AlertDescription>
                </Alert>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <ArrowLeftRight className="h-6 w-6" />
                Convert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Currency Conversion</DialogTitle>
                <DialogDescription>
                  Convert between different currencies in your wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select value={convertForm.fromCurrency} onValueChange={(value) => 
                      setConvertForm(prev => ({ ...prev, fromCurrency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.filter(c => c.code !== 'BTC').map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select value={convertForm.toCurrency} onValueChange={(value) => 
                      setConvertForm(prev => ({ ...prev, toCurrency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.filter(c => c.code !== 'BTC' && c.code !== convertForm.fromCurrency).map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount to Convert</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={convertForm.amount}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                {convertForm.estimatedReceive > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      You will receive approximately{' '}
                      <span className="font-medium">
                        {formatCurrency(convertForm.estimatedReceive, convertForm.toCurrency)}
                      </span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Exchange rate: 1 {convertForm.fromCurrency} = {
                        exchangeRates[`${convertForm.fromCurrency}-${convertForm.toCurrency}`] || 1
                      } {convertForm.toCurrency}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowConvertDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleConvert} disabled={loading} className="flex-1">
                    {loading ? 'Converting...' : 'Convert'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <History className="h-6 w-6" />
            History
          </Button>
        </div>

        {/* Detailed Wallet Information */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                  <CardDescription>
                    Overview of all your wallet balances
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(walletData.accounts).map(([currency, account]) => (
                    <div key={currency} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium uppercase">{currency}</p>
                          <p className="text-sm text-gray-500">Available</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatBalance(account.available, currency.toUpperCase())}
                        </p>
                        <Badge variant={account.change >= 0 ? 'default' : 'destructive'}>
                          {account.change >= 0 ? '+' : ''}{account.change}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bitcoin className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Bitcoin</p>
                        <p className="text-sm text-gray-500">Available</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {balanceVisible ? `₿ ${walletData.bitcoin.confirmed}` : '••••••'}
                      </p>
                      <Badge variant="default">
                        +{walletData.bitcoin.change}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest wallet transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {walletData.recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {tx.type === 'receive' ? (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          ) : tx.type === 'send' ? (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium capitalize">{tx.type}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(tx.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {tx.type === 'convert' 
                              ? `${tx.fromAmount} ${tx.fromCurrency} → ${tx.toAmount} ${tx.toCurrency}`
                              : `${tx.type === 'send' ? '-' : '+'}${
                                  tx.currency === 'BTC' 
                                    ? `₿ ${tx.amount}` 
                                    : formatCurrency(tx.amount, tx.currency)
                                }`
                            }
                          </p>
                          <Badge variant={
                            tx.status === 'confirmed' || tx.status === 'completed' ? 'default' : 'secondary'
                          }>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bitcoin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-orange-500" />
                  Bitcoin Wallet Details
                </CardTitle>
                <CardDescription>
                  Detailed information about your Bitcoin holdings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Bitcoin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      ₿ {walletData.bitcoin.balance}
                    </p>
                    <p className="text-sm text-orange-700">Total Balance</p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      ₿ {walletData.bitcoin.confirmed}
                    </p>
                    <p className="text-sm text-green-700">Confirmed</p>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      ₿ {walletData.bitcoin.pending}
                    </p>
                    <p className="text-sm text-yellow-700">Pending</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Bitcoin Address</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mt-1">
                      <code className="text-sm flex-1 break-all">{walletData.bitcoin.address}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(walletData.bitcoin.address)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">USD Value</p>
                      <p className="font-medium text-lg">{formatCurrency(walletData.bitcoin.value)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">24h Change</p>
                      <p className="font-medium text-lg text-green-600">+{walletData.bitcoin.change}%</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your Bitcoin is secured with industry-standard encryption and multi-signature technology. 
                    Always verify addresses before sending transactions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Complete history of all wallet transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {walletData.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {tx.type === 'receive' ? (
                          <ArrowDownRight className="h-5 w-5 text-green-500" />
                        ) : tx.type === 'send' ? (
                          <ArrowUpRight className="h-5 w-5 text-red-500" />
                        ) : (
                          <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium capitalize">
                            {tx.type === 'convert' 
                              ? `Convert ${tx.fromCurrency} to ${tx.toCurrency}`
                              : `${tx.type} ${tx.currency}`
                            }
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(tx.date).toLocaleString()}
                          </p>
                          {tx.txHash && (
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs text-gray-400">{tx.txHash}</code>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {tx.type === 'convert' 
                            ? `${tx.fromAmount} ${tx.fromCurrency}`
                            : `${tx.type === 'send' ? '-' : '+'}${
                                tx.currency === 'BTC' 
                                  ? `₿ ${tx.amount}` 
                                  : formatCurrency(tx.amount, tx.currency)
                              }`
                          }
                        </p>
                        {tx.type === 'convert' && (
                          <p className="text-sm text-gray-500">
                            → {tx.toAmount} {tx.toCurrency}
                          </p>
                        )}
                        <Badge variant={
                          tx.status === 'confirmed' || tx.status === 'completed' ? 'default' : 'secondary'
                        }>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
