const express = require('express');
const Goal = require('../models/goal');
const Budget = require('../models/budget');
const Expense = require('../models/expense');
const auth = require('../authMiddleare');

const router = express.Router();

// Import AI helper
const { callOpenAI } = require('../utils/aiHelper');

// Get all goals for user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching goals', error: error.message });
  }
});

// Get single goal
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const goal = await Goal.findOne({ _id: req.params.id, user: userId });
    
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching goal', error: error.message });
  }
});

// Create new goal
router.post('/', auth, async (req, res) => {
  const { title, description, targetAmount, deadline, category } = req.body;

  if (!title || !targetAmount || !deadline) {
    return res.status(400).json({ success: false, message: 'Title, target amount, and deadline are required' });
  }

  try {
    const userId = req.user.id || req.user._id;
    const goal = new Goal({
      title,
      description: description || '',
      targetAmount,
      deadline,
      category: category || 'savings',
      user: userId
    });

    await goal.save();
    res.status(201).json({ success: true, message: 'Goal created successfully', data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating goal', error: error.message });
  }
});

// Update goal
router.put('/:id', auth, async (req, res) => {
  const { title, description, targetAmount, currentAmount, deadline, category, status } = req.body;

  try {
    const userId = req.user.id || req.user._id;
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetAmount) updateData.targetAmount = targetAmount;
    if (currentAmount !== undefined) updateData.currentAmount = currentAmount;
    if (deadline) updateData.deadline = deadline;
    if (category) updateData.category = category;
    if (status) updateData.status = status;

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, message: 'Goal updated successfully', data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating goal', error: error.message });
  }
});

// Delete goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: userId });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting goal', error: error.message });
  }
});

// AI Goal Suggestions
router.get('/ai/suggestions', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Get user's financial data for context
    const budgets = await Budget.find({ user: userId });
    const expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(50);
    const existingGoals = await Goal.find({ user: userId });
    
    const totalIncome = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalExpenses = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const savings = totalIncome - totalExpenses;
    const monthlySavings = savings > 0 ? savings / 12 : 0;
    
    // Common goal categories with estimated prices
    const commonGoals = [
      { title: 'Buy a Laptop', category: 'purchase', estimatedPrice: 50000, description: 'High-performance laptop for work or gaming' },
      { title: 'Emergency Fund', category: 'savings', estimatedPrice: 100000, description: '6 months of expenses as emergency fund' },
      { title: 'Vacation Trip', category: 'purchase', estimatedPrice: 50000, description: 'Dream vacation to your favorite destination' },
      { title: 'Down Payment for House', category: 'savings', estimatedPrice: 500000, description: 'Save for your dream home down payment' },
      { title: 'Buy a Car', category: 'purchase', estimatedPrice: 800000, description: 'New or used car purchase' },
      { title: 'Wedding Expenses', category: 'purchase', estimatedPrice: 500000, description: 'Save for wedding and related expenses' },
      { title: 'Education Fund', category: 'investment', estimatedPrice: 200000, description: 'Save for higher education or courses' },
      { title: 'Retirement Fund', category: 'investment', estimatedPrice: 1000000, description: 'Long-term retirement savings goal' },
      { title: 'Home Renovation', category: 'purchase', estimatedPrice: 300000, description: 'Renovate or upgrade your home' },
      { title: 'Start a Business', category: 'investment', estimatedPrice: 500000, description: 'Capital for starting your own business' },
      { title: 'Pay Off Debt', category: 'debt', estimatedPrice: 200000, description: 'Clear all outstanding debts' },
      { title: 'Buy a Smartphone', category: 'purchase', estimatedPrice: 30000, description: 'Latest smartphone or upgrade' },
      { title: 'Fitness Equipment', category: 'purchase', estimatedPrice: 50000, description: 'Home gym setup or fitness equipment' },
      { title: 'Gadgets & Electronics', category: 'purchase', estimatedPrice: 40000, description: 'Latest tech gadgets and electronics' },
      { title: 'Medical Emergency Fund', category: 'savings', estimatedPrice: 150000, description: 'Fund for medical emergencies' }
    ];
    
    // Filter out goals user already has
    const existingGoalTitles = existingGoals.map(g => g.title.toLowerCase());
    const availableGoals = commonGoals.filter(g => 
      !existingGoalTitles.includes(g.title.toLowerCase())
    );
    
    // Use AI to personalize suggestions based on user's financial data
    let personalizedSuggestions = [];
    try {
      const prompt = `Based on this user's financial data, suggest 5-8 personalized financial goals:
      
Income: ₹${totalIncome.toLocaleString('en-IN')}
Monthly Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
Monthly Savings: ₹${monthlySavings.toLocaleString('en-IN')}
Existing Goals: ${existingGoals.length} goals

Available common goals: ${availableGoals.map(g => g.title).join(', ')}

Provide suggestions in this JSON format (return ONLY valid JSON, no other text):
[
  {
    "title": "Goal name",
    "category": "purchase|savings|investment|debt|other",
    "estimatedPrice": 50000,
    "description": "Brief description",
    "suggestedDeadline": "2025-12-31",
    "reasoning": "Why this goal makes sense for this user"
  }
]

Make suggestions realistic based on their savings capacity. Include mix of short-term (3-6 months) and long-term (1-3 years) goals.`;

      const aiResponse = await callOpenAI(prompt, 800);
      
      // Try to parse AI response as JSON
      if (aiResponse && aiResponse.trim()) {
        try {
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            personalizedSuggestions = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.log('Could not parse AI response, using default suggestions');
        }
      }
    } catch (aiError) {
      console.error('AI suggestion error:', aiError.message);
      // Continue with default suggestions
    }
    
    // Combine AI suggestions with common goals
    const allSuggestions = [
      ...personalizedSuggestions.slice(0, 5),
      ...availableGoals.slice(0, 10 - personalizedSuggestions.length)
    ].slice(0, 10);
    
    // Add default deadlines if not provided
    allSuggestions.forEach(suggestion => {
      if (!suggestion.suggestedDeadline) {
        const months = suggestion.estimatedPrice / (monthlySavings || 10000);
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + Math.ceil(months));
        suggestion.suggestedDeadline = deadline.toISOString().split('T')[0];
      }
      if (!suggestion.reasoning) {
        const months = suggestion.estimatedPrice / (monthlySavings || 10000);
        suggestion.reasoning = `Based on your current savings rate, you can achieve this goal in ${Math.ceil(months)} months.`;
      }
    });
    
    res.json({
      success: true,
      suggestions: allSuggestions,
      context: {
        monthlySavings,
        totalIncome,
        totalExpenses,
        existingGoalsCount: existingGoals.length
      }
    });
  } catch (error) {
    console.error('Error generating goal suggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating suggestions',
      error: error.message 
    });
  }
});

module.exports = router;
