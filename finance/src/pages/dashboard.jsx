
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
  Area
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChart,
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
  SaveAllIcon,
  SaveAll,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import path from "path";


// Currency formatter
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(value);

const sidebarOptions = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Transactions", icon: Receipt, path: "/transactions" },
  { name: "Budgets", icon: Wallet, path: "/budgets" },
  { name: "Reports", icon: BarChart, path: "/report" },
  {name: "Investment Tracker" ,icon:SaveAll ,path:'/saving'},
  {name:"SplitExpenses", icon:SplitIcon,path:"/split"},
];

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const res = await axios.get("http://localhost:5000/api/budget/dashboard/summary", {
          headers: {
            Authorization: `Bearer ${token}`, // <--- THIS IS IMPORTANT
          },
        });

      setSummary(res.data); // Save response to state
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    };

    fetchSummary();
  }, []);

 
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
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Financial Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here's your financial summary</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <Calendar size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                {summary ? summary.user?.charAt(0)?.toUpperCase() || "U" : "U"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
              title="Total Income"
              value={formatCurrency(summary.income)}
              icon={<TrendingUp className="text-green-500" />}
              trend={{
                value: "+2.5%",
                label: "vs last month",
                positive: true
              }}
            />
            <SummaryCard
              title="Total Expenses"
              value={formatCurrency(summary.expenses)}
              icon={<TrendingDown className="text-red-500" />}
              trend={{
                value: "-1.2%",
                label: "vs last month",
                positive: false
              }}
            />
            <SummaryCard
              title="Current Balance"
              value={formatCurrency(summary.balance)}
              icon={<Wallet className="text-blue-500" />}
              trend={{
                value: "+4.3%",
                label: "vs last month",
                positive: true
              }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Line Chart */}
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
              </CardContent>
            </Card>

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

const SummaryCard = ({ title, value, icon, trend }) => (
  <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800 overflow-hidden">
    <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{value}</p>
      <div className={`flex items-center text-xs ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span className="ml-1 font-semibold">{trend.value}</span>
        <span className="ml-1 text-gray-500 dark:text-gray-400">{trend.label}</span>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;