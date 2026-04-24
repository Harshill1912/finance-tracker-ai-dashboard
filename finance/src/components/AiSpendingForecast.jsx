import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const AiSpendingForecast = () => {
  const [forecast, setForecast] = useState([]);
  const [insight, setInsight] = useState('');
  const [averageMonthly, setAverageMonthly] = useState(0);
  const [trend, setTrend] = useState('stable');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Check for local backend first
      const localUrl = 'http://localhost:5000';
      const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
      
      let useLocal = false;
      try {
        const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
        if (testRes.data) {
          useLocal = true;
        }
      } catch (e) {
        // Local not available
      }
      
      const baseUrl = useLocal ? localUrl : deployedUrl;
      
      const response = await axios.get(`${baseUrl}/api/ai/spending-forecast?months=3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: useLocal ? 25000 : 50000, // Increased timeout
      });

      if (response.data.forecast) {
        setForecast(response.data.forecast);
        setInsight(response.data.insight || '');
        setAverageMonthly(response.data.averageMonthlySpending || 0);
        setTrend(response.data.trend || 'stable');
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
      // Silent error handling - don't show error
      setError(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600 dark:text-red-400';
      case 'decreasing':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Generating spending forecast...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-500" />
            AI Spending Forecast
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchForecast}
            className="text-xs"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Monthly</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              ₹{averageMonthly.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trend</p>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <p className={`text-lg font-bold capitalize ${getTrendColor()}`}>
                {trend}
              </p>
            </div>
          </div>
        </div>

        {/* Forecast Chart */}
        {forecast.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              3-Month Forecast
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Predicted']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="predictedAmount" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Forecast List */}
        {forecast.length > 0 && (
          <div className="space-y-3 mb-4">
            {forecast.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">
                      {item.month}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Confidence: {(item.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ₹{(item.predicted || item.predictedAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {insight && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {insight}
              </p>
            </div>
          </div>
        )}

        {forecast.length === 0 && !error && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No forecast data available. Add more expenses to generate predictions!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AiSpendingForecast;
