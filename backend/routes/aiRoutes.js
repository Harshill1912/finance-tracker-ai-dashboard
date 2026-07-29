const express = require('express');
const axios = require('axios');
const Budget = require('../models/budget');
const Expense = require('../models/expense');
const Investment = require('../models/investment');
const auth = require('../authMiddleare');

const router = express.Router();

// Import centralized AI helper
const { callOpenAI } = require('../utils/aiHelper');

// AI Auto-Detect Expense Category, Merchant, and Payment Method from Description
router.post('/auto-detect-expense', auth, async (req, res) => {
  try {
    const { description, amount } = req.body;
    
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const userId = req.user.id || req.user._id;
    const { extractMerchant, detectPaymentMethod } = require('../utils/expenseUtils');
    
    // Get user's historical data for pattern matching
    const userExpenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(50);
    const userBudgets = await Budget.find({ user: userId });
    
    // Analyze patterns from real data
    const categoryPatterns = {};
    userExpenses.forEach(exp => {
      if (exp.category && exp.title) {
        const keywords = exp.title.toLowerCase().split(' ');
        keywords.forEach(keyword => {
          if (!categoryPatterns[keyword]) {
            categoryPatterns[keyword] = {};
          }
          categoryPatterns[keyword][exp.category] = (categoryPatterns[keyword][exp.category] || 0) + 1;
        });
      }
    });

    // Extract keywords from description
    const descKeywords = description.toLowerCase().split(/\s+/);
    const categoryScores = {};
    
    descKeywords.forEach(keyword => {
      if (categoryPatterns[keyword]) {
        Object.keys(categoryPatterns[keyword]).forEach(cat => {
          categoryScores[cat] = (categoryScores[cat] || 0) + categoryPatterns[keyword][cat];
        });
      }
    });

    const categories = [
      'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 
      'Bills & Utilities', 'Healthcare', 'Education', 'Travel', 
      'Personal Care', 'Groceries', 'Other'
    ];

    // Data-driven category prediction
    let predictedCategory = 'Other';
    let confidence = 0.5;
    
    if (Object.keys(categoryScores).length > 0) {
      const topCategory = Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])[0];
      predictedCategory = topCategory[0];
      confidence = Math.min(0.9, 0.5 + (topCategory[1] / 10));
    }

    // Use AI only for text classification (not numbers)
    try {
      const prompt = `Analyze this expense description and extract information. Return ONLY a JSON object with these fields:
{
  "category": "one category from: ${categories.join(', ')}",
  "merchant": "merchant name if mentioned, or empty string",
  "paymentMethod": "UPI, Card, Cash, Online, or Other"
}

Expense Description: "${description}"
Amount: ₹${amount || 'N/A'}

Return ONLY the JSON object, no other text.`;

      const aiResponse = await callOpenAI(prompt, 100);
      
      // Try to parse JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate category
        const matchedCategory = categories.find(c => 
          c.toLowerCase() === parsed.category?.toLowerCase() || 
          parsed.category?.toLowerCase().includes(c.toLowerCase())
        );
        
        if (matchedCategory) {
          predictedCategory = matchedCategory;
          confidence = 0.95;
        }
      }
    } catch (aiError) {
      console.log('AI detection fallback to pattern matching');
    }

    // Extract merchant and payment method using utility functions
    const merchant = extractMerchant(description);
    const paymentMethod = detectPaymentMethod(description);

    // Suggest budget based on category
    const categoryBudget = userBudgets.find(b => 
      b.category.toLowerCase() === predictedCategory.toLowerCase()
    );

    // Extract amount from description if not provided
    let detectedAmount = amount;
    if (!detectedAmount) {
      const amountMatch = description.match(/₹?\s*(\d+(?:\.\d{2})?)/);
      if (amountMatch) {
        detectedAmount = parseFloat(amountMatch[1]);
      }
    }

    res.json({
      category: predictedCategory,
      merchant: merchant || '',
      paymentMethod: paymentMethod,
      confidence: confidence,
      suggestedAmount: detectedAmount || null,
      suggestedBudget: categoryBudget ? {
        category: categoryBudget.category,
        budget: categoryBudget.amount,
        spent: categoryBudget.spent,
        remaining: categoryBudget.amount - categoryBudget.spent
      } : null,
      suggestions: categories.filter(c => c !== predictedCategory).slice(0, 3)
    });
  } catch (error) {
    console.error('Auto-detect error:', error);
    res.status(500).json({ message: 'Error auto-detecting expense', error: error.message });
  }
});

