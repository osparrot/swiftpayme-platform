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
  Filter, 
  Eye, 
  UserCheck, 
  UserX, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [statusFilter, kycFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(kycFilter !== 'all' && { kycStatus: kycFilter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await apiService.getUsers(params);
      setUsers(response.data.users || mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Debounce search
    setTimeout(() => {
      loadUsers();
    }, 500);
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'suspend':
          await apiService.suspendUser(userId, 'Administrative action');
          break;
        case 'unsuspend':
          await apiService.unsuspendUser(userId);
          break;
        case 'approve_kyc':
          await apiService.approveKYC(userId, { approved: true });
          break;
        case 'reject_kyc':
          await apiService.rejectKYC(userId, { reason: 'Documentation insufficient' });
          break;
      }
      loadUsers();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'default',
      suspended: 'destructive',
      pending: 'secondary',
      inactive: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getKycBadge = (kycStatus) => {
    const config = {
      verified: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-500' },
      rejected: { variant: 'destructive', icon: AlertTriangle, color: 'text-red-500' },
      not_started: { variant: 'outline', icon: Shield, color: 'text-gray-500' }
    };
    
    const { variant, icon: Icon, color } = config[kycStatus] || config.not_started;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {kycStatus.replace('_', ' ')}
      </Badge>
    );
  };

  const mockUsers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      status: 'active',
      kycStatus: 'verified',
      joinDate: '2024-01-15',
      lastLogin: '2024-01-20',
      totalDeposits: 25000,
      accountBalance: 12500
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      status: 'active',
      kycStatus: 'pending',
      joinDate: '2024-01-18',
      lastLogin: '2024-01-19',
      totalDeposits: 15000,
      accountBalance: 8750
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      status: 'suspended',
      kycStatus: 'rejected',
      joinDate: '2024-01-10',
      lastLogin: '2024-01-12',
      totalDeposits: 5000,
      accountBalance: 0
    }
  ];

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, KYC verification, and user activities
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Users
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,543</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,921</div>
            <p className="text-xs text-muted-foreground">71% of total users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and filter user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={handleSearch}
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                      <TableCell>{new Date(user.joinDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                      <TableCell>${user.accountBalance?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                                <DialogDescription>
                                  Complete user information and account details
                                </DialogDescription>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Name</label>
                                      <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Email</label>
                                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Status</label>
                                      <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">KYC Status</label>
                                      <div className="mt-1">{getKycBadge(selectedUser.kycStatus)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Total Deposits</label>
                                      <p className="text-sm text-muted-foreground">${selectedUser.totalDeposits?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Account Balance</label>
                                      <p className="text-sm text-muted-foreground">${selectedUser.accountBalance?.toLocaleString()}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 pt-4">
                                    {selectedUser.kycStatus === 'pending' && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          onClick={() => handleUserAction(selectedUser.id, 'approve_kyc')}
                                        >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Approve KYC
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleUserAction(selectedUser.id, 'reject_kyc')}
                                        >
                                          <AlertTriangle className="mr-2 h-4 w-4" />
                                          Reject KYC
                                        </Button>
                                      </>
                                    )}
                                    
                                    {selectedUser.status === 'active' ? (
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                                      >
                                        <UserX className="mr-2 h-4 w-4" />
                                        Suspend User
                                      </Button>
                                    ) : selectedUser.status === 'suspended' && (
                                      <Button 
                                        size="sm"
                                        onClick={() => handleUserAction(selectedUser.id, 'unsuspend')}
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Unsuspend User
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
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

