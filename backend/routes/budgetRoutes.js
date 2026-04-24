const express = require('express');
const Budget = require('../models/budget');
const Expense = require('../models/expense');
const User = require('../models/user');
const auth = require('../authMiddleare');
const { calculateCategoryAverages } = require('../utils/expenseUtils');
const emailService = require('../utils/emailService');

// Import AI helper - uses Cohere v2/chat API
const callOpenAI = async (prompt, maxTokens = 500) => {
  const axios = require('axios');
  const apiKey = process.env.COHERE_API_KEY;
  
  if (!apiKey) {
    console.error('No Cohere API key found');
    return '';
  }
  
  const models = ['command-a-03-2025', 'command-r7b-12-2024'];
  
  for (const model of models) {
    try {
      console.log(`[budgetRoutes] Calling Cohere v2/chat with model: ${model}`);
      const response = await axios.post(
        'https://api.cohere.com/v2/chat',
        {
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful financial advisor AI assistant. Provide clear, actionable, and personalized financial advice.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );
      const result = response.data?.message?.content?.[0]?.text?.trim() || '';
      if (result) {
        console.log(`[budgetRoutes] Cohere ${model} success!`);
        return result;
      }
    } catch (error) {
      console.error(`[budgetRoutes] Cohere ${model} error:`, error.response?.status, error.response?.data?.message || error.message);
    }
  }
  
  return '';
};

const router = express.Router();

// 🔹 Dashboard Summary
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const budgets = await Budget.find({ user: userId });

    const income = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const expenses = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const balance = income - expenses;

    const chartMap = {};
    budgets.forEach(b => {
      if (b.month) {
        chartMap[b.month] = (chartMap[b.month] || 0) + ((b.amount || 0) - (b.spent || 0));
      }
    });

    const chart = Object.entries(chartMap)
      .sort((a, b) => new Date(`1 ${a[0]} 2000`) - new Date(`1 ${b[0]} 2000`))
      .map(([month, value]) => ({ month, value }));

    const recent = await Budget.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('month category spent');

    res.json({
      balance,
      income,
      expenses,
      chart,
      recent: recent.map(r => ({
        date: r.month,
        category: r.category,
        amount: r.spent
      }))
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper function to recalculate spent amount from actual expenses
const recalculateBudgetSpent = async (budget) => {
  try {
    const userId = budget.user;
    const budgetMonth = budget.month; // e.g., "January 2026"
    
    // Parse month and year from budget.month
    const [monthName, year] = budgetMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    
    // Calculate total spent from actual expenses for this category and month
    const expenses = await Expense.find({
      user: userId,
      category: budget.category,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    // Update budget spent amount
    budget.spent = totalSpent;
    await budget.save();
    
    return totalSpent;
  } catch (error) {
    console.error('Error recalculating budget spent:', error);
    return budget.spent || 0;
  }
};

// 🔹 Get Budgets (Paginated) - with automatic recalculation
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 100, recalculate = 'true' } = req.query;
  const skip = (page - 1) * limit;

  try {
    const userId = req.user.id || req.user._id;
    let budgets = await Budget.find({ user: userId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ month: -1, category: 1 });
    
    // Recalculate spent amounts from actual expenses for accuracy
    if (recalculate === 'true') {
      await Promise.all(budgets.map(budget => recalculateBudgetSpent(budget)));
      // Refetch to get updated values
      budgets = await Budget.find({ user: userId })
        .skip(skip)
        .limit(Number(limit))
        .sort({ month: -1, category: 1 });
    }
    
    const total = await Budget.countDocuments({ user: userId });

    res.json({ budgets, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching budgets', error: err.message });
  }
});

// 🔹 Filter Budgets
router.get('/search/filters', auth, async (req, res) => {
  const { category, month } = req.query;
  const userId = req.user.id || req.user._id;
  const filter = { user: userId };
  if (category) filter.category = category;
  if (month) filter.month = month;

  try {
    const filtered = await Budget.find(filter);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Error applying filters', error: err.message });
  }
});

// 🔹 Single Budget
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const budget = await Budget.findOne({ _id: req.params.id, user: userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching budget', error: err.message });
  }
});

// 🔹 AI Budget Suggestions (Based on Real Data)
router.get('/suggestions/ai', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year } = req.query;
    
    // Get last 3-6 months of expenses
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const sixMonthsAgo = new Date(targetYear, targetMonth - 6, 1);
    
    const expenses = await Expense.find({
      user: userId,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: -1 });
    
    if (expenses.length === 0) {
      return res.json({
        suggestions: [],
        message: 'Not enough expense data. Add expenses to get AI budget suggestions.'
      });
    }
    
    // Calculate category averages from real data
    const categoryAverages = calculateCategoryAverages(expenses);
    
    // Group by month to get monthly averages
    const monthlyCategorySpending = {};
    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      const monthKey = `${expDate.getFullYear()}-${expDate.getMonth()}`;
      
      if (!monthlyCategorySpending[monthKey]) {
        monthlyCategorySpending[monthKey] = {};
      }
      
      if (!monthlyCategorySpending[monthKey][exp.category]) {
        monthlyCategorySpending[monthKey][exp.category] = { total: 0, count: 0 };
      }
      
      monthlyCategorySpending[monthKey][exp.category].total += exp.amount;
      monthlyCategorySpending[monthKey][exp.category].count += 1;
    });
    
    // Calculate average monthly spending per category
    const categoryMonthlyAverages = {};
    Object.keys(monthlyCategorySpending).forEach(monthKey => {
      Object.keys(monthlyCategorySpending[monthKey]).forEach(category => {
        if (!categoryMonthlyAverages[category]) {
          categoryMonthlyAverages[category] = [];
        }
        const avg = monthlyCategorySpending[monthKey][category].total / monthlyCategorySpending[monthKey][category].count;
        categoryMonthlyAverages[category].push(avg);
      });
    });
    
    // Generate suggestions based on real averages
    const suggestions = [];
    Object.keys(categoryMonthlyAverages).forEach(category => {
      const monthlyAvgs = categoryMonthlyAverages[category];
      const avgMonthly = monthlyAvgs.reduce((sum, val) => sum + val, 0) / monthlyAvgs.length;
      
      // Suggest budget = average + 10% buffer
      const suggestedBudget = Math.ceil(avgMonthly * 1.1);
      
      suggestions.push({
        category,
        averageSpending: Math.round(avgMonthly),
        suggestedBudget,
        monthsAnalyzed: monthlyAvgs.length,
        reasoning: `Based on your past ${monthlyAvgs.length} months, you usually spend ₹${Math.round(avgMonthly)} on ${category}. Suggested budget: ₹${suggestedBudget} (includes 10% buffer).`
      });
    });
    
    // Generate AI explanation
    let aiExplanation = '';
    if (suggestions.length > 0) {
      try {
        const prompt = `Based on these budget suggestions calculated from real spending data, provide a brief, friendly explanation (2-3 sentences):

${suggestions.slice(0, 5).map(s => 
  `${s.category}: Average ₹${s.averageSpending}/month, Suggested ₹${s.suggestedBudget}`
).join('\n')}

Provide a helpful explanation that helps the user understand why these budgets make sense.`;

        aiExplanation = await callOpenAI(prompt, 200);
      } catch (aiError) {
        aiExplanation = 'These suggestions are based on your actual spending patterns over the past few months.';
      }
    }
    
    res.json({
      suggestions: suggestions.sort((a, b) => b.suggestedBudget - a.suggestedBudget),
      explanation: aiExplanation,
      dataSource: 'Last 3-6 months of actual expenses'
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ message: 'Error generating suggestions', error: error.message });
  }
});

