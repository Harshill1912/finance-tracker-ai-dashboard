const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  spent: {
    type: Number,
    required: true
  },
  month: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', 
    required: true
  }
}, {
  timestamps: true
});

const Budget = mongoose.model('Budget', budgetSchema);
module.exports = Budget;
