import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe, 
  Coins, 
  TrendingUp, 
  Lock, 
  CheckCircle,
  Star,
  Users,
  DollarSign,
  Bitcoin
} from 'lucide-react';

export const LandingPage = () => {
  const features = [
    {
      icon: Coins,
      title: 'Physical Asset Banking',
      description: 'Deposit gold, silver, and diamonds with professional verification and secure storage.',
    },
    {
      icon: Bitcoin,
      title: 'Bitcoin Integration',
      description: 'Seamlessly convert your asset-backed funds to Bitcoin with competitive rates.',
    },
    {
      icon: Globe,
      title: 'Multi-Currency Support',
      description: 'Manage USD, EUR, and GBP accounts with real-time currency conversion.',
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'Military-grade encryption, multi-factor authentication, and regulatory compliance.',
    },
    {
      icon: Zap,
      title: 'Instant Transactions',
      description: 'Lightning-fast processing with real-time balance updates and notifications.',
    },
    {
      icon: TrendingUp,
      title: 'Asset Tokenization',
      description: 'Convert physical assets to digital tokens for enhanced liquidity and trading.',
    },
  ];

  const stats = [
    { label: 'Assets Secured', value: '$50M+', icon: DollarSign },
    { label: 'Active Users', value: '10K+', icon: Users },
    { label: 'Countries Served', value: '25+', icon: Globe },
    { label: 'Security Rating', value: '5/5', icon: Star },
  ];

  const steps = [
    {
      step: '01',
      title: 'Deposit Assets',
      description: 'Send your gold, silver, or diamonds to our secure facility for professional verification.',
    },
    {
      step: '02',
      title: 'Get Verified',
      description: 'Our experts authenticate and appraise your assets using industry-standard methods.',
    },
    {
      step: '03',
      title: 'Receive Credit',
      description: 'Your account is credited with the verified value in your preferred currency.',
    },
    {
      step: '04',
      title: 'Trade & Invest',
      description: 'Use your funds to buy Bitcoin, trade currencies, or tokenize your assets.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  🚀 Now Live - Digital Asset Banking
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                  Turn Your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Physical Assets
                  </span>{' '}
                  Into Digital Wealth
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Deposit gold, silver, and diamonds. Get instant fiat credit. Buy Bitcoin. 
                  All in one secure, regulated platform with bank-grade security.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="text-lg px-8 py-6">
                  <Link to="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Insured up to $1M</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Portfolio Overview</h3>
                    <Badge variant="secondary">Live</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold">$125,430</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">24h Change</p>
                      <p className="text-2xl font-bold text-green-500">+2.4%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Coins className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Gold (XAU)</span>
                      </div>
                      <span className="font-semibold">$85,200</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <Bitcoin className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Bitcoin</span>
                      </div>
                      <span className="font-semibold">$40,230</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Background decoration */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
              <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-900 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="flex justify-center">
                  <stat.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Everything You Need for Digital Asset Banking
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              From physical asset deposits to Bitcoin trading, we provide a complete 
              ecosystem for modern digital wealth management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get started with SwiftPayMe in four simple steps. From asset deposit 
              to digital wealth management.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold text-lg">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full">
                    <ArrowRight className="h-6 w-6 text-gray-400 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Transform Your Assets?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join thousands of users who trust SwiftPayMe with their digital asset banking needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
                <Link to="/register">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-blue-600">
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

