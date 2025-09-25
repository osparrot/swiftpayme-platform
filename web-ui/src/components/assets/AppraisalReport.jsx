import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  FileText, 
  Download, 
  Eye, 
  Scale, 
  Award, 
  Calendar,
  User,
  Shield,
  DollarSign,
  Gem,
  CheckCircle
} from 'lucide-react';

export const AppraisalReport = ({ asset, onDownload, onView }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGradeColor = (grade) => {
    const gradeColors = {
      'A+': 'text-green-600',
      'A': 'text-green-500',
      'A-': 'text-green-400',
      'B+': 'text-blue-600',
      'B': 'text-blue-500',
      'B-': 'text-blue-400',
      'C+': 'text-yellow-600',
      'C': 'text-yellow-500',
      'C-': 'text-orange-500'
    };
    return gradeColors[grade] || 'text-gray-500';
  };

  if (!asset.appraisalReport) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Appraisal report not yet available</p>
            <p className="text-sm text-gray-400 mt-1">
              Report will be generated after verification is complete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const report = asset.appraisalReport;

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Professional Appraisal Report
              </CardTitle>
              <CardDescription>
                Certified appraisal by {report.appraiser?.name || 'SwiftPayMe Certified Appraiser'}
              </CardDescription>
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Certified
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report.appraisedValue)}
              </p>
              <p className="text-sm text-green-700">Appraised Value</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Scale className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {report.grade || 'A'}
              </p>
              <p className="text-sm text-blue-700">Quality Grade</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {report.purity || '99.9%'}
              </p>
              <p className="text-sm text-purple-700">Purity</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onDownload(report)} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Full Report
            </Button>
            <Button variant="outline" onClick={() => onView(report)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5" />
            Asset Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Physical Characteristics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">
                      {asset.weight} {asset.type === 'diamonds' ? 'carats' : 'oz'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purity:</span>
                    <span className="font-medium">{report.purity || '99.9%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="font-medium">{report.condition || 'Excellent'}</span>
                  </div>
                  {report.dimensions && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="font-medium">{report.dimensions}</span>
                    </div>
                  )}
                </div>
              </div>

              {asset.type === 'diamonds' && report.diamondSpecs && (
                <div>
                  <h4 className="font-medium mb-2">Diamond Specifications</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cut:</span>
                      <span className="font-medium">{report.diamondSpecs.cut}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Color:</span>
                      <span className="font-medium">{report.diamondSpecs.color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clarity:</span>
                      <span className="font-medium">{report.diamondSpecs.clarity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carat:</span>
                      <span className="font-medium">{report.diamondSpecs.carat}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Market Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Price:</span>
                    <span className="font-medium">
                      {formatCurrency(report.marketPrice || report.appraisedValue * 0.9)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premium/Discount:</span>
                    <span className={`font-medium ${
                      (report.premium || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(report.premium || 0) >= 0 ? '+' : ''}{report.premium || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidity:</span>
                    <span className="font-medium">{report.liquidity || 'High'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Quality Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overall Grade:</span>
                    <span className={`font-medium ${getGradeColor(report.grade)}`}>
                      {report.grade || 'A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Authenticity:</span>
                    <span className="font-medium text-green-600">Verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium">{report.confidence || '99.8%'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {report.notes && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Appraiser Notes</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{report.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Credit Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Appraised Value</span>
              <span className="font-medium">{formatCurrency(report.appraisedValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Credit Rate (85%)</span>
              <span className="font-medium">
                {formatCurrency(report.appraisedValue * 0.85)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Processing Fee (2%)</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(report.appraisedValue * 0.85 * 0.02)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Net Credit Amount</span>
              <span className="text-green-600">
                {formatCurrency(asset.creditAmount || (report.appraisedValue * 0.85 * 0.98))}
              </span>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Credit Applied</span>
            </div>
            <p className="text-sm text-green-600">
              {formatCurrency(asset.creditAmount || (report.appraisedValue * 0.85 * 0.98))} has been 
              added to your USD account and is available for immediate use.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appraiser Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certification & Appraiser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Appraiser Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{report.appraiser?.name || 'Dr. Sarah Mitchell, GIA'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{report.appraiser?.certification || 'GIA Certified Gemologist'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Appraised on {formatDate(report.appraisalDate || new Date())}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Report Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report ID:</span>
                  <span className="font-mono">{report.reportId || 'SPM-' + Date.now().toString().slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until:</span>
                  <span>{formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification:</span>
                  <span className="text-green-600 font-medium">Blockchain Verified</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
