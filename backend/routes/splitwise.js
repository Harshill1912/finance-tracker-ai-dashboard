// routes/splitwise.js
// Production-ready Splitwise-style API routes
// Comprehensive expense sharing system

const express = require('express');
const router = express.Router();
const auth = require('../authMiddleare');

const Group = require('../models/group');
const SplitExpense = require('../models/splitExpense');
const Payment = require('../models/payment');
const User = require('../models/user');
const GroupInvitation = require('../models/groupInvitation');

const expenseService = require('../services/expenseService');
const balanceService = require('../services/balanceService');
const paymentService = require('../services/paymentService');
const invitationService = require('../utils/groupInvitationService');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');

// ============================================
// GROUPS
// ============================================

/**
 * Create a new group
 * POST /api/splitwise/groups
 */
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id || req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group name is required' 
      });
    }

    // Check for duplicate group name (optional - you might allow duplicates)
    const existingGroup = await Group.findOne({ 
      name: name.trim(), 
      createdBy: userId,
      isActive: true 
    });

    if (existingGroup) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a group with this name' 
      });
    }

    const group = new Group({
      name: name.trim(),
      description: description || '',
      createdBy: userId,
      members: [userId] // Creator is automatically a member
    });

    await group.save();
    await group.populate('createdBy', 'name email phone');
    await group.populate('members', 'name email phone');

    // Send email and SMS notification to creator
    try {
      const creator = await User.findById(userId);
      console.log('📧 Group creation - Creator info:', {
        id: creator?._id,
        name: creator?.name,
        email: creator?.email,
        phone: creator?.phone
      });
      
      if (creator) {
        const groupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/groups/${group._id}`;
        
        // Send email if creator has email
        if (creator.email) {
          console.log(`📧 Attempting to send group creation email to: ${creator.email}`);
          try {
            const emailResult = await emailService.sendGroupCreatedNotification({
              to: creator.email,
              userName: creator.name,
              groupName: group.name,
              groupDescription: group.description || '',
              groupLink: groupLink
            });
            console.log('📧 Email result:', emailResult);
            if (!emailResult.success) {
              console.error('⚠️ Email sending failed:', emailResult.error || emailResult.note);
            }
          } catch (emailError) {
            console.error('❌ Email sending exception:', emailError);
            console.error('❌ Email error stack:', emailError.stack);
          }
        } else {
          console.log('⚠️ Creator has no email address, skipping email notification');
        }
        
        // Send SMS if creator has phone
        if (creator.phone) {
          console.log(`📱 Attempting to send group creation SMS to: ${creator.phone}`);
          try {
            const smsResult = await smsService.sendGroupCreatedNotification({
              to: creator.phone,
              userName: creator.name,
              groupName: group.name,
              groupLink: groupLink
            });
            console.log('📱 SMS result:', smsResult);
            if (!smsResult.success) {
              console.error('⚠️ SMS sending failed:', smsResult.error || smsResult.note);
            }
          } catch (smsError) {
            console.error('❌ SMS sending exception:', smsError);
            console.error('❌ SMS error stack:', smsError.stack);
          }
        } else {
          console.log('⚠️ Creator has no phone number, skipping SMS notification');
        }
      } else {
        console.error('❌ Creator not found for userId:', userId);
      }
    } catch (notificationError) {
      console.error('❌ Error sending group creation notifications:', notificationError);
      console.error('❌ Notification error stack:', notificationError.stack);
      // Don't fail the request if notifications fail
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating group' 
    });
  }
});

/**
 * Get all groups for current user
 * GET /api/splitwise/groups
 */
router.get('/groups', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const groups = await Group.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ],
      isActive: true
    })
      .populate('createdBy', 'name email')
      .populate('members', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching groups' 
    });
  }
});

/**
 * Get group details with balances
 * GET /api/splitwise/groups/:id
 */
router.get('/groups/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const group = await Group.findById(id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email phone');

    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is a member
    if (!group.isMember(userId) && !group.isAdmin(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    // Get balances
    const balances = await balanceService.calculateGroupBalances(id);
    const simplified = balanceService.simplifyDebts(balances);

    // Get expenses
    const expenses = await expenseService.getGroupExpenses(id, {
      limit: 50
    });

    res.json({
      success: true,
      data: {
        group,
        balances: {
          raw: balances,
          simplified: simplified
        },
        expenses: expenses.slice(0, 20) // Recent expenses
      }
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching group' 
    });
  }
});

// ============================================
// INVITATIONS
// ============================================

/**
 * Invite user to group
 * POST /api/splitwise/groups/:id/invite
 */
router.post('/groups/:id/invite', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body;
    const userId = req.user.id || req.user._id;

    if (!email && !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either email or phone is required' 
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group admin can send invitations' 
      });
    }

    const invitation = await invitationService.createInvitation({
      groupId: id,
      invitedBy: userId,
      email,
      phone,
      groupName: group.name
    });

    await invitation.populate('group', 'name description');
    await invitation.populate('invitedBy', 'name email');

    res.json({
      success: true,
      data: invitation,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error creating invitation' 
    });
  }
});

/**
 * Accept group invitation
 * POST /api/splitwise/invitations/:id/accept
 */
router.post('/invitations/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const result = await invitationService.acceptInvitation(id, userId);

    await result.group.populate('createdBy', 'name email');
    await result.group.populate('members', 'name email phone');

    res.json({
      success: true,
      data: {
        group: result.group,
        alreadyMember: result.alreadyMember
      },
      message: result.alreadyMember 
        ? 'You are already a member of this group' 
        : `You've successfully joined "${result.group.name}"`
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error accepting invitation' 
    });
  }
});

