import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Eye, EyeOff, Mail, User, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Personal Details, 3: Verification
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    
    // Step 2: Personal Details
    phone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    
    // Step 3: Agreements
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    setPasswordStrength({ score, feedback });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword || 
            !formData.firstName || !formData.lastName) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (passwordStrength.score < 3) {
          setError('Password is too weak. Please choose a stronger password.');
          return false;
        }
        break;
      case 2:
        if (!formData.phone || !formData.dateOfBirth || 
            !formData.address.street || !formData.address.city || 
            !formData.address.state || !formData.address.zipCode || 
            !formData.address.country) {
          setError('Please fill in all required fields');
          return false;
        }
        break;
      case 3:
        if (!formData.acceptTerms || !formData.acceptPrivacy) {
          setError('Please accept the required terms and conditions');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        acceptMarketing: formData.acceptMarketing
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 1) return 'bg-red-500';
    if (passwordStrength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 1) return 'Weak';
    if (passwordStrength.score <= 3) return 'Medium';
    return 'Strong';
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="john.doe@example.com"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a strong password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        
        {formData.password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Password strength:</span>
              <span className={`font-medium ${
                passwordStrength.score <= 1 ? 'text-red-500' :
                passwordStrength.score <= 3 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {getPasswordStrengthText()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              ></div>
            </div>
            {passwordStrength.feedback.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Missing: {passwordStrength.feedback.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Passwords do not match
          </p>
        )}
        {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
          <p className="text-sm text-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Passwords match
          </p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 123-4567"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-medium">Address Information *</Label>
        </div>
        
        <div className="space-y-2">
          <Input
            name="address.street"
            type="text"
            value={formData.address.street}
            onChange={handleInputChange}
            placeholder="Street Address"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="address.city"
            type="text"
            value={formData.address.city}
            onChange={handleInputChange}
            placeholder="City"
            required
          />
          <Input
            name="address.state"
            type="text"
            value={formData.address.state}
            onChange={handleInputChange}
            placeholder="State/Province"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            name="address.zipCode"
            type="text"
            value={formData.address.zipCode}
            onChange={handleInputChange}
            placeholder="ZIP/Postal Code"
            required
          />
          <Input
            name="address.country"
            type="text"
            value={formData.address.country}
            onChange={handleInputChange}
            placeholder="Country"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="acceptTerms"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, acceptTerms: checked }))
            }
          />
          <Label htmlFor="acceptTerms" className="text-sm">
            I accept the{' '}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            *
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="acceptPrivacy"
            name="acceptPrivacy"
            checked={formData.acceptPrivacy}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, acceptPrivacy: checked }))
            }
          />
          <Label htmlFor="acceptPrivacy" className="text-sm">
            I accept the{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{' '}
            *
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="acceptMarketing"
            name="acceptMarketing"
            checked={formData.acceptMarketing}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, acceptMarketing: checked }))
            }
          />
          <Label htmlFor="acceptMarketing" className="text-sm">
            I would like to receive marketing communications and updates
          </Label>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          By creating an account, you confirm that you are at least 18 years old and 
          agree to comply with all applicable laws and regulations regarding financial services.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Step {step} of 3: {
              step === 1 ? 'Basic Information' :
              step === 2 ? 'Personal Details' :
              'Terms & Verification'
            }
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex space-x-2 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex gap-2 mt-6">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {step === 3 ? 'Creating Account...' : 'Next'}
                  </div>
                ) : (
                  step === 3 ? 'Create Account' : 'Next'
                )}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <div className="w-full text-center space-y-4">
            <Separator />
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
