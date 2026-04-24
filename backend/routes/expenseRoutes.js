const express=require('express');
const Expense=require('../models/expense');
const Budget=require('../models/budget');
const auth=require('../authMiddleare');
const { detectAnomaly } = require('../utils/expenseUtils');

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
      console.log(`[expenseRoutes] Calling Cohere v2/chat with model: ${model}`);
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
        console.log(`[expenseRoutes] Cohere ${model} success!`);
        return result;
      }
    } catch (error) {
      console.error(`[expenseRoutes] Cohere ${model} error:`, error.response?.status, error.response?.data?.message || error.message);
    }
  }
  
  return '';
};

const router=express.Router();

router.post('/',auth,async(req,res)=>{
    const{title,amount,category,date,budgetId,description,paymentMethod,merchant} =req.body;
    if(!title || !amount || !category || !date){
        return res.status(400).json({message:"Title, amount, category, and date are required"});
    }
    try {
        const userId = req.user.id || req.user._id;
        const expenseDate = new Date(date);
        const monthYear = `${expenseDate.toLocaleString('default', { month: 'long' })} ${expenseDate.getFullYear()}`;
        
        // Find or create matching budget
        let budget = null;
        if (budgetId) {
            budget = await Budget.findOne({ _id: budgetId, user: userId });
        } else {
            // Auto-find budget by category and month
            budget = await Budget.findOne({ 
                category: category,
                month: monthYear,
                user: userId 
            });
            
            // If no budget exists, create one automatically
            if (!budget) {
                budget = new Budget({
                    category: category,
                    amount: amount * 10, // Auto-create budget 10x the expense
                    spent: 0,
                    month: monthYear,
                    user: userId
                });
                await budget.save();
            }
        }

        if(!budget){
            return res.status(404).json({message:'Budget not found or access denied'});
        }

        // Get user expenses for anomaly detection
        const userExpenses = await Expense.find({ user: userId });
        
        // Create expense object
        const expenseData = {
            title,
            amount,
            category,
            date: expenseDate,
            Budget: budget._id,
            user: userId,
            description: description || title,
            paymentMethod: paymentMethod || 'Other',
            merchant: merchant || ''
        };

        // Detect anomalies using real data
        const anomalyCheck = detectAnomaly(expenseData, userExpenses);
        if (anomalyCheck.isAnomaly) {
            expenseData.isAnomaly = true;
            expenseData.anomalyReason = anomalyCheck.reasons.join('; ');
        }

        // Create expense
        const expense = new Expense(expenseData);
        await expense.save();

        // Recalculate budget spent from all expenses for accuracy
        const budgetMonth = budget.month; // e.g., "January 2026"
        const [monthName, year] = budgetMonth.split(' ');
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
        
        const allExpenses = await Expense.find({
          user: userId,
          category: category,
          date: { $gte: startDate, $lte: endDate }
        });
        
        budget.spent = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        await budget.save();

        res.status(201).json({
            expense,
            updatedBudget: budget,
            anomalyDetected: anomalyCheck.isAnomaly,
            anomalyReason: anomalyCheck.reasons.join('; '),
            message: 'Expense added and budget updated successfully'
        });

    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({message:"Error creating expense",error:error.message});
    }
})

// Get expenses with optional filters
router.get('/',auth,async(req,res)=>{
      try {
        const userId = req.user.id || req.user._id;
        const { category, month, year, limit } = req.query;
        
        let query = { user: userId };
        
        // Apply filters
        if (category && category !== 'all') {
          query.category = category;
        }
        
        // Filter by month and year (specific month)
        if (month && year) {
          const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
          query.date = { $gte: startDate, $lte: endDate };
        }
        // Filter by year only (entire year)
        else if (year && !month) {
          const startDate = new Date(parseInt(year), 0, 1);
          const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
          query.date = { $gte: startDate, $lte: endDate };
        }
        // No date filters = all time
        
        const expenses = await Expense.find(query)
          .sort({date:-1})
          .limit(limit ? parseInt(limit) : 10000); // Increased limit for all-time view
        
        res.json(expenses);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching expenses', error: error.message });
      }
})

