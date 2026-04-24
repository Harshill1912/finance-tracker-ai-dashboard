import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const AiExpenseCategorizer = ({ description, amount, onCategorySelected }) => {
  const [category, setCategory] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categorizeExpense = async () => {
    if (!description || !description.trim()) {
      setError('Please enter an expense description');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
      
      const response = await axios.post(
        `${baseUrl}/api/ai/categorize-expense`,
        { description, amount: parseFloat(amount) || 0 },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.category) {
        setCategory(response.data.category);
        setConfidence(response.data.confidence || 0);
        
        // Auto-select if confidence is high
        if (response.data.confidence > 0.8 && onCategorySelected) {
          onCategorySelected(response.data.category);
        }
      }
    } catch (err) {
      console.error('Error categorizing expense:', err);
      setError('Unable to categorize expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!description || description.trim().length < 3) {
    return null;
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={categorizeExpense}
        disabled={loading}
        className="w-full text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3 mr-2" />
            AI Categorize
          </>
        )}
      </Button>

      {category && !loading && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  Suggested: {category}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            {onCategorySelected && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onCategorySelected(category)}
                className="text-xs"
              >
                Use This
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default AiExpenseCategorizer;
