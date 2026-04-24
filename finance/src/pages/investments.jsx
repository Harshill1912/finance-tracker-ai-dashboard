import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, TrendingUp, TrendingDown, DollarSign, PieChart, 
  Target, Calendar, Trash2, Edit2, BarChart3, Sparkles, 
  AlertTriangle, CheckCircle2, RefreshCw, X, Award, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import StockSuggestions from './stockSuggestion';

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [selectedType, setSelectedType] = useState('stock');
  const [showYearlySummary, setShowYearlySummary] = useState(false);
  const [yearlySummary, setYearlySummary] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [updatingPrices, setUpdatingPrices] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    amountInvested: '',
    currentValue: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    interestRate: '',
    maturityDate: '',
    sipAmount: '',
    sipFrequency: 'monthly',
    riskLevel: 'medium',
    notes: ''
  });

  const apiKey = '872XM08JT8P7M8S1';

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  useEffect(() => {
    fetchInvestments();
    fetchPortfolioSummary();
    fetchPortfolioAnalysis();
    fetchAiInsights();
  }, []);

  const fetchInvestments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/investments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setInvestments(res.data.investments || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/investments/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPortfolioSummary(res.data);
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
    }
  };

  const fetchPortfolioAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/investments/dashboard/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPortfolioAnalysis(res.data);
    } catch (error) {
      console.error('Error fetching portfolio analysis:', error);
    }
  };

  const fetchAiInsights = async () => {
    setLoadingInsights(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/ai/investment-insights`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000
      });
      setAiInsights(res.data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchYearlySummary = async (year) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/investments/summary/yearly/${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setYearlySummary(res.data);
    } catch (error) {
      console.error('Error fetching yearly summary:', error);
      toast.error('Failed to load yearly summary');
    }
  };

  const updateAllPrices = async () => {
    setUpdatingPrices(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.post(`${baseUrl}/api/investments/update-prices`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 30000 // 30 second timeout for multiple API calls
      });
      
      toast.success(`Updated ${res.data.updated.length} investments`);
      if (res.data.errors && res.data.errors.length > 0) {
        toast.warning(`${res.data.errors.length} investments could not be updated`);
      }
      
      // Refresh data
      fetchInvestments();
      fetchPortfolioSummary();
      fetchPortfolioAnalysis();
      fetchAiInsights();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices. Please try again.');
    } finally {
      setUpdatingPrices(false);
    }
  };

  const updateSinglePrice = async (investmentId) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.post(`${baseUrl}/api/investments/${investmentId}/update-price`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      toast.success(`Updated ${res.data.investment.name}`);
      
      // Refresh data
      fetchInvestments();
      fetchPortfolioSummary();
      fetchPortfolioAnalysis();
      fetchAiInsights();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      // Don't send currentValue - let backend auto-fetch accurate price
      const payload = {
        type: selectedType,
        name: formData.name,
        symbol: formData.symbol || undefined,
        amountInvested: parseFloat(formData.amountInvested),
        // currentValue will be auto-fetched by backend for stocks, MFs, gold, ETFs
        // Only send if user explicitly wants to override (for manual entries)
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        purchaseDate: formData.purchaseDate,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        maturityDate: formData.maturityDate || undefined,
        sipAmount: formData.sipAmount ? parseFloat(formData.sipAmount) : undefined,
        sipFrequency: formData.sipFrequency,
        riskLevel: formData.riskLevel,
        notes: formData.notes || undefined
      };

      if (editingInvestment) {
        await axios.put(`${baseUrl}/api/investments/${editingInvestment._id}`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.success('Investment updated successfully');
      } else {
        // Show loading toast for price fetching
        const loadingToast = toast.loading('Fetching current market price...', {
          description: selectedType === 'stock' || selectedType === 'etf' 
            ? 'Getting latest stock price'
            : selectedType === 'mutual_fund'
            ? 'Fetching NAV from MFAPI'
            : selectedType === 'gold'
            ? 'Getting current gold price'
            : 'Calculating value'
        });
        
        const res = await axios.post(`${baseUrl}/api/investments`, payload, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15000
        });
        
        toast.dismiss(loadingToast);
        
        if (res.data.investment) {
          const fetchedValue = res.data.investment.currentValue;
          const investedValue = res.data.investment.amountInvested;
          
          if (fetchedValue !== investedValue && (selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'gold' || selectedType === 'etf')) {
            toast.success('Investment added successfully!', {
              description: `Current value: ₹${fetchedValue.toLocaleString()} (auto-fetched from market)`
            });
          } else {
            toast.success('Investment added successfully');
          }
        } else {
          toast.success('Investment added successfully');
        }
      }

      setShowAddForm(false);
      setEditingInvestment(null);
      resetForm();
      fetchInvestments();
      fetchPortfolioSummary();
      fetchPortfolioAnalysis();
      fetchAiInsights();
    } catch (error) {
      console.error('Error saving investment:', error);
      toast.error(error.response?.data?.message || 'Failed to save investment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      await axios.delete(`${baseUrl}/api/investments/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Investment deleted successfully');
      fetchInvestments();
      fetchPortfolioSummary();
      fetchPortfolioAnalysis();
      fetchAiInsights();
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast.error('Failed to delete investment');
    }
  };

  const handleEdit = (investment) => {
    setEditingInvestment(investment);
    setSelectedType(investment.type);
    setFormData({
      name: investment.name || '',
      symbol: investment.symbol || '',
      amountInvested: investment.amountInvested?.toString() || '',
      currentValue: investment.currentValue?.toString() || '',
      quantity: investment.quantity?.toString() || '',
      purchasePrice: investment.purchasePrice?.toString() || '',
      purchaseDate: investment.purchaseDate ? new Date(investment.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      interestRate: investment.interestRate?.toString() || '',
      maturityDate: investment.maturityDate ? new Date(investment.maturityDate).toISOString().split('T')[0] : '',
      sipAmount: investment.sipAmount?.toString() || '',
      sipFrequency: investment.sipFrequency || 'monthly',
      riskLevel: investment.riskLevel || 'medium',
      notes: investment.notes || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      amountInvested: '',
      currentValue: '',
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      interestRate: '',
      maturityDate: '',
      sipAmount: '',
      sipFrequency: 'monthly',
      riskLevel: 'medium',
      notes: ''
    });
    setSelectedType('stock');
    setEditingInvestment(null);
  };

  // Auto-calculate amount invested when quantity and purchase price are provided
  const handleQuantityChange = (value) => {
    setFormData(prev => ({ ...prev, quantity: value }));
    if ((selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'etf') && 
        formData.purchasePrice && parseFloat(formData.purchasePrice) > 0 && parseFloat(value) > 0) {
      const calculatedAmount = parseFloat(formData.purchasePrice) * parseFloat(value);
      setFormData(prev => ({ ...prev, quantity: value, amountInvested: calculatedAmount.toFixed(2) }));
    }
  };

  const handlePurchasePriceChange = (value) => {
    setFormData(prev => ({ ...prev, purchasePrice: value }));
    if ((selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'etf') && 
        formData.quantity && parseFloat(formData.quantity) > 0 && parseFloat(value) > 0) {
      const calculatedAmount = parseFloat(value) * parseFloat(formData.quantity);
      setFormData(prev => ({ ...prev, purchasePrice: value, amountInvested: calculatedAmount.toFixed(2) }));
    }
  };

  // Auto-estimate gold quantity from amount invested
  const handleAmountInvestedChange = (value) => {
    setFormData(prev => ({ ...prev, amountInvested: value }));
    // Auto-estimate quantity for gold if amount invested is provided and quantity is empty
    if (selectedType === 'gold' && parseFloat(value) > 0 && !formData.quantity) {
      // Estimate: Assume gold price is ~₹6,750 per gram
      const estimatedGrams = (parseFloat(value) / 6750).toFixed(2);
      setFormData(prev => ({ ...prev, amountInvested: value, quantity: estimatedGrams }));
    }
  };

  const handleYearlySummary = async () => {
    setShowYearlySummary(true);
    await fetchYearlySummary(selectedYear);
  };

  const getTypeIcon = (type) => {
    const icons = {
      stock: <TrendingUp className="w-5 h-5" />,
      mutual_fund: <PieChart className="w-5 h-5" />,
      sip: <Target className="w-5 h-5" />,
      fd: <DollarSign className="w-5 h-5" />,
      gold: <Award className="w-5 h-5" />,
      etf: <BarChart3 className="w-5 h-5" />
    };
    return icons[type] || <DollarSign className="w-5 h-5" />;
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-red-600 bg-red-100'
    };
    return colors[risk] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading investments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-purple-600" />
              Investment Portfolio
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Track and manage your investments</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={updateAllPrices}
              disabled={updatingPrices}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${updatingPrices ? 'animate-spin' : ''}`} />
              {updatingPrices ? 'Updating...' : 'Update Prices'}
            </button>
            <button
              onClick={handleYearlySummary}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
            >
              <Award className="w-5 h-5" />
              Yearly Summary
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Add Investment
            </button>
          </div>
        </motion.div>

        {/* Portfolio Summary Cards */}
        {portfolioSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Invested</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    ₹{(portfolioSummary.totalInvested || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Current Value</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    ₹{(portfolioSummary.totalCurrentValue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <PieChart className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Returns</p>
                  <p className={`text-2xl font-bold ${(portfolioSummary.totalReturns || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(portfolioSummary.totalReturns || 0) >= 0 ? '+' : ''}₹{(portfolioSummary.totalReturns || 0).toLocaleString()}
                  </p>
                  <p className={`text-sm ${(portfolioSummary.totalReturnsPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(portfolioSummary.totalReturnsPercentage || 0) >= 0 ? '+' : ''}{(portfolioSummary.totalReturnsPercentage || 0).toFixed(2)}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${(portfolioSummary.totalReturns || 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {(portfolioSummary.totalReturns || 0) >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Risk Level</p>
                  <p className={`text-2xl font-bold capitalize ${getRiskColor(portfolioSummary.portfolioRiskLevel || 'medium').split(' ')[0]}`}>
                    {portfolioSummary.portfolioRiskLevel || 'Medium'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${getRiskColor(portfolioSummary.portfolioRiskLevel || 'medium').split(' ')[1]}`}>
                  <Target className={`w-6 h-6 ${getRiskColor(portfolioSummary.portfolioRiskLevel || 'medium').split(' ')[0]}`} />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">AI Portfolio Insights</h3>
                {loadingInsights ? (
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing portfolio...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiInsights.insights && aiInsights.insights.length > 0 && (
                      <div>
                        <p className="text-sm text-purple-800 dark:text-purple-300">
                          {aiInsights.insights.map((insight, idx) => (
                            <span key={idx}>{insight}{idx < aiInsights.insights.length - 1 ? ' ' : ''}</span>
                          ))}
                        </p>
                      </div>
                    )}
                    {aiInsights.warnings && aiInsights.warnings.length > 0 && (
                      <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm mb-1">Warnings:</p>
                          <ul className="text-sm list-disc list-inside">
                            {aiInsights.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                      <div className="flex items-start gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm mb-1">Recommendations:</p>
                          <ul className="text-sm list-disc list-inside">
                            {aiInsights.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={fetchAiInsights}
                className="p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition-colors"
                title="Refresh insights"
              >
                <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Portfolio Analysis */}
        {portfolioAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Portfolio Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Asset Allocation</h3>
                <div className="space-y-2">
                  {Object.entries(portfolioAnalysis.allocationByType || {}).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-16 text-right">
                          {data.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Risk Exposure</h3>
                <div className="space-y-2">
                  {Object.entries(portfolioAnalysis.riskExposure || {}).map(([level, data]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className={`text-sm capitalize ${getRiskColor(level).split(' ')[0]}`}>
                        {level}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getRiskColor(level).split(' ')[1]}`}
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-16 text-right">
                          {data.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Add/Edit Investment Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Investment Type Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-3">
                  Investment Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { type: 'stock', label: 'Stocks', icon: <TrendingUp className="w-5 h-5" /> },
                    { type: 'mutual_fund', label: 'Mutual Funds', icon: <PieChart className="w-5 h-5" /> },
                    { type: 'sip', label: 'SIP', icon: <Target className="w-5 h-5" /> },
                    { type: 'fd', label: 'Fixed Deposit', icon: <DollarSign className="w-5 h-5" /> },
                    { type: 'gold', label: 'Gold', icon: <Award className="w-5 h-5" /> },
                    { type: 'etf', label: 'ETF', icon: <BarChart3 className="w-5 h-5" /> }
                  ].map(({ type, label, icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        selectedType === type
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {icon}
                      <span className="font-medium text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Investment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Apple Inc., HDFC Equity Fund"
                    />
                  </div>

                  {(selectedType === 'stock' || selectedType === 'etf') && (
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                        Symbol
                      </label>
                      <StockSuggestions
                        value={formData.symbol}
                        onChange={(value) => setFormData({ ...formData, symbol: value })}
                        onSelect={(symbol, name) => setFormData({ ...formData, symbol, name: name || formData.name })}
                        apiKey={apiKey}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Amount Invested (₹) *
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        {selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'etf'
                          ? '(Auto-calculated if quantity × price provided)'
                          : ''}
                      </span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amountInvested}
                      onChange={(e) => handleAmountInvestedChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Enter amount invested"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'etf'
                        ? '💡 Tip: Enter quantity and purchase price to auto-calculate, or enter amount directly'
                        : selectedType === 'gold'
                        ? '💡 Tip: Enter amount to auto-estimate quantity, or enter quantity directly'
                        : 'Enter the total amount you invested'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Current Value (₹)
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        {selectedType === 'stock' || selectedType === 'etf' 
                          ? '(Auto-fetched from market)'
                          : selectedType === 'mutual_fund'
                          ? '(Auto-fetched NAV)'
                          : selectedType === 'gold'
                          ? '(Auto-fetched gold price)'
                          : selectedType === 'sip' || selectedType === 'fd'
                          ? '(Auto-calculated)'
                          : '(Optional)'}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.currentValue}
                      onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder={selectedType === 'stock' || selectedType === 'etf' || selectedType === 'mutual_fund' || selectedType === 'gold'
                        ? "Leave empty to auto-fetch from market"
                        : "Leave empty to auto-calculate"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedType === 'stock' || selectedType === 'etf' 
                        ? '💡 Current market price will be fetched automatically when you add the investment'
                        : selectedType === 'mutual_fund'
                        ? '💡 Latest NAV will be fetched automatically from MFAPI when you add the investment'
                        : selectedType === 'gold'
                        ? '💡 Current gold price will be fetched automatically when you add the investment'
                        : selectedType === 'sip'
                        ? '💡 Value will be calculated automatically based on months invested and estimated returns'
                        : selectedType === 'fd'
                        ? '💡 Value will be calculated automatically based on interest rate and time elapsed'
                        : 'Enter manually or leave empty'}
                    </p>
                  </div>

                  {(selectedType === 'stock' || selectedType === 'mutual_fund' || selectedType === 'etf') && (
                    <>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Quantity (Shares/Units)
                          <span className="text-xs text-gray-500 ml-2 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={formData.quantity}
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 10, 0.5"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Enter quantity to get accurate current value. Leave empty if unknown.
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Purchase Price per Unit (₹)
                          <span className="text-xs text-gray-500 ml-2 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.purchasePrice}
                          onChange={(e) => handlePurchasePriceChange(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 150.50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Enter purchase price per share/unit. Amount invested will auto-calculate if quantity is provided.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedType === 'fd' && (
                    <>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Interest Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.interestRate}
                          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          Maturity Date
                        </label>
                        <input
                          type="date"
                          value={formData.maturityDate}
                          onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {selectedType === 'sip' && (
                    <>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          SIP Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.sipAmount}
                          onChange={(e) => setFormData({ ...formData, sipAmount: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                          SIP Frequency
                        </label>
                        <select
                          value={formData.sipFrequency}
                          onChange={(e) => setFormData({ ...formData, sipFrequency: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                      Risk Level
                    </label>
                    <select
                      value={formData.riskLevel}
                      onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Additional notes about this investment..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    {editingInvestment ? 'Update Investment' : 'Add Investment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Investments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investments.map((investment) => {
            const returns = (investment.currentValue || investment.amountInvested) - investment.amountInvested;
            const returnsPercentage = investment.amountInvested > 0 
              ? (returns / investment.amountInvested) * 100 
              : 0;
            const isProfit = returns >= 0;

            return (
              <motion.div
                key={investment._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      investment.type === 'stock' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      investment.type === 'mutual_fund' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                      investment.type === 'sip' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      investment.type === 'fd' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      investment.type === 'gold' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {getTypeIcon(investment.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{investment.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {investment.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(investment.type === 'stock' || investment.type === 'mutual_fund' || investment.type === 'etf' || investment.type === 'gold') && (
                      <button
                        onClick={() => updateSinglePrice(investment._id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Update Price"
                      >
                        <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(investment)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(investment._id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                {investment.symbol && (
                  <div className="mb-3">
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">
                      {investment.symbol}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Invested:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      ₹{investment.amountInvested.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Value:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      ₹{(investment.currentValue || investment.amountInvested).toLocaleString()}
                    </span>
                  </div>
                  
                  {(investment.type === 'stock' || investment.type === 'mutual_fund' || investment.type === 'etf') && investment.symbol && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Click refresh icon to update price
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Returns:</span>
                      <div className="text-right">
                        <div className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          {isProfit ? '+' : ''}₹{returns.toFixed(2)}
                        </div>
                        <div className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          ({isProfit ? '+' : ''}{returnsPercentage.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(investment.purchaseDate).toLocaleDateString()}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(investment.riskLevel)}`}>
                      {investment.riskLevel}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {investments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <PieChart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No investments yet</h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Start tracking your investments by adding your first investment above.</p>
          </div>
        )}

        {/* Yearly Summary Modal */}
        <AnimatePresence>
          {showYearlySummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowYearlySummary(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    Your {selectedYear} Investment Summary
                  </h2>
                  <button
                    onClick={() => setShowYearlySummary(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value));
                      fetchYearlySummary(parseInt(e.target.value));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {yearlySummary && yearlySummary.summary ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-90 mb-1">Best Performer</p>
                        <p className="text-xl font-bold">{yearlySummary.summary.bestPerformer.name}</p>
                        <p className="text-sm opacity-90 capitalize">{yearlySummary.summary.bestPerformer.type.replace('_', ' ')}</p>
                        <p className="text-2xl font-bold mt-2">
                          +{yearlySummary.summary.bestPerformer.returnsPercentage.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-90 mb-1">Worst Performer</p>
                        <p className="text-xl font-bold">{yearlySummary.summary.worstPerformer.name}</p>
                        <p className="text-sm opacity-90 capitalize">{yearlySummary.summary.worstPerformer.type.replace('_', ' ')}</p>
                        <p className="text-2xl font-bold mt-2">
                          {yearlySummary.summary.worstPerformer.returnsPercentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white">
                      <p className="text-sm opacity-90 mb-1">Most Consistent Asset</p>
                      <p className="text-3xl font-bold capitalize">
                        {yearlySummary.summary.mostConsistentAsset.replace('_', ' ')}
                      </p>
                      <p className="text-sm opacity-90 mt-2">
                        {yearlySummary.summary.investmentsByType[yearlySummary.summary.mostConsistentAsset]} investments
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
                      <p className="text-sm opacity-90 mb-1">Overall Portfolio Performance</p>
                      <p className={`text-3xl font-bold ${yearlySummary.summary.overallReturns >= 0 ? '' : 'text-red-200'}`}>
                        {yearlySummary.summary.overallReturns >= 0 ? '+' : ''}
                        {yearlySummary.summary.overallReturnsPercentage.toFixed(2)}%
                      </p>
                      <p className="text-sm opacity-90 mt-2">
                        {yearlySummary.summary.totalInvestments} investments • 
                        ₹{yearlySummary.summary.totalInvested.toLocaleString()} invested
                      </p>
                    </div>
                  </div>
                ) : yearlySummary && yearlySummary.message ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">{yearlySummary.message}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Loading summary...</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Investments;
