import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Sparkles, Loader2, RefreshCw, 
  TrendingUp, Wallet, Target, BarChart3, DollarSign,
  MessageSquare, X, Lightbulb, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const AIChatbotNew = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your AI Financial Assistant. I can help you with:\n\n• Your expenses and spending patterns\n• Budget analysis and recommendations\n• Investment portfolio insights\n• Savings goals progress\n• Financial planning advice\n\nWhat would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Suggested questions
  const suggestedQuestions = [
    {
      icon: Wallet,
      text: "How much did I spend this month?",
      category: "Expenses"
    },
    {
      icon: Target,
      text: "What's my budget status?",
      category: "Budgets"
    },
    {
      icon: TrendingUp,
      text: "How are my investments performing?",
      category: "Investments"
    },
    {
      icon: DollarSign,
      text: "What are my top spending categories?",
      category: "Analysis"
    },
    {
      icon: BarChart3,
      text: "Show me my savings progress",
      category: "Goals"
    },
    {
      icon: Lightbulb,
      text: "Give me saving tips",
      category: "Advice"
    }
  ];

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

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async (question = null) => {
    const questionText = question || input.trim();
    if (!questionText) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: questionText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to use the chatbot');
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.post(
        `${baseUrl}/api/ai/chat`,
        { question: questionText },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: res.data?.response || 'I apologize, but I could not generate a response. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: error.response?.data?.response || 'Sorry, I encountered an error. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get response from AI');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClear = () => {
    if (confirm('Clear chat history?')) {
      setMessages([
        {
          role: 'assistant',
          content: "👋 Chat cleared! How can I help you with your finances today?",
          timestamp: new Date()
        }
      ]);
      setShowSuggestions(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI Financial Assistant
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask me anything about your finances
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border-2 border-purple-200 dark:border-purple-800 transition-all flex items-center gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </motion.div>

        {/* Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-200 dark:border-purple-800 flex flex-col"
          style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}
        >
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 justify-start"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {showSuggestions && messages.length <= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suggested Questions</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSend(suggestion.text)}
                        className="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            {suggestion.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about your expenses, budgets, investments, savings..."
                  className="w-full px-4 py-3 pr-12 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-800 dark:text-white placeholder-gray-400"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Powered</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Context-aware responses
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expenses</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Track & analyze spending
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budgets</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Smart budget insights
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Investments</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Portfolio analysis
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AIChatbotNew;