// 🔹 Real-time Budget Tracking with Alerts
router.get('/tracking/status', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? month : currentDate.toLocaleString('default', { month: 'long' });
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const monthYear = `${targetMonth} ${targetYear}`;
    
    const budgets = await Budget.find({
      user: userId,
      month: monthYear
    });
    
    const alerts = [];
    const categoryStatus = [];
    
    budgets.forEach(budget => {
      const percentage = (budget.spent / budget.amount) * 100;
      let status = 'On Track';
      
      if (percentage >= 100) {
        status = 'Over Budget';
        alerts.push({
          type: 'exceeded',
          category: budget.category,
          message: `You've exceeded your ${budget.category} budget by ₹${(budget.spent - budget.amount).toFixed(2)}`
        });
      } else if (percentage >= 80) {
        status = 'Near Limit';
        alerts.push({
          type: 'warning',
          category: budget.category,
          message: `You've spent ${percentage.toFixed(1)}% of your ${budget.category} budget. Consider reducing expenses.`
        });
      }
      
      categoryStatus.push({
        category: budget.category,
        budget: budget.amount,
        spent: budget.spent,
        remaining: budget.amount - budget.spent,
        percentage: percentage.toFixed(1),
        status
      });
    });
    
    // Generate AI alerts
    let aiAlerts = [];
    if (alerts.length > 0) {
      try {
        const prompt = `Generate friendly, actionable budget alerts based on these situations:

${alerts.map(a => `${a.category}: ${a.message}`).join('\n')}

Provide 2-3 concise, helpful alerts that suggest what the user can do.`;

        const aiText = await callOpenAI(prompt, 200);
        aiAlerts = aiText.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
      } catch (aiError) {
        // Fallback to simple alerts
        aiAlerts = alerts.map(a => a.message);
      }
    }
    
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    res.json({
      month: monthYear,
      totalBudget,
      totalSpent,
      totalRemaining,
      categoryStatus,
      alerts,
      aiAlerts
    });
  } catch (error) {
    console.error('Error fetching budget status:', error);
    res.status(500).json({ message: 'Error fetching budget status', error: error.message });
  }
});

