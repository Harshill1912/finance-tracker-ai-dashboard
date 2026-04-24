// models/SplitExpense.js
const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  // User reference (for ACTIVE and INVITED users)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false // Not required for GUEST users
  },
  // For GUEST users or backward compatibility
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  share: { 
    type: Number, 
    required: true,
    min: 0
  },
  // Payment tracking
  paidAmount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  paid: { 
    type: Boolean, 
    default: false 
  },
  // User type at time of expense creation
  userType: {
    type: String,
    enum: ['ACTIVE', 'INVITED', 'GUEST'],
    default: 'GUEST'
  }
});

const SplitExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  participants: [ParticipantSchema],
  // User who created/paid the expense
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // Legacy field for backward compatibility
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // Settlement status
  settled: {
    type: Boolean,
    default: false
  },
  // Optional group name for organizing expenses
  groupName: {
    type: String,
    default: null
  },
  // Group reference (preferred over groupName)
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
SplitExpenseSchema.index({ paidBy: 1 });
SplitExpenseSchema.index({ 'participants.user': 1 });
SplitExpenseSchema.index({ settled: 1 });

const SplitExpense = mongoose.model('SplitExpense', SplitExpenseSchema);

module.exports = SplitExpense;
