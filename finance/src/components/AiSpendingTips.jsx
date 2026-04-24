import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const AiSpendingTips = () => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchAiTips();
  }, []);

  const fetchAiTips = async () => {
    try {
      setLoading(true);
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
      
      const response = await axios.get(`${baseUrl}/api/ai/tips`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: useLocal ? 25000 : 50000, // Increased timeout further
      });

      if (response.data.tips && response.data.tips.length > 0) {
        setTips(response.data.tips);
        setSummary(response.data.summary);
      } else {
        // Fallback tips
        setTips([
          {
            type: 'info',
            title: 'Track Your Expenses',
            description: 'Regularly review your spending to identify patterns and opportunities to save.'
          }
        ]);
      }
    } catch (err) {
      // Silently handle errors - don't show to user, just use fallback
      console.error('Error fetching AI tips:', err);
      // Set fallback tips (always show something)
      setTips([
        {
          type: 'info',
          title: 'Financial Wellness',
          description: 'Keep tracking your expenses and stay within your budget to achieve your financial goals.'
        }
      ]);
      setError(null); // Don't show error message
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <PiggyBank className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-purple-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
      default:
        return 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800';
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading AI insights...</span>
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
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI-Powered Spending Tips
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAiTips}
            className="text-xs"
          >
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

        {summary && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  ₹{summary.totalBudget?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  ₹{summary.totalSpent?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ₹{summary.savings?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
        )}

        {tips.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No tips available at the moment. Add some expenses to get personalized recommendations!
          </p>
        ) : (
          <div className="space-y-4">
            {tips.map((tip, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${getBgColor(tip.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(tip.type)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Tips are generated using AI based on your actual spending patterns
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiSpendingTips;