// AI Budget Recommendations - Analyze last 6 months with moving average + buffer
router.get('/budget-recommendations', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { month, year } = req.query;
    
    // Get all budgets and expenses
    const allBudgets = await Budget.find({ user: userId }).sort({ createdAt: -1 });
    const allExpenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(200);
    
    // If no expenses, use budget data to generate recommendations
    const hasExpenses = allExpenses.length > 0;

    // Group expenses by category and month (if expenses exist)
    const categoryMonthlySpending = {};
    const categoryCounts = {};
    
    if (hasExpenses) {
      allExpenses.forEach(exp => {
        if (exp.category && exp.date) {
          const expenseDate = new Date(exp.date);
          const monthKey = `${expenseDate.toLocaleString('default', { month: 'long' })} ${expenseDate.getFullYear()}`;
          
          if (!categoryMonthlySpending[exp.category]) {
            categoryMonthlySpending[exp.category] = {};
            categoryCounts[exp.category] = 0;
          }
          
          if (!categoryMonthlySpending[exp.category][monthKey]) {
            categoryMonthlySpending[exp.category][monthKey] = 0;
          }
          
          categoryMonthlySpending[exp.category][monthKey] += exp.amount;
          categoryCounts[exp.category] += 1;
        }
      });
    } else {
      // Use budget data if no expenses
      allBudgets.forEach(budget => {
        if (budget.category && budget.month) {
          if (!categoryMonthlySpending[budget.category]) {
            categoryMonthlySpending[budget.category] = {};
            categoryCounts[budget.category] = 0;
          }
          
          if (!categoryMonthlySpending[budget.category][budget.month]) {
            categoryMonthlySpending[budget.category][budget.month] = 0;
          }
          
          // Use spent amount as spending indicator
          categoryMonthlySpending[budget.category][budget.month] += budget.spent || 0;
          categoryCounts[budget.category] += 1;
        }
      });
    }

    // Calculate moving average for each category (last 6 months)
    const recommendations = [];
    const categories = Object.keys(categoryMonthlySpending);
    
    // If no data at all, provide default recommendations
    if (categories.length === 0) {
      const defaultCategories = [
        'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 
        'Bills & Utilities', 'Groceries', 'Personal Care'
      ];
      
      defaultCategories.forEach(category => {
        recommendations.push({
          category,
          averageMonthlySpending: 0,
          movingAverage: 0,
          recommendedAmount: 5000, // Default recommendation
          currentBudget: 0,
          currentSpent: 0,
          overspendingRisk: false,
          trend: 'stable',
          monthsAnalyzed: 0,
          reasoning: `Start tracking your ${category} expenses. We recommend setting an initial budget of ₹5,000.`
        });
      });
    } else {
      categories.forEach(category => {
        const monthlyData = categoryMonthlySpending[category];
        const months = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
        
        if (months.length === 0) return;
      
      // Calculate average spending per month
      const monthlyTotals = months.map(m => monthlyData[m]);
      const averageMonthly = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
      
      // Calculate moving average (weighted - recent months more important)
      let weightedSum = 0;
      let weightSum = 0;
      monthlyTotals.forEach((amount, index) => {
        const weight = index + 1; // More recent = higher weight
        weightedSum += amount * weight;
        weightSum += weight;
      });
      const movingAverage = weightedSum / weightSum;
      
      // Add 20% buffer for safety
      const recommendedAmount = Math.ceil(movingAverage * 1.2);
      
      // Detect overspending risk
      const recentMonths = monthlyTotals.slice(-3);
      const recentAverage = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;
      const overspendingRisk = recentAverage > movingAverage * 1.15;
      
      // Get current budget for this category
      const currentMonth = month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const currentBudget = allBudgets.find(b => 
        b.category === category && b.month === currentMonth
      );
      
        recommendations.push({
          category,
          averageMonthlySpending: Math.round(averageMonthly),
          movingAverage: Math.round(movingAverage),
          recommendedAmount,
          currentBudget: currentBudget?.amount || 0,
          currentSpent: currentBudget?.spent || 0,
          overspendingRisk,
          trend: recentAverage > movingAverage ? 'increasing' : recentAverage < movingAverage * 0.9 ? 'decreasing' : 'stable',
          monthsAnalyzed: months.length,
          reasoning: overspendingRisk 
            ? `Your recent spending (₹${Math.round(recentAverage)}) exceeds the moving average (₹${Math.round(movingAverage)}). Consider increasing budget to ₹${recommendedAmount} to avoid overspending.`
            : `Based on ${months.length} months of data, your average spending is ₹${Math.round(averageMonthly)}. Recommended budget: ₹${recommendedAmount} (includes 20% safety buffer).`
        });
      });
    }

    // Sort by recommended amount (highest first)
    recommendations.sort((a, b) => b.recommendedAmount - a.recommendedAmount);

    // Generate AI explanation
    let aiExplanation = '';
    try {
      const prompt = `Based on these budget recommendations, provide a brief, personalized explanation (2-3 sentences) in a friendly, helpful tone:

${recommendations.slice(0, 5).map(r => 
  `${r.category}: Current ₹${r.currentBudget}, Recommended ₹${r.recommendedAmount}, Average ₹${r.averageMonthlySpending}/month, ${r.overspendingRisk ? '⚠️ Overspending Risk' : '✅ On Track'}`
).join('\n')}

Provide a helpful explanation that helps the user understand their spending patterns and why these recommendations make sense.`;

      aiExplanation = await callOpenAI(prompt, 200);
    } catch (aiError) {
      console.error('AI explanation error:', aiError);
      aiExplanation = 'These recommendations are based on your last 6 months of spending patterns, using a moving average calculation with a 20% safety buffer.';
    }

    res.json({
      recommendations,
      explanation: aiExplanation,
      summary: {
        totalCategories: recommendations.length,
        overspendingRiskCount: recommendations.filter(r => r.overspendingRisk).length,
        averageRecommendedBudget: Math.round(recommendations.reduce((sum, r) => sum + r.recommendedAmount, 0) / recommendations.length)
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Error fetching recommendations', error: error.message });
  }
});

// Get AI-powered spending and saving tips
router.get('/tips', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    const budgets = await Budget.find({ user: userId });
    const expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(20);

    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const overBudgetCategories = budgets.filter(b => b.spent > b.amount);
    
    const categorySpending = {};
    expenses.forEach(exp => {
      if (exp.category) {
        categorySpending[exp.category] = (categorySpending[exp.category] || 0) + exp.amount;
      }
    });

    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => ({ category: cat, amount: amt }));

    const spendingContext = {
      totalBudget,
      totalSpent,
      savings: totalBudget - totalSpent,
      overBudgetCount: overBudgetCategories.length,
      topCategories: topCategories.map(c => `${c.category} (₹${c.amount})`).join(', '),
      overBudgetCategories: overBudgetCategories.map(b => `${b.category} (₹${b.spent - b.amount} over)`).join(', ')
    };

    // Generate fallback tips based on data (no AI needed)
    const fallbackTips = [];
    
    if (overBudgetCategories.length > 0) {
      fallbackTips.push({
        type: 'warning',
        title: 'Budget Alert',
        description: `You're over budget in ${overBudgetCategories.length} category${overBudgetCategories.length > 1 ? 'ies' : ''}. Review your spending in these areas to get back on track.`
      });
    }
    
    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      fallbackTips.push({
        type: 'info',
        title: 'Top Spending Category',
        description: `Your highest spending is in ${topCategory.category} (₹${topCategory.amount}). Consider setting a specific budget limit for this category.`
      });
    }
    
    if (spendingContext.savings < 0) {
      fallbackTips.push({
        type: 'warning',
        title: 'Overspending Detected',
        description: `You've spent ₹${Math.abs(spendingContext.savings)} more than your budget. Try to reduce expenses in the coming days.`
      });
    } else {
      fallbackTips.push({
        type: 'success',
        title: 'Great Job!',
        description: `You're within budget with ₹${spendingContext.savings} remaining. Keep up the good work!`
      });
    }

    // Try AI with timeout, but return fallback if it takes too long
    const aiPromise = (async () => {
      try {
        const prompt = `You are a financial advisor AI. Based on the following user spending data, provide personalized saving tips and spending recommendations:

User Financial Summary:
- Total Budget: ₹${spendingContext.totalBudget}
- Total Spent: ₹${spendingContext.totalSpent}
- Current Savings: ₹${spendingContext.savings}
- Categories Over Budget: ${spendingContext.overBudgetCount}
- Top Spending Categories: ${spendingContext.topCategories}
${spendingContext.overBudgetCategories ? `- Over Budget Items: ${spendingContext.overBudgetCategories}` : ''}

Provide:
1. 2-3 specific saving tips based on their top spending categories
2. Recommendations to reduce overspending in over-budget categories
3. General financial advice to improve their savings rate
4. Actionable steps they can take immediately

Format the response in a friendly, encouraging tone. Keep each tip concise (1-2 sentences). Return as a numbered list.`;

        const aiText = await callOpenAI(prompt, 400);
        const tips = aiText.split('\n').filter(line => line.trim().length > 0 && /^\d+\./.test(line.trim())).slice(0, 5).map((line, index) => {
          const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
          return {
            type: index === 0 ? 'success' : index === 1 ? 'warning' : 'info',
            title: cleanLine.split(':')[0] || `Tip ${index + 1}`,
            description: cleanLine.split(':').slice(1).join(':').trim() || cleanLine
          };
        });
        return tips.length > 0 ? tips : null;
      } catch (aiError) {
        console.error('AI tips error:', aiError);
        return null;
      }
    })();

    // Wait for AI with timeout (10 seconds max)
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 10000));
    const aiTips = await Promise.race([aiPromise, timeoutPromise]);

    // Use AI tips if available, otherwise use fallback
    const tips = aiTips && aiTips.length > 0 ? aiTips : fallbackTips;

    res.json({
      tips: tips.length > 0 ? tips : [
        {
          type: 'info',
          title: 'Financial Wellness',
          description: 'Keep tracking your expenses and stay within your budget to achieve your financial goals.'
        }
      ],
      summary: spendingContext
    });
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ message: 'Error fetching tips', error: error.message });
  }
});

