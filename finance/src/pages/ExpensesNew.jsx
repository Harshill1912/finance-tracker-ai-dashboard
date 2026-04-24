import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Receipt, Trash2, Edit2, Filter, 
  Search, Wand2, AlertTriangle, RefreshCw, DollarSign,
  Tag, CreditCard, Building2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const ExpensesNew = () => {
  // State Management
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [aiDetecting, setAiDetecting] = useState(false);
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Other',
    merchant: '',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear()
  });

  // Categories
  const categories = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Bills & Utilities', 'Healthcare', 'Education', 'Travel',
    'Groceries', 'Personal Care', 'Other'
  ];

  const paymentMethods = ['UPI', 'Card', 'Cash', 'Online', 'Other'];
  const months = ['all', ...Array.from({ length: 12 }, (_, i) => i + 1)];
  const monthNames = ['All', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Get Base URL
  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    try {
      await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      return localUrl;
    } catch (e) {
      return deployedUrl;
    }
  };

  // Fetch Expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
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
        headers: { 'Authorization': `Bearer ${token}` },
        params
      });

      setExpenses(res.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // AI Auto-Detection
  const handleAIDetection = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error('Please enter expense description first');
      return;
    }

    try {
      setAiDetecting(true);
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();

      const res = await axios.post(
        `${baseUrl}/api/ai/auto-detect-expense`,
        {
          description: formData.description || formData.title,
          amount: formData.amount || 0
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15000
        }
      );

      if (res.data) {
        setFormData(prev => ({
          ...prev,
          category: res.data.category || prev.category,
          merchant: res.data.merchant || prev.merchant,
          paymentMethod: res.data.paymentMethod || prev.paymentMethod
        }));
        toast.success(`AI detected: ${res.data.category} (${Math.round((res.data.confidence || 0.8) * 100)}% confidence)`);
      }
    } catch (error) {
      console.error('AI detection error:', error);
      toast.error('AI detection failed. Please fill manually.');
    } finally {
      setAiDetecting(false);
    }
  };

  // Save Expense
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.amount || !formData.category || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();

      const expenseData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        description: formData.description || formData.title,
        paymentMethod: formData.paymentMethod,
        merchant: formData.merchant
      };

      const url = editingExpense 
        ? `${baseUrl}/api/expenses/${editingExpense._id}`
        : `${baseUrl}/api/expenses`;

      await axios[editingExpense ? 'put' : 'post'](url, expenseData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`Expense ${editingExpense ? 'updated' : 'added'} successfully!`);
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        title: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'Other',
        merchant: '',
        selectedMonth: new Date().getMonth() + 1,
        selectedYear: new Date().getFullYear()
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error.response?.data?.message || 'Failed to save expense');
    }
  };

  // Delete Expense
  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      await axios.delete(`${baseUrl}/api/expenses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Edit Expense
  const handleEdit = (expense) => {
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      description: expense.description || expense.title,
      paymentMethod: expense.paymentMethod || 'Other',
      merchant: expense.merchant || '',
      selectedMonth: new Date(expense.date).getMonth() + 1,
      selectedYear: new Date(expense.date).getFullYear()
    });
    setEditingExpense(expense);
    setShowModal(true);
  };

  // Filtered Expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = searchQuery === '' || 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Calculate Totals
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  // Effects
  useEffect(() => {
    fetchExpenses();
  }, [filterMonth, filterYear, filterCategory]);

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

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <Receipt className="h-10 w-10 text-purple-600" />
                Expense Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Track your expenses with AI-powered auto-detection
              </p>
            </div>
            <button
              onClick={() => {
                setEditingExpense(null);
                setFormData({
                  title: '',
                  amount: '',
                  category: '',
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  paymentMethod: 'Other',
                  merchant: '',
                  selectedMonth: new Date().getMonth() + 1,
                  selectedYear: new Date().getFullYear()
                });
                setShowModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all flex items-center gap-2 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Add Expense
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-10 pr-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            <button
              onClick={fetchExpenses}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Month</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                  >
                    {months.map((month, idx) => (
                      <option key={month} value={month}>{monthNames[idx]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                ₹{totalAmount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
              </p>
            </div>
            <DollarSign className="h-16 w-16 text-purple-600 opacity-20" />
          </div>
        </motion.div>

        {/* Expenses List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-purple-600" />
            All Expenses
          </h2>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">No expenses found. Add your first expense to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{expense.title}</h3>
                        {expense.isAnomaly && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Unusual
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Amount</p>
                          <p className="font-semibold text-gray-800 dark:text-white">₹{expense.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Category</p>
                          <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {expense.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Date</p>
                          <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Payment</p>
                          <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {expense.paymentMethod || 'Other'}
                          </p>
                        </div>
                      </div>
                      {expense.merchant && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-500 dark:text-gray-400">Merchant</p>
                          <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {expense.merchant}
                          </p>
                        </div>
                      )}
                      {expense.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{expense.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense._id)}
                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border-2 border-purple-200 dark:border-purple-800 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* AI Detection */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-gray-800 dark:text-white">AI Auto-Detection</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAIDetection}
                      disabled={aiDetecting || (!formData.title.trim() && !formData.description.trim())}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                    >
                      <Wand2 className={`h-4 w-4 ${aiDetecting ? 'animate-spin' : ''}`} />
                      {aiDetecting ? 'Detecting...' : 'Auto-Detect'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Enter description and click to auto-detect category, merchant, and payment method
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                      placeholder="e.g., Grocery Shopping"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                      placeholder="1000"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                    placeholder="Additional details about this expense..."
                    rows="2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                    >
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Merchant
                    </label>
                    <input
                      type="text"
                      value={formData.merchant}
                      onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                      placeholder="e.g., Amazon, Swiggy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingExpense(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all"
                  >
                    {editingExpense ? 'Update' : 'Add'} Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpensesNew;