// 🔹 Create Budget
router.post('/', auth, async (req, res) => {
  const { category, amount, spent, month } = req.body;
  if (!category || amount == null || spent == null || !month) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userId = req.user.id || req.user._id;
    const newBudget = new Budget({ category, amount, spent, month, user: userId });
    await newBudget.save();
    res.status(201).json(newBudget);
  } catch (err) {
    res.status(400).json({ message: 'Error creating budget', error: err.message });
  }
});

// 🔹 Update Budget
router.put('/:id', auth, async (req, res) => {
  const { category, amount, spent, month } = req.body;

  try {
    const userId = req.user.id || req.user._id;
    const updated = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { category, amount, spent, month },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Budget not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Error updating budget', error: err.message });
  }
});

// 🔹 Delete Budget
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!deleted) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting budget', error: err.message });
  }
});

// 🔹 Check Budget Insights and Send Email if Needed
router.post('/check-insights', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { sendEmail = false } = req.body;
    
    // Get current month budgets
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    const monthYear = `${currentMonth} ${currentYear}`;
    
    const budgets = await Budget.find({ 
      user: userId,
      month: { $regex: monthYear, $options: 'i' }
    });
    
    if (budgets.length === 0) {
      return res.json({ 
        hasInsights: false, 
        message: 'No budgets found for current month' 
      });
    }
    
    // Calculate totals
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const totalRemaining = totalBudget - totalSpent;
    
    // Find budgets that need attention
    const overBudget = budgets.filter(b => b.spent > b.amount);
    const nearLimit = budgets.filter(b => {
      const pct = (b.spent / b.amount) * 100;
      return pct >= 80 && pct < 100;
    });
    
    // Generate insights
    const insights = {
      title: overBudget.length > 0 
        ? 'Budget Exceeded Alert' 
        : nearLimit.length > 0 
        ? 'Budget Warning' 
        : 'Budget Update',
      message: overBudget.length > 0
        ? `You've exceeded your budget in ${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'}. Review your spending to get back on track.`
        : nearLimit.length > 0
        ? `You're approaching your budget limit in ${nearLimit.length} categor${nearLimit.length === 1 ? 'y' : 'ies'}. Watch your spending to stay within budget.`
        : `Your budget is on track! You have ₹${totalRemaining.toLocaleString()} remaining this month.`,
      budgets: [...overBudget, ...nearLimit].slice(0, 5),
      totalBudget,
      totalSpent,
      totalRemaining,
      actionItems: []
    };
    
    // Generate action items
    if (overBudget.length > 0) {
      insights.actionItems.push(
        `Review spending in ${overBudget.map(b => b.category).join(', ')}`,
        'Consider adjusting your budget for next month',
        'Look for ways to reduce expenses in over-budget categories'
      );
    } else if (nearLimit.length > 0) {
      insights.actionItems.push(
        `Monitor spending in ${nearLimit.map(b => b.category).join(', ')}`,
        'Consider reducing non-essential expenses',
        'Track daily spending to stay within limits'
      );
    } else {
      insights.actionItems.push(
        'Great job staying within budget!',
        'Consider saving the remaining amount',
        'Review your spending patterns for next month'
      );
    }
    
    // Send email if requested and insights exist
    if (sendEmail && (overBudget.length > 0 || nearLimit.length > 0 || totalSpent > 0)) {
      try {
        const user = await User.findById(userId);
        if (user && user.email) {
          await emailService.sendBudgetInsight({
            to: user.email,
            userName: user.name || 'User',
            budgetInsights: insights
          });
        }
      } catch (emailError) {
        console.error('Error sending budget insight email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({
      hasInsights: overBudget.length > 0 || nearLimit.length > 0,
      insights,
      emailSent: sendEmail && (overBudget.length > 0 || nearLimit.length > 0 || totalSpent > 0)
    });
  } catch (err) {
    console.error('Error checking budget insights:', err);
    res.status(500).json({ message: 'Error checking budget insights', error: err.message });
  }
});

module.exports = router;
