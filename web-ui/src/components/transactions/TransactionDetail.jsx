import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Bitcoin, 
  Gem,
  ArrowLeftRight,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  CreditCard,
  Building,
  User,
  MapPin
} from 'lucide-react';

export const TransactionDetail = ({ transaction, onClose }) => {
  const getTransactionIcon = (type, subType) => {
    switch (type) {
      case 'deposit':
        return subType === 'asset_deposit' ? 
          <Gem className="h-6 w-6 text-green-500" /> : 
          <ArrowDownRight className="h-6 w-6 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-6 w-6 text-red-500" />;
      case 'purchase':
        return <Bitcoin className="h-6 w-6 text-orange-500" />;
      case 'transfer':
        return <ArrowLeftRight className="h-6 w-6 text-blue-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: { variant: 'default', icon: CheckCircle, text: 'Completed', color: 'text-green-600' },
      pending: { variant: 'secondary', icon: Clock, text: 'Pending', color: 'text-yellow-600' },
      processing: { variant: 'secondary', icon: RefreshCw, text: 'Processing', color: 'text-blue-600' },
      failed: { variant: 'destructive', icon: AlertCircle, text: 'Failed', color: 'text-red-600' },
      cancelled: { variant: 'outline', icon: AlertCircle, text: 'Cancelled', color: 'text-gray-600' }
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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const mockTimeline = [
    {
      status: 'initiated',
      timestamp: transaction.date,
      description: 'Transaction initiated',
      details: 'User initiated the transaction'
    },
    {
      status: 'processing',
      timestamp: new Date(new Date(transaction.date).getTime() + 5 * 60 * 1000).toISOString(),
      description: 'Processing payment',
      details: 'Verifying transaction details and processing payment'
    },
    {
      status: 'completed',
      timestamp: new Date(new Date(transaction.date).getTime() + 10 * 60 * 1000).toISOString(),
      description: 'Transaction completed',
      details: 'Transaction successfully completed and funds transferred'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTransactionIcon(transaction.type, transaction.subType)}
              <div>
                <CardTitle className="text-xl">
                  {getTypeLabel(transaction.type, transaction.subType)}
                </CardTitle>
                <CardDescription>
                  Transaction ID: {transaction.id}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(transaction.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <p className="text-sm text-gray-600">Transaction Amount</p>
            </div>
            
            {transaction.fee && transaction.fee > 0 && (
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(transaction.fee)}
                </p>
                <p className="text-sm text-red-700">Processing Fee</p>
              </div>
            )}
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(transaction.amount - (transaction.fee || 0), transaction.currency)}
              </p>
              <p className="text-sm text-green-700">Net Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Reference ID</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm">{transaction.reference}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.reference)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Date & Time</p>
                <p className="text-sm mt-1">{formatDate(transaction.date)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm mt-1">{transaction.description}</p>
              </div>

              {transaction.asset && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Asset</p>
                  <p className="text-sm mt-1">{transaction.asset}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {transaction.btcAmount && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Bitcoin Amount</p>
                  <p className="text-sm mt-1 font-mono">₿ {transaction.btcAmount}</p>
                </div>
              )}

              {transaction.convertedAmount && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Converted Amount</p>
                  <p className="text-sm mt-1">
                    {formatCurrency(transaction.convertedAmount, transaction.convertedCurrency)}
                  </p>
                </div>
              )}

              {transaction.exchangeRate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Exchange Rate</p>
                  <p className="text-sm mt-1">{transaction.exchangeRate}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500">Network</p>
                <p className="text-sm mt-1">SwiftPayMe Network</p>
              </div>
            </div>
          </div>

          {transaction.notes && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{transaction.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method / Destination */}
      {(transaction.type === 'withdrawal' || transaction.type === 'deposit') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {transaction.type === 'withdrawal' ? <Building className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              {transaction.type === 'withdrawal' ? 'Destination' : 'Source'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Chase Bank</p>
                  <p className="text-sm text-gray-500">****1234</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-gray-500">Account Holder</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">New York, NY</p>
                  <p className="text-sm text-gray-500">United States</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTimeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blockchain Information (for crypto transactions) */}
      {transaction.type === 'purchase' && transaction.asset === 'Bitcoin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bitcoin className="h-5 w-5" />
              Blockchain Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Transaction Hash</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono text-sm break-all">
                  0x1234567890abcdef1234567890abcdef12345678
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('0x1234567890abcdef1234567890abcdef12345678')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Block Number</p>
                <p className="text-sm mt-1">825,432</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Confirmations</p>
                <p className="text-sm mt-1">6/6</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            {transaction.status === 'failed' && (
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Transaction
              </Button>
            )}
            {transaction.status === 'pending' && (
              <Button variant="outline" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Cancel Transaction
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Need help with this transaction? Contact our support team at{' '}
          <a href="mailto:support@swiftpayme.com" className="text-blue-600 hover:underline">
            support@swiftpayme.com
          </a>{' '}
          or call +1 (555) 123-4567. Please reference transaction ID: {transaction.id}
        </AlertDescription>
      </Alert>
    </div>
  );
};
