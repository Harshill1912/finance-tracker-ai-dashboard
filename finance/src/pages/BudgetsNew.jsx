import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Target, TrendingUp, AlertTriangle, 
  CheckCircle2, Clock, Edit2, Trash2, RefreshCw, Sparkles,
  DollarSign, BarChart3, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const BudgetsNew = () => {
  // State Management
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true); // Start with true to show loading initially

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

  // Fetch AI Recommendations
  const fetchAIRecommendations = async () => {
    try {
      setLoadingAI(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingAI(false);
        return;
      }
      
      const baseUrl = await getBaseUrl();
      
      try {
        const res = await axios.get(`${baseUrl}/api/ai/budget-recommendations`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { month: selectedMonth, year: selectedYear },
          timeout: 30000 // Increased timeout
        });

        if (res.data && res.data.recommendations) {
          setAiRecommendations(res.data);
        } else {
          // Set default recommendations if API returns empty
          setAiRecommendations({
            recommendations: [],
            explanation: 'Add some expenses to get personalized budget recommendations based on your spending patterns.',
            summary: { totalCategories: 0 }
          });
        }
      } catch (apiError) {
        console.error('Error fetching AI recommendations:', apiError);
        // Set helpful fallback content
        setAiRecommendations({
          recommendations: [
            {
              category: 'Food & Dining',
              recommendedAmount: 5000,
              reasoning: 'Start with a basic budget. Adjust based on your actual spending.'
            },
            {
              category: 'Transportation',
              recommendedAmount: 3000,
              reasoning: 'Track your commute and travel expenses to optimize this budget.'
            },
            {
              category: 'Groceries',
              recommendedAmount: 4000,
              reasoning: 'Monitor your grocery spending to set an accurate budget.'
            }
          ],
          explanation: 'These are default budget recommendations. Add expenses to get personalized AI-powered suggestions based on your spending history.',
          summary: { totalCategories: 3 }
        });
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Set fallback recommendations
      setAiRecommendations({
        recommendations: [
          {
            category: 'Food & Dining',
            recommendedAmount: 5000,
            reasoning: 'Start tracking your food expenses with this recommended budget.'
          },
          {
            category: 'Transportation',
            recommendedAmount: 3000,
            reasoning: 'Set a budget for your travel and commute expenses.'
          }
        ],
        explanation: 'Start by creating budgets for your main spending categories. As you add expenses, we\'ll provide personalized recommendations.',
        summary: { totalCategories: 2 }
      });
    } finally {
      setLoadingAI(false);
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

      toast.success(`Budget ${editingBudget ? 'updated' : 'created'} successfully!`);
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
      return { label: 'Over Budget', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle };
    } else if (percentage >= 80) {
      return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
    } else if (percentage >= 50) {
      return { label: 'On Track', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: TrendingUp };
    }
    return { label: 'Safe', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
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

  // Effects
  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAIRecommendations();
  }, [selectedMonth, selectedYear]);

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
                <Target className="h-10 w-10 text-purple-600" />
                Budget Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Track and manage your monthly budgets with AI-powered insights
              </p>
            </div>
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
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all flex items-center gap-2 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Add Budget
            </button>
          </div>

          {/* Month/Year Selector */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 font-medium"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 font-medium"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={fetchBudgets}
              className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Total Budget</span>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              ₹{totalBudget.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-red-200 dark:border-red-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Total Spent</span>
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              ₹{totalSpent.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-green-200 dark:border-green-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Remaining</span>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ₹{totalRemaining.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Usage</span>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {spentPercentage.toFixed(1)}%
            </p>
          </motion.div>
        </div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">AI Budget Recommendations</h2>
            </div>
            <button
              onClick={fetchAIRecommendations}
              disabled={loadingAI}
              className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-lg transition-all flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingAI ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingAI ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing your spending patterns...</p>
            </div>
          ) : aiRecommendations ? (
            <>
              {/* AI Explanation */}
              {aiRecommendations.explanation && (
                <div className="mb-4 p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiRecommendations.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendations List */}
              {aiRecommendations.recommendations && aiRecommendations.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {aiRecommendations.recommendations.slice(0, 5).map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-5 w-5 text-purple-600" />
                            <p className="font-semibold text-lg text-gray-800 dark:text-white">{rec.category}</p>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              Recommended: ₹{rec.recommendedAmount?.toLocaleString() || '0'}
                            </span>
                            {rec.averageMonthlySpending > 0 && (
                              <span className="ml-2">
                                (Avg: ₹{rec.averageMonthlySpending.toLocaleString()}/month)
                              </span>
                            )}
                          </p>
                          {rec.reasoning && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              {rec.reasoning}
                            </p>
                          )}
                          {rec.overspendingRisk && (
                            <span className="inline-block mt-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-semibold">
                              ⚠️ Overspending Risk
                            </span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              const baseUrl = await getBaseUrl();
                              const monthYear = `${selectedMonth} ${selectedYear}`;
                              
                              // Check if budget already exists
                              const existingBudget = budgets.find(b => 
                                b.category === rec.category && 
                                b.month === monthYear
                              );
                              
                              if (existingBudget) {
                                toast.info(`Budget for ${rec.category} already exists`);
                                return;
                              }
                              
                              await axios.post(`${baseUrl}/api/budget`, {
                                category: rec.category,
                                amount: rec.recommendedAmount,
                                spent: 0,
                                month: monthYear
                              }, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              
                              toast.success(`Budget for ${rec.category} created! 🎉`);
                              fetchBudgets();
                              fetchAIRecommendations(); // Refresh recommendations
                            } catch (error) {
                              console.error('Error applying recommendation:', error);
                              toast.error(error.response?.data?.message || 'Failed to apply recommendation');
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex-shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    No personalized recommendations yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Add expenses to get AI-powered budget suggestions based on your spending patterns.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">
                Click "Refresh" to load AI recommendations
              </p>
            </div>
          )}
        </motion.div>

        {/* Budget List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-purple-200 dark:border-purple-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Target className="h-6 w-6 text-purple-600" />
            Budget Categories ({selectedMonth} {selectedYear})
          </h2>

          {filteredBudgets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">No budgets found for this period. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBudgets.map((budget, index) => {
                const status = getStatus(budget);
                const StatusIcon = status.icon;
                const percentage = (budget.spent / budget.amount) * 100;

                return (
                  <motion.div
                    key={budget._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{budget.category}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget._id, budget.category)}
                          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
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
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mt-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentage >= 100 ? 'bg-red-500' :
                            percentage >= 80 ? 'bg-yellow-500' :
                            percentage >= 50 ? 'bg-blue-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{percentage.toFixed(1)}% used</p>
                    </div>
                  </motion.div>
                );
              })}
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border-2 border-purple-200 dark:border-purple-800"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
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
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
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
                    className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
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
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
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
                      className="w-full px-4 py-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
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
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all"
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

export default BudgetsNew;