// AI Expense Categorization
router.post('/categorize-expense', auth, async (req, res) => {
  try {
    const { description, amount } = req.body;
    
    if (!description) {
      return res.status(400).json({ message: 'Expense description is required' });
    }

    const categories = [
      'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 
      'Bills & Utilities', 'Healthcare', 'Education', 'Travel', 
      'Personal Care', 'Groceries', 'Other'
    ];

    try {
      const prompt = `Categorize this expense into one of these categories: ${categories.join(', ')}

Expense Description: "${description}"
Amount: ₹${amount || 'N/A'}

Respond with ONLY the category name from the list above.`;

      const aiCategory = await callOpenAI(prompt, 20);
      const cleanCategory = aiCategory.replace(/[^a-zA-Z\s&]/g, '').trim();
      const matchedCategory = categories.find(c => 
        c.toLowerCase() === cleanCategory.toLowerCase() || 
        cleanCategory.toLowerCase().includes(c.toLowerCase())
      );

      res.json({
        category: matchedCategory || 'Other',
        confidence: matchedCategory ? 0.9 : 0.6,
        suggestions: categories.slice(0, 3)
      });
    } catch (error) {
      console.error('AI categorization error:', error);
      // Fallback
      const desc = description.toLowerCase();
      if (desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) {
        return res.json({ category: 'Food & Dining', confidence: 0.7 });
      }
      if (desc.includes('uber') || desc.includes('taxi') || desc.includes('fuel') || desc.includes('petrol')) {
        return res.json({ category: 'Transportation', confidence: 0.7 });
      }
      if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('mart')) {
        return res.json({ category: 'Groceries', confidence: 0.7 });
      }
      res.json({ category: 'Other', confidence: 0.5, suggestions: categories.slice(0, 3) });
    }
  } catch (error) {
    console.error('Error categorizing expense:', error);
    res.status(500).json({ message: 'Error categorizing expense', error: error.message });
  }
});

