import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  Bitcoin,
  Coins,
  CreditCard
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export const TransactionMonitoring = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, typeFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await apiService.getTransactions(params);
      setTransactions(response.data.transactions || mockTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionAction = async (transactionId, action) => {
    try {
      switch (action) {
        case 'approve':
          await apiService.approveTransaction(transactionId);
          break;
        case 'reject':
          await apiService.rejectTransaction(transactionId);
          break;
        case 'investigate':
          await apiService.flagTransactionForInvestigation(transactionId);
          break;
      }
      loadTransactions();
    } catch (error) {
      console.error('Transaction action failed:', error);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      completed: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-500' },
      failed: { variant: 'destructive', icon: AlertTriangle, color: 'text-red-500' },
      processing: { variant: 'outline', icon: RefreshCw, color: 'text-blue-500' },
      cancelled: { variant: 'outline', icon: AlertTriangle, color: 'text-gray-500' }
    };
    
    const { variant, icon: Icon, color } = config[status] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status}
      </Badge>
    );
  };

  const getTransactionIcon = (type) => {
    const icons = {
      asset_deposit: Coins,
      crypto_purchase: Bitcoin,
      fiat_transfer: CreditCard,
      token_mint: Coins,
      token_burn: Coins,
      withdrawal: ArrowUpRight
    };
    const Icon = icons[type] || DollarSign;
    return <Icon className="h-4 w-4" />;
  };

  const getTransactionDirection = (type) => {
    const inbound = ['asset_deposit', 'fiat_transfer_in', 'token_mint'];
    return inbound.includes(type) ? 'in' : 'out';
  };

  const mockTransactions = [
    {
      id: 'TXN-001',
      userId: 1234,
      userName: 'John Doe',
      type: 'asset_deposit',
      amount: 25000,
      currency: 'USD',
      status: 'completed',
      timestamp: '2024-01-20T10:30:00Z',
      description: 'Gold deposit - 10.5oz PAMP Suisse',
      fees: 125,
      reference: 'ASSET-001',
      riskScore: 'low'
    },
    {
      id: 'TXN-002',
      userId: 5678,
      userName: 'Jane Smith',
      type: 'crypto_purchase',
      amount: 15000,
      currency: 'USD',
      cryptoAmount: 0.35,
      cryptoCurrency: 'BTC',
      status: 'pending',
      timestamp: '2024-01-20T14:15:00Z',
      description: 'Bitcoin purchase',
      fees: 75,
      reference: 'BTC-002',
      riskScore: 'medium'
    },
    {
      id: 'TXN-003',
      userId: 9012,
      userName: 'Bob Johnson',
      type: 'fiat_transfer',
      amount: 5000,
      currency: 'EUR',
      status: 'failed',
      timestamp: '2024-01-19T16:20:00Z',
      description: 'EUR to USD conversion',
      fees: 25,
      reference: 'CONV-003',
      riskScore: 'high',
      failureReason: 'Insufficient funds'
    },
    {
      id: 'TXN-004',
      userId: 3456,
      userName: 'Alice Brown',
      type: 'token_mint',
      amount: 12000,
      currency: 'USD',
      tokenAmount: 12000,
      tokenSymbol: 'XAUG',
      status: 'processing',
      timestamp: '2024-01-20T11:45:00Z',
      description: 'Gold token minting',
      fees: 60,
      reference: 'TOKEN-004',
      riskScore: 'low'
    }
  ];

  const filteredTransactions = transactions.filter(tx => 
    tx.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and manage all system transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+23 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Monitoring Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Monitor all system transactions in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user, transaction ID, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset_deposit">Asset Deposit</SelectItem>
                <SelectItem value="crypto_purchase">Crypto Purchase</SelectItem>
                <SelectItem value="fiat_transfer">Fiat Transfer</SelectItem>
                <SelectItem value="token_mint">Token Mint</SelectItem>
                <SelectItem value="token_burn">Token Burn</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="font-medium">{transaction.id}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {transaction.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.userName}</div>
                          <div className="text-sm text-muted-foreground">ID: {transaction.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {transaction.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {getTransactionDirection(transaction.type) === 'in' ? '+' : '-'}
                            ${transaction.amount?.toLocaleString()} {transaction.currency}
                          </div>
                          {transaction.cryptoAmount && (
                            <div className="text-sm text-muted-foreground">
                              {transaction.cryptoAmount} {transaction.cryptoCurrency}
                            </div>
                          )}
                          {transaction.tokenAmount && (
                            <div className="text-sm text-muted-foreground">
                              {transaction.tokenAmount} {transaction.tokenSymbol}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.riskScore === 'high' ? 'destructive' :
                            transaction.riskScore === 'medium' ? 'secondary' : 'outline'
                          }
                        >
                          {transaction.riskScore}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>
                                Complete transaction information and audit trail
                              </DialogDescription>
                            </DialogHeader>
                            {selectedTransaction && (
                              <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Transaction ID</label>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.id}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Reference</label>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.reference}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">User</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedTransaction.userName} (ID: {selectedTransaction.userId})
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {selectedTransaction.type.replace('_', ' ')}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Amount</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedTransaction.amount?.toLocaleString()} {selectedTransaction.currency}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Fees</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedTransaction.fees?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Risk Score</label>
                                    <div className="mt-1">
                                      <Badge 
                                        variant={
                                          selectedTransaction.riskScore === 'high' ? 'destructive' :
                                          selectedTransaction.riskScore === 'medium' ? 'secondary' : 'outline'
                                        }
                                      >
                                        {selectedTransaction.riskScore}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Timestamp</label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedTransaction.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                  {selectedTransaction.failureReason && (
                                    <div>
                                      <label className="text-sm font-medium">Failure Reason</label>
                                      <p className="text-sm text-red-600">{selectedTransaction.failureReason}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <p className="text-sm text-muted-foreground mt-1">{selectedTransaction.description}</p>
                                </div>

                                {selectedTransaction.status === 'pending' && (
                                  <div className="flex gap-2 pt-4 border-t">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleTransactionAction(selectedTransaction.id, 'approve')}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleTransactionAction(selectedTransaction.id, 'reject')}
                                    >
                                      <AlertTriangle className="mr-2 h-4 w-4" />
                                      Reject
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleTransactionAction(selectedTransaction.id, 'investigate')}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Investigate
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

