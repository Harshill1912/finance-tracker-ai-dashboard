import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const AiBudgetRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
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
      
      const response = await axios.get(`${baseUrl}/api/ai/budget-recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: useLocal ? 25000 : 50000, // Increased timeout
      });

      if (response.data.recommendations) {
        setRecommendations(response.data.recommendations);
        setExplanation(response.data.explanation || '');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      // Silent error handling - don't show error, just use empty state
      setError(null);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing your spending patterns...</span>
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
            <Target className="h-6 w-6 text-blue-500" />
            AI Budget Recommendations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecommendations}
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

        {explanation && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {explanation}
              </p>
            </div>
          </div>
        )}

        {recommendations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No recommendations available. Add some expenses to get personalized budget suggestions!
          </p>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {rec.category}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {rec.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Average Spending</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      ₹{(rec.averageMonthlySpending || rec.averageSpending || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recommended Budget</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{(rec.recommendedAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Recommendations based on your last 6 months of spending patterns
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiBudgetRecommendations;
