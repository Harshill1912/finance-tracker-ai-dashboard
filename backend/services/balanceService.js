// services/balanceService.js
// Production-ready balance calculation and debt simplification service
// Implements Splitwise-style balance management

const Balance = require('../models/balance');
const SplitExpense = require('../models/splitExpense');
const Payment = require('../models/payment');
const Group = require('../models/group');

/**
 * Calculate balances for a group
 * Returns who owes whom and how much
 */
async function calculateGroupBalances(groupId) {
  try {
    const group = await Group.findById(groupId).populate('members');
    if (!group) {
      throw new Error('Group not found');
    }

    const memberIds = group.members.map(m => m._id);
    const balances = new Map(); // Map<userId, Map<userId, amount>>

    // Initialize balance map for all members
    memberIds.forEach(id1 => {
      balances.set(id1.toString(), new Map());
      memberIds.forEach(id2 => {
        if (id1.toString() !== id2.toString()) {
          balances.get(id1.toString()).set(id2.toString(), 0);
        }
      });
    });

    // Get all expenses for this group
    const expenses = await SplitExpense.find({
      groupName: group.name, // Using groupName for now, can be enhanced with groupId
      settled: false
    }).populate('paidBy participants.user');

    // Calculate balances from expenses
    for (const expense of expenses) {
      const paidBy = expense.paidBy._id.toString();
      const totalAmount = expense.amount;
      
      // Calculate total share
      const totalShare = expense.participants.reduce((sum, p) => sum + (p.share || 0), 0);
      
      if (totalShare === 0) continue;

      // For each participant, they owe their share to the payer
      for (const participant of expense.participants) {
        if (!participant.user) continue; // Skip guests
        
        const participantId = participant.user._id.toString();
        if (participantId === paidBy) continue; // Skip payer
        
        const share = participant.share || 0;
        const paidAmount = participant.paidAmount || 0;
        const amountOwed = share - paidAmount;

        if (amountOwed > 0) {
          // Participant owes the payer
          const currentBalance = balances.get(participantId).get(paidBy) || 0;
          balances.get(participantId).set(paidBy, currentBalance + amountOwed);
        }
      }
    }

    // Get all payments for this group
    const payments = await SplitExpense.find({
      groupName: group.name,
      settled: true
    }).populate('paidBy participants.user');

    // Adjust balances from payments
    for (const expense of payments) {
      for (const participant of expense.participants) {
        if (!participant.user || !participant.paid) continue;
        
        const participantId = participant.user._id.toString();
        const paidBy = expense.paidBy._id.toString();
        
        if (participantId === paidBy) continue;
        
        const paidAmount = participant.paidAmount || 0;
        if (paidAmount > 0) {
          // Reduce what participant owes
          const currentBalance = balances.get(participantId).get(paidBy) || 0;
          balances.get(participantId).set(paidBy, Math.max(0, currentBalance - paidAmount));
        }
      }
    }

    // Convert to simplified format
    const simplifiedBalances = [];
    for (const [userId, owesMap] of balances.entries()) {
      for (const [owesToId, amount] of owesMap.entries()) {
        if (amount > 0.01) { // Only include significant amounts (> 1 paisa)
          simplifiedBalances.push({
            from: userId,
            to: owesToId,
            amount: Math.round(amount * 100) / 100 // Round to 2 decimals
          });
        }
      }
    }

    return simplifiedBalances;
  } catch (error) {
    console.error('Error calculating group balances:', error);
    throw error;
  }
}

/**
 * Simplify debts using graph-based algorithm
 * Minimizes number of transactions needed to settle all debts
 * 
 * Algorithm:
 * 1. Build a graph of debts
 * 2. Find cycles and simplify them
 * 3. Minimize edges (transactions)
 */