// AI Spending Forecast
router.get('/spending-forecast', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const months = parseInt(req.query.months) || 3;
    
    const expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(100);
    
    if (expenses.length === 0) {
      return res.json({
        forecast: [],
        insight: 'Not enough data to generate forecast. Add more expenses to get predictions.',
        averageMonthlySpending: 0,
        trend: 'stable'
      });
    }

    const monthlySpending = {};
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      monthlySpending[month] = (monthlySpending[month] || 0) + exp.amount;
    });

    const monthlyValues = Object.values(monthlySpending);
    const averageMonthly = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
    
    let trend = 'stable';
    if (monthlyValues.length >= 2) {
      const recent = monthlyValues.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, monthlyValues.length);
      const older = monthlyValues.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, monthlyValues.length - 3);
      if (recent > older * 1.1) trend = 'increasing';
      else if (recent < older * 0.9) trend = 'decreasing';
    }

    const forecast = [];
    const currentDate = new Date();
    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(currentDate.getMonth() + i);
      const monthName = forecastDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      let predictedAmount = averageMonthly;
      if (trend === 'increasing') {
        predictedAmount = averageMonthly * (1 + (i * 0.05));
      } else if (trend === 'decreasing') {
        predictedAmount = averageMonthly * (1 - (i * 0.03));
      }
      
      forecast.push({
        month: monthName,
        predicted: Math.round(predictedAmount),
        confidence: Math.max(0.6, 1 - (i * 0.1))
      });
    }

    let insight = '';
    try {
      const prompt = `Based on this spending forecast, provide a brief insight (1-2 sentences):
Average Monthly Spending: ₹${Math.round(averageMonthly)}
Trend: ${trend}
Forecast for next ${months} months: ${forecast.map(f => `${f.month}: ₹${f.predicted}`).join(', ')}

Provide a helpful insight.`;

      insight = await callOpenAI(prompt, 100);
    } catch (aiError) {
      insight = `Based on your spending pattern, you're likely to spend around ₹${Math.round(averageMonthly)} per month.`;
    }

    res.json({
      forecast,
      insight: insight || `Based on your spending pattern, you're likely to spend around ₹${Math.round(averageMonthly)} per month.`,
      averageMonthlySpending: Math.round(averageMonthly),
      trend
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ message: 'Error fetching forecast', error: error.message });
  }
});

