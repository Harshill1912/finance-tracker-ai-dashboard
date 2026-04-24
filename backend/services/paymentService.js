// services/paymentService.js
// Production-ready payment/settlement service
// Handles recording payments and updating balances

const Payment = require('../models/payment');
const SplitExpense = require('../models/splitExpense');
const Group = require('../models/group');
const balanceService = require('./balanceService');

/**
 * Record a payment/settlement
 * Reduces balances between two users
 */
async function recordPayment({
  fromUser,
  toUser,
  amount,
  groupId,
  expenseId = null,
  paymentMethod = 'MANUAL',
  notes = ''
}) {
  try {
    // Validate inputs
    if (!fromUser || !toUser || !amount || amount <= 0) {
      throw new Error('Invalid payment data');
    }

    if (fromUser.toString() === toUser.toString()) {
      throw new Error('Cannot pay yourself');
    }

    // Get group if specified
    let group = null;
    if (groupId) {
      group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Verify both users are group members
      if (!group.isMember(fromUser) || !group.isMember(toUser)) {
        throw new Error('Both users must be group members');
      }
    }

    // Get expense if specified
    let expense = null;
    if (expenseId) {
      expense = await SplitExpense.findById(expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      // Verify payment is for this expense
      const participant = expense.participants.find(
        p => p.user && p.user.toString() === fromUser.toString()
      );

      if (!participant) {
        throw new Error('User is not a participant in this expense');
      }

      // Update participant's paid amount
      participant.paidAmount = (participant.paidAmount || 0) + amount;
      
      // Mark as paid if fully paid
      if (participant.paidAmount >= participant.share) {
        participant.paid = true;
      }

      // Check if all participants are paid
      const allPaid = expense.participants.every(p => 
        !p.user || p.user.toString() === expense.paidBy.toString() || p.paid
      );

      if (allPaid) {
        expense.settled = true;
      }

      await expense.save();
    }

    // Create payment record
    const payment = new Payment({
      splitExpense: expenseId || null,
      fromUser: fromUser,
      toUser: toUser,
      amount: amount,
      status: 'COMPLETED',
      paymentMethod: paymentMethod,
      notes: notes,
      paidAt: new Date()
    });

    await payment.save();

    // Update balances
    await balanceService.updateBalancesFromPayment(payment);

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Get payment history for a user
 */
async function getUserPayments(userId, groupId = null) {
  try {
    const query = {
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ]
    };

    if (groupId) {
      // Filter by group expenses
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const expenses = await SplitExpense.find({ groupName: group.name });
      const expenseIds = expenses.map(e => e._id);
      
      query.splitExpense = { $in: expenseIds };
    }

    const payments = await Payment.find(query)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('splitExpense', 'description amount')
      .sort({ createdAt: -1 })
      .limit(100);

    return payments;
  } catch (error) {
    console.error('Error getting user payments:', error);
    throw error;
  }
}

/**
 * Get payment history for a group
 */
async function getGroupPayments(groupId) {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const expenses = await SplitExpense.find({ groupName: group.name });
    const expenseIds = expenses.map(e => e._id);

    const payments = await Payment.find({
      splitExpense: { $in: expenseIds }
    })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('splitExpense', 'description amount')
      .sort({ createdAt: -1 });

    return payments;
  } catch (error) {
    console.error('Error getting group payments:', error);
    throw error;
  }
}

module.exports = {
  recordPayment,
  getUserPayments,
  getGroupPayments
};
