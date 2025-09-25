import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Gem, 
  Bitcoin, 
  Coins,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

export const PortfolioChart = ({ data, timeframe = '30d' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock portfolio data
  const portfolioData = {
    totalValue: 71275.08,
    change24h: 4.2,
    changeAmount: 2890.45,
    assets: [
      { name: 'Gold', value: 25000, percentage: 35.1, change: 2.5, color: '#FFD700' },
      { name: 'USD', value: 20000, percentage: 28.1, change: 0.0, color: '#22C55E' },
      { name: 'Bitcoin', value: 10890, percentage: 15.3, change: 5.7, color: '#F59E0B' },
      { name: 'Silver', value: 8200, percentage: 11.5, change: -1.2, color: '#9CA3AF' },
      { name: 'EUR', value: 4185, percentage: 5.9, change: 1.8, color: '#3B82F6' },
      { name: 'GBP', value: 3000, percentage: 4.2, change: -0.5, color: '#8B5CF6' }
    ],
    historicalData: [
      { date: '2024-01-01', value: 65000, gold: 22000, usd: 18000, bitcoin: 8500, silver: 7500, eur: 4000, gbp: 5000 },
      { date: '2024-01-05', value: 66200, gold: 22500, usd: 18200, bitcoin: 8800, silver: 7600, eur: 4100, gbp: 5000 },
      { date: '2024-01-10', value: 68500, gold: 23000, usd: 19000, bitcoin: 9200, silver: 7800, eur: 4200, gbp: 5300 },
      { date: '2024-01-15', value: 71275, gold: 25000, usd: 20000, bitcoin: 10890, silver: 8200, eur: 4185, gbp: 3000 }
    ],
    performance: {
      '24h': { change: 4.2, amount: 2890.45 },
      '7d': { change: 8.7, amount: 5720.30 },
      '30d': { change: 12.3, amount: 7815.60 },
      '90d': { change: 18.9, amount: 11350.80 },
      '1y': { change: 24.5, amount: 14025.90 }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getAssetIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'gold':
        return <Gem className="h-4 w-4 text-yellow-500" />;
      case 'silver':
        return <Coins className="h-4 w-4 text-gray-400" />;
      case 'bitcoin':
        return <Bitcoin className="h-4 w-4 text-orange-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-green-500" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Portfolio Overview</CardTitle>
              <CardDescription>
                Total portfolio value and performance metrics
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency(portfolioData.totalValue)}</p>
              <div className="flex items-center gap-1">
                {portfolioData.change24h >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  portfolioData.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatPercentage(portfolioData.change24h)} ({formatCurrency(portfolioData.changeAmount)})
                </span>
                <span className="text-sm text-gray-500">24h</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(portfolioData.performance).map(([period, perf]) => (
          <Card key={period}>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase">{period}</p>
                <p className={`text-lg font-bold ${
                  perf.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(perf.change)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(perf.amount)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Allocation
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value Over Time</CardTitle>
              <CardDescription>
                Historical portfolio value and asset breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioData.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>
                  Distribution of your portfolio by asset type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={portfolioData.assets}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {portfolioData.assets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Breakdown</CardTitle>
                <CardDescription>
                  Detailed view of each asset in your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolioData.assets.map((asset, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.name)}
                          <span className="font-medium">{asset.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(asset.value)}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">{asset.percentage}%</span>
                          <Badge variant={asset.change >= 0 ? 'default' : 'destructive'}>
                            {formatPercentage(asset.change)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance Comparison</CardTitle>
              <CardDescription>
                Compare the performance of different assets in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={portfolioData.assets}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Change']}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar 
                      dataKey="change" 
                      fill={(entry) => entry >= 0 ? '#22C55E' : '#EF4444'}
                      radius={[4, 4, 0, 0]}
                    >
                      {portfolioData.assets.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.change >= 0 ? '#22C55E' : '#EF4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>
                Key performance metrics for your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {portfolioData.assets.filter(a => a.change > 0).length}
                  </p>
                  <p className="text-sm text-green-700">Assets Gaining</p>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {portfolioData.assets.filter(a => a.change < 0).length}
                  </p>
                  <p className="text-sm text-red-700">Assets Declining</p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {(portfolioData.assets.reduce((sum, asset) => sum + Math.abs(asset.change), 0) / portfolioData.assets.length).toFixed(1)}%
                  </p>
                  <p className="text-sm text-blue-700">Avg Volatility</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
