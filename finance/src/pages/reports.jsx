import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingDown, TrendingUp, Download, Calendar, 
  Filter, BarChart3, PieChart, LineChart, Target, AlertCircle,
  Sparkles, Zap, RefreshCw, TrendingUp as TrendUp, TrendingDown as TrendDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import axios from 'axios';
import { toast } from 'sonner';

const Reports = () => {
  const [viewMode, setViewMode] = useState('month'); // 'month', 'year', 'all'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [monthlyInsights, setMonthlyInsights] = useState(null);
  const [yearlyInsights, setYearlyInsights] = useState(null);

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedMonth, selectedYear, selectedCategory]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("No authentication token found");
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      
      // Build query params based on view mode
      let expenseParams = {};
      if (viewMode === 'month') {
        expenseParams = { month: selectedMonth, year: selectedYear };
      } else if (viewMode === 'year') {
        expenseParams = { year: selectedYear };
      }
      // 'all' mode - no params, get everything

      // Fetch expenses with filters
      const expensesRes = await axios.get(`${baseUrl}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: expenseParams,
        timeout: 10000
      }).catch(() => ({ data: [] }));

      // Fetch budgets
      const budgetsRes = await axios.get(`${baseUrl}/api/budget`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }).catch(() => ({ data: { budgets: [] } }));

      // Fetch monthly insights if in month view
      if (viewMode === 'month') {
        try {
          const insightsRes = await axios.get(`${baseUrl}/api/expenses/insights/monthly`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { month: selectedMonth, year: selectedYear },
            timeout: 15000
          });
          setMonthlyInsights(insightsRes.data);
        } catch (e) {
          console.error('Error fetching monthly insights:', e);
        }
      }

      // Fetch yearly insights if in year view
      if (viewMode === 'year') {
        try {
          const wrappedRes = await axios.get(`${baseUrl}/api/wrapped/yearly`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { year: selectedYear },
            timeout: 15000
          });
          setYearlyInsights(wrappedRes.data);
        } catch (e) {
          console.error('Error fetching yearly insights:', e);
        }
      }

      setExpenses(expensesRes.data || []);
      setBudgets(budgetsRes.data?.budgets || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load report data. Please try again.");
      setExpenses([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by category
  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    
    return filtered;
  };

  // Calculate statistics from filtered expenses
  const calculateStats = () => {
    const filtered = getFilteredExpenses();
    const totalSpent = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    const avgExpense = filtered.length > 0 ? totalSpent / filtered.length : 0;
    
    // Get budgets for the current period
    let periodBudgets = [];
    if (viewMode === 'month') {
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
      periodBudgets = budgets.filter(b => b.month === `${monthName} ${selectedYear}`);
    } else if (viewMode === 'year') {
      periodBudgets = budgets.filter(b => b.month.includes(selectedYear.toString()));
    } else {
      periodBudgets = budgets;
    }
    
    const totalBudget = periodBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpentFromBudgets = periodBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const totalSaved = totalBudget - totalSpentFromBudgets;
    const savingsPercentage = totalBudget > 0 ? ((totalSaved / totalBudget) * 100).toFixed(1) : "0";
    
    return {
      totalSpent,
      totalBudget,
      totalSaved,
      savingsPercentage,
      avgExpense,
      transactionCount: filtered.length,
      periodBudgets
    };
  };

  // Get category breakdown
  const getCategoryBreakdown = () => {
    const filtered = getFilteredExpenses();
    const breakdown = {};
    
    filtered.forEach(exp => {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    });
    
    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Get monthly breakdown for charts
  const getMonthlyBreakdown = () => {
    const filtered = getFilteredExpenses();
    const monthlyData = {};
    
    filtered.forEach(exp => {
      const date = new Date(exp.date);
      const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + exp.amount;
    });
    
    return Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });
  };

  // Export to CSV
  const exportToCSV = () => {
    const filtered = getFilteredExpenses();
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Merchant'];
    const rows = filtered.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      exp.category,
      exp.title,
      exp.amount,
      exp.paymentMethod || 'Other',
      exp.merchant || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `expense-report-${viewMode}-${viewMode === 'month' ? `${selectedMonth}-${selectedYear}` : viewMode === 'year' ? selectedYear : 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.download = filename;
    a.click();
    toast.success('Report exported to CSV!');
  };

  // Get view title
  const getViewTitle = () => {
    if (viewMode === 'month') {
      const monthName = new Date(2000, selectedMonth - 1).toLocaleString('default', { month: 'long' });
      return `${monthName} ${selectedYear}`;
    } else if (viewMode === 'year') {
      return `${selectedYear}`;
    }
    return 'All Time';
  };

  // Get unique categories
  const categories = ['all', ...new Set(expenses.map(exp => exp.category).filter(Boolean))];

  const stats = calculateStats();
  const categoryBreakdown = getCategoryBreakdown();
  const topCategories = categoryBreakdown.slice(0, 5);
  const monthlyBreakdown = getMonthlyBreakdown();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading financial reports...</p>
        </div>
      </div>
    );
  }

  if (error && expenses.length === 0) {
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 dark:text-gray-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-xl rounded-b-3xl py-10 px-6 border-b-2 border-purple-200 dark:border-purple-800"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <Sparkles className="h-10 w-10 text-purple-600" />
                AI Financial Reports
              </h1>
              <p className="mt-3 text-gray-600 dark:text-gray-400 text-base">
                Comprehensive insights into your spending, savings, and financial health
              </p>
              <p className="mt-2 text-lg font-semibold text-purple-600 dark:text-purple-400">
                {getViewTitle()}
              </p>
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
                onClick={exportToCSV}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg transition-all flex items-center gap-2 font-semibold"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 transition-all"
              >
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </button>
            </div>
          </div>

          {/* View Mode Toggle with Month/Year Selectors */}
          <div className="mt-6 space-y-4">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setViewMode('month')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Month View
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  viewMode === 'year'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Year View
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  viewMode === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <LineChart className="h-4 w-4 inline mr-2" />
                All Time
              </button>
            </div>

            {/* Month/Year Selectors */}
            {(viewMode === 'month' || viewMode === 'year') && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 justify-center items-center"
              >
                {viewMode === 'month' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Month:
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Year:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 font-medium"
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
              </motion.div>
            )}
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {viewMode === 'month' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Month
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(viewMode === 'month' || viewMode === 'year') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <Filter className="h-4 w-4 inline mr-2" />
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 shadow-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Saved</p>
                <p className="text-3xl font-bold mt-2">₹{stats.totalSaved.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">{stats.savingsPercentage}% of budget</p>
              </div>
              <TrendUp className="h-12 w-12 opacity-80" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 shadow-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Budget</p>
                <p className="text-3xl font-bold mt-2">₹{stats.totalBudget.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">{getViewTitle()}</p>
              </div>
              <Wallet className="h-12 w-12 opacity-80" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl p-6 shadow-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Spent</p>
                <p className="text-3xl font-bold mt-2">₹{stats.totalSpent.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">{stats.transactionCount} transactions</p>
              </div>
              <TrendDown className="h-12 w-12 opacity-80" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 shadow-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avg. Expense</p>
                <p className="text-3xl font-bold mt-2">₹{Math.round(stats.avgExpense).toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">Per transaction</p>
              </div>
              <BarChart3 className="h-12 w-12 opacity-80" />
            </div>
          </motion.div>
        </div>

        {/* Monthly/Yearly Insights */}
        {viewMode === 'month' && monthlyInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-purple-600" />
              Monthly Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Trend</p>
                <p className={`text-2xl font-bold ${monthlyInsights.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {monthlyInsights.trend > 0 ? '+' : ''}{monthlyInsights.trend}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">vs previous month</p>
              </div>
              {monthlyInsights.currentMonth.topCategory && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Category</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {monthlyInsights.currentMonth.topCategory.category}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ₹{monthlyInsights.currentMonth.topCategory.amount.toLocaleString()}
                  </p>
                </div>
              )}
              {monthlyInsights.currentMonth.biggestExpense && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Biggest Expense</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {monthlyInsights.currentMonth.biggestExpense.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ₹{monthlyInsights.currentMonth.biggestExpense.amount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            {monthlyInsights.aiSummary && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{monthlyInsights.aiSummary}</p>
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'year' && yearlyInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-600" />
              Yearly Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  ₹{yearlyInsights.stats.totalSpent.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{yearlyInsights.stats.transactionCount} transactions</p>
              </div>
              {yearlyInsights.stats.highestSpendingMonth && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Highest Month</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {yearlyInsights.stats.highestSpendingMonth.month}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ₹{yearlyInsights.stats.highestSpendingMonth.amount.toLocaleString()}
                  </p>
                </div>
              )}
              {yearlyInsights.stats.bestSavingMonth && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best Saving Month</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {yearlyInsights.stats.bestSavingMonth.month}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ₹{yearlyInsights.stats.bestSavingMonth.amount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            {yearlyInsights.stats.topCategories && yearlyInsights.stats.topCategories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top 3 Categories:</p>
                <div className="flex gap-2">
                  {yearlyInsights.stats.topCategories.map((cat, idx) => (
                    <div key={idx} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{cat.category}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">₹{cat.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {yearlyInsights.aiSummary && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{yearlyInsights.aiSummary}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Top Spending Categories */}
        {topCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <PieChart className="h-6 w-6 text-purple-600" />
              Top Spending Categories
            </h2>
            <div className="space-y-4">
              {topCategories.map((item, index) => {
                const percentage = stats.totalSpent > 0 ? (item.amount / stats.totalSpent) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 dark:text-white">{item.category}</span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        ₹{item.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Monthly Spending Chart */}
        {monthlyBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <LineChart className="h-6 w-6 text-purple-600" />
              Spending Trend
            </h2>
            <div className="space-y-3">
              {monthlyBreakdown.map((item, index) => {
                const maxAmount = Math.max(...monthlyBreakdown.map(m => m.amount));
                const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.month}</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        ₹{item.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Category Breakdown Table */}
        {categoryBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              Category Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">Amount</th>
                    <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">Percentage</th>
                    <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((item, index) => {
                    const percentage = stats.totalSpent > 0 ? (item.amount / stats.totalSpent) * 100 : 0;
                    const count = getFilteredExpenses().filter(exp => exp.category === item.category).length;
                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">{item.category}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-white">
                          ₹{item.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{count}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {expenses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <BarChart3 className="h-24 w-24 mx-auto mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No expenses found</h3>
            <p className="text-gray-500 dark:text-gray-500">
              {viewMode === 'month' && `No expenses for ${getViewTitle()}`}
              {viewMode === 'year' && `No expenses for ${selectedYear}`}
              {viewMode === 'all' && 'No expenses recorded yet'}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Reports;
