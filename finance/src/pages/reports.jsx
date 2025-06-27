import React, { useState, useEffect } from 'react';
import { Wallet, TrendingDown } from 'lucide-react';
import Navbar from '../components/navbar';
import SpendingData from '../components/spendingData';
import MonthlySpending from '@/components/monthlySpending';
import OverBudget from '@/components/overBudget';
import AiTrendsAnalysis from '@/components/AiTrendsAnalysis';

const Reports = () => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
/*
  useEffect(() => {
    // Retrieve token from localStorage or wherever you store it
    const token = localStorage.getItem('authToken');
  
    fetch("http://localhost:5000/api/budget/dashboard/summary", {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Add token to headers
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch((err) => {
        console.error("Error fetching dashboard data:", err);
        setError(`Failed to load data: ${err.message}`);
      });
  }, []);
  */
    useEffect(() => {
      const token = localStorage.getItem("token"); // Get the token from localStorage
    
      if (token) {
        fetch("http://localhost:5000/api/budget/dashboard/summary", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Add the token to the request header
          },
        })
          .then((res) => res.json())
          .then((data) => setSummary(data))
          .catch((err) => console.error("Error fetching dashboard data:", err));
      } else {
        console.error("No token found.");
      }
    }, []);
    
  
  if (error) {
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
        Error: {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
        Loading report...
      </div>
    );
  }

  const { income, expenses, balance, chart, recent } = summary;
  const totalBudget = income || 0;
  const totalSpent = expenses || 0;
  const totalSaved = balance || 0;
  const savingsPercentage = totalBudget !== 0 ? ((totalSaved / totalBudget) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-md rounded-b-3xl py-10 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex justify-center items-center gap-3">
            <span className="text-5xl">📈</span> Monthly Financial Report
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400 text-base">
            Insightful analysis of your savings, spending, and monthly financial health.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* Total Saved Highlight */}
        <section className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 p-6 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-green-700 dark:text-green-300 font-medium">Total Saved</h3>
              <p className="text-3xl font-semibold text-green-800 dark:text-green-200 mt-2">
                ₹{totalSaved ? totalSaved.toLocaleString() : "0"}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">{savingsPercentage}% of your budget</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              <TrendingDown className="text-green-700 dark:text-green-300" />
            </div>
          </div>
        </section>

        {/* Spending Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SpendingData spendingData={recent} />
          <MonthlySpending monthlyData={chart.map(item => ({ month: item.month, spent: item.value }))} />
          <OverBudget data={recent} />
          <AiTrendsAnalysis budgetData={recent} monthlyData={chart} />
        </div>

        {/* Financial Summary */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
            <Wallet className="text-indigo-600 dark:text-indigo-400" /> Financial Summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-indigo-50 dark:bg-gray-700 p-4 rounded-xl text-center shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Budget</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-2">
                ₹{totalBudget ? totalBudget.toLocaleString() : "0"}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-gray-700 p-4 rounded-xl text-center shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Spent</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-2">
                ₹{totalSpent ? totalSpent.toLocaleString() : "0"}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-xl text-center shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Monthly Spending</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                ₹{chart && chart.length > 0
                  ? Math.round(chart.reduce((acc, curr) => acc + curr.value, 0) / chart.length).toLocaleString()
                  : "0"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Based on {chart.length} months</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Reports;
