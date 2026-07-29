// Monthly and Yearly Wrapped Reports (Spotify Wrapped style)
const express = require('express');
const Expense = require('../models/expense');
const Budget = require('../models/budget');
const auth = require('../authMiddleare');

// Import AI helper
const { callOpenAI } = require('../utils/aiHelper');

const router = express.Router();

// Monthly Wrapped
router.get('/monthly', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    // Get expenses for the month
    const expenses = await Expense.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get budgets for the month
    const monthName = startDate.toLocaleString('default', { month: 'long' });
    const budgets = await Budget.find({
      user: userId,
      month: `${monthName} ${targetYear}`
    });
    
    // Calculate stats from real data
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const budgetEfficiency = totalBudget > 0 ? ((totalBudget - budgets.reduce((sum, b) => sum + b.spent, 0)) / totalBudget * 100).toFixed(1) : 0;
    
    // Top category
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Biggest expense
    const biggestExpense = expenses.length > 0
      ? expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max)
      : null;
    
    // Generate AI summary
    let aiSummary = '';
    try {
      const prompt = `Create a fun, Spotify Wrapped-style summary for this month's spending:

Total Spent: ₹${totalSpent}
Total Budget: ₹${totalBudget}
Budget Efficiency: ${budgetEfficiency}%
Top Category: ${topCategory ? topCategory[0] + ' (₹' + topCategory[1] + ')' : 'N/A'}
Biggest Expense: ${biggestExpense ? biggestExpense.title + ' (₹' + biggestExpense.amount + ')' : 'N/A'}
Total Transactions: ${expenses.length}

Make it engaging and celebratory, like Spotify Wrapped. 2-3 sentences.`;

      aiSummary = await callOpenAI(prompt, 200);
    } catch (aiError) {
      aiSummary = `You spent ₹${totalSpent} this month with ${budgetEfficiency}% budget efficiency!`;
    }
    
    res.json({
      month: monthName,
      year: targetYear,
      stats: {
        totalSpent,
        totalBudget,
        budgetEfficiency: parseFloat(budgetEfficiency),
        topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null,
        biggestExpense: biggestExpense ? {
          title: biggestExpense.title,
          amount: biggestExpense.amount,
          date: biggestExpense.date
        } : null,
        transactionCount: expenses.length
      },
      aiSummary
    });
  } catch (error) {
    console.error('Error generating monthly wrapped:', error);
    res.status(500).json({ message: 'Error generating monthly wrapped', error: error.message });
  }
});

// Yearly Wrapped
router.get('/yearly', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { year } = req.query;
    
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    
    // Get all expenses for the year
    const expenses = await Expense.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate monthly totals
    const monthlyTotals = {};
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleString('default', { month: 'long' });
      monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
    });
    
    // Top 3 categories
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount }));
    
    // Highest spending month
    const highestMonth = Object.entries(monthlyTotals)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Best saving month (lowest spending)
    const lowestMonth = Object.entries(monthlyTotals)
      .sort((a, b) => a[1] - b[1])[0];
    
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Generate AI summary
    let aiSummary = '';
    try {
      const prompt = `Create a fun, Spotify Wrapped-style yearly summary:

Total Spent: ₹${totalSpent}
Top 3 Categories: ${topCategories.map(c => `${c.category} (₹${c.amount})`).join(', ')}
Highest Spending Month: ${highestMonth ? highestMonth[0] + ' (₹' + highestMonth[1] + ')' : 'N/A'}
Best Saving Month: ${lowestMonth ? lowestMonth[0] + ' (₹' + lowestMonth[1] + ')' : 'N/A'}
Total Transactions: ${expenses.length}

Make it engaging and celebratory, like Spotify Wrapped. 3-4 sentences.`;

      aiSummary = await callOpenAI(prompt, 250);
    } catch (aiError) {
      aiSummary = `You spent ₹${totalSpent} this year! Your top category was ${topCategories[0]?.category || 'N/A'}.`;
    }
    
    res.json({
      year: targetYear,
      stats: {
        totalSpent,
        topCategories,
        highestSpendingMonth: highestMonth ? { month: highestMonth[0], amount: highestMonth[1] } : null,
        bestSavingMonth: lowestMonth ? { month: lowestMonth[0], amount: lowestMonth[1] } : null,
        transactionCount: expenses.length,
        monthlyBreakdown: monthlyTotals
      },
      aiSummary
    });
  } catch (error) {
    console.error('Error generating yearly wrapped:', error);
    res.status(500).json({ message: 'Error generating yearly wrapped', error: error.message });
  }
});

module.exports = router;
