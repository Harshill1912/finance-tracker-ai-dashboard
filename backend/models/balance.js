const mongoose = require('mongoose');

const BalanceSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // Amount user1 owes to user2 (positive) or user2 owes to user1 (negative)
  amount: {
    type: Number,
    default: 0
  },
  // Last updated timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unique pair (user1, user2) regardless of order
BalanceSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Helper method to get balance between two users
BalanceSchema.statics.getBalance = async function(userId1, userId2) {
  // Convert to strings for comparison
  const id1Str = userId1.toString();
  const id2Str = userId2.toString();
  const [user1, user2] = [id1Str, id2Str].sort();
  
  let balance = await this.findOne({ user1, user2 });
  
  if (!balance) {
    balance = new this({ user1, user2, amount: 0 });
    await balance.save();
  }
  
  // If userId1 is the larger ID, negate the amount
  if (id1Str > id2Str) {
    return { ...balance.toObject(), amount: -balance.amount };
  }
  
  return balance;
};

// Helper method to update balance
BalanceSchema.statics.updateBalance = async function(userId1, userId2, amount) {
  // Convert to strings for comparison
  const id1Str = userId1.toString();
  const id2Str = userId2.toString();
  const [user1, user2] = [id1Str, id2Str].sort();
  
  let balance = await this.findOne({ user1, user2 });
  
  if (!balance) {
    balance = new this({ user1, user2, amount: 0 });
  }
  
  // If userId1 is the larger ID, negate the amount
  if (id1Str > id2Str) {
    balance.amount -= amount;
  } else {
    balance.amount += amount;
  }
  
  // Round to 2 decimal places to avoid floating point issues
  balance.amount = Math.round(balance.amount * 100) / 100;
  
  // If balance is near zero, set to zero
  if (Math.abs(balance.amount) < 0.01) {
    balance.amount = 0;
  }
  
  balance.lastUpdated = new Date();
  await balance.save();
  
  return balance;
};

const Balance = mongoose.model('Balance', BalanceSchema);

module.exports = Balance;
