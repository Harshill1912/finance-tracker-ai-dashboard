import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';

const AddBudgetModal = ({ isOpen, onClose, onAdd, selectedMonth, isEditing, existingData }) => {
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    spent: '0',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear()
  });
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (existingData) {
        // Parse month and year from existing data
        const monthYear = existingData.month || selectedMonth || '';
        let parsedMonth = new Date().getMonth() + 1;
        let parsedYear = new Date().getFullYear();
        
        if (monthYear) {
          const parts = monthYear.split(' ');
          if (parts.length >= 2) {
            const monthName = parts[0];
            const year = parseInt(parts[1]);
            if (year) parsedYear = year;
            const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
            if (!isNaN(monthIndex)) parsedMonth = monthIndex + 1;
          }
        }
        
        setFormData({
          category: existingData.category || '',
          amount: existingData.amount?.toString() || '',
          spent: existingData.spent?.toString() || '0',
          selectedMonth: parsedMonth,
          selectedYear: parsedYear
        });
      } else {
        setFormData({ 
          category: '', 
          amount: '', 
          spent: '0',
          selectedMonth: new Date().getMonth() + 1,
          selectedYear: new Date().getFullYear()
        });
      }
      setAiSuggestions(null);
    }
  }, [isOpen, existingData, selectedMonth]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const handleAiDetection = async () => {
    if (!formData.category.trim()) {
      toast.error('Please enter a category name first');
      return;
    }

    setAiDetecting(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const res = await axios.post(
        `${baseUrl}/api/ai/auto-detect-expense`,
        {
          description: formData.category,
          amount: formData.amount || null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      if (res.data) {
        setAiSuggestions(res.data);
        
        // Auto-fill if confidence is high
        if (res.data.confidence > 0.7) {
          setFormData(prev => ({
            ...prev,
            category: res.data.category,
            amount: res.data.suggestedAmount?.toString() || prev.amount
          }));
          toast.success(`AI detected: ${res.data.category} (${Math.round(res.data.confidence * 100)}% confidence)`);
        }
      }
    } catch (error) {
      console.error('AI detection error:', error);
      toast.error('AI detection failed. Please fill manually.');
    } finally {
      setAiDetecting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const monthName = new Date(2000, formData.selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const monthYear = `${monthName} ${formData.selectedYear}`;
    
    const budgetData = {
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      spent: parseFloat(formData.spent) || 0,
      month: monthYear,
    };
    onAdd(budgetData);
    setFormData({ 
      category: '', 
      amount: '', 
      spent: '0',
      selectedMonth: new Date().getMonth() + 1,
      selectedYear: new Date().getFullYear()
    });
    setAiSuggestions(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border-2 border-purple-200 dark:border-purple-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-6 border-b border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {isEditing ? 'Edit Budget' : 'Add New Budget'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* AI Detection Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-gray-800 dark:text-white">AI Auto-Detection</span>
                </div>
                <button
                  type="button"
                  onClick={handleAiDetection}
                  disabled={aiDetecting || !formData.category.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiDetecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Auto-Detect
                    </>
                  )}
                </button>
              </div>
              
              <AnimatePresence>
                {aiSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Detected: <strong>{aiSuggestions.category}</strong> ({Math.round(aiSuggestions.confidence * 100)}% confidence)
                      </span>
                    </div>
                    {aiSuggestions.suggestedAmount && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Suggested Amount: ₹{aiSuggestions.suggestedAmount.toLocaleString()}
                      </div>
                    )}
                    {aiSuggestions.suggestedBudget && (
                      <div className="text-xs bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                        <div className="font-semibold text-blue-700 dark:text-blue-400">Budget Info:</div>
                        <div className="text-blue-600 dark:text-blue-300">
                          Budget: ₹{aiSuggestions.suggestedBudget.budget.toLocaleString()} | 
                          Spent: ₹{aiSuggestions.suggestedBudget.spent.toLocaleString()} | 
                          Remaining: ₹{aiSuggestions.suggestedBudget.remaining.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category Name
              </label>
              <input
                type="text"
                name="category"
                id="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Groceries, Rent, Entertainment"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Budget Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                id="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="spent" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Amount Already Spent (₹)
              </label>
              <input
                type="number"
                name="spent"
                id="spent"
                value={formData.spent}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            {/* Month and Year Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="selectedMonth" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Month *
                </label>
                <select
                  id="selectedMonth"
                  value={formData.selectedMonth}
                  onChange={(e) => setFormData({ ...formData, selectedMonth: parseInt(e.target.value) })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="selectedYear" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Year *
                </label>
                <select
                  id="selectedYear"
                  value={formData.selectedYear}
                  onChange={(e) => setFormData({ ...formData, selectedYear: parseInt(e.target.value) })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                {isEditing ? 'Update Budget' : 'Add Budget'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default AddBudgetModal;
