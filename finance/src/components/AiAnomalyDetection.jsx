import React, { useState, useEffect } from 'react';
import { AlertTriangle, Copy, Sparkles, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const AiAnomalyDetection = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
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
      
      const response = await axios.get(`${baseUrl}/api/ai/anomalies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: useLocal ? 15000 : 30000,
      });

      if (response.data) {
        setAnomalies(response.data.anomalies || []);
        setDuplicates(response.data.duplicates || []);
        setInsight(response.data.insight || '');
      }
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError('Unable to detect anomalies. Please try again.');
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
            <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing expenses for anomalies...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalIssues = anomalies.length + duplicates.length;

  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            AI Anomaly Detection
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAnomalies}
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

        {totalIssues === 0 && !error ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              No Anomalies Detected
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your expenses look normal. Great job tracking your finances!
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <p className="font-semibold text-gray-800 dark:text-white">
                  {totalIssues} Issue{totalIssues !== 1 ? 's' : ''} Found
                </p>
              </div>
              {insight && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {insight}
                </p>
              )}
            </div>

            {/* Unusual Expenses */}
            {anomalies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Unusual Expenses ({anomalies.length})
                </h3>
                <div className="space-y-3">
                  {anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`h-4 w-4 ${
                              anomaly.severity === 'high' ? 'text-red-500' : 'text-orange-500'
                            }`} />
                            <p className="font-medium text-gray-800 dark:text-white">
                              {anomaly.description}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {anomaly.category} • {new Date(anomaly.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          ₹{anomaly.amount.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                        {anomaly.reason}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          anomaly.severity === 'high' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                        }`}>
                          {anomaly.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate Expenses */}
            {duplicates.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Possible Duplicates ({duplicates.length})
                </h3>
                <div className="space-y-3">
                  {duplicates.map((dup, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Copy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-800 dark:text-white mb-2">
                            {dup.reason}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300">
                                {dup.expense1.description}
                              </span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                ₹{dup.expense1.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300">
                                {dup.expense2.description}
                              </span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                ₹{dup.expense2.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            🔍 AI analyzes your expenses to detect unusual patterns and potential duplicates
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiAnomalyDetection;
