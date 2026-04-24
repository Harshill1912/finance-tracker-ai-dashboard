import React, { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, Calendar, Trash2, Edit2, CheckCircle2, Clock, Pause, Sparkles, Zap, Wand2, X, Loader2, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';
import { motion, AnimatePresence } from 'framer-motion';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    deadline: '',
    category: 'savings'
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchAISuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/goals/ai/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });
      
      if (res.data.success) {
        setAiSuggestions(res.data.suggestions || []);
        setShowAISuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast.error('Failed to load AI suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setFormData({
      title: suggestion.title,
      description: suggestion.description || '',
      targetAmount: suggestion.estimatedPrice?.toString() || '',
      deadline: suggestion.suggestedDeadline || '',
      category: suggestion.category || 'purchase'
    });
    setShowAISuggestions(false);
    setShowAddModal(true);
    toast.success('Goal suggestion applied! Review and adjust as needed.');
  };

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      if (res.data.success) {
        setGoals(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const url = editingGoal 
        ? `${baseUrl}/api/goals/${editingGoal._id}`
        : `${baseUrl}/api/goals`;

      const payload = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: new Date(formData.deadline).toISOString()
      };

      const res = editingGoal
        ? await axios.put(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
        : await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

      if (res.data.success) {
        toast.success(editingGoal ? 'Goal updated!' : 'Goal created!');
        setShowAddModal(false);
        setEditingGoal(null);
        setFormData({
          title: '',
          description: '',
          targetAmount: '',
          deadline: '',
          category: 'savings'
        });
        fetchGoals();
      }
    } catch (error) {
      toast.error('Failed to save goal');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.delete(`${baseUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Goal deleted!');
        fetchGoals();
      }
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetAmount: goal.targetAmount.toString(),
      deadline: new Date(goal.deadline).toISOString().split('T')[0],
      category: goal.category
    });
    setShowAddModal(true);
  };

  const getProgress = (goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (deadline) => {
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusIcon = (goal) => {
    if (goal.status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (goal.status === 'paused') return <Pause className="h-5 w-5 text-yellow-500" />;
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your goals...</p>
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
              Financial Goals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track and achieve your financial dreams</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={fetchAISuggestions}
              disabled={loadingSuggestions}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 mr-2" />
                  AI Suggestions
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setEditingGoal(null);
                setFormData({
                  title: '',
                  description: '',
                  targetAmount: '',
                  deadline: '',
                  category: 'savings'
                });
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Goal
            </Button>
          </div>
        </motion.div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {goals.map((goal, index) => {
              const progress = getProgress(goal);
              const daysRemaining = getDaysRemaining(goal.deadline);
              const isOverdue = daysRemaining < 0;
              const isCompleted = goal.status === 'completed' || progress >= 100;

              return (
                <motion.div
                  key={goal._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all shadow-xl hover:shadow-2xl">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(goal)}
                          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
                            {goal.title}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(goal)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(goal._id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{goal.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                isCompleted
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gradient-to-r from-purple-500 to-blue-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Current</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              ₹{goal.currentAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Target</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              ₹{goal.targetAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Deadline */}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {isOverdue ? (
                              <span className="text-red-500 font-semibold">
                                Overdue by {Math.abs(daysRemaining)} days
                              </span>
                            ) : (
                              <span className={daysRemaining < 30 ? 'text-yellow-600 font-semibold' : ''}>
                                {daysRemaining} days remaining
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Category Badge */}
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-500" />
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 capitalize">
                            {goal.category}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Target className="h-24 w-24 mx-auto mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No goals yet</h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Create your first financial goal to get started!</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Goal
            </Button>
          </motion.div>
        )}
      </div>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {showAISuggestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowAISuggestions(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-purple-500/50"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600/50 to-indigo-600/50 backdrop-blur-sm p-6 border-b border-purple-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        AI-Powered Goal Suggestions
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-400/30">
                          Powered by AI
                        </span>
                      </h2>
                      <p className="text-purple-200 text-sm mt-1">
                        Personalized goals based on your financial profile
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAISuggestions(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {aiSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => selectSuggestion(suggestion)}
                        className="group cursor-pointer bg-white/10 backdrop-blur-md rounded-2xl p-5 border-2 border-purple-400/30 hover:border-purple-400/60 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                              <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{suggestion.title}</h3>
                              <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full mt-1 inline-block capitalize">
                                {suggestion.category}
                              </span>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-green-500/20 border border-green-400/30">
                            <Zap className="h-4 w-4 text-green-300" />
                          </div>
                        </div>
                        
                        <p className="text-purple-200 text-sm mb-4 line-clamp-2">
                          {suggestion.description}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-purple-300">Estimated Cost</span>
                            <span className="text-lg font-bold text-white">
                              ₹{suggestion.estimatedPrice?.toLocaleString('en-IN') || 'N/A'}
                            </span>
                          </div>
                          {suggestion.suggestedDeadline && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-purple-300">Suggested Deadline</span>
                              <span className="text-sm text-purple-200">
                                {new Date(suggestion.suggestedDeadline).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          {suggestion.reasoning && (
                            <div className="mt-3 pt-3 border-t border-purple-400/20">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-purple-200 italic">
                                  {suggestion.reasoning}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-purple-400/20">
                          <div className="flex items-center gap-2 text-sm text-purple-300 group-hover:text-white transition-colors">
                            <span>Click to use this suggestion</span>
                            <TrendingUp className="h-4 w-4" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-purple-300 animate-spin" />
                    <p className="text-purple-200">Generating personalized suggestions...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                <Target className="h-6 w-6 text-purple-600" />
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGoal(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Buy a house"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a description"
                />
              </div>
              <div>
                <Label>Target Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="purchase">Purchase</option>
                  <option value="debt">Debt</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGoal(null);
                    setFormData({
                      title: '',
                      description: '',
                      targetAmount: '',
                      deadline: '',
                      category: 'savings'
                    });
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

export default Goals;
