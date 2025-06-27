
import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, PieChart, Target, Calendar, Trash2 } from 'lucide-react';

import StockSuggestions from './stockSuggestion';
import Navbar from '@/components/navbar';

const Index = () => {
  const [investments, setInvestments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState('stock');
  const [mfSuggestions, setMfSuggestions] = useState([]);

  const apiKey='872XM08JT8P7M8S1'
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    investedAmount: '',
    quantity: '',
    purchasePrice: '',
    interestRate: '',
    maturityDate: '',
    sipAmount: '',
    sipFrequency: 'monthly'
  });

  useEffect(() => {
    const saved = localStorage.getItem('investments');
    if (saved) {
      setInvestments(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('investments', JSON.stringify(investments));
  }, [investments]);

  
  const getStockPrice = async (symbol) => {
    if (!apiKey) {
     console.log("Api Key is Missing")
      return null;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      const data = await response.json();
      
      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        return parseFloat(data['Global Quote']['05. price']);
      } else if (data['Error Message']) {
        console.error('API Error:', data['Error Message']);
        return null;
      } else {
        console.error('Unexpected API response:', data);
        return null;
      }
    } catch (error) {
      console.error('Error fetching stock price:', error);
      return null;
    }
  };

  // Get mutual fund NAV from MFApi (Indian mutual funds)
  const getMutualFundPrice = async (symbol) => {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/search?q=${symbol}`);
    const searchData = await response.json();

    if (searchData && searchData.length > 0) {
      const match = searchData.find(item => item.schemeName.toLowerCase() === symbol.toLowerCase());
      const fundCode = match?.schemeCode || searchData[0]?.schemeCode;

      if (!fundCode) return null;

      const navResponse = await fetch(`https://api.mfapi.in/mf/${fundCode}`);
      const navData = await navResponse.json();

      if (navData && navData.data && navData.data.length > 0) {
        return parseFloat(navData.data[0].nav);
      }
    }

    console.log(`Mutual Fund Error: Could not find NAV for "${symbol}"`);
    return null;
  } catch (error) {
    console.error('Error fetching mutual fund NAV:', error);
    return null;
  }
};


  // Update current prices for stocks and mutual funds
  useEffect(() => {
    const updatePrices = async () => {
      if (!apiKey && investments.some(inv => inv.type === 'stock')) {
        return;
      }

      const updatedInvestments = await Promise.all(
        investments.map(async (investment) => {
          if (investment.type === 'stock' && investment.symbol) {
            const currentPrice = await getStockPrice(investment.symbol);
            return currentPrice !== null ? { ...investment, currentPrice } : investment;
          } else if (investment.type === 'mutual_fund' && investment.symbol) {
            const currentPrice = await getMutualFundPrice(investment.symbol);
            return currentPrice !== null ? { ...investment, currentPrice } : investment;
          }
          return investment;
        })
      );
      
      if (JSON.stringify(updatedInvestments) !== JSON.stringify(investments)) {
        setInvestments(updatedInvestments);
      }
    };

    if (investments.length > 0) {
      updatePrices();
      const interval = setInterval(updatePrices, 300000); // Update every 5 minutes to avoid API limits
      return () => clearInterval(interval);
    }
  }, [investments.length, apiKey]);

  const handleStockSelect = (symbol, name) => {
    setFormData({ ...formData, symbol, name });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
   

    const newInvestment = {
      id: Date.now().toString(),
      type: selectedType,
      name: formData.name,
      symbol: formData.symbol || undefined,
      investedAmount: parseFloat(formData.investedAmount),
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
      maturityDate: formData.maturityDate || undefined,
      sipAmount: formData.sipAmount ? parseFloat(formData.sipAmount) : undefined,
      sipFrequency: formData.sipFrequency,
      dateAdded: new Date().toISOString().split('T')[0],
      currentPrice: undefined
    };

    // Get current price for stocks and mutual funds
    if (selectedType === 'stock' && formData.symbol) {
      const currentPrice = await getStockPrice(formData.symbol);
      if (currentPrice !== null) {
        newInvestment.currentPrice = currentPrice;
      }
    } else if (selectedType === 'mutual_fund' && formData.symbol) {
      const currentPrice = await getMutualFundPrice(formData.symbol);
      if (currentPrice !== null) {
        newInvestment.currentPrice = currentPrice;
      }
    }

    setInvestments([...investments, newInvestment]);
    setFormData({
      name: '',
      symbol: '',
      investedAmount: '',
      quantity: '',
      purchasePrice: '',
      interestRate: '',
      maturityDate: '',
      sipAmount: '',
      sipFrequency: 'monthly'
    });
    setShowAddForm(false);
    
  /*  toast({
      title: "Investment Added",
      description: `Successfully added ${newInvestment.name} to your portfolio.`,
    });*/
    
  };

  const calculateProfit = (investment) => {
    switch (investment.type) {
      case 'stock':
      case 'mutual_fund':
        if (investment.currentPrice && investment.quantity && investment.purchasePrice) {
          const currentValue = investment.currentPrice * investment.quantity;
          const investedValue = investment.purchasePrice * investment.quantity;
          return currentValue - investedValue;
        }
        return 0;
      case 'fd':
        if (investment.interestRate && investment.maturityDate) {
          const maturityDate = new Date(investment.maturityDate);
          const investmentDate = new Date(investment.dateAdded);
          const years = (maturityDate.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          const maturityAmount = investment.investedAmount * Math.pow(1 + investment.interestRate / 100, years);
          return maturityAmount - investment.investedAmount;
        }
        return 0;
      case 'sip':
        const monthsInvested = Math.floor((new Date().getTime() - new Date(investment.dateAdded).getTime()) / (1000 * 60 * 60 * 24 * 30));
        const totalInvested = (investment.sipAmount || 0) * monthsInvested;
        const estimatedReturns = totalInvested * 0.12;
        return estimatedReturns;
      default:
        return 0;
    }
  };

  const calculateProfitPercentage = (investment) => {
    const profit = calculateProfit(investment);
    if (investment.investedAmount === 0) return 0;
    return (profit / investment.investedAmount) * 100;
  };

  const getTotalPortfolioValue = () => {
    return investments.reduce((total, investment) => {
      const profit = calculateProfit(investment);
      return total + investment.investedAmount + profit;
    }, 0);
  };

  const getTotalInvested = () => {
    return investments.reduce((total, investment) => total + investment.investedAmount, 0);
  };

  const getTotalProfit = () => {
    return investments.reduce((total, investment) => total + calculateProfit(investment), 0);
  };

  const deleteInvestment = (id) => {
    setInvestments(investments.filter(inv => inv.id !== id));
  
    /*toast({
      title: "Investment Deleted",
      description: "Investment has been removed from your portfolio.",
    });*/
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'stock': return <TrendingUp className="w-5 h-5" />;
      case 'mutual_fund': return <PieChart className="w-5 h-5" />;
      case 'sip': return <Target className="w-5 h-5" />;
      case 'fd': return <DollarSign className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
         <Navbar/>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Investment Tracker</h1>
          <p className="text-gray-600">Track your stocks, mutual funds, SIPs, and fixed deposits with real-time data</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Portfolio</p>
                <p className="text-2xl font-bold text-gray-800">₹{getTotalPortfolioValue().toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Invested</p>
                <p className="text-2xl font-bold text-gray-800">₹{getTotalInvested().toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Profit/Loss</p>
                <p className={`text-2xl font-bold ${getTotalProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{getTotalProfit().toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-full ${getTotalProfit() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {getTotalProfit() >= 0 ? 
                  <TrendingUp className="w-6 h-6 text-green-600" /> : 
                  <TrendingDown className="w-6 h-6 text-red-600" />
                }
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Investments</p>
                <p className="text-2xl font-bold text-gray-800">{investments.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Investment Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add New Investment
          </button>
        </div>

        {/* Add Investment Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-2xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Investment</h2>
            
            {/* Investment Type Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-3">Investment Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { type: 'stock', label: 'Stocks', icon: <TrendingUp className="w-5 h-5" /> },
                  { type: 'mutual_fund', label: 'Mutual Funds', icon: <PieChart className="w-5 h-5" /> },
                  { type: 'sip', label: 'SIP', icon: <Target className="w-5 h-5" /> },
                  { type: 'fd', label: 'Fixed Deposit', icon: <DollarSign className="w-5 h-5" /> }
                ].map(({ type, label, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2  cursor-pointer${
                      selectedType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {icon}
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Investment Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Apple Inc., HDFC Equity Fund"
                  />
                </div>

                {selectedType === 'stock' && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Stock Symbol</label>
                    <StockSuggestions
                      value={formData.symbol}
                      onChange={(value) => setFormData({ ...formData, symbol: value })}
                      onSelect={handleStockSelect}
                      apiKey={apiKey}
                    />
                  </div>
                )}

                {selectedType === 'mutual_fund' && (
  <div className="relative">
    <label className="block text-gray-700 font-semibold mb-2">Mutual Fund Name</label>
    <input
      type="text"
      value={formData.symbol}
      onChange={async (e) => {
        const input = e.target.value;
        setFormData({ ...formData, symbol: input });

        if (input.length >= 3) {
          const response = await fetch(`https://api.mfapi.in/mf/search?q=${input}`);
          const data = await response.json();
          setMfSuggestions(data.slice(0, 5)); // Limit to 5 suggestions
        } else {
          setMfSuggestions([]);
        }
      }}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="e.g., HDFC Equity Fund"
    />

    {mfSuggestions.length > 0 && (
      <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {mfSuggestions.map((item) => (
          <li
            key={item.schemeCode}
            onClick={() => {
              setFormData({ ...formData, symbol: item.schemeName });
              setMfSuggestions([]);
            }}
            className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
          >
            {item.schemeName}
          </li>
        ))}
      </ul>
    )}
  </div>
)}

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    {selectedType === 'sip' ? 'Monthly SIP Amount' : 'Invested Amount'}
                  </label>
                  <input
                    type="number"
                    required
                    value={selectedType === 'sip' ? formData.sipAmount : formData.investedAmount}
                    onChange={(e) => setFormData({
                      ...formData,
                      [selectedType === 'sip' ? 'sipAmount' : 'investedAmount']: e.target.value
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {selectedType === 'sip' && (
                  <>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Total Invested Till Date</label>
                      <input
                        type="number"
                        required
                        value={formData.investedAmount}
                        onChange={(e) => setFormData({ ...formData, investedAmount: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">SIP Frequency</label>
                      <select
                        value={formData.sipFrequency}
                        onChange={(e) => setFormData({ ...formData, sipFrequency: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                  </>
                )}

                {(selectedType === 'stock' || selectedType === 'mutual_fund') && (
                  <>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Purchase Price</label>
                      <input
                        type="number"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                {selectedType === 'fd' && (
                  <>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.interestRate}
                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Maturity Date</label>
                      <input
                        type="date"
                        value={formData.maturityDate}
                        onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Add Investment
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200 cursor-"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Investments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investments.map((investment) => {
            const profit = calculateProfit(investment);
            const profitPercentage = calculateProfitPercentage(investment);
            const isProfit = profit >= 0;

            return (
              <div key={investment.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      investment.type === 'stock' ? 'bg-blue-100 text-blue-600' :
                      investment.type === 'mutual_fund' ? 'bg-purple-100 text-purple-600' :
                      investment.type === 'sip' ? 'bg-green-100 text-green-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {getTypeIcon(investment.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{investment.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{investment.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteInvestment(investment.id)}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {investment.symbol && (
                  <div className="mb-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                      {investment.symbol}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invested:</span>
                    <span className="font-semibold">₹{investment.investedAmount.toLocaleString()}</span>
                  </div>

                  {(investment.type === 'stock' || investment.type === 'mutual_fund') && investment.currentPrice && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Price:</span>
                        <span className="font-semibold">₹{investment.currentPrice.toFixed(2)}</span>
                      </div>
                      {investment.quantity && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Value:</span>
                          <span className="font-semibold">₹{(investment.currentPrice * investment.quantity).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}

                  {investment.type === 'sip' && investment.sipAmount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">SIP Amount:</span>
                      <span className="font-semibold">₹{investment.sipAmount.toLocaleString()}/{investment.sipFrequency}</span>
                    </div>
                  )}

                  {investment.type === 'fd' && investment.interestRate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span className="font-semibold">{investment.interestRate}%</span>
                      </div>
                      {investment.maturityDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Maturity:</span>
                          <span className="font-semibold">{new Date(investment.maturityDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Profit/Loss:</span>
                      <div className="text-right">
                        <div className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          {isProfit ? '+' : ''}₹{profit.toFixed(2)}
                        </div>
                        <div className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          ({isProfit ? '+' : ''}{profitPercentage.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 gap-1">
                    <Calendar className="w-3 h-3" />
                    Added: {new Date(investment.dateAdded).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {investments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <PieChart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No investments yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your investments by adding your first investment above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;