// Get comprehensive AI-powered insights for reports
router.get('/insights/comprehensive', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year, viewMode } = req.query;
    
    // Get expenses based on view mode
    let expenses = [];
    let periodLabel = '';
    
    if (viewMode === 'month' && month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      expenses = await Expense.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      });
      periodLabel = `${new Date(2000, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`;
    } else if (viewMode === 'year' && year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      expenses = await Expense.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      });
      periodLabel = year;
    } else {
      expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(1000);
      periodLabel = 'All Time';
    }
    
    if (expenses.length === 0) {
      return res.json({
        insights: [],
        predictions: null,
        anomalies: [],
        recommendations: [],
        summary: 'No expenses found for this period.'
      });
    }
    
    // Calculate statistics
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const avgExpense = totalSpent / expenses.length;
    
    // Category analysis
    const categoryTotals = {};
    const categoryCounts = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const biggestExpense = expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max);
    
    // Detect anomalies (expenses significantly higher than average)
    const anomalies = expenses.filter(exp => exp.amount > avgExpense * 2.5).slice(0, 5);
    
    // Get previous period for comparison
    let previousExpenses = [];
    let comparisonLabel = '';
    if (viewMode === 'month' && month && year) {
      const prevMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
      const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);
      const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
      const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
      previousExpenses = await Expense.find({
        user: userId,
        date: { $gte: prevStartDate, $lte: prevEndDate }
      });
      comparisonLabel = `${new Date(2000, prevMonth - 1).toLocaleString('default', { month: 'long' })} ${prevYear}`;
    } else if (viewMode === 'year' && year) {
      const prevYear = parseInt(year) - 1;
      const prevStartDate = new Date(prevYear, 0, 1);
      const prevEndDate = new Date(prevYear, 11, 31, 23, 59, 59, 999);
      previousExpenses = await Expense.find({
        user: userId,
        date: { $gte: prevStartDate, $lte: prevEndDate }
      });
      comparisonLabel = prevYear.toString();
    }
    
    const prevTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
    const trend = prevTotal > 0 ? ((totalSpent - prevTotal) / prevTotal * 100).toFixed(1) : 0;
    
    // Predict next period spending
    let prediction = null;
    if (viewMode === 'month') {
      // Predict next month based on average
      const last3Months = [];
      for (let i = 1; i <= 3; i++) {
        const checkMonth = parseInt(month) - i;
        const checkYear = parseInt(year);
        let actualMonth = checkMonth;
        let actualYear = checkYear;
        if (checkMonth <= 0) {
          actualMonth = 12 + checkMonth;
          actualYear = checkYear - 1;
        }
        const monthStart = new Date(actualYear, actualMonth - 1, 1);
        const monthEnd = new Date(actualYear, actualMonth, 0, 23, 59, 59, 999);
        const monthExpenses = await Expense.find({
          user: userId,
          date: { $gte: monthStart, $lte: monthEnd }
        });
        last3Months.push(monthExpenses.reduce((sum, e) => sum + e.amount, 0));
      }
      const avgLast3Months = last3Months.reduce((sum, val) => sum + val, 0) / last3Months.length;
      prediction = {
        amount: Math.round(avgLast3Months),
        confidence: 'medium',
        period: 'Next Month'
      };
    }
    
    // Generate comprehensive AI analysis
    let aiInsights = [];
    let aiRecommendations = [];
    let aiSummary = '';
    
    try {
      const prompt = `Analyze this financial data and provide comprehensive insights:

Period: ${periodLabel}
Total Spent: ₹${totalSpent.toLocaleString()}
Number of Transactions: ${expenses.length}
Average Expense: ₹${avgExpense.toFixed(2)}
Top Category: ${topCategory ? topCategory[0] + ' (₹' + topCategory[1].toLocaleString() + ')' : 'N/A'}
Biggest Expense: ${biggestExpense.title} (₹${biggestExpense.amount.toLocaleString()})
${comparisonLabel ? `Previous Period (${comparisonLabel}): ₹${prevTotal.toLocaleString()}` : ''}
${comparisonLabel ? `Trend: ${trend > 0 ? '+' : ''}${trend}%` : ''}
Anomalies Detected: ${anomalies.length} (expenses > 2.5x average)

Provide:
1. 3-4 key insights about spending patterns
2. 3-4 actionable recommendations
3. A brief 2-3 sentence summary

Format as JSON:
{
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "summary": "brief summary"
}`;

      const aiResponse = await callOpenAI(prompt, 800);
      
      // Try to parse JSON response
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiInsights = parsed.insights || [];
          aiRecommendations = parsed.recommendations || [];
          aiSummary = parsed.summary || '';
        } else {
          // Fallback: parse text response
          const lines = aiResponse.split('\n').filter(l => l.trim());
          aiInsights = lines.filter(l => l.includes('insight') || l.includes('pattern') || l.includes('spending')).slice(0, 4);
          aiRecommendations = lines.filter(l => l.includes('recommend') || l.includes('suggest') || l.includes('consider')).slice(0, 4);
          aiSummary = lines.slice(0, 3).join(' ');
        }
      } catch (parseError) {
        // Use raw response as summary
        aiSummary = aiResponse.substring(0, 300);
        aiInsights = [
          `Total spending of ₹${totalSpent.toLocaleString()} across ${expenses.length} transactions`,
          `Average expense per transaction: ₹${avgExpense.toFixed(2)}`,
          topCategory ? `Top spending category: ${topCategory[0]}` : 'No category data available'
        ];
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      aiSummary = `You spent ₹${totalSpent.toLocaleString()} in ${periodLabel} across ${expenses.length} transactions. ${trend !== 0 ? `This is a ${trend > 0 ? trend + '% increase' : Math.abs(trend) + '% decrease'} compared to ${comparisonLabel || 'previous period'}.` : ''}`;
      aiInsights = [
        `Total spending: ₹${totalSpent.toLocaleString()}`,
        `Average per transaction: ₹${avgExpense.toFixed(2)}`,
        topCategory ? `Top category: ${topCategory[0]}` : 'No category data'
      ];
    }
    
    res.json({
      insights: aiInsights,
      recommendations: aiRecommendations,
      summary: aiSummary,
      predictions: prediction,
      anomalies: anomalies.map(a => ({
        title: a.title,
        amount: a.amount,
        date: a.date,
        category: a.category,
        reason: `This expense is ${(a.amount / avgExpense).toFixed(1)}x higher than your average`
      })),
      statistics: {
        totalSpent,
        transactionCount: expenses.length,
        avgExpense,
        topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null,
        biggestExpense: {
          title: biggestExpense.title,
          amount: biggestExpense.amount,
          date: biggestExpense.date
        },
        trend: parseFloat(trend),
        comparisonLabel
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive insights:', error);
    res.status(500).json({ message: 'Error fetching insights', error: error.message });
  }
});