// AI Anomaly Detection
router.get('/anomalies', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    const expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(50);
    
    if (expenses.length === 0) {
      return res.json({ anomalies: [], duplicates: [], insight: 'No expenses to analyze yet.' });
    }

    const amounts = expenses.map(e => e.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + (2 * stdDev);

    const anomalies = expenses
      .filter(exp => exp.amount > threshold)
      .map(exp => ({
        id: exp._id,
        description: exp.title,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        reason: `Amount (₹${exp.amount}) is significantly higher than your average spending (₹${Math.round(mean)})`
      }));

    const duplicates = [];
    
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const exp1 = expenses[i];
        const exp2 = expenses[j];
        
        const sameDay = new Date(exp1.date).toDateString() === new Date(exp2.date).toDateString();
        const similarAmount = Math.abs(exp1.amount - exp2.amount) < 10;
        const similarCategory = exp1.category === exp2.category;
        
        if (sameDay && similarAmount && similarCategory) {
          duplicates.push({
            expense1: { id: exp1._id, description: exp1.title, amount: exp1.amount },
            expense2: { id: exp2._id, description: exp2.title, amount: exp2.amount },
            reason: 'Possible duplicate expenses detected'
          });
        }
      }
    }

    let aiInsight = '';
    if (anomalies.length > 0 || duplicates.length > 0) {
      try {
        const prompt = `Analyze these financial anomalies and provide a brief insight (1-2 sentences):
${anomalies.length > 0 ? `Unusual expenses: ${anomalies.map(a => `${a.description} - ₹${a.amount}`).join(', ')}` : ''}
${duplicates.length > 0 ? `Possible duplicates: ${duplicates.length} pairs found` : ''}

Provide a helpful insight.`;

        aiInsight = await callOpenAI(prompt, 100);
      } catch (aiError) {
        // Fallback
      }
    }

    res.json({
      anomalies,
      duplicates,
      insight: aiInsight || (anomalies.length > 0 || duplicates.length > 0 
        ? 'Review these items to ensure accuracy.' 
        : 'No anomalies detected. Your expenses look normal!')
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ message: 'Error detecting anomalies', error: error.message });
  }
});

