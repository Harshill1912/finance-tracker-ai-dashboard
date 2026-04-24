// Database indexes for better performance and data isolation
const mongoose = require('mongoose');
const Budget = require('./budget');
const Expense = require('./expense');
const SplitExpense = require('./splitExpense');
const Goal = require('./goal');

// Create indexes on user fields for better query performance
const createIndexes = async () => {
  try {
    // Budget indexes
    await Budget.collection.createIndex({ user: 1 });
    await Budget.collection.createIndex({ user: 1, month: 1 });
    await Budget.collection.createIndex({ user: 1, category: 1 });
    
    // Expense indexes
    await Expense.collection.createIndex({ user: 1 });
    await Expense.collection.createIndex({ user: 1, date: -1 });
    await Expense.collection.createIndex({ user: 1, category: 1 });
    
    // SplitExpense indexes
    await SplitExpense.collection.createIndex({ user: 1 });
    await SplitExpense.collection.createIndex({ user: 1, createdAt: -1 });
    
    // Goal indexes
    await Goal.collection.createIndex({ user: 1 });
    await Goal.collection.createIndex({ user: 1, status: 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = createIndexes;
