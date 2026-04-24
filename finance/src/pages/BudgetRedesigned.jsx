import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Target, TrendingUp, AlertTriangle, 
  CheckCircle2, Clock, Edit2, Trash2, RefreshCw, Sparkles,
  DollarSign, BarChart3, Zap, MessageCircle, Sliders, 
  Smile, TrendingDown, Info, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

// Category emoji mapping for friendly display
const categoryEmojis = {
  'Food & Dining': '🍕',
  'Groceries': '🛒',
  'Transportation': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Bills & Utilities': '💡',
  'Healthcare': '🏥',
  'Education': '📚',
  'Travel': '✈️',
  'Personal Care': '💅',
  'Other': '📦'
};

// Smart insights generator - human-friendly messages
const generateSmartInsights = (budgets, totalSpent, totalBudget, selectedMonth) => {
  const insights = [];
  
  if (budgets.length === 0) {
    return [
      { text: "Start by creating your first budget! 🎯", type: 'info' },
      { text: "We'll help you track spending and stay on target.", type: 'info' }
    ];
  }

  const overBudget = budgets.filter(b => b.spent > b.amount);
  const nearLimit = budgets.filter(b => {
    const pct = (b.spent / b.amount) * 100;
    return pct >= 80 && pct < 100;
  });

  // Weekend spending insight (would need expense data - placeholder)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    insights.push({ 
      text: "You tend to spend more on weekends 🍕", 
      type: 'tip' 
    });
  }

  // Budget running out soon
  if (nearLimit.length > 0) {
    const category = nearLimit[0];
    const remaining = category.amount - category.spent;
    const dailyAvg = category.spent / new Date().getDate();
    const daysLeft = Math.ceil(remaining / dailyAvg);
    if (daysLeft > 0 && daysLeft < 7) {
      insights.push({ 
        text: `${category.category} budget might run out in ~${daysLeft} days`, 
        type: 'warning' 
      });
    }
  }

  // Comparison to last month (placeholder - would need historical data)
  const usagePct = (totalSpent / totalBudget) * 100;
  if (usagePct < 50) {
    insights.push({ 
      text: "You're doing great! Spending is well under budget 🎉", 
      type: 'success' 
    });
  } else if (usagePct < 80) {
    insights.push({ 
      text: "You're on track! Keep monitoring your spending.", 
      type: 'info' 
    });
  }

  // Overspending alert
  if (overBudget.length > 0) {
    insights.push({ 
      text: `${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'} over budget. Let's adjust! 💪`, 
      type: 'warning' 
    });
  }

  // Default friendly message
  if (insights.length === 0) {
    insights.push({ 
      text: "Keep tracking your expenses to get personalized insights! 📊", 
      type: 'info' 
    });
  }

  return insights.slice(0, 4); // Max 4 insights
};

// Get days left in month
const getDaysLeftInMonth = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - now.getDate();
  return daysLeft;
};