// Get AI response for chat queries with comprehensive user context
router.post('/chat', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const userId = req.user.id || req.user._id;
    const Goal = require('../models/goal');
    const Investment = require('../models/investment');
    
    // Fetch all user data with error handling
    let budgets = [], expenses = [], investments = [], goals = [];
    try {
      budgets = await Budget.find({ user: userId });
      expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(100);
      investments = await Investment.find({ $or: [{ userId: userId }, { user: userId }], isActive: { $ne: false } });
      goals = await Goal.find({ user: userId });
    } catch (dbError) {
      console.error('Database error fetching user data:', dbError);
      // Continue with empty arrays if DB fails
    }

    // Calculate current month spending
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    let thisMonthSpent = 0;
    let thisMonthCount = 0;
    const thisMonthCategorySpending = {};

    (expenses || []).forEach(exp => {
      if (exp?.date && exp?.amount) {
        try {
          const expDate = new Date(exp.date);
          if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            thisMonthSpent += exp.amount;
            thisMonthCount += 1;
            if (exp.category) {
              thisMonthCategorySpending[exp.category] = (thisMonthCategorySpending[exp.category] || 0) + exp.amount;
            }
          }
        } catch (e) {}
      }
    });

    const thisMonthCategoryBreakdown = Object.entries(thisMonthCategorySpending)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: ₹${amt.toLocaleString()}`)
      .join(', ');

    // Calculate comprehensive statistics with safe defaults
    const totalBudget = (budgets || []).reduce((sum, b) => sum + (b?.amount || 0), 0);
    const totalSpent = (budgets || []).reduce((sum, b) => sum + (b?.spent || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e?.amount || 0), 0);
    const balance = totalBudget - totalSpent;

    // Category breakdown across all loaded expenses
    const categorySpending = {};
    (expenses || []).forEach(exp => {
      if (exp?.category && exp?.amount) {
        categorySpending[exp.category] = (categorySpending[exp.category] || 0) + exp.amount;
      }
    });
    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: ₹${amt.toLocaleString()}`)
      .join(', ');

    // Monthly spending (last 3 months)
    const monthlySpending = {};
    (expenses || []).forEach(exp => {
      if (exp?.date && exp?.amount) {
        try {
          const monthKey = new Date(exp.date).toLocaleString('default', { month: 'long', year: 'numeric' });
          monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + exp.amount;
        } catch (e) {}
      }
    });
    const monthlyBreakdown = Object.entries(monthlySpending)
      .slice(-3)
      .map(([month, amt]) => `${month}: ₹${amt.toLocaleString()}`)
      .join(', ');

    // Investment summary
    const totalInvested = (investments || []).reduce((sum, inv) => sum + (inv?.amountInvested || 0), 0);
    const totalCurrentValue = (investments || []).reduce((sum, inv) => sum + (inv?.currentValue || inv?.amountInvested || 0), 0);
    const investmentReturns = totalCurrentValue - totalInvested;
    const investmentReturnsPercent = totalInvested > 0 ? ((investmentReturns / totalInvested) * 100).toFixed(2) : 0;
    
    const investmentBreakdown = (investments || []).map(inv => 
      `${inv?.name || 'Unknown'} (${inv?.type || 'Unknown'}): ₹${(inv?.currentValue || inv?.amountInvested || 0).toLocaleString()}`
    ).join(', ');

    // Goals summary
    const totalGoalAmount = (goals || []).reduce((sum, g) => sum + (g?.targetAmount || 0), 0);
    const totalSaved = (goals || []).reduce((sum, g) => sum + (g?.currentAmount || 0), 0);
    const goalsProgress = (goals || []).map(g => {
      const progress = g?.targetAmount > 0 ? ((g?.currentAmount || 0) / g.targetAmount * 100).toFixed(1) : 0;
      return `${g?.title || 'Unknown'}: ₹${(g?.currentAmount || 0).toLocaleString()}/${(g?.targetAmount || 0).toLocaleString()} (${progress}%)`;
    }).join(', ');

    // Recent expenses details
    const recentExpenses = (expenses || []).slice(0, 10).map(exp => {
      try {
        return `${exp?.title || 'Unknown'}: ₹${(exp?.amount || 0).toLocaleString()} (${exp?.category || 'Unknown'}) on ${exp?.date ? new Date(exp.date).toLocaleDateString() : 'Unknown date'}`;
      } catch (e) {
        return '';
      }
    }).filter(Boolean).join('; ');

    // Budget status
    const budgetStatus = (budgets || []).map(b => {
      const percentage = b?.amount > 0 ? ((b?.spent || 0) / b.amount * 100).toFixed(1) : 0;
      const status = percentage >= 100 ? 'Over Budget' : percentage >= 80 ? 'Warning' : 'On Track';
      return `${b?.category || 'Unknown'}: ₹${(b?.spent || 0).toLocaleString()}/₹${(b?.amount || 0).toLocaleString()} (${percentage}%) - ${status}`;
    }).join('; ');

    // Build comprehensive context
    const contextPrompt = `You are a helpful, intelligent financial advisor AI assistant. The user is asking: "${question}"

USER'S COMPREHENSIVE FINANCIAL DATA:

CURRENT MONTH (${currentMonthName}):
- Spent this month: ₹${thisMonthSpent.toLocaleString()} across ${thisMonthCount} transaction(s)
- Current Month Category Breakdown: ${thisMonthCategoryBreakdown || 'No expenses recorded for this month yet'}

OVERALL BUDGETS:
- Total Budget: ₹${totalBudget.toLocaleString()}
- Total Spent: ₹${totalSpent.toLocaleString()}
- Remaining Budget: ₹${balance.toLocaleString()}
- Budget Status by Category: ${budgetStatus || 'No budgets set'}

EXPENSES HISTORY:
- Total All-Time Expenses: ₹${totalExpenses.toLocaleString()}
- Total Loaded Transactions: ${expenses.length}
- Top Spending Categories: ${topCategories || 'No expenses yet'}
- Monthly Spending Trend: ${monthlyBreakdown || 'No data'}
- Recent Expenses: ${recentExpenses || 'No recent expenses'}

INVESTMENTS:
- Total Invested: ₹${totalInvested.toLocaleString()}
- Current Portfolio Value: ₹${totalCurrentValue.toLocaleString()}
- Total Returns: ₹${investmentReturns.toLocaleString()} (${investmentReturnsPercent}%)
- Investment Breakdown: ${investmentBreakdown || 'No investments yet'}

FINANCIAL GOALS:
- Total Goal Amount: ₹${totalGoalAmount.toLocaleString()}
- Total Saved: ₹${totalSaved.toLocaleString()}
- Goals Progress: ${goalsProgress || 'No goals set'}

INSTRUCTIONS:
1. Answer the user's question directly and accurately using their actual financial data above.
2. If they ask "How much did I spend this month?", state clearly: "In ${currentMonthName}, you have spent ₹${thisMonthSpent.toLocaleString()} across ${thisMonthCount} transaction(s)." and provide the breakdown by category if available.
3. Be specific, referencing exact numbers and figures from their data.
4. Use Indian Rupee (₹) format for all amounts.
5. Keep responses clean, organized, and friendly (use markdown bullet points and bolding for key numbers).

User Question: "${question}"

Provide a helpful, personalized response:`;

    try {
      console.log('Calling AI with prompt length:', contextPrompt.length);
      const responseText = await callOpenAI(contextPrompt, 800);
      
      if (!responseText || !responseText.trim()) {
        console.log('Empty response from AI, constructing fallback');
        
        let fallbackResponse = `Here is a summary based on your financial data:\n\n`;
        fallbackResponse += `• **This Month (${currentMonthName}) Spending:** ₹${thisMonthSpent.toLocaleString()} (${thisMonthCount} transactions)\n`;
        if (thisMonthCategoryBreakdown) {
          fallbackResponse += `  - Breakdown: ${thisMonthCategoryBreakdown}\n`;
        }
        fallbackResponse += `• **Total Budget:** ₹${totalBudget.toLocaleString()} | **Spent:** ₹${totalSpent.toLocaleString()} | **Remaining:** ₹${balance.toLocaleString()}\n`;
        if (topCategories) {
          fallbackResponse += `• **Top Categories:** ${topCategories}\n`;
        }
        if (investments.length > 0) {
          fallbackResponse += `• **Investment Portfolio Value:** ₹${totalCurrentValue.toLocaleString()} (Returns: ₹${investmentReturns.toLocaleString()})\n`;
        }
        if (goals.length > 0) {
          fallbackResponse += `• **Savings Goals:** Saved ₹${totalSaved.toLocaleString()} of ₹${totalGoalAmount.toLocaleString()}\n`;
        }
        
        return res.json({ response: fallbackResponse });
      }
      
      console.log('AI response received, length:', responseText.length);
      res.json({ response: responseText });
    } catch (error) {
      console.error('AI API error in chat endpoint:', error.response?.data || error.message);
      
      let fallbackResponse = `Here is your current financial summary:\n\n`;
      fallbackResponse += `• **This Month (${currentMonthName}) Spending:** ₹${thisMonthSpent.toLocaleString()} across ${thisMonthCount} transaction(s)\n`;
      if (thisMonthCategoryBreakdown) {
        fallbackResponse += `  - Breakdown: ${thisMonthCategoryBreakdown}\n`;
      }
      fallbackResponse += `• **Total Budget:** ₹${totalBudget.toLocaleString()} | **Spent:** ₹${totalSpent.toLocaleString()} | **Remaining:** ₹${balance.toLocaleString()}\n`;
      if (topCategories) {
        fallbackResponse += `• **Top Spending Categories:** ${topCategories}\n`;
      }
      
      res.json({ response: fallbackResponse });
    }
  } catch (error) {
    console.error('AI chat error (outer catch):', error);
    res.json({ 
      response: `Sorry, I encountered an issue retrieving your data: ${error.message}. Please try again.`
    });
  }
});

