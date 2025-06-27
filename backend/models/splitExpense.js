// models/SplitExpense.js
const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  name: String,
  share: Number,
  paid: { type: Boolean, default: false },
});

const SplitExpenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  participants: [ParticipantSchema],
  createdAt: { type: Date, default: Date.now },
});

const SplitExpense = mongoose.model('SplitExpense', SplitExpenseSchema);

module.exports = SplitExpense;