// Get monthly spending insights (calculated from real data)
router.get('/insights/monthly', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    // Get current month expenses
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    const currentMonthExpenses = await Expense.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get previous month expenses for comparison
    const prevStartDate = new Date(targetYear, targetMonth - 1, 1);
    const prevEndDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    
    const prevMonthExpenses = await Expense.find({
      user: userId,
      date: { $gte: prevStartDate, $lte: prevEndDate }
    });
    
    // Calculate statistics from real data
    const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Category breakdown
    const categoryTotals = {};
    currentMonthExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Biggest expense
    const biggestExpense = currentMonthExpenses.length > 0
      ? currentMonthExpenses.reduce((max, exp) => exp.amount > max.amount ? exp : max)
      : null;
    
    // Calculate trend
    const trend = prevTotal > 0 
      ? ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1)
      : 0;
    
    // Generate AI summary of the data
    let aiSummary = '';
    try {
      const prompt = `Summarize these monthly spending statistics in 2-3 sentences:

Current Month Total: ₹${currentTotal}
Previous Month Total: ₹${prevTotal}
Trend: ${trend > 0 ? '+' : ''}${trend}%
Top Category: ${topCategory ? topCategory[0] + ' (₹' + topCategory[1] + ')' : 'N/A'}
Biggest Expense: ${biggestExpense ? biggestExpense.title + ' (₹' + biggestExpense.amount + ')' : 'N/A'}

Provide a friendly, actionable summary.`;

      aiSummary = await callOpenAI(prompt, 150);
    } catch (aiError) {
      aiSummary = `You spent ₹${currentTotal} this month. ${trend > 0 ? 'That\'s an increase' : 'That\'s a decrease'} of ${Math.abs(trend)}% compared to last month.`;
    }
    
    res.json({
      currentMonth: {
        total: currentTotal,
        count: currentMonthExpenses.length,
        topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null,
        biggestExpense: biggestExpense ? {
          title: biggestExpense.title,
          amount: biggestExpense.amount,
          date: biggestExpense.date
        } : null
      },
      previousMonth: {
        total: prevTotal,
        count: prevMonthExpenses.length
      },
      trend: parseFloat(trend),
      categoryBreakdown: categoryTotals,
      aiSummary: aiSummary
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ message: 'Error fetching insights', error: error.message });
  }
});