/**
 * Decline group invitation
 * POST /api/splitwise/invitations/:id/decline
 */
router.post('/invitations/:id/decline', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    await invitationService.declineInvitation(id, userId);

    res.json({
      success: true,
      message: 'Invitation declined'
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error declining invitation' 
    });
  }
});

/**
 * Get pending invitations
 * GET /api/splitwise/invitations/pending
 */
router.get('/invitations/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const invitations = await invitationService.getPendingInvitationsForUser(userId);

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching invitations' 
    });
  }
});

// ============================================
// EXPENSES
// ============================================

/**
 * Create expense
 * POST /api/splitwise/expenses
 */
router.post('/expenses', auth, async (req, res) => {
  try {
    const { 
      description, 
      amount, 
      groupId, 
      participants, 
      splitType = 'equal' 
    } = req.body;

    const userId = req.user.id || req.user._id;

    // Validate inputs
    if (!description || !amount || !participants || participants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be positive' 
      });
    }

    // Create expense
    const expense = await expenseService.createExpense({
      description,
      amount: Number(amount),
      paidBy: userId,
      groupId: groupId || null,
      participants,
      splitType
    });

    // Send notifications to participants (EXCLUDE the creator who already paid)
    // Splitwise-style: Only members who OWE money get payment notifications
    try {
      const group = groupId ? await Group.findById(groupId) : null;
      const payer = await User.findById(userId);
      
      for (const participant of expense.participants) {
        if (!participant.user) continue; // Skip guests
        
        const participantUser = await User.findById(participant.user);
        if (!participantUser) continue;

        // SKIP the creator (payer) - they already paid, they don't need payment notifications
        if (participantUser._id.toString() === userId.toString()) {
          console.log(`⏭️ Skipping notification to creator (payer): ${participantUser.name}`);
          continue;
        }

        const expenseLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/expenses/${expense._id}`;

        // Send email to members who owe money
        if (participantUser.email) {
          await emailService.sendExpenseInvite({
            to: participantUser.email,
            expenseDetails: {
              description: expense.description,
              amount: expense.amount,
              share: participant.share
            },
            inviteLink: expenseLink,
            userName: payer.name,
            payerEmail: payer.email,
            payerPhone: payer.phone,
            paymentDetails: payer.paymentDetails || {},
            groupName: group ? group.name : null
          });
          console.log(`✅ Payment notification email sent to ${participantUser.email} (owes ₹${participant.share})`);
        }

        // Send SMS to members who owe money
        if (participantUser.phone) {
          await smsService.sendExpenseInvite({
            to: participantUser.phone,
            expenseDetails: {
              description: expense.description,
              amount: expense.amount,
              share: participant.share
            },
            inviteLink: expenseLink,
            userName: payer.name,
            payerEmail: payer.email,
            payerPhone: payer.phone,
            paymentDetails: payer.paymentDetails || {}
          });
          console.log(`✅ Payment notification SMS sent to ${participantUser.phone} (owes ₹${participant.share})`);
        }
      }
      
      // Optional: Send confirmation to creator (they paid, not a payment request)
      console.log(`✅ Expense created by ${payer.name}. Payment notifications sent to ${expense.participants.length - 1} member(s).`);
    } catch (notificationError) {
      console.error('Error sending expense notifications:', notificationError);
      // Don't fail the request
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error creating expense' 
    });
  }
});

/**
 * Get a single expense by ID
 * GET /api/splitwise/expenses/:id
 */
router.get('/expenses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const expense = await SplitExpense.findById(id)
      .populate('paidBy', 'name email phone paymentDetails')
      .populate('participants.user', 'name email phone status')
      .populate('group', 'name description');

    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    // Verify user has access (must be payer or participant)
    const isPayer = expense.paidBy && (
      expense.paidBy._id?.toString() === userId.toString() || 
      expense.paidBy.toString() === userId.toString()
    );
    const isParticipant = expense.participants?.some(p => 
      p.user && (
        p.user._id?.toString() === userId.toString() || 
        p.user.toString() === userId.toString()
      )
    );

    if (!isPayer && !isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this expense' 
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching expense' 
    });
  }
});

/**
 * Get expenses for a group
 * GET /api/splitwise/groups/:id/expenses
 */
router.get('/groups/:id/expenses', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const { settled, limit = 50 } = req.query;

    // Verify user is a member
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    const expenses = await expenseService.getGroupExpenses(id, {
      settled: settled === 'true' ? true : settled === 'false' ? false : undefined,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching expenses' 
    });
  }
});

/**
 * Update expense
 * PUT /api/splitwise/expenses/:id
 */
router.put('/expenses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const updates = req.body;

    const expense = await expenseService.updateExpense(id, updates, userId);

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error updating expense' 
    });
  }
});

/**
 * Delete expense
 * DELETE /api/splitwise/expenses/:id
 */
router.delete('/expenses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    await expenseService.deleteExpense(id, userId);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error deleting expense' 
    });
  }
});

// ============================================
// BALANCES
// ============================================

/**
 * Get balances for a group
 * GET /api/splitwise/groups/:id/balances
 */
router.get('/groups/:id/balances', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    // Verify user is a member
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    const balances = await balanceService.calculateGroupBalances(id);
    const simplified = balanceService.simplifyDebts(balances);

    // Get user's personal balance
    const userBalance = await balanceService.getUserBalance(userId, id);

    res.json({
      success: true,
      data: {
        raw: balances,
        simplified: simplified,
        userBalance: userBalance
      }
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching balances' 
    });
  }
});

/**
 * Recalculate balances for a group
 * POST /api/splitwise/groups/:id/balances/recalculate
 */
router.post('/groups/:id/balances/recalculate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    // Verify user is admin
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    if (!group.isAdmin(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group admin can recalculate balances' 
      });
    }

    const result = await balanceService.recalculateGroupBalances(id);

    res.json({
      success: true,
      data: result,
      message: 'Balances recalculated successfully'
    });
  } catch (error) {
    console.error('Error recalculating balances:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error recalculating balances' 
    });
  }
});

// ============================================
// PAYMENTS
// ============================================

/**
 * Record a payment
 * POST /api/splitwise/payments
 */
router.post('/payments', auth, async (req, res) => {
  try {
    const { 
      toUser, 
      amount, 
      groupId, 
      expenseId, 
      paymentMethod = 'MANUAL',
      notes = '' 
    } = req.body;

    const fromUser = req.user.id || req.user._id;

    if (!toUser || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment data' 
      });
    }

    if (fromUser.toString() === toUser.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot pay yourself' 
      });
    }

    const payment = await paymentService.recordPayment({
      fromUser,
      toUser,
      amount: Number(amount),
      groupId: groupId || null,
      expenseId: expenseId || null,
      paymentMethod,
      notes
    });

    await payment.populate('fromUser', 'name email');
    await payment.populate('toUser', 'name email');

    res.json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error recording payment' 
    });
  }
});

/**
 * Get payment history
 * GET /api/splitwise/payments
 */
router.get('/payments', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { groupId } = req.query;

    const payments = await paymentService.getUserPayments(userId, groupId || null);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching payments' 
    });
  }
});

// ============================================
// USER BALANCE SUMMARY
// ============================================

/**
 * Get user's balance summary across all groups
 * GET /api/splitwise/balance
 */
router.get('/balance', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Get all groups user is a member of
    const groups = await Group.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ],
      isActive: true
    });

    const balanceSummary = {
      totalOwed: 0,
      totalOwedTo: 0,
      netBalance: 0,
      byGroup: []
    };

    for (const group of groups) {
      try {
        const userBalance = await balanceService.getUserBalance(userId, group._id);
        const balances = await balanceService.calculateGroupBalances(group._id);
        const simplified = balanceService.simplifyDebts(balances);

        balanceSummary.totalOwed += userBalance.totalOwed;
        balanceSummary.totalOwedTo += userBalance.totalOwedTo;

        balanceSummary.byGroup.push({
          groupId: group._id,
          groupName: group.name,
          ...userBalance,
          simplifiedBalances: simplified.filter(b => 
            b.from === userId.toString() || b.to === userId.toString()
          )
        });
      } catch (error) {
        console.error(`Error calculating balance for group ${group._id}:`, error);
      }
    }

    balanceSummary.netBalance = balanceSummary.totalOwedTo - balanceSummary.totalOwed;

    res.json({
      success: true,
      data: balanceSummary
    });
  } catch (error) {
    console.error('Error fetching balance summary:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching balance summary' 
    });
  }
});

module.exports = router;
