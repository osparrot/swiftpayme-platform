import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  FileText, 
  Scale, 
  DollarSign,
  Truck,
  Package,
  Shield
} from 'lucide-react';

export const VerificationStatus = ({ asset }) => {
  const verificationSteps = [
    {
      id: 'received',
      title: 'Asset Received',
      description: 'Your asset has been received at our secure facility',
      icon: Package,
      status: asset.verification?.received || 'pending'
    },
    {
      id: 'documented',
      title: 'Documentation Review',
      description: 'Reviewing submitted photos and certificates',
      icon: FileText,
      status: asset.verification?.documented || 'pending'
    },
    {
      id: 'physical_inspection',
      title: 'Physical Inspection',
      description: 'Detailed examination by certified experts',
      icon: Eye,
      status: asset.verification?.physicalInspection || 'pending'
    },
    {
      id: 'testing',
      title: 'Authenticity Testing',
      description: 'Scientific testing to verify authenticity and purity',
      icon: Scale,
      status: asset.verification?.testing || 'pending'
    },
    {
      id: 'appraisal',
      title: 'Professional Appraisal',
      description: 'Final valuation by certified appraisers',
      icon: DollarSign,
      status: asset.verification?.appraisal || 'pending'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'default',
      in_progress: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    };
    
    const labels = {
      completed: 'Completed',
      in_progress: 'In Progress',
      failed: 'Failed',
      pending: 'Pending'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || 'Pending'}
      </Badge>
    );
  };

  const calculateProgress = () => {
    const completedSteps = verificationSteps.filter(step => 
      step.status === 'completed'
    ).length;
    return (completedSteps / verificationSteps.length) * 100;
  };

  const getCurrentStep = () => {
    const inProgressStep = verificationSteps.find(step => 
      step.status === 'in_progress'
    );
    if (inProgressStep) return inProgressStep;

    const nextPendingStep = verificationSteps.find(step => 
      step.status === 'pending'
    );
    return nextPendingStep || verificationSteps[verificationSteps.length - 1];
  };

  const currentStep = getCurrentStep();
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
              <CardDescription>
                Track the verification progress of your asset deposit
              </CardDescription>
            </div>
            {getStatusBadge(asset.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {currentStep && (
            <Alert>
              <currentStep.icon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Current Step: {currentStep.title}</p>
                  <p className="text-sm">{currentStep.description}</p>
                  {currentStep.status === 'in_progress' && (
                    <p className="text-xs text-muted-foreground">
                      Estimated completion: 1-2 business days
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Steps</CardTitle>
          <CardDescription>
            Detailed breakdown of the verification process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verificationSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {step.title}
                      </p>
                      {getStatusBadge(step.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {step.description}
                    </p>
                    
                    {/* Additional details for specific steps */}
                    {step.id === 'received' && step.status === 'completed' && asset.receivedDate && (
                      <p className="text-xs text-green-600 mt-1">
                        Received on {new Date(asset.receivedDate).toLocaleDateString()}
                      </p>
                    )}
                    
                    {step.id === 'appraisal' && step.status === 'completed' && asset.appraisalValue && (
                      <p className="text-xs text-green-600 mt-1">
                        Appraised at ${asset.appraisalValue.toLocaleString()}
                      </p>
                    )}
                    
                    {step.status === 'failed' && (
                      <p className="text-xs text-red-600 mt-1">
                        Issue detected. Our team will contact you shortly.
                      </p>
                    )}
                  </div>
                  
                  {/* Connector line */}
                  {index < verificationSteps.length - 1 && (
                    <div className="absolute left-6 mt-6 w-0.5 h-8 bg-gray-200" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Tracking */}
      {asset.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tracking Number</p>
                <p className="font-mono font-medium">{asset.trackingNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carrier</p>
                <p className="font-medium">{asset.carrier || 'FedEx'}</p>
              </div>
            </div>
            
            {asset.shippingStatus && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Status: {asset.shippingStatus}
                </p>
                {asset.estimatedDelivery && (
                  <p className="text-xs text-blue-700 mt-1">
                    Estimated delivery: {new Date(asset.estimatedDelivery).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {asset.timeline && asset.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Recent updates and activities for this deposit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {asset.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleString()}
                    </p>
                    {event.note && (
                      <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
