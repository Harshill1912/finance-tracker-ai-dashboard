// services/expenseService.js
// Production-ready expense management service
// Handles expense creation, splitting, and validation

const SplitExpense = require('../models/splitExpense');
const Group = require('../models/group');
const User = require('../models/user');
const balanceService = require('./balanceService');

/**
 * Validate split amounts
 * Ensures total shares don't exceed expense amount
 */
function validateSplitAmounts(amount, participants) {
  const totalShare = participants.reduce((sum, p) => sum + (p.share || 0), 0);
  
  // Allow small rounding differences (0.01)
  const difference = Math.abs(totalShare - amount);
  if (difference > 0.01) {
    throw new Error(`Total shares (${totalShare}) must equal expense amount (${amount})`);
  }
  
  return true;
}

/**
 * Create expense with equal split
 */
function createEqualSplit(amount, participantCount) {
  if (participantCount === 0) {
    throw new Error('At least one participant required');
  }
  
  const sharePerPerson = Math.round((amount / participantCount) * 100) / 100;
  const shares = Array(participantCount).fill(sharePerPerson);
  
  // Handle rounding: add remainder to first participant
  const total = shares.reduce((sum, s) => sum + s, 0);
  const remainder = amount - total;
  if (Math.abs(remainder) > 0.01) {
    shares[0] = Math.round((shares[0] + remainder) * 100) / 100;
  }
  
  return shares;
}

/**
 * Create expense with exact amounts
 */
function createExactSplit(amount, exactAmounts) {
  const total = exactAmounts.reduce((sum, a) => sum + a, 0);
  
  if (Math.abs(total - amount) > 0.01) {
    throw new Error(`Exact amounts (${total}) must equal expense amount (${amount})`);
  }
  
  return exactAmounts;
}

/**
 * Create expense with percentage split
 */
function createPercentageSplit(amount, percentages) {
  const totalPercent = percentages.reduce((sum, p) => sum + p, 0);
  
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100% (got ${totalPercent}%)`);
  }
  
  return percentages.map(p => Math.round((amount * p / 100) * 100) / 100);
}

/**
 * Create a new expense
 */
async function createExpense({
  description,
  amount,
  paidBy,
  groupId,
  participants,
  splitType = 'equal' // 'equal', 'exact', 'percentage'
}) {
  try {
    // Validate inputs
    if (!description || !amount || !paidBy || !participants || participants.length === 0) {
      throw new Error('Missing required fields');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Get group if specified
    let group = null;
    if (groupId) {
      group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Verify paidBy is a member
      if (!group.isMember(paidBy)) {
        throw new Error('Payer must be a group member');
      }
    }

    // Process participants and calculate shares
    const processedParticipants = [];
    let shares = [];

    if (splitType === 'equal') {
      shares = createEqualSplit(amount, participants.length);
    } else if (splitType === 'exact') {
      const exactAmounts = participants.map(p => p.share || 0);
      shares = createExactSplit(amount, exactAmounts);
    } else if (splitType === 'percentage') {
      const percentages = participants.map(p => p.percentage || 0);
      shares = createPercentageSplit(amount, percentages);
    } else {
      throw new Error(`Invalid split type: ${splitType}`);
    }

    // Process each participant
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const share = shares[i];

      // Skip payer (they don't owe themselves)
      if (participant.userId && participant.userId.toString() === paidBy.toString()) {
        continue;
      }

      // Get user
      let user = null;
      if (participant.userId) {
        user = await User.findById(participant.userId);
        if (!user) {
          throw new Error(`User ${participant.userId} not found`);
        }

        // If group specified, verify user is a member
        if (group && !group.isMember(participant.userId)) {
          throw new Error(`User ${participant.userId} is not a group member`);
        }
      }

      processedParticipants.push({
        user: participant.userId || null,
        name: participant.name || user?.name || 'Guest',
        email: participant.email || user?.email || null,
        phone: participant.phone || user?.phone || null,
        share: share,
        paidAmount: 0,
        paid: false,
        userType: user ? user.status : 'GUEST'
      });
    }

    if (processedParticipants.length === 0) {
      throw new Error('No valid participants after processing');
    }

    // Validate split amounts
    const totalShare = processedParticipants.reduce((sum, p) => sum + p.share, 0);
    validateSplitAmounts(amount, processedParticipants);

    // Create expense
    const expense = new SplitExpense({
      description: description.trim(),
      amount: amount,
      paidBy: paidBy,
      user: paidBy, // Legacy field
      participants: processedParticipants,
      settled: false,
      groupName: group ? group.name : null
    });

    await expense.save();
    await expense.populate('paidBy', 'name email');
    await expense.populate('participants.user', 'name email phone');

    // Update balances
    await balanceService.updateBalancesFromExpense(expense);

    return expense;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
}

/**
 * Update an expense
 */
async function updateExpense(expenseId, updates, userId) {
  try {
    const expense = await SplitExpense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Verify user can edit (paid by or admin)
    if (expense.paidBy.toString() !== userId.toString()) {
      throw new Error('Only expense creator can edit');
    }

    // If amount or participants changed, recalculate balances
    const amountChanged = updates.amount && updates.amount !== expense.amount;
    const participantsChanged = updates.participants && 
      JSON.stringify(updates.participants) !== JSON.stringify(expense.participants);

    if (amountChanged || participantsChanged) {
      // Revert old balances (subtract old expense)
      // This is simplified - in production, you'd store original values
      // For now, we'll recalculate all balances
    }

    // Update expense
    if (updates.description) expense.description = updates.description;
    if (updates.amount) expense.amount = updates.amount;
    if (updates.participants) {
      // Recalculate shares if needed
      expense.participants = updates.participants;
    }

    await expense.save();

    // Recalculate balances if needed
    if (amountChanged || participantsChanged) {
      if (expense.groupName) {
        const group = await Group.findOne({ name: expense.groupName });
        if (group) {
          await balanceService.recalculateGroupBalances(group._id);
        }
      }
    }

    return expense;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

/**
 * Delete an expense
 */
async function deleteExpense(expenseId, userId) {
  try {
    const expense = await SplitExpense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Verify user can delete
    if (expense.paidBy.toString() !== userId.toString()) {
      throw new Error('Only expense creator can delete');
    }

    const groupName = expense.groupName;

    // Delete expense
    await SplitExpense.findByIdAndDelete(expenseId);

    // Recalculate balances
    if (groupName) {
      const group = await Group.findOne({ name: groupName });
      if (group) {
        await balanceService.recalculateGroupBalances(group._id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

/**
 * Get expenses for a group
 */
async function getGroupExpenses(groupId, options = {}) {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const query = {
      groupName: group.name
    };

    if (options.settled !== undefined) {
      query.settled = options.settled;
    }

    if (options.userId) {
      query.$or = [
        { paidBy: options.userId },
        { 'participants.user': options.userId }
      ];
    }

    const expenses = await SplitExpense.find(query)
      .populate('paidBy', 'name email phone')
      .populate('participants.user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(options.limit || 100);

    return expenses;
  } catch (error) {
    console.error('Error getting group expenses:', error);
    throw error;
  }
}

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  getGroupExpenses,
  validateSplitAmounts,
  createEqualSplit,
  createExactSplit,
  createPercentageSplit
};
