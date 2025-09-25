import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Upload, 
  Camera, 
  FileText, 
  Gem, 
  Coins, 
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  MapPin,
  Package,
  Truck,
  Shield,
  DollarSign,
  Eye,
  Info,
  ArrowRight,
  Plus,
  X,
  Download
} from 'lucide-react';

export const AssetDeposit = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [depositData, setDepositData] = useState({
    assetType: '',
    quantity: '',
    weight: '',
    description: '',
    estimatedValue: '',
    images: [],
    certificates: [],
    shippingMethod: '',
    insuranceValue: '',
    specialInstructions: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [estimatedCredit, setEstimatedCredit] = useState(0);
  const [processingFee, setProcessingFee] = useState(0);
  const fileInputRef = useRef(null);
  const certificateInputRef = useRef(null);

  const assetTypes = [
    { value: 'gold', label: 'Gold', icon: Gem, color: 'text-yellow-500' },
    { value: 'silver', label: 'Silver', icon: Coins, color: 'text-gray-400' },
    { value: 'diamonds', label: 'Diamonds', icon: Gem, color: 'text-blue-500' },
    { value: 'platinum', label: 'Platinum', icon: Gem, color: 'text-gray-600' }
  ];

  const shippingMethods = [
    { value: 'insured_mail', label: 'Insured Mail', cost: 25, days: '3-5 business days' },
    { value: 'fedex_overnight', label: 'FedEx Overnight', cost: 75, days: '1 business day' },
    { value: 'ups_ground', label: 'UPS Ground', cost: 35, days: '2-3 business days' },
    { value: 'armored_transport', label: 'Armored Transport', cost: 150, days: '1-2 business days' }
  ];

  const steps = [
    { id: 1, title: 'Asset Details', description: 'Provide information about your asset' },
    { id: 2, title: 'Documentation', description: 'Upload photos and certificates' },
    { id: 3, title: 'Shipping', description: 'Choose shipping method and insurance' },
    { id: 4, title: 'Review', description: 'Review and confirm your deposit' }
  ];

  const handleInputChange = (name, value) => {
    setDepositData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate estimated credit based on asset type and weight/quantity
    if (name === 'weight' || name === 'quantity' || name === 'assetType') {
      calculateEstimatedCredit({ ...depositData, [name]: value });
    }
  };

  const calculateEstimatedCredit = (data) => {
    const marketPrices = {
      gold: 2000, // per oz
      silver: 25, // per oz
      diamonds: 5000, // per carat
      platinum: 1000 // per oz
    };

    const weight = parseFloat(data.weight) || 0;
    const baseValue = marketPrices[data.assetType] * weight;
    const creditPercentage = 0.85; // 85% of market value
    const credit = baseValue * creditPercentage;
    const fee = credit * 0.02; // 2% processing fee

    setEstimatedCredit(credit);
    setProcessingFee(fee);
  };

  const handleFileUpload = (type) => {
    const inputRef = type === 'images' ? fileInputRef : certificateInputRef;
    inputRef.current?.click();
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: type,
      preview: URL.createObjectURL(file)
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setDepositData(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setDepositData(prev => ({
      ...prev,
      images: prev.images.filter(f => f.id !== fileId),
      certificates: prev.certificates.filter(f => f.id !== fileId)
    }));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return depositData.assetType && depositData.weight && depositData.description;
      case 2:
        return depositData.images.length > 0;
      case 3:
        return depositData.shippingMethod && depositData.insuranceValue;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call to submit deposit request
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      // Redirect to success page or show confirmation
    } catch (error) {
      console.error('Deposit submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step.id 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'border-gray-300 text-gray-500'
          }`}>
            {currentStep > step.id ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <span className="text-sm font-medium">{step.id}</span>
            )}
          </div>
          <div className="ml-3 min-w-0">
            <p className={`text-sm font-medium ${
              currentStep >= step.id ? 'text-primary' : 'text-gray-500'
            }`}>
              {step.title}
            </p>
            <p className="text-xs text-gray-500">{step.description}</p>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${
              currentStep > step.id ? 'bg-primary' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asset Information
          </CardTitle>
          <CardDescription>
            Tell us about the asset you want to deposit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select value={depositData.assetType} onValueChange={(value) => handleInputChange('assetType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((asset) => {
                  const Icon = asset.icon;
                  return (
                    <SelectItem key={asset.value} value={asset.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${asset.color}`} />
                        {asset.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">
                Weight/Quantity
                <span className="text-sm text-muted-foreground ml-1">
                  ({depositData.assetType === 'diamonds' ? 'carats' : 'oz'})
                </span>
              </Label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={depositData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Value (Optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estimatedValue"
                  type="number"
                  value={depositData.estimatedValue}
                  onChange={(e) => handleInputChange('estimatedValue', e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={depositData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide detailed description of your asset (purity, brand, condition, etc.)"
              rows={4}
            />
          </div>

          {estimatedCredit > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Estimated Credit:</strong> ${estimatedCredit.toFixed(2)}</p>
                  <p><strong>Processing Fee:</strong> ${processingFee.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Final credit amount will be determined after professional appraisal.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Asset Documentation
          </CardTitle>
          <CardDescription>
            Upload clear photos and any certificates of authenticity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Asset Photos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileUpload('images')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Upload high-quality photos of your asset from multiple angles
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG up to 10MB each. Minimum 3 photos required.
              </p>
            </div>

            {/* Uploaded Images Preview */}
            {uploadedFiles.filter(f => f.type === 'images').length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedFiles.filter(f => f.type === 'images').map((file) => (
                  <div key={file.id} className="relative group">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Certificate Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Certificates & Documentation</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileUpload('certificates')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Documents
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Upload certificates of authenticity, appraisals, or purchase receipts
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG up to 10MB each. Optional but recommended.
              </p>
            </div>

            {/* Uploaded Certificates */}
            {uploadedFiles.filter(f => f.type === 'certificates').length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.filter(f => f.type === 'certificates').map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All uploaded files are encrypted and stored securely. Your documentation 
              will only be used for asset verification and appraisal purposes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'images')}
        className="hidden"
      />
      <input
        ref={certificateInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileChange(e, 'certificates')}
        className="hidden"
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping & Insurance
          </CardTitle>
          <CardDescription>
            Choose how you'll send your asset to our secure facility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Shipping Method</Label>
            <div className="grid gap-4">
              {shippingMethods.map((method) => (
                <div
                  key={method.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    depositData.shippingMethod === method.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleInputChange('shippingMethod', method.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{method.label}</p>
                      <p className="text-sm text-muted-foreground">{method.days}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${method.cost}</p>
                      <p className="text-sm text-muted-foreground">Shipping cost</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insuranceValue">Insurance Value</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="insuranceValue"
                type="number"
                value={depositData.insuranceValue}
                onChange={(e) => handleInputChange('insuranceValue', e.target.value)}
                placeholder="Enter insurance value"
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Recommended: Use the estimated value of your asset for full coverage
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              value={depositData.specialInstructions}
              onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
              placeholder="Any special handling instructions or notes for our team"
              rows={3}
            />
          </div>

          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Ship to:</strong></p>
                <p>
                  SwiftPayMe Secure Facility<br />
                  123 Vault Street, Suite 100<br />
                  New York, NY 10004<br />
                  United States
                </p>
                <p className="text-sm">
                  Reference ID: SPM-{Date.now().toString().slice(-6)}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Review Your Deposit
          </CardTitle>
          <CardDescription>
            Please review all details before submitting your deposit request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Asset Summary */}
          <div className="space-y-4">
            <h3 className="font-medium">Asset Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Asset Type</p>
                <p className="font-medium capitalize">{depositData.assetType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Weight/Quantity</p>
                <p className="font-medium">
                  {depositData.weight} {depositData.assetType === 'diamonds' ? 'carats' : 'oz'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium">{depositData.description}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Documentation Summary */}
          <div className="space-y-4">
            <h3 className="font-medium">Documentation</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Photos</p>
                <p className="font-medium">
                  {uploadedFiles.filter(f => f.type === 'images').length} files uploaded
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Certificates</p>
                <p className="font-medium">
                  {uploadedFiles.filter(f => f.type === 'certificates').length} files uploaded
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Summary */}
          <div className="space-y-4">
            <h3 className="font-medium">Shipping & Insurance</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Shipping Method</p>
                <p className="font-medium">
                  {shippingMethods.find(m => m.value === depositData.shippingMethod)?.label}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Insurance Value</p>
                <p className="font-medium">${depositData.insuranceValue}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div className="space-y-4">
            <h3 className="font-medium">Financial Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Estimated Credit</span>
                <span className="font-medium">${estimatedCredit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee (2%)</span>
                <span className="font-medium">-${processingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Cost</span>
                <span className="font-medium">
                  -${shippingMethods.find(m => m.value === depositData.shippingMethod)?.cost || 0}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-medium">
                <span>Net Credit (Estimated)</span>
                <span>
                  ${(estimatedCredit - processingFee - (shippingMethods.find(m => m.value === depositData.shippingMethod)?.cost || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The final credit amount will be determined after professional appraisal of your asset. 
              You'll receive a detailed appraisal report within 2-3 business days of receipt.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asset Deposit</h1>
          <p className="text-gray-600 mt-1">
            Deposit your physical assets and receive instant fiat credit
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Deposit'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
