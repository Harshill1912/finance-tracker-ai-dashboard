import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowUpDown, Sparkles, TrendingUp, TrendingDown, Target, Zap, AlertTriangle, CheckCircle2, Clock, RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from '@/components/navbar';
import BudgetCard from './BudgetCard';
import BudgetChart from './BudgetChart';
import AddBudgetModal from './AddBudgetModal';

const Budgets = () => {
  const [budgetData, setBudgetData] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [autoApplyMode, setAutoApplyMode] = useState(false);

  // Generate months and years
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  useEffect(() => {
    const currentDate = new Date();
    if (!selectedMonth) {
      setSelectedMonth(currentDate.toLocaleString('default', { month: 'long' }));
    }
    fetchBudgets();
    fetchAiRecommendations();
  }, [selectedMonth, selectedYear]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchBudgets = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      window.location.href = '/login';
      return;
    }

    try {
      const baseUrl = await getBaseUrl();
      // Always recalculate from actual expenses for accuracy
      const res = await fetch(`${baseUrl}/api/budget?limit=100&recalculate=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch budgets');
      }

      const data = await res.json();
      setBudgetData(data.budgets || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setError('Failed to fetch budget data. Please try again.');
      setBudgetData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const res = await axios.get(`${baseUrl}/api/ai/budget-recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { month: selectedMonth, year: selectedYear },
        timeout: 15000
      });

      if (res.data) {
        setAiRecommendations(res.data);
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      toast.error('Failed to load AI recommendations');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleApplyRecommendation = async (recommendation) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const monthYear = `${selectedMonth} ${selectedYear}`;
      
      // Check if budget already exists
      const existingBudget = budgetData.find(b => 
        b.category === recommendation.category && b.month === monthYear
      );

      const budgetData = {
        category: recommendation.category,
        amount: recommendation.recommendedAmount,
        spent: existingBudget?.spent || 0,
        month: monthYear
      };

      const url = existingBudget
        ? `${baseUrl}/api/budget/${existingBudget._id}`
        : `${baseUrl}/api/budget`;

      const method = existingBudget ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(budgetData),
      });

      if (!res.ok) throw new Error('Failed to apply recommendation');

      toast.success(`Budget for ${recommendation.category} ${existingBudget ? 'updated' : 'created'}!`);
      fetchBudgets();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAutoApplyAll = async () => {
    if (!aiRecommendations?.recommendations) return;
    
    setAutoApplyMode(true);
    let successCount = 0;
    
    for (const rec of aiRecommendations.recommendations) {
      try {
        await handleApplyRecommendation(rec);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between requests
      } catch (err) {
        console.error(`Failed to apply ${rec.category}:`, err);
      }
    }
    
    setAutoApplyMode(false);
    toast.success(`Applied ${successCount} budget recommendations!`);
    fetchBudgets();
  };

  const handleAddOrUpdateBudget = async (budget) => {
    const token = localStorage.getItem('token');
    const monthYear = `${selectedMonth} ${selectedYear}`;
    const updatedBudget = { ...budget, month: monthYear, spent: budget.spent || 0 };

    try {
      const baseUrl = await getBaseUrl();
      const url = editData
        ? `${baseUrl}/api/budget/${editData._id}`
        : `${baseUrl}/api/budget`;

      const method = editData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedBudget),
      });

      if (!res.ok) throw new Error('Failed to save budget');

      toast.success(`Budget ${editData ? 'updated' : 'added'} successfully`);
      fetchBudgets();
      fetchAiRecommendations();
    } catch (err) {
      toast.error(err.message);
    }

    setIsAddModalOpen(false);
    setEditData(null);
  };

  const handleDeleteBudget = async (id, categoryName) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await fetch(`${baseUrl}/api/budget/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete budget');

      toast.success(`${categoryName} budget deleted successfully`);
      fetchBudgets();
      fetchAiRecommendations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusTag = (budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    if (percentage >= 100) {
      return { label: 'Over Budget', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle };
    } else if (percentage >= 80) {
      return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
    } else if (percentage >= 50) {
      return { label: 'On Track', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock };
    } else {
      return { label: 'Safe', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
    }
  };

  const filteredBudgetData = budgetData.filter(item => {
    const itemMonthYear = item.month || '';
    return itemMonthYear.includes(selectedMonth) && itemMonthYear.includes(selectedYear.toString());
  });

  const totalBudget = filteredBudgetData.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSpent = filteredBudgetData.reduce((acc, curr) => acc + curr.spent, 0);
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const remainingPercentage = totalBudget ? Math.round((remaining / totalBudget) * 100) : 0;
  const overBudgetCount = filteredBudgetData.filter(b => b.spent > b.amount).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-800 dark:text-white">
      <Navbar />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Futuristic Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-purple-600" />
              AI-Powered Budget Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Smart budgeting with AI auto-detection and recommendations</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 rounded-xl px-4 py-2 pr-10 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <Calendar className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            {/* Year Selector */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="appearance-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 rounded-xl px-4 py-2 pr-10 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ArrowUpDown className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <button
              onClick={() => {
                setEditData(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              <PlusCircle className="h-5 w-5" />
              New Budget
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BudgetCard 
              title="Total Budget" 
              amount={totalBudget} 
              type="budget" 
              percentage={100} 
              trend="neutral" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <BudgetCard 
              title="Total Spent" 
              amount={totalSpent} 
              type="spent" 
              percentage={spentPercentage} 
              trend="up" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BudgetCard 
              title="Remaining" 
              amount={remaining} 
              type="remaining" 
              percentage={remainingPercentage} 
              trend="down" 
            />
          </motion.div>
        </div>

        {/* Over Budget Alert */}
        {overBudgetCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Budget Alert</h3>
              <p className="text-sm text-red-800 dark:text-red-300">
                {overBudgetCount} categor{overBudgetCount === 1 ? 'y' : 'ies'} {overBudgetCount === 1 ? 'is' : 'are'} over budget
              </p>
            </div>
          </motion.div>
        )}

        {/* AI Budget Recommendations Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI Budget Recommendations
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Based on last 6 months of spending patterns
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAiRecommendations}
                disabled={loadingRecommendations}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingRecommendations ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {aiRecommendations?.recommendations && aiRecommendations.recommendations.length > 0 && (
                <button
                  onClick={handleAutoApplyAll}
                  disabled={autoApplyMode}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold disabled:opacity-50"
                >
                  {autoApplyMode ? 'Applying...' : 'Apply All Recommendations'}
                </button>
              )}
            </div>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Analyzing your spending patterns...</p>
              </div>
            </div>
          ) : aiRecommendations?.explanation ? (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiRecommendations.explanation}
                </p>
              </div>
            </div>
          ) : null}

          {aiRecommendations?.recommendations && aiRecommendations.recommendations.length > 0 ? (
            <div className="space-y-4">
              {aiRecommendations.recommendations.map((rec, index) => {
                const existingBudget = filteredBudgetData.find(b => b.category === rec.category);
                const needsUpdate = existingBudget && existingBudget.amount !== rec.recommendedAmount;
                
                return (
                  <motion.div
                    key={rec.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                            {rec.category}
                          </h3>
                          {rec.overspendingRisk && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded-full flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overspending Risk
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            rec.trend === 'increasing' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            rec.trend === 'decreasing' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {rec.trend === 'increasing' ? '📈 Increasing' : rec.trend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {rec.reasoning}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Average Spending</p>
                            <p className="font-semibold text-gray-800 dark:text-white">₹{rec.averageMonthlySpending.toLocaleString()}/mo</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Moving Average</p>
                            <p className="font-semibold text-gray-800 dark:text-white">₹{rec.movingAverage.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Current Budget</p>
                            <p className="font-semibold text-gray-800 dark:text-white">₹{rec.currentBudget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Recommended</p>
                            <p className="font-bold text-purple-600 dark:text-purple-400">₹{rec.recommendedAmount.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Based on {rec.monthsAnalyzed} months of data
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyRecommendation(rec)}
                        className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-semibold text-sm whitespace-nowrap"
                      >
                        {existingBudget ? (needsUpdate ? 'Update' : 'Applied') : 'Apply'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">
                {loadingRecommendations ? 'Analyzing...' : 'No recommendations available. Add more expenses to get AI-powered suggestions.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Category-wise Budget Table with Status Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-600" />
              Spending Breakdown
            </h2>
            <BudgetChart data={filteredBudgetData} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              Budget Categories ({selectedMonth} {selectedYear})
            </h2>
            {filteredBudgetData.length > 0 ? (
              <div className="space-y-3">
                {filteredBudgetData.map((budget, index) => {
                  const status = getStatusTag(budget);
                  const StatusIcon = status.icon;
                  const percentage = (budget.spent / budget.amount) * 100;
                  
                  return (
                    <motion.div
                      key={budget._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-gray-800 dark:text-white">{budget.category}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditData(budget);
                              setIsAddModalOpen(true);
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(budget._id, budget.category)}
                            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Budget</span>
                          <span className="font-semibold text-gray-800 dark:text-white">₹{budget.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Spent</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">₹{budget.spent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                          <span className={`font-semibold ${budget.amount - budget.spent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ₹{(budget.amount - budget.spent).toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${
                              percentage >= 100 ? 'bg-red-500' :
                              percentage >= 80 ? 'bg-yellow-500' :
                              percentage >= 50 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                          {percentage.toFixed(1)}% used
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No budgets for {selectedMonth} {selectedYear}</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all"
                >
                  Create First Budget
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditData(null);
        }}
        onAdd={handleAddOrUpdateBudget}
        selectedMonth={`${selectedMonth} ${selectedYear}`}
        isEditing={!!editData}
        existingData={editData}
      />
    </div>
  );
};

export default Budgets;
