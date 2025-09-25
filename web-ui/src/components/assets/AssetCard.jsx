import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Gem, 
  Coins, 
  Eye, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Calendar
} from 'lucide-react';

export const AssetCard = ({ asset, onView, onDownload }) => {
  const getAssetIcon = (type) => {
    switch (type) {
      case 'gold':
        return <Gem className="h-5 w-5 text-yellow-500" />;
      case 'silver':
        return <Coins className="h-5 w-5 text-gray-400" />;
      case 'diamonds':
        return <Gem className="h-5 w-5 text-blue-500" />;
      case 'platinum':
        return <Gem className="h-5 w-5 text-gray-600" />;
      default:
        return <Gem className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pending Review' },
      appraising: { variant: 'default', icon: Eye, text: 'Under Appraisal' },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved' },
      rejected: { variant: 'destructive', icon: AlertCircle, text: 'Rejected' },
      credited: { variant: 'default', icon: CheckCircle, text: 'Credited' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getAssetIcon(asset.type)}
            <CardTitle className="text-lg capitalize">{asset.type}</CardTitle>
          </div>
          {getStatusBadge(asset.status)}
        </div>
        <CardDescription>
          Deposit ID: {asset.id} • {formatDate(asset.createdAt)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Asset Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Weight/Quantity</p>
            <p className="font-medium">
              {asset.weight} {asset.type === 'diamonds' ? 'carats' : 'oz'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Estimated Value</p>
            <p className="font-medium">{formatCurrency(asset.estimatedValue)}</p>
          </div>
        </div>

        {/* Credit Information */}
        {asset.status === 'credited' && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Credit Applied</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {formatCurrency(asset.creditAmount)} added to your account
            </p>
          </div>
        )}

        {/* Appraisal Information */}
        {asset.appraisalValue && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Appraised Value</span>
              <span className="font-medium">{formatCurrency(asset.appraisalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credit Amount (85%)</span>
              <span className="font-medium">{formatCurrency(asset.creditAmount)}</span>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p className="text-sm line-clamp-2">{asset.description}</p>
        </div>

        {/* Timeline */}
        {asset.timeline && asset.timeline.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Activity</p>
            <div className="space-y-1">
              {asset.timeline.slice(0, 2).map((event, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{event.action}</span>
                  <span>•</span>
                  <span>{formatDate(event.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(asset)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {asset.appraisalReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(asset.appraisalReport)}
            >
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