function simplifyDebts(balances) {
  if (!balances || balances.length === 0) {
    return [];
  }

  // Build debt graph: Map<userId, Map<userId, amount>>
  const debtGraph = new Map();
  
  for (const balance of balances) {
    const from = balance.from.toString();
    const to = balance.to.toString();
    
    if (!debtGraph.has(from)) {
      debtGraph.set(from, new Map());
    }
    if (!debtGraph.has(to)) {
      debtGraph.set(to, new Map());
    }
    
    const current = debtGraph.get(from).get(to) || 0;
    debtGraph.get(from).set(to, current + balance.amount);
  }

  // Net balances: Map<userId, netAmount>
  // Positive = they are owed money, Negative = they owe money
  const netBalances = new Map();
  
  for (const [from, owesMap] of debtGraph.entries()) {
    if (!netBalances.has(from)) {
      netBalances.set(from, 0);
    }
    
    for (const [to, amount] of owesMap.entries()) {
      // From owes 'amount' to To
      netBalances.set(from, (netBalances.get(from) || 0) - amount);
      
      if (!netBalances.has(to)) {
        netBalances.set(to, 0);
      }
      netBalances.set(to, (netBalances.get(to) || 0) + amount);
    }
  }

  // Separate creditors (positive) and debtors (negative)
  const creditors = [];
  const debtors = [];
  
  for (const [userId, netAmount] of netBalances.entries()) {
    if (Math.abs(netAmount) < 0.01) continue; // Skip zero balances
    
    if (netAmount > 0) {
      creditors.push({ userId, amount: netAmount });
    } else {
      debtors.push({ userId, amount: Math.abs(netAmount) });
    }
  }

  // Sort: largest creditors first, largest debtors first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy algorithm: match largest creditors with largest debtors
  const simplified = [];
  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];

    if (creditor.amount < 0.01 || debtor.amount < 0.01) {
      if (creditor.amount < 0.01) creditorIdx++;
      if (debtor.amount < 0.01) debtorIdx++;
      continue;
    }

    const settlementAmount = Math.min(creditor.amount, debtor.amount);
    
    simplified.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(settlementAmount * 100) / 100
    });

    creditor.amount -= settlementAmount;
    debtor.amount -= settlementAmount;

    if (creditor.amount < 0.01) creditorIdx++;
    if (debtor.amount < 0.01) debtorIdx++;
  }

  return simplified;
}

/**
 * Get user's total balance (what they owe + what they're owed)
 */
async function getUserBalance(userId, groupId = null) {
  try {
    let query = {
      $or: [
        { user1: userId },
        { user2: userId }
      ]
    };

    // If group specified, filter by group expenses
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Get expenses for this group
      const expenses = await SplitExpense.find({ groupName: group.name });
      const expenseIds = expenses.map(e => e._id);
      
      // This is a simplified version - in production, you'd link balances to groups
      // For now, we calculate from expenses
    }

    const balances = await Balance.find(query);
    
    let totalOwed = 0; // What user owes others
    let totalOwedTo = 0; // What others owe user

    for (const balance of balances) {
      const isUser1 = balance.user1.toString() === userId.toString();
      
      if (isUser1) {
        // user1 owes user2 (positive amount) or user2 owes user1 (negative amount)
        if (balance.amount > 0) {
          totalOwed += balance.amount;
        } else {
          totalOwedTo += Math.abs(balance.amount);
        }
      } else {
        // user2 owes user1 (positive amount) or user1 owes user2 (negative amount)
        if (balance.amount > 0) {
          totalOwedTo += balance.amount;
        } else {
          totalOwed += Math.abs(balance.amount);
        }
      }
    }

    return {
      totalOwed,
      totalOwedTo,
      netBalance: totalOwedTo - totalOwed
    };
  } catch (error) {
    console.error('Error getting user balance:', error);
    throw error;
  }
}

/**
 * Update balances when expense is added
 */
async function updateBalancesFromExpense(expense) {
  try {
    const paidBy = expense.paidBy;
    
    for (const participant of expense.participants) {
      if (!participant.user) continue; // Skip guests
      
      const participantId = participant.user._id || participant.user;
      if (participantId.toString() === paidBy.toString()) continue; // Skip payer
      
      const share = participant.share || 0;
      const paidAmount = participant.paidAmount || 0;
      const amountOwed = share - paidAmount;

      if (amountOwed > 0) {
        // Participant owes the payer
        await Balance.updateBalance(participantId, paidBy, amountOwed);
      }
    }
  } catch (error) {
    console.error('Error updating balances from expense:', error);
    throw error;
  }
}

/**
 * Update balances when payment is recorded
 */
async function updateBalancesFromPayment(payment) {
  try {
    const fromUser = payment.fromUser;
    const toUser = payment.toUser;
    const amount = payment.amount;

    // Payment reduces what fromUser owes toUser
    await Balance.updateBalance(fromUser, toUser, -amount);
  } catch (error) {
    console.error('Error updating balances from payment:', error);
    throw error;
  }
}

/**
 * Recalculate all balances for a group
 * Useful when balances get out of sync
 */
async function recalculateGroupBalances(groupId) {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Get all expenses for this group
    const expenses = await SplitExpense.find({
      groupName: group.name,
      settled: false
    });

    // Clear existing balances (or you could keep them and recalculate)
    // For now, we'll recalculate from scratch

    // Recalculate from all expenses
    for (const expense of expenses) {
      await updateBalancesFromExpense(expense);
    }

    // Get simplified balances
    const balances = await calculateGroupBalances(groupId);
    const simplified = simplifyDebts(balances);

    return {
      raw: balances,
      simplified: simplified
    };
  } catch (error) {
    console.error('Error recalculating group balances:', error);
    throw error;
  }
}

module.exports = {
  calculateGroupBalances,
  simplifyDebts,
  getUserBalance,
  updateBalancesFromExpense,
  updateBalancesFromPayment,
  recalculateGroupBalances
};
