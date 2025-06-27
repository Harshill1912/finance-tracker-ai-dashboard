// routes/splitExpense.js
const express = require('express');
const SplitExpense = require('../models/splitExpense');
const router = express.Router();

// Create a new split expense
router.post('/split-expense', async (req, res) => {
  const { description, amount, participants } = req.body;

  try {
    const splitExpense = new SplitExpense({
      description,
      amount,
      participants,
    });

    await splitExpense.save();
    res.status(201).json({ success: true, message: 'Split expense created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating split expense' });
  }
});

// Get all split expenses
router.get('/split-expenses', async (req, res) => {
  try {
    const splitExpenses = await SplitExpense.find();
    res.json(splitExpenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching split expenses' });
  }
});

module.exports = router;
