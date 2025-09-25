import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  DollarSign,
  Info,
  Clock,
  CheckCircle
} from 'lucide-react';

export const CurrencyConverter = ({ onConvert, availableBalances = {} }) => {
  const [loading, setLoading] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [rateChange, setRateChange] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const currencies = [
    { 
      code: 'USD', 
      name: 'US Dollar', 
      symbol: '$', 
      flag: '🇺🇸',
      rate: 1.0000,
      change: 0.0
    },
    { 
      code: 'EUR', 
      name: 'Euro', 
      symbol: '€', 
      flag: '🇪🇺',
      rate: 0.9200,
      change: -0.15
    },
    { 
      code: 'GBP', 
      name: 'British Pound', 
      symbol: '£', 
      flag: '🇬🇧',
      rate: 0.7900,
      change: 0.23
    },
    { 
      code: 'JPY', 
      name: 'Japanese Yen', 
      symbol: '¥', 
      flag: '🇯🇵',
      rate: 149.50,
      change: -0.45
    },
    { 
      code: 'CAD', 
      name: 'Canadian Dollar', 
      symbol: 'C$', 
      flag: '🇨🇦',
      rate: 1.3500,
      change: 0.12
    },
    { 
      code: 'AUD', 
      name: 'Australian Dollar', 
      symbol: 'A$', 
      flag: '🇦🇺',
      rate: 1.5200,
      change: 0.08
    }
  ];

  const getExchangeRate = (from, to) => {
    const fromCurr = currencies.find(c => c.code === from);
    const toCurr = currencies.find(c => c.code === to);
    
    if (!fromCurr || !toCurr) return 1;
    
    // Convert to USD first, then to target currency
    const usdAmount = 1 / fromCurr.rate;
    return usdAmount * toCurr.rate;
  };

  const formatCurrency = (amount, currency) => {
    const currencyInfo = currencies.find(c => c.code === currency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 4,
    }).format(amount);
  };

  const calculateConversion = () => {
    if (!amount || fromCurrency === toCurrency) {
      setConvertedAmount(0);
      return;
    }

    const rate = getExchangeRate(fromCurrency, toCurrency);
    const converted = parseFloat(amount) * rate;
    setConvertedAmount(converted);
    setExchangeRate(rate);
  };

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleConvert = async () => {
    if (!amount || !convertedAmount) return;

    setLoading(true);
    try {
      await onConvert({
        fromCurrency,
        toCurrency,
        amount: parseFloat(amount),
        convertedAmount,
        exchangeRate
      });
      setAmount('');
      setConvertedAmount(0);
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRates = () => {
    setLastUpdated(new Date());
    calculateConversion();
  };

  const getAvailableBalance = (currency) => {
    return availableBalances[currency.toLowerCase()] || 0;
  };

  const hasInsufficientFunds = () => {
    const available = getAvailableBalance(fromCurrency);
    return parseFloat(amount) > available;
  };

  useEffect(() => {
    calculateConversion();
  }, [amount, fromCurrency, toCurrency]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Currency Converter
        </CardTitle>
        <CardDescription>
          Convert between different fiat currencies in your wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* From Currency */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span>{currency.code}</span>
                        <span className="text-gray-500">- {currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Available: {formatCurrency(getAvailableBalance(fromCurrency), fromCurrency)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={hasInsufficientFunds() ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                  onClick={() => setAmount(getAvailableBalance(fromCurrency).toString())}
                >
                  MAX
                </Button>
              </div>
              {hasInsufficientFunds() && (
                <p className="text-sm text-red-500">Insufficient funds</p>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwapCurrencies}
              className="rounded-full p-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.filter(c => c.code !== fromCurrency).map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span>{currency.code}</span>
                        <span className="text-gray-500">- {currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>You'll receive</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-medium">
                  {convertedAmount > 0 ? formatCurrency(convertedAmount, toCurrency) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        {exchangeRate > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Exchange Rate</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={refreshRates}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm">
              1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Market Info */}
        <div className="grid grid-cols-2 gap-4">
          {[fromCurrency, toCurrency].map(currency => {
            const currInfo = currencies.find(c => c.code === currency);
            if (!currInfo) return null;
            
            return (
              <div key={currency} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{currInfo.flag}</span>
                  <span className="font-medium">{currInfo.code}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {currInfo.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={currInfo.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {currInfo.change >= 0 ? '+' : ''}{currInfo.change}%
                  </span>
                  <span className="text-gray-500">24h</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fees Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>Conversion fee: 0.5% (minimum $1.00)</p>
              <p>Estimated processing time: Instant</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Convert Button */}
        <Button
          onClick={handleConvert}
          disabled={loading || !amount || !convertedAmount || hasInsufficientFunds()}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Converting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Convert {amount} {fromCurrency} to {toCurrency}
            </div>
          )}
        </Button>

        {/* Recent Conversions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Recent Conversions</Label>
          <div className="space-y-2">
            {[
              { from: 'USD', to: 'EUR', amount: 1000, rate: 0.92, time: '2 hours ago' },
              { from: 'GBP', to: 'USD', amount: 500, rate: 1.27, time: '1 day ago' },
              { from: 'EUR', to: 'GBP', amount: 750, rate: 0.86, time: '3 days ago' }
            ].map((conversion, index) => (
              <div key={index} className="flex items-center justify-between p-2 text-sm border rounded">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-3 w-3 text-gray-400" />
                  <span>{conversion.amount} {conversion.from} → {conversion.to}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rate: {conversion.rate}</p>
                  <p className="text-xs text-gray-500">{conversion.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
