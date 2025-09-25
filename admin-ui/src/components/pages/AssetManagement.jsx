import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Gem, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Scale,
  FileImage,
  DollarSign,
  TrendingUp,
  Download,
  Upload
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadAssets();
  }, [statusFilter, typeFilter]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await apiService.getAssetDeposits(params);
      setAssets(response.data.assets || mockAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setAssets(mockAssets);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetAction = async (assetId, action, data = {}) => {
    try {
      switch (action) {
        case 'approve':
          await apiService.approveAsset(assetId, {
            approved: true,
            reason: approvalReason,
            ...data
          });
          break;
        case 'reject':
          await apiService.rejectAsset(assetId, {
            reason: rejectionReason,
            ...data
          });
          break;
        case 'update_valuation':
          await apiService.updateAssetValuation(assetId, data);
          break;
      }
      loadAssets();
      setApprovalReason('');
      setRejectionReason('');
    } catch (error) {
      console.error('Asset action failed:', error);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-500' },
      verified: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      approved: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-500' },
      under_review: { variant: 'outline', icon: Eye, color: 'text-blue-500' }
    };
    
    const { variant, icon: Icon, color } = config[status] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getAssetIcon = (type) => {
    const icons = {
      gold: '🥇',
      silver: '🥈',
      diamond: '💎',
      platinum: '⚪',
      palladium: '⚫'
    };
    return icons[type] || '💎';
  };

  const mockAssets = [
    {
      id: 1,
      userId: 1234,
      userName: 'John Doe',
      type: 'gold',
      weight: 10.5,
      purity: 99.9,
      estimatedValue: 25000,
      finalValue: null,
      status: 'pending',
      submittedAt: '2024-01-20T10:30:00Z',
      images: ['asset1_front.jpg', 'asset1_back.jpg'],
      certificates: ['certificate1.pdf'],
      description: '10.5oz Gold Bar - PAMP Suisse',
      verificationMethod: 'xrf_analysis'
    },
    {
      id: 2,
      userId: 5678,
      userName: 'Jane Smith',
      type: 'silver',
      weight: 100,
      purity: 99.9,
      estimatedValue: 3200,
      finalValue: 3150,
      status: 'approved',
      submittedAt: '2024-01-19T14:15:00Z',
      approvedAt: '2024-01-20T09:45:00Z',
      images: ['asset2_front.jpg'],
      certificates: [],
      description: '100oz Silver Bar - Royal Canadian Mint',
      verificationMethod: 'visual_inspection'
    },
    {
      id: 3,
      userId: 9012,
      userName: 'Bob Johnson',
      type: 'diamond',
      weight: 2.5,
      purity: null,
      estimatedValue: 15000,
      finalValue: null,
      status: 'under_review',
      submittedAt: '2024-01-18T16:20:00Z',
      images: ['asset3_1.jpg', 'asset3_2.jpg', 'asset3_3.jpg'],
      certificates: ['gia_certificate.pdf'],
      description: '2.5 Carat Diamond - Round Brilliant Cut',
      verificationMethod: 'professional_appraisal'
    }
  ];

  const filteredAssets = assets.filter(asset => 
    asset.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Review and approve physical asset deposits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
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
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Gem className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+23 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Deposits</CardTitle>
          <CardDescription>Review and manage physical asset deposits</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user, asset ID, or description..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="palladium">Palladium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assets Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight/Size</TableHead>
                  <TableHead>Estimated Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
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
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getAssetIcon(asset.type)}</div>
                          <div>
                            <div className="font-medium">#{asset.id}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {asset.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.userName}</div>
                          <div className="text-sm text-muted-foreground">ID: {asset.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {asset.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Scale className="h-3 w-3 text-muted-foreground" />
                          {asset.weight} {asset.type === 'diamond' ? 'ct' : 'oz'}
                          {asset.purity && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({asset.purity}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${asset.estimatedValue?.toLocaleString()}</div>
                          {asset.finalValue && asset.finalValue !== asset.estimatedValue && (
                            <div className="text-sm text-green-600">
                              Final: ${asset.finalValue.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell>
                        {new Date(asset.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Asset Details - #{selectedAsset?.id}</DialogTitle>
                              <DialogDescription>
                                Complete asset information and verification details
                              </DialogDescription>
                            </DialogHeader>
                            {selectedAsset && (
                              <div className="grid gap-6">
                                {/* Asset Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Asset Type</label>
                                    <p className="text-sm text-muted-foreground capitalize">{selectedAsset.type}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Weight/Size</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedAsset.weight} {selectedAsset.type === 'diamond' ? 'carats' : 'oz'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Purity</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedAsset.purity ? `${selectedAsset.purity}%` : 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Verification Method</label>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {selectedAsset.verificationMethod?.replace('_', ' ')}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Estimated Value</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedAsset.estimatedValue?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedAsset.status)}</div>
                                  </div>
                                </div>

                                {/* Description */}
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <p className="text-sm text-muted-foreground mt-1">{selectedAsset.description}</p>
                                </div>

                                {/* Images */}
                                {selectedAsset.images && selectedAsset.images.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium">Images</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                      {selectedAsset.images.map((image, index) => (
                                        <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                                          <FileImage className="h-8 w-8 text-muted-foreground" />
                                          <span className="text-xs ml-1">{image}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                {selectedAsset.status === 'pending' && (
                                  <div className="space-y-4 pt-4 border-t">
                                    <div>
                                      <label className="text-sm font-medium">Approval Reason</label>
                                      <Textarea
                                        placeholder="Enter reason for approval..."
                                        value={approvalReason}
                                        onChange={(e) => setApprovalReason(e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Rejection Reason</label>
                                      <Textarea
                                        placeholder="Enter reason for rejection..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={() => handleAssetAction(selectedAsset.id, 'approve')}
                                        disabled={!approvalReason.trim()}
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve Asset
                                      </Button>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => handleAssetAction(selectedAsset.id, 'reject')}
                                        disabled={!rejectionReason.trim()}
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject Asset
                                      </Button>
                                    </div>
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