// Helper function to recalculate budget spent from expenses
const recalculateBudgetFromExpenses = async (budget, userId) => {
  try {
    const budgetMonth = budget.month; // e.g., "January 2026"
    const [monthName, year] = budgetMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    
    const allExpenses = await Expense.find({
      user: userId,
      category: budget.category,
      date: { $gte: startDate, $lte: endDate }
    });
    
    budget.spent = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    await budget.save();
    return budget;
  } catch (error) {
    console.error('Error recalculating budget:', error);
    return budget;
  }
};

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { title, amount, category, date, description, paymentMethod, merchant } = req.body;
    
    const expense = await Expense.findOne({ _id: req.params.id, user: userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const oldBudget = await Budget.findById(expense.Budget);
    const oldCategory = expense.category;
    const oldDate = expense.date;
    
    // Update expense
    if (title) expense.title = title;
    if (amount !== undefined) expense.amount = amount;
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (description !== undefined) expense.description = description;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (merchant !== undefined) expense.merchant = merchant;
    
    // If category or date changed, find new budget
    const expenseDate = expense.date;
    const monthYear = `${expenseDate.toLocaleString('default', { month: 'long' })} ${expenseDate.getFullYear()}`;
    
    let budget = await Budget.findOne({
      category: expense.category,
      month: monthYear,
      user: userId
    });
    
    if (!budget) {
      budget = new Budget({
        category: expense.category,
        amount: expense.amount * 10,
        spent: 0,
        month: monthYear,
        user: userId
      });
      await budget.save();
    }
    
    expense.Budget = budget._id;
    await expense.save();
    
    // Recalculate both old and new budgets
    if (oldBudget) {
      await recalculateBudgetFromExpenses(oldBudget, userId);
    }
    await recalculateBudgetFromExpenses(budget, userId);
    
    res.json({ expense, updatedBudget: budget, message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Error updating expense', error: error.message });
  }
});

//delete expense and recalculate budget
router.delete('/:id',auth,async(req,res)=>{
    try {
        const userId = req.user.id || req.user._id;
        const expense = await Expense.findOne({ _id: req.params.id, user: userId });
        if(!expense) return res.status(404).json({message:'expense not found'});

        const budget = await Budget.findOne({ _id: expense.Budget, user: userId });
        
        // Delete expense
        await Expense.findByIdAndDelete(req.params.id);
        
        // Recalculate budget from all remaining expenses
        if(budget){
            await recalculateBudgetFromExpenses(budget, userId);
        }
        
        res.json({message:"Expense deleted",updatedBudget:budget});
    } catch (error) {
        res.status(500).json({ message: 'Error deleting expense', error: error.message });
    }
})

module.exports=router;
