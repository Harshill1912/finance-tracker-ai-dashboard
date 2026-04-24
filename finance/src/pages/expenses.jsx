import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Wand2, Loader2, CheckCircle2, Trash2, Edit2, Calendar, DollarSign, Tag, AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '@/components/navbar';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: '',
    merchant: '',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear()
  });

  const fetchBudgets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const baseUrl = await getBaseUrl();
      // Refresh budgets to get updated spent amounts (recalculated from actual expenses)
      const res = await axios.get(`${baseUrl}/api/budget?limit=100&recalculate=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data?.budgets) {
        setBudgets(res.data.budgets);
      }
    } catch (error) {
      console.error('Error refreshing budgets:', error);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filterMonth, filterYear, filterCategory]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const params = {};
      
      if (filterMonth !== 'all') {
        params.month = filterMonth;
        params.year = filterYear;
      } else if (filterYear) {
        params.year = filterYear;
      }
      
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      
      const res = await axios.get(`${baseUrl}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setExpenses(res.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };


  const handleAiDetection = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error('Please enter expense description first');
      return;
    }

    setAiDetecting(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const description = formData.description || formData.title;
      const res = await axios.post(
        `${baseUrl}/api/ai/auto-detect-expense`,
        {
          description: description,
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
        
        // Auto-fill form if confidence is high
        if (res.data.confidence > 0.7) {
          setFormData(prev => ({
            ...prev,
            category: res.data.category,
            amount: res.data.suggestedAmount?.toString() || prev.amount
          }));
          
          // Auto-select matching budget
          if (res.data.suggestedBudget) {
            const matchingBudget = budgets.find(b => 
              b.category.toLowerCase() === res.data.category.toLowerCase()
            );
            if (matchingBudget) {
              setFormData(prev => ({ ...prev, budgetId: matchingBudget._id }));
            }
          }
          
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.amount || !formData.category || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      // Find or create matching budget
      let budgetId = formData.budgetId;
      if (!budgetId) {
        // Find budget by category and current month
        const currentDate = new Date(formData.date);
        const monthYear = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
        
        let matchingBudget = budgets.find(b => 
          b.category.toLowerCase() === formData.category.toLowerCase() && 
          b.month === monthYear
        );

        // If no budget exists, create one automatically
        if (!matchingBudget) {
          const budgetRes = await axios.post(
            `${baseUrl}/api/budget`,
            {
              category: formData.category,
              amount: parseFloat(formData.amount) * 10, // Auto-create budget 10x the expense
              spent: 0,
              month: monthYear
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              }
            }
          );
          matchingBudget = budgetRes.data;
          setBudgets([...budgets, matchingBudget]);
          toast.success(`Auto-created budget for ${formData.category}`);
        }
        
        budgetId = matchingBudget._id;
      }

      // Create expense
      const expenseRes = await axios.post(
        `${baseUrl}/api/expenses`,
        {
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          date: formData.date,
          budgetId: budgetId,
          description: formData.description || formData.title,
          paymentMethod: formData.paymentMethod || 'Other',
          merchant: formData.merchant || ''
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (expenseRes.data) {
        toast.success('Expense added successfully!');
        setFormData({
          title: '',
          amount: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          budgetId: '',
          paymentMethod: '',
          merchant: '',
          selectedMonth: new Date().getMonth() + 1,
          selectedYear: new Date().getFullYear()
        });
        setAiSuggestions(null);
        setShowAddModal(false);
        fetchExpenses();
        fetchBudgets();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error(error.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.delete(`${baseUrl}/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        toast.success('Expense deleted!');
        fetchExpenses();
        fetchBudgets();
      }
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              AI-Powered Expenses
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Smart expense tracking with auto-detection</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2"
            >
              <Filter className="h-5 w-5 text-purple-600" />
              Filters
            </button>
            <button
              onClick={fetchExpenses}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 transition-all"
            >
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </Button>
          </div>
        </motion.div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Month
                  </label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Tag className="h-4 w-4 inline mr-2" />
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Categories</option>
                    {[...new Set(expenses.map(e => e.category).filter(Boolean))].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expenses List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {expenses.map((expense, index) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all shadow-xl hover:shadow-2xl">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">
                          {expense.title}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense._id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            ₹{expense.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
                          {expense.category}
                        </span>
                        {expense.paymentMethod && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                            {expense.paymentMethod}
                          </span>
                        )}
                        {expense.merchant && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                            {expense.merchant}
                          </span>
                        )}
                        {expense.isAnomaly && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Unusual
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {expenses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <DollarSign className="h-24 w-24 mx-auto mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No expenses yet</h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Add your first expense with AI auto-detection!</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border-2 border-purple-200 dark:border-purple-800"
          >
            <div className="flex justify-between items-center p-6 border-b border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Add Expense
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    title: '',
                    amount: '',
                    category: '',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    budgetId: '',
                    paymentMethod: '',
                    merchant: '',
                    selectedMonth: new Date().getMonth() + 1,
                    selectedYear: new Date().getFullYear()
                  });
                  setAiSuggestions(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
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
                  <Button
                    type="button"
                    onClick={handleAiDetection}
                    disabled={aiDetecting || (!formData.title.trim() && !formData.description.trim())}
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
                  </Button>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <Label>Expense Description *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Groceries at Big Bazaar, Uber ride, Restaurant dinner"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Additional Details (Optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="More details about the expense"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Category *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 mt-1"
                >
                  <option value="">Select category</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Bills & Utilities">Bills & Utilities</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Travel">Travel</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date Selection - Month/Year/Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Month *</Label>
                  <select
                    value={formData.selectedMonth}
                    onChange={(e) => {
                      const month = parseInt(e.target.value);
                      const year = formData.selectedYear;
                      const lastDay = new Date(year, month, 0).getDate();
                      const day = Math.min(new Date().getDate(), lastDay);
                      const newDate = new Date(year, month - 1, day).toISOString().split('T')[0];
                      setFormData({ ...formData, selectedMonth: month, date: newDate });
                    }}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 mt-1"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Year *</Label>
                  <select
                    value={formData.selectedYear}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      const month = formData.selectedMonth;
                      const lastDay = new Date(year, month, 0).getDate();
                      const day = Math.min(new Date().getDate(), lastDay);
                      const newDate = new Date(year, month - 1, day).toISOString().split('T')[0];
                      setFormData({ ...formData, selectedYear: year, date: newDate });
                    }}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 mt-1"
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
                <div>
                  <Label>Day *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setFormData({ 
                        ...formData, 
                        date: e.target.value,
                        selectedMonth: date.getMonth() + 1,
                        selectedYear: date.getFullYear()
                      });
                    }}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Payment Method & Merchant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment Method</Label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 mt-1"
                  >
                    <option value="">Select method</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Merchant (Optional)</Label>
                  <Input
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                    placeholder="e.g., Amazon, Swiggy, Uber"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Add Expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      title: '',
                      amount: '',
                      category: '',
                      date: new Date().toISOString().split('T')[0],
                      description: '',
                      budgetId: ''
                    });
                    setAiSuggestions(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
