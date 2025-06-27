const express = require('express');
const Budget = require('../models/budget');
const auth = require('../authMiddleare');

const router = express.Router();

// 🔹 Dashboard Summary
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id });

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

    const recent = await Budget.find({ user: req.user.id })
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
    console.error('Error fetching dashboard summary:', err);  // Log the error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 🔹 Get Budgets (Paginated)
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const [budgets, total] = await Promise.all([
      Budget.find({ user: req.user.id }).skip(skip).limit(Number(limit)),
      Budget.countDocuments({ user: req.user.id })
    ]);

    res.json({ budgets, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching budgets', error: err.message });
  }
});

// 🔹 Filter Budgets
router.get('/search/filters', auth, async (req, res) => {
  const { category, month } = req.query;
  const filter = { user: req.user.id };
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
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user.id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching budget', error: err.message });
  }
});

// 🔹 Create Budget
router.post('/', auth, async (req, res) => {
  const { category, amount, spent, month } = req.body;
  if (!category || amount == null || spent == null || !month) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newBudget = new Budget({ category, amount, spent, month, user: req.user.id });
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
    const updated = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
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
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting budget', error: err.message });
  }
});

module.exports = router;