const BudgetRedesigned = () => {
  // State Management
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [aiCopilotQuery, setAiCopilotQuery] = useState('');
  const [aiCopilotResponse, setAiCopilotResponse] = useState('');
  const [aiCopilotLoading, setAiCopilotLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear()
  });

  // Months and Years
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
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

  // Fetch Budgets
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/budget?limit=100&recalculate=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setBudgets(res.data?.budgets || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to load budgets');
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  // Save Budget
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const monthYear = `${formData.month} ${formData.year}`;

      const budgetData = {
        category: formData.category,
        amount: parseFloat(formData.amount),
        spent: 0,
        month: monthYear
      };

      const url = editingBudget 
        ? `${baseUrl}/api/budget/${editingBudget._id}`
        : `${baseUrl}/api/budget`;

      const res = await axios[editingBudget ? 'put' : 'post'](url, budgetData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`Budget ${editingBudget ? 'updated' : 'created'} successfully! 🎉`);
      setShowModal(false);
      setEditingBudget(null);
      setFormData({
        category: '',
        amount: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear()
      });
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error.response?.data?.message || 'Failed to save budget');
    }
  };

  // Update Budget Amount (Inline Slider)
  const handleBudgetUpdate = async (budgetId, newAmount) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const budget = budgets.find(b => b._id === budgetId);
      
      if (!budget) return;

      const monthYear = budget.month;
      const budgetData = {
        category: budget.category,
        amount: newAmount,
        spent: budget.spent,
        month: monthYear
      };

      await axios.put(`${baseUrl}/api/budget/${budgetId}`, budgetData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      fetchBudgets();
      toast.success('Budget updated! 💰');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  // Delete Budget
  const handleDelete = async (id, category) => {
    if (!confirm(`Delete budget for ${category}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      await axios.delete(`${baseUrl}/api/budget/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Budget deleted successfully');
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  // Edit Budget
  const handleEdit = (budget) => {
    const [month, year] = budget.month.split(' ');
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      month: month,
      year: parseInt(year)
    });
    setEditingBudget(budget);
    setShowModal(true);
  };

  // Get Status
  const getStatus = (budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    if (percentage >= 100) {
      return { 
        label: 'Over Budget', 
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        message: 'You\'ve exceeded this budget. Consider adjusting it! 💪',
        icon: AlertTriangle 
      };
    } else if (percentage >= 80) {
      return { 
        label: 'Warning', 
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        message: 'Getting close to your limit. Watch your spending! 👀',
        icon: Clock 
      };
    } else if (percentage >= 50) {
      return { 
        label: 'On Track', 
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        message: 'You\'re doing well! Keep it up! 👍',
        icon: TrendingUp 
      };
    }
    return { 
      label: 'Safe', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      message: 'You\'re well within budget. Great job! 🎉',
      icon: CheckCircle2 
    };
  };

  // Filtered Budgets
  const filteredBudgets = budgets.filter(b => {
    const budgetMonth = b.month || '';
    return budgetMonth.includes(selectedMonth) && budgetMonth.includes(selectedYear.toString());
  });

  // Calculate Totals
  const totalBudget = filteredBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget * 100) : 0;
  const daysLeft = getDaysLeftInMonth();

  // Get progress bar color
  const getProgressColor = () => {
    if (spentPercentage >= 100) return 'bg-red-500';
    if (spentPercentage >= 80) return 'bg-yellow-500';
    if (spentPercentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Smart Insights
  const insights = generateSmartInsights(filteredBudgets, totalSpent, totalBudget, selectedMonth);

  // Handle AI Copilot Query
  const handleAICopilotQuery = async (query) => {
    if (!query.trim()) return;
    
    setAiCopilotLoading(true);
    setAiCopilotResponse('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to use AI Copilot');
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.post(`${baseUrl}/api/ai/chat`, {
        question: query
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (res.data && res.data.response) {
        setAiCopilotResponse(res.data.response);
      } else {
        toast.error('No response from AI');
      }
    } catch (error) {
      console.error('AI Copilot error:', error);
      toast.error(error.response?.data?.message || 'Failed to get AI response');
      setAiCopilotResponse('Sorry, I couldn\'t process your question. Please try again.');
    } finally {
      setAiCopilotLoading(false);
    }
  };

  // Check and send budget insights email
  const checkBudgetInsights = async (sendEmail = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const baseUrl = await getBaseUrl();
      const res = await axios.post(`${baseUrl}/api/budget/check-insights`, {
        sendEmail
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.data && res.data.hasInsights) {
        if (sendEmail && res.data.emailSent) {
          toast.success('Budget insights email sent! 📧');
        }
        return res.data.insights;
      }
    } catch (error) {
      console.error('Error checking budget insights:', error);
    }
    return null;
  };

  // Effects
  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header - Simple and Clean */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
              Budget
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedMonth} {selectedYear}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditingBudget(null);
                setFormData({
                  category: '',
                  amount: '',
                  month: selectedMonth,
                  year: selectedYear
                });
                setShowModal(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Add Budget
            </button>
          </div>
        </div>

        {/* Budget Overview - Big Remaining Money */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 mb-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Remaining Money
              </p>
              <h2 className={`text-5xl md:text-6xl font-bold mb-3 ${
                totalRemaining >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                ₹{Math.abs(totalRemaining).toLocaleString()}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in {selectedMonth}
              </p>
            </div>
            
            {/* Primary Progress Bar */}
            <div className="w-full md:w-80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {spentPercentage.toFixed(1)}% used
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  ₹{totalSpent.toLocaleString()} of ₹{totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, spentPercentage)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${getProgressColor()}`}
                />
              </div>
              {spentPercentage >= 100 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  ⚠️ You've exceeded your total budget
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Smart Insights - Human-Friendly Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 mb-6 border border-indigo-200 dark:border-indigo-800"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Smart Insights</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="mt-0.5">
                  {insight.type === 'success' ? '🎉' : 
                   insight.type === 'warning' ? '⚠️' : 
                   insight.type === 'tip' ? '💡' : 'ℹ️'}
                </span>
                <span>{insight.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Category Cards */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Budgets
          </h3>
          {filteredBudgets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                No budgets yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Create your first budget to start tracking your spending!
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all"
              >
                Create Budget
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBudgets.map((budget, index) => {
                const status = getStatus(budget);
                const StatusIcon = status.icon;
                const percentage = (budget.spent / budget.amount) * 100;
                const remaining = budget.amount - budget.spent;
                const emoji = categoryEmojis[budget.category] || '📦';

                return (
                  <motion.div
                    key={budget._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 ${status.borderColor} hover:shadow-lg transition-all`}
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emoji}</span>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {budget.category}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget._id, budget.category)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Budget Amounts */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Budget</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ₹{budget.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Spent</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          ₹{budget.spent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
                        <span className={`font-semibold ${
                          remaining >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ₹{Math.abs(remaining).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Circular Progress Indicator */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative w-16 h-16">
                        <svg className="transform -rotate-90 w-16 h-16">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(percentage, 100) / 100)}`}
                            className={status.color}
                            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - Math.min(percentage, 100) / 100) }}
                            transition={{ duration: 0.8 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-bold ${status.color}`}>
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`h-4 w-4 ${status.color}`} />
                          <span className={`text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {status.message}
                        </p>
                      </div>
                    </div>

                    {/* Inline Budget Adjustment Slider */}
                    {editingBudgetId === budget._id ? (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Adjust Budget: ₹{budget.amount.toLocaleString()}
                        </label>
                        <input
                          type="range"
                          min={Math.max(0, budget.spent)}
                          max={budget.amount * 2}
                          value={budget.amount}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value);
                            handleBudgetUpdate(budget._id, newAmount);
                          }}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
                          <span>₹{Math.max(0, budget.spent).toLocaleString()}</span>
                          <span>₹{(budget.amount * 2).toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => setEditingBudgetId(null)}
                          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingBudgetId(budget._id)}
                        className="w-full mt-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Sliders className="h-4 w-4" />
                        Adjust Budget
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lightweight AI Copilot */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <AnimatePresence>
            {showAICopilot ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80 mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Budget Assistant
                  </h4>
                  <button
                    onClick={() => setShowAICopilot(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2 mb-3">
                  <button
                    onClick={async () => {
                      setAiCopilotQuery("Can I afford this?");
                      await handleAICopilotQuery("Can I afford this?");
                    }}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    💰 Can I afford this?
                  </button>
                  <button
                    onClick={async () => {
                      setAiCopilotQuery("Why am I overspending?");
                      await handleAICopilotQuery("Why am I overspending?");
                    }}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    📊 Why am I overspending?
                  </button>
                  <button
                    onClick={async () => {
                      setAiCopilotQuery("Help me plan next month");
                      await handleAICopilotQuery("Help me plan next month");
                    }}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    📅 Help me plan next month
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiCopilotQuery}
                    onChange={(e) => setAiCopilotQuery(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && aiCopilotQuery.trim() && !aiCopilotLoading) {
                        await handleAICopilotQuery(aiCopilotQuery);
                        setAiCopilotQuery('');
                      }
                    }}
                    disabled={aiCopilotLoading}
                  />
                  <button
                    onClick={async () => {
                      if (aiCopilotQuery.trim() && !aiCopilotLoading) {
                        await handleAICopilotQuery(aiCopilotQuery);
                        setAiCopilotQuery('');
                      }
                    }}
                    disabled={aiCopilotLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiCopilotLoading ? 'Thinking...' : 'Ask'}
                  </button>
                </div>
                {aiCopilotResponse && (
                  <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{aiCopilotResponse}</p>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      await checkBudgetInsights(true);
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    📧 Email Budget Insights
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            onClick={() => setShowAICopilot(!showAICopilot)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {editingBudget ? 'Edit Budget' : 'Add New Budget'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    placeholder="e.g., Food & Dining"
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Month
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Year
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBudget(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all"
                  >
                    {editingBudget ? 'Update' : 'Create'} Budget
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

export default BudgetRedesigned;
