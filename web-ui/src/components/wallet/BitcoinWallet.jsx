import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bitcoin, 
  Send, 
  Download, 
  Copy, 
  QrCode, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Zap
} from 'lucide-react';

export const BitcoinWallet = ({ 
  balance = 0.2456, 
  usdValue = 10890.45, 
  change = 5.7,
  address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  onSend,
  onBuy
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sendForm, setSendForm] = useState({
    address: '',
    amount: '',
    fee: 'medium',
    memo: ''
  });

  const [buyForm, setBuyForm] = useState({
    currency: 'USD',
    amount: '',
    btcAmount: 0
  });

  const transactions = [
    {
      id: 1,
      type: 'receive',
      amount: 0.0125,
      usdValue: 550.25,
      date: '2024-01-15T14:30:00Z',
      status: 'confirmed',
      confirmations: 6,
      txHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      from: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    },
    {
      id: 2,
      type: 'send',
      amount: 0.0089,
      usdValue: 392.15,
      date: '2024-01-14T09:15:00Z',
      status: 'confirmed',
      confirmations: 12,
      txHash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
      to: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
    },
    {
      id: 3,
      type: 'receive',
      amount: 0.0234,
      usdValue: 1031.40,
      date: '2024-01-12T16:45:00Z',
      status: 'pending',
      confirmations: 2,
      txHash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2',
      from: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
    }
  ];

  const feeOptions = [
    { value: 'low', label: 'Low Priority', time: '30-60 min', fee: 0.00001 },
    { value: 'medium', label: 'Medium Priority', time: '10-30 min', fee: 0.00003 },
    { value: 'high', label: 'High Priority', time: '0-10 min', fee: 0.00005 }
  ];

  const formatBTC = (amount) => `₿ ${amount.toFixed(8)}`;
  
  const formatUSD = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const calculateBuyAmount = (usdAmount) => {
    const btcPrice = usdValue / balance; // Current BTC price
    return usdAmount / btcPrice;
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSend?.(sendForm);
      setShowSendDialog(false);
      setSendForm({ address: '', amount: '', fee: 'medium', memo: '' });
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      await onBuy?.(buyForm);
      setShowBuyDialog(false);
      setBuyForm({ currency: 'USD', amount: '', btcAmount: 0 });
    } catch (error) {
      console.error('Buy failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bitcoin Balance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bitcoin className="h-8 w-8 text-orange-500" />
              <div>
                <CardTitle className="text-xl">Bitcoin Wallet</CardTitle>
                <CardDescription>Your Bitcoin holdings and transactions</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Bitcoin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {showBalance ? formatBTC(balance) : '••••••••'}
              </p>
              <p className="text-sm text-orange-700">Total Balance</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {change >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
              <p className="text-2xl font-bold">
                {showBalance ? formatUSD(usdValue) : '••••••'}
              </p>
              <p className="text-sm text-green-700">USD Value</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {change >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-blue-600" />
                )}
              </div>
              <p className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </p>
              <p className="text-sm text-blue-700">24h Change</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
              <DialogTrigger asChild>
                <Button className="flex flex-col gap-2 h-16">
                  <Send className="h-5 w-5" />
                  Send
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Bitcoin</DialogTitle>
                  <DialogDescription>
                    Send Bitcoin to another wallet address
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient Address</Label>
                    <Input
                      placeholder="Enter Bitcoin address"
                      value={sendForm.address}
                      onChange={(e) => setSendForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (BTC)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.00000001"
                        placeholder="0.00000000"
                        value={sendForm.amount}
                        onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                        onClick={() => setSendForm(prev => ({ ...prev, amount: balance.toString() }))}
                      >
                        MAX
                      </Button>
                    </div>
                    {sendForm.amount && (
                      <p className="text-sm text-gray-500">
                        ≈ {formatUSD(parseFloat(sendForm.amount) * (usdValue / balance))}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Fee</Label>
                    <div className="space-y-2">
                      {feeOptions.map(option => (
                        <div
                          key={option.value}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            sendForm.fee === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSendForm(prev => ({ ...prev, fee: option.value }))}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-sm text-gray-500">{option.time}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatBTC(option.fee)}</p>
                              <p className="text-sm text-gray-500">
                                {formatUSD(option.fee * (usdValue / balance))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                      {loading ? 'Sending...' : 'Send Bitcoin'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex flex-col gap-2 h-16">
                  <Download className="h-5 w-5" />
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
                    <p className="text-sm text-gray-600 mb-2">Your Bitcoin Address</p>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <code className="text-sm flex-1 break-all">{address}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(address)}
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

            <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex flex-col gap-2 h-16">
                  <Bitcoin className="h-5 w-5" />
                  Buy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buy Bitcoin</DialogTitle>
                  <DialogDescription>
                    Purchase Bitcoin using your fiat currency balance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pay with</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={buyForm.currency}
                      onChange={(e) => setBuyForm(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount ({buyForm.currency})</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={buyForm.amount}
                      onChange={(e) => {
                        const amount = e.target.value;
                        setBuyForm(prev => ({ 
                          ...prev, 
                          amount,
                          btcAmount: amount ? calculateBuyAmount(parseFloat(amount)) : 0
                        }));
                      }}
                    />
                  </div>

                  {buyForm.btcAmount > 0 && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-700">
                        You will receive approximately{' '}
                        <span className="font-medium">
                          {formatBTC(buyForm.btcAmount)}
                        </span>
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Rate: 1 BTC = {formatUSD(usdValue / balance)}
                      </p>
                    </div>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>Trading fee: 1.5%</p>
                        <p>Processing time: Instant</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowBuyDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleBuy} disabled={loading} className="flex-1">
                      {loading ? 'Processing...' : 'Buy Bitcoin'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Bitcoin Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Your Bitcoin Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <code className="text-sm flex-1 break-all">{address}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(address)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your Bitcoin transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {tx.type === 'receive' ? (
                      <ArrowDownRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium capitalize">{tx.type} Bitcoin</p>
                      <Badge variant={tx.status === 'confirmed' ? 'default' : 'secondary'}>
                        {tx.status === 'confirmed' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(tx.date)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-gray-400">
                        {tx.txHash.substring(0, 16)}...
                      </code>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {tx.type === 'send' ? '-' : '+'}
                    {formatBTC(tx.amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatUSD(tx.usdValue)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Shield className="h-3 w-3" />
                    <span>{tx.confirmations}/6 confirmations</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
