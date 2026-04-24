
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChart as BarChartIcon,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  SplitIcon,
  SaveAll,
  Target,
  Sparkles,
  Zap,
  PieChart as PieChartIcon,
  DollarSign,
  Award,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import AiSpendingTips from "@/components/AiSpendingTips";
import AiBudgetRecommendations from "@/components/AiBudgetRecommendations";
import AiSpendingForecast from "@/components/AiSpendingForecast";
import AiAnomalyDetection from "@/components/AiAnomalyDetection";


// Currency formatter
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(value);

const sidebarOptions = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Expenses", icon: Receipt, path: "/expenses" },
  { name: "Budgets", icon: Wallet, path: "/budgets" },
  { name: "Reports", icon: BarChart, path: "/report" },
  { name: "Investment Tracker", icon: SaveAll, path: '/investments' },
  { name: "Split Expenses", icon: SplitIcon, path: "/split" },
  { name: "Goals", icon: Target, path: "/goals" },
];

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [investmentSummary, setInvestmentSummary] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          console.error("No authentication token found");
          setIsLoading(false);
          window.location.href = "/login";
          return;
        }

        // Use local backend if available, otherwise use deployed
        const localUrl = 'http://localhost:5000';
        const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
        
        // Check if local backend is available first
        let useLocal = false;
        try {
          const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
          if (testRes.data) {
            useLocal = true;
          }
        } catch (e) {
          // Local not available, use deployed
          useLocal = false;
        }
        
        const baseUrl = useLocal ? localUrl : deployedUrl;
        const timeout = useLocal ? 8000 : 20000;
        
        const res = await axios.get(`${baseUrl}/api/budget/dashboard/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: timeout,
        });

        // Handle empty or invalid response
        if (res.data) {
          // Ensure all required fields exist with defaults
          const summaryData = {
            balance: res.data.balance || 0,
            income: res.data.income || 0,
            expenses: res.data.expenses || 0,
            chart: res.data.chart || [],
            recent: res.data.recent || [],
            user: res.data.user || JSON.parse(localStorage.getItem("user") || '{}').name || 'User'
          };
          setSummary(summaryData);
        } else {
          // If no data, set default empty summary
          setSummary({
            balance: 0,
            income: 0,
            expenses: 0,
            chart: [],
            recent: [],
            user: JSON.parse(localStorage.getItem("user") || '{}').name || 'User'
          });
        }
      } catch (error) {
        console.error("Dashboard error:", error);
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
        
        // For other errors, set empty summary so user can still see the dashboard
        const userData = JSON.parse(localStorage.getItem("user") || '{}');
        setSummary({
          balance: 0,
          income: 0,
          expenses: 0,
          chart: [],
          recent: [],
          user: userData.name || 'User'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
    fetchInvestmentSummary();
    fetchExpenseCategories();
    fetchBudgets();
    fetchGoals();
  }, []);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchInvestmentSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/investments/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      // Ensure all values are valid numbers, not NaN
      const summary = {
        totalInvested: parseFloat(res.data.totalInvested) || 0,
        currentPortfolioValue: parseFloat(res.data.currentPortfolioValue || res.data.totalCurrentValue) || 0,
        totalReturns: parseFloat(res.data.totalReturns) || 0,
        totalReturnsPercentage: parseFloat(res.data.totalReturnsPercentage) || 0,
        portfolioRiskLevel: res.data.portfolioRiskLevel || 'medium',
        totalInvestments: res.data.totalInvestments || 0
      };
      
      // Double check for NaN
      Object.keys(summary).forEach(key => {
        if (typeof summary[key] === 'number' && isNaN(summary[key])) {
          summary[key] = 0;
        }
      });
      
      setInvestmentSummary(summary);
    } catch (error) {
      console.error("Investment summary error:", error);
      // Set default values on error
      setInvestmentSummary({
        totalInvested: 0,
        currentPortfolioValue: 0,
        totalReturns: 0,
        totalReturnsPercentage: 0,
        portfolioRiskLevel: 'medium',
        totalInvestments: 0
      });
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      const expenses = res.data.expenses || [];
      const categoryMap = {};
      expenses.forEach(exp => {
        categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
      });
      const categories = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      setExpenseCategories(categories);
    } catch (error) {
      console.error("Expense categories error:", error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/budget`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setBudgets(res.data.budgets || []);
    } catch (error) {
      console.error("Budgets error:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setGoals(res.data.goals || []);
    } catch (error) {
      console.error("Goals error:", error);
    }
  };

 
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
 
  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No Data Available</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We couldn't load your financial data. Please check your connection and try again.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-white transition-colors duration-300">
      {/* Sidebar */}
      <motion.div
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white dark:bg-gray-800 shadow-lg z-10 min-h-screen relative"
      >
        <div className="p-4">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Wallet className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FinancePro AI
              </h1>
            </motion.div>
          )}
          
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-6 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 p-1.5 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <ul className="px-3 py-2 space-y-1">
          {sidebarOptions.map((item, index) => (
            <motion.li
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={item.path}
                className={`flex items-center gap-x-3 px-4 py-3 rounded-xl ${
                  item.path === "/dashboard" 
                    ? "bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                } transition-all`}
              >
                <item.icon 
                  size={20} 
                  className={item.path === "/dashboard" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"} 
                />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`text-sm font-medium ${
                        item.path === "/dashboard" 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 border-b-2 border-purple-200 dark:border-purple-800 shadow-lg">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                AI Financial Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's your AI-powered financial summary</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                <Calendar size={20} className="text-purple-600 dark:text-purple-400" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                {summary ? summary.user?.charAt(0)?.toUpperCase() || "U" : "U"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
            <SummaryCard
              title="Total Income"
              value={formatCurrency(summary.income)}
              icon={<TrendingUp className="text-green-500" />}
              trend={{
                value: "+2.5%",
                label: "vs last month",
                positive: true
              }}
                gradient="from-green-500 to-emerald-600"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
            <SummaryCard
              title="Total Expenses"
              value={formatCurrency(summary.expenses)}
              icon={<TrendingDown className="text-red-500" />}
              trend={{
                value: "-1.2%",
                label: "vs last month",
                positive: false
              }}
                gradient="from-red-500 to-rose-600"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
            <SummaryCard
              title="Current Balance"
              value={formatCurrency(summary.balance)}
              icon={<Wallet className="text-blue-500" />}
              trend={{
                value: "+4.3%",
                label: "vs last month",
                positive: true
              }}
                gradient="from-blue-500 to-indigo-600"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SummaryCard
                title="Portfolio Value"
                value={investmentSummary && !isNaN(investmentSummary.currentPortfolioValue) 
                  ? formatCurrency(investmentSummary.currentPortfolioValue) 
                  : formatCurrency(0)}
                icon={<Award className="text-yellow-500" />}
                trend={{
                  value: investmentSummary && !isNaN(investmentSummary.totalReturnsPercentage)
                    ? `${investmentSummary.totalReturnsPercentage.toFixed(1)}%`
                    : "0%",
                  label: "Total Returns",
                  positive: (investmentSummary?.totalReturnsPercentage || 0) >= 0
                }}
                gradient="from-yellow-500 to-amber-600"
              />
            </motion.div>
          </div>

          {/* Investment Portfolio Quick View */}
          {investmentSummary && investmentSummary.totalInvested > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600">
                        <SaveAll className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Investment Portfolio</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quick overview of your investments</p>
                      </div>
                    </div>
                    <Link to="/investments" className="text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:underline">
                      View Details →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Invested</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatCurrency(isNaN(investmentSummary.totalInvested) ? 0 : investmentSummary.totalInvested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatCurrency(isNaN(investmentSummary.currentPortfolioValue) ? 0 : investmentSummary.currentPortfolioValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Returns</p>
                      <p className={`text-lg font-bold ${
                        (investmentSummary.totalReturns || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(isNaN(investmentSummary.totalReturns) ? 0 : investmentSummary.totalReturns)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Returns %</p>
                      <p className={`text-lg font-bold ${
                        (investmentSummary.totalReturnsPercentage || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isNaN(investmentSummary.totalReturnsPercentage) ? '0.00' : investmentSummary.totalReturnsPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Budget Progress & Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Progress */}
            {budgets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        Budget Progress
                      </h2>
                      <Link to="/budgets" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {budgets.slice(0, 3).map((budget, index) => {
                        const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                        const isOverBudget = percentage > 100;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {budget.category || budget.month}
                              </span>
                              <span className={`text-sm font-semibold ${
                                isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {formatCurrency(budget.spent || 0)} / {formatCurrency(budget.amount || 0)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                  isOverBudget
                                    ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                    : percentage > 80
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}% used
                              {isOverBudget && (
                                <span className="text-red-600 dark:text-red-400 ml-2">
                                  <AlertCircle className="inline h-3 w-3 mr-1" />
                                  Over budget
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Goals Progress */}
            {goals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        Goals Progress
                      </h2>
                      <Link to="/goals" className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {goals.slice(0, 3).map((goal, index) => {
                        const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                        const isCompleted = percentage >= 100;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                {goal.name}
                                {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </span>
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                {formatCurrency(goal.currentAmount || 0)} / {formatCurrency(goal.targetAmount || 0)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                  isCompleted
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-600'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}% complete
                              {isCompleted && (
                                <span className="text-green-600 dark:text-green-400 ml-2">✓ Achieved!</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* AI Features Section with Futuristic Design */}
          <div className="mb-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 mb-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI-Powered Insights
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get personalized recommendations powered by machine learning
              </p>
            </motion.div>

            <AiSpendingTips />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AiBudgetRecommendations />
              <AiSpendingForecast />
            </div>
            
            <AiAnomalyDetection />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Savings Chart */}
            <Card className="lg:col-span-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Monthly Savings</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your saving patterns</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                    Last 6 Months
                  </div>
                </div>
                {summary.chart && summary.chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={summary.chart}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `₹${value/1000}k`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: 12,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e5e7eb',
                          padding: '8px 12px'
                        }}
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No savings data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories Pie Chart */}
            {expenseCategories.length > 0 && (
              <Card className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-purple-600" />
                      Expense Categories
                    </h2>
                    <Link to="/expenses" className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline">
                      View All
                    </Link>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={expenseCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseCategories.map((entry, index) => {
                          const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Recent Transactions</h2>
                  <Link to="/transactions" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="space-y-2">
                  {summary.recent.map((tx, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.amount > 0 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {tx.amount > 0 ? 
                              <ArrowUpRight size={18} /> : 
                              <ArrowDownRight size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{tx.category}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{tx.date}</p>
                          </div>
                        </div>
                        <span className={`font-semibold ${
                          tx.amount > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Assistant Button */}
      <Link
        to="/ai"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-lg transition-all z-50 group"
      >
        <div className="relative">
          <MessageSquare size={24} />
          <span className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
        </div>
        <span className="absolute right-16 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
          Ask AI Assistant
        </span>
      </Link>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend, gradient = "from-blue-500 to-indigo-600" }) => (
  <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-shadow duration-300">
    <div className={`h-1 bg-gradient-to-r ${gradient}`}></div>
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{value}</p>
      {trend && (
        <div className={`flex items-center text-xs ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span className="ml-1 font-semibold">{trend.value}</span>
          <span className="ml-1 text-gray-500 dark:text-gray-400">{trend.label}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export default Dashboard;