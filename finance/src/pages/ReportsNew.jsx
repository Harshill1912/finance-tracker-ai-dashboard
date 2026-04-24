import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, LineChart, Calendar, Download, 
  Filter, TrendingUp, TrendingDown, Wallet, Target,
  Sparkles, RefreshCw, DollarSign, AlertCircle, Brain,
  Lightbulb, AlertTriangle, Zap, Rocket, TrendingUp as TrendUp,
  TrendingDown as TrendDown, Eye, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const ReportsNew = () => {
  // State Management
  const [viewMode, setViewMode] = useState('month'); // 'month', 'year', 'all'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Data States
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [monthlyInsights, setMonthlyInsights] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  // Months and Years
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
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

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
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

      // Fetch expenses
      const expensesRes = await axios.get(`${baseUrl}/api/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: expenseParams,
        timeout: 10000
      });
      setExpenses(expensesRes.data || []);

      // Fetch budgets
      const budgetsRes = await axios.get(`${baseUrl}/api/budget?limit=100&recalculate=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      setBudgets(budgetsRes.data?.budgets || []);

      // Fetch monthly insights if month view
      if (viewMode === 'month') {
        try {
          const insightsRes = await axios.get(`${baseUrl}/api/expenses/insights/monthly`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { month: selectedMonth, year: selectedYear },
            timeout: 10000
          });
          setMonthlyInsights(insightsRes.data);
        } catch (error) {
          console.error('Error fetching insights:', error);
        }
      }
      
      // Fetch comprehensive AI insights
      fetchAiInsights();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load reports');
      setExpenses([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Expenses
  const getFilteredExpenses = () => {
    let filtered = [...expenses];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }

    return filtered;
  };

  // Calculate Statistics
  const calculateStats = () => {
    const filtered = getFilteredExpenses();
    const totalSpent = filtered.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    // Filter budgets based on view mode
    let periodBudgets = [];
    if (viewMode === 'month') {
      const monthName = monthNames[selectedMonth - 1];
      const monthYear = `${monthName} ${selectedYear}`;
      periodBudgets = budgets.filter(b => b.month === monthYear);
    } else if (viewMode === 'year') {
      periodBudgets = budgets.filter(b => {
        const budgetYear = b.month.split(' ')[1];
        return budgetYear === selectedYear.toString();
      });
    } else {
      // All time - use all budgets
      periodBudgets = budgets;
    }
    
    const totalBudget = periodBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpentFromBudgets = periodBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const totalRemaining = totalBudget - totalSpentFromBudgets;
    const avgExpense = filtered.length > 0 ? totalSpent / filtered.length : 0;

    return {
      totalSpent,
      totalBudget,
      totalRemaining,
      avgExpense,
      count: filtered.length
    };
  };

  // Category Breakdown
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

  // Monthly Breakdown (for year view)
  const getMonthlyBreakdown = () => {
    if (viewMode !== 'year') return [];
    
    const breakdown = {};
    expenses.forEach(exp => {
      const month = new Date(exp.date).getMonth() + 1;
      breakdown[month] = (breakdown[month] || 0) + exp.amount;
    });

    return months.map(month => ({
      month: monthNames[month - 1],
      amount: breakdown[month] || 0
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    const filtered = getFilteredExpenses();
    const headers = ['Date', 'Category', 'Title', 'Amount', 'Payment Method', 'Merchant'];
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

  // Get View Title
  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    } else if (viewMode === 'year') {
      return `${selectedYear}`;
    }
    return 'All Time';
  };

  // Get Unique Categories
  const categories = ['all', ...new Set(expenses.map(exp => exp.category).filter(Boolean))];

  const stats = calculateStats();
  const categoryBreakdown = getCategoryBreakdown();
  const topCategories = categoryBreakdown.slice(0, 5);
  const monthlyBreakdown = getMonthlyBreakdown();

  // Fetch AI Insights
  const fetchAiInsights = async () => {
    try {
      setAiLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const baseUrl = await getBaseUrl();
      const insightsRes = await axios.get(`${baseUrl}/api/expenses/insights/comprehensive`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { 
          month: viewMode === 'month' ? selectedMonth : null,
          year: viewMode === 'year' ? selectedYear : (viewMode === 'month' ? selectedYear : null),
          viewMode 
        },
        timeout: 30000
      });
      setAiInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Don't show error toast, just silently fail
    } finally {
      setAiLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [viewMode, selectedMonth, selectedYear, selectedCategory]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-xl rounded-b-3xl py-10 px-6 border-b-2 border-purple-200 dark:border-purple-800 mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <BarChart3 className="h-10 w-10 text-purple-600" />
                AI Financial Reports
                <span className="text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  AI-Powered
                </span>
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
                className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
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
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {monthNames[month - 1]}
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
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        </motion.header>

        {/* Summary Cards with Enhanced Animations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl border-2 border-purple-300 dark:border-purple-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 font-medium">Total Spent</span>
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">
              ₹{stats.totalSpent.toLocaleString()}
            </p>
            {aiInsights?.statistics?.trend !== undefined && (
              <p className="text-sm text-white/80 mt-2 flex items-center gap-1">
                {aiInsights.statistics.trend > 0 ? (
                  <>
                    <TrendUp className="h-3 w-3" />
                    {aiInsights.statistics.trend.toFixed(1)}% vs previous
                  </>
                ) : (
                  <>
                    <TrendDown className="h-3 w-3" />
                    {Math.abs(aiInsights.statistics.trend).toFixed(1)}% vs previous
                  </>
                )}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl border-2 border-green-300 dark:border-green-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 font-medium">Remaining</span>
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">
              ₹{stats.totalRemaining.toLocaleString()}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {stats.totalBudget > 0 
                ? `${((stats.totalRemaining / stats.totalBudget) * 100).toFixed(1)}% of budget`
                : 'No budget set'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl border-2 border-blue-300 dark:border-blue-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 font-medium">Transactions</span>
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.count}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {stats.count > 0 ? `Avg: ₹${stats.avgExpense.toFixed(0)}` : 'No transactions'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-xl border-2 border-yellow-300 dark:border-yellow-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 font-medium">Avg Expense</span>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">
              ₹{stats.avgExpense.toFixed(0)}
            </p>
            {aiInsights?.statistics?.biggestExpense && (
              <p className="text-sm text-white/80 mt-2 truncate">
                Largest: ₹{aiInsights.statistics.biggestExpense.amount.toLocaleString()}
              </p>
            )}
          </motion.div>
        </div>

        {/* AI-Powered Comprehensive Insights */}
        {aiLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 shadow-2xl border-2 border-purple-300 dark:border-purple-700"
          >
            <div className="flex items-center justify-center gap-3">
              <Brain className="h-6 w-6 text-white animate-pulse" />
              <p className="text-white text-lg font-semibold">AI is analyzing your financial data...</p>
              <RefreshCw className="h-5 w-5 text-white animate-spin" />
            </div>
          </motion.div>
        )}
        
        {aiInsights && !aiLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 shadow-2xl border-2 border-purple-300 dark:border-purple-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    AI Financial Analysis
                    {aiLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  </h2>
                  <p className="text-purple-100 text-sm">Powered by advanced AI insights</p>
                </div>
              </div>
              <button
                onClick={fetchAiInsights}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* AI Summary */}
            {aiInsights.summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20"
              >
                <p className="text-white text-base leading-relaxed">{aiInsights.summary}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI Insights */}
              {aiInsights.insights && aiInsights.insights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-yellow-300" />
                    <h3 className="text-lg font-bold text-white">Key Insights</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.insights.map((insight, idx) => (
                      <li key={idx} className="text-white/90 text-sm flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-200 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* AI Recommendations */}
              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="h-5 w-5 text-green-300" />
                    <h3 className="text-lg font-bold text-white">Smart Recommendations</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-white/90 text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-200 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Predictions & Anomalies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Spending Prediction */}
              {aiInsights.predictions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendUp className="h-5 w-5 text-blue-300" />
                    <h3 className="text-lg font-bold text-white">Spending Forecast</h3>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    ₹{aiInsights.predictions.amount.toLocaleString()}
                  </p>
                  <p className="text-purple-100 text-sm">{aiInsights.predictions.period}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="px-2 py-1 bg-white/20 rounded text-xs text-white">
                      {aiInsights.predictions.confidence === 'high' ? 'High Confidence' : 
                       aiInsights.predictions.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Anomalies */}
              {aiInsights.anomalies && aiInsights.anomalies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-300" />
                    <h3 className="text-lg font-bold text-white">Unusual Expenses</h3>
                  </div>
                  <div className="space-y-2">
                    {aiInsights.anomalies.slice(0, 3).map((anomaly, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-2">
                        <p className="text-white font-semibold text-sm">{anomaly.title}</p>
                        <p className="text-orange-200 text-xs">₹{anomaly.amount.toLocaleString()}</p>
                        <p className="text-purple-200 text-xs mt-1">{anomaly.reason}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Monthly Insights */}
        {monthlyInsights && viewMode === 'month' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 mb-8 border-2 border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Monthly Insights</h2>
            </div>
            {monthlyInsights.aiSummary && (
              <p className="text-gray-700 dark:text-gray-300 mb-4">{monthlyInsights.aiSummary}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monthlyInsights.currentMonth?.topCategory && (
                <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Category</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {monthlyInsights.currentMonth.topCategory.category}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    ₹{monthlyInsights.currentMonth.topCategory.amount.toLocaleString()}
                  </p>
                </div>
              )}
              {monthlyInsights.currentMonth?.biggestExpense && (
                <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Biggest Expense</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {monthlyInsights.currentMonth.biggestExpense.title}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ₹{monthlyInsights.currentMonth.biggestExpense.amount.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Trend</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">
                  {monthlyInsights.trend > 0 ? (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +{monthlyInsights.trend.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      {monthlyInsights.trend.toFixed(1)}%
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">vs last month</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category Breakdown with AI Insights */}
        {categoryBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <PieChart className="h-6 w-6 text-purple-600" />
                Category Breakdown
              </h2>
              {aiInsights?.statistics?.topCategory && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Top: {aiInsights.statistics.topCategory.category}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {topCategories.map((item, index) => {
                const percentage = stats.totalSpent > 0 ? (item.amount / stats.totalSpent) * 100 : 0;
                const isTopCategory = aiInsights?.statistics?.topCategory?.category === item.category;
                return (
                  <motion.div
                    key={item.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`space-y-2 p-3 rounded-xl ${isTopCategory ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-all`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 dark:text-white">{item.category}</span>
                        {isTopCategory && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                            TOP
                          </span>
                        )}
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        ₹{item.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                        className={`h-3 rounded-full ${
                          isTopCategory 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                        }`}
                      ></motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800 mb-8"
            >
              <h3 className="text-lg font-bold mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expenses List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-purple-600" />
            Expense Details
          </h2>

          {getFilteredExpenses().length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">No expenses found for the selected period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredExpenses().slice(0, 50).map((expense, index) => {
                const isAnomaly = aiInsights?.anomalies?.some(a => 
                  a.title === expense.title && a.amount === expense.amount
                );
                const avgExpense = stats.avgExpense;
                const isHighExpense = expense.amount > avgExpense * 1.5;
                
                return (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`p-4 rounded-xl border transition-all ${
                      isAnomaly 
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 hover:border-orange-400' 
                        : isHighExpense
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white">{expense.title}</h3>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 text-xs font-semibold rounded-full">
                            {expense.category}
                          </span>
                          {isAnomaly && (
                            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Unusual
                            </span>
                          )}
                          {isHighExpense && !isAnomaly && (
                            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                              High
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(expense.date).toLocaleDateString()} • {expense.paymentMethod || 'Other'}
                          {expense.merchant && ` • ${expense.merchant}`}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-bold ${
                          isAnomaly 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : isHighExpense
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ₹{expense.amount.toLocaleString()}
                        </p>
                        {isHighExpense && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(expense.amount / avgExpense).toFixed(1)}x avg
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ReportsNew;