// Get AI insights for investment portfolio
router.get('/investment-insights', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Get portfolio analysis data
    const investments = await Investment.find({
      userId: userId,
      isActive: true
    });

    if (investments.length === 0) {
      return res.json({
        insights: [
          'You haven\'t added any investments yet. Start by adding your first investment to begin tracking your portfolio.',
          'Consider diversifying across different asset types like stocks, mutual funds, and fixed deposits for better risk management.'
        ],
        warnings: [],
        recommendations: []
      });
    }

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amountInvested), 0);
    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnsPercentage = totalInvested > 0 
      ? (totalReturns / totalInvested) * 100 
      : 0;

    // Calculate asset allocation
    const allocationByType = investments.reduce((acc, inv) => {
      const value = inv.currentValue || inv.amountInvested;
      if (!acc[inv.type]) {
        acc[inv.type] = { amount: 0, percentage: 0, count: 0 };
      }
      acc[inv.type].amount += value;
      acc[inv.type].count += 1;
      return acc;
    }, {});

    Object.keys(allocationByType).forEach(type => {
      allocationByType[type].percentage = totalCurrentValue > 0 
        ? (allocationByType[type].amount / totalCurrentValue) * 100 
        : 0;
    });

    // Calculate risk exposure
    const riskExposure = investments.reduce((acc, inv) => {
      const value = inv.currentValue || inv.amountInvested;
      if (!acc[inv.riskLevel]) {
        acc[inv.riskLevel] = { amount: 0, percentage: 0 };
      }
      acc[inv.riskLevel].amount += value;
      acc[inv.riskLevel].percentage += totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0;
      return acc;
    }, {});

    // Check for over-concentration (more than 50% in one type)
    const overConcentrated = Object.entries(allocationByType)
      .filter(([type, data]) => data.percentage > 50)
      .map(([type, data]) => ({ type, percentage: data.percentage }));

    // Prepare structured data for AI
    const portfolioData = {
      totalInvestments: investments.length,
      totalInvested,
      totalCurrentValue,
      totalReturns,
      totalReturnsPercentage,
      allocationByType: Object.entries(allocationByType).map(([type, data]) => ({
        type,
        percentage: Math.round(data.percentage * 10) / 10,
        count: data.count
      })),
      riskExposure: Object.entries(riskExposure).map(([level, data]) => ({
        level,
        percentage: Math.round(data.percentage * 10) / 10
      })),
      overConcentrated: overConcentrated.map(oc => ({
        type: oc.type,
        percentage: Math.round(oc.percentage * 10) / 10
      }))
    };

    // Generate AI insights
    const prompt = `You are a financial advisor analyzing an investment portfolio. Based on this structured data, provide insights in natural language. DO NOT generate or invent any numbers - only use the numbers provided. Return a JSON object with three arrays: "insights", "warnings", and "recommendations".

Portfolio Data:
- Total Investments: ${portfolioData.totalInvestments}
- Total Invested: ₹${portfolioData.totalInvested.toLocaleString()}
- Current Portfolio Value: ₹${portfolioData.totalCurrentValue.toLocaleString()}
- Total Returns: ₹${portfolioData.totalReturns.toLocaleString()} (${portfolioData.totalReturnsPercentage.toFixed(2)}%)

Asset Allocation:
${portfolioData.allocationByType.map(a => `- ${a.type}: ${a.percentage}% (${a.count} investments)`).join('\n')}

Risk Exposure:
${portfolioData.riskExposure.map(r => `- ${r.level}: ${r.percentage}%`).join('\n')}

${portfolioData.overConcentrated.length > 0 ? `Over-concentration detected: ${portfolioData.overConcentrated.map(oc => `${oc.type} (${oc.percentage}%)`).join(', ')}` : 'No significant over-concentration detected.'}

Provide:
1. "insights": 2-3 sentences explaining the portfolio's overall health and performance
2. "warnings": Any concerns about risk, concentration, or portfolio balance (empty array if none)
3. "recommendations": Actionable suggestions for improvement (empty array if portfolio is well-balanced)

Return ONLY valid JSON, no markdown, no code blocks. Example format:
{
  "insights": ["insight 1", "insight 2"],
  "warnings": ["warning 1"] or [],
  "recommendations": ["recommendation 1"] or []
}`;

    try {
      const aiResponse = await callOpenAI(prompt, 400);
      
      // Parse AI response (handle if it's wrapped in markdown)
      let parsedResponse;
      try {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        // Fallback to structured response
        parsedResponse = {
          insights: [
            totalReturnsPercentage >= 0 
              ? `Your portfolio is performing well with ${totalReturnsPercentage >= 10 ? 'strong' : 'positive'} returns.`
              : 'Your portfolio is currently showing negative returns. Consider reviewing your investment strategy.',
            `You have ${investments.length} active investments across ${Object.keys(allocationByType).length} different asset types.`
          ],
          warnings: overConcentrated.length > 0 
            ? [`Your portfolio is heavily concentrated in ${overConcentrated.map(oc => oc.type).join(' and ')}. Consider diversifying.`]
            : [],
          recommendations: overConcentrated.length > 0
            ? ['Consider diversifying your portfolio across more asset types to reduce risk.']
            : []
        };
      }

      res.json({
        insights: parsedResponse.insights || [],
        warnings: parsedResponse.warnings || [],
        recommendations: parsedResponse.recommendations || [],
        portfolioData
      });
    } catch (aiError) {
      // Fallback response
      res.json({
        insights: [
          totalReturnsPercentage >= 0 
            ? `Your portfolio shows ${totalReturnsPercentage >= 10 ? 'strong' : 'positive'} returns of ${totalReturnsPercentage.toFixed(2)}%.`
            : `Your portfolio is currently showing negative returns of ${totalReturnsPercentage.toFixed(2)}%.`,
          `You have ${investments.length} investments with a total value of ₹${totalCurrentValue.toLocaleString()}.`
        ],
        warnings: overConcentrated.length > 0 
          ? [`Portfolio is over-concentrated in ${overConcentrated.map(oc => `${oc.type} (${oc.percentage.toFixed(1)}%)`).join(', ')}.`]
          : [],
        recommendations: overConcentrated.length > 0
          ? ['Consider diversifying your portfolio to reduce concentration risk.']
          : ['Continue monitoring your investments and rebalance periodically.'],
        portfolioData
      });
    }
  } catch (error) {
    console.error('Error generating investment insights:', error);
    res.status(500).json({ message: 'Error generating investment insights', error: error.message });
  }
});

module.exports = router;
