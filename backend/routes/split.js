// routes/split.js - Splitwise-style expense splitting with user invitations
const express = require('express');
const mongoose = require('mongoose');
const SplitExpense = require('../models/splitExpense');
const User = require('../models/user');
const Payment = require('../models/payment');
const Balance = require('../models/balance');
const auth = require('../authMiddleare');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const crypto = require('crypto');
const router = express.Router();

// Helper function to find or create user
async function findOrCreateUser({ name, email, phone, status = 'GUEST' }) {
  try {
    // For INVITED status, we need email or phone
    if (status === 'INVITED' && !email && !phone) {
      throw new Error('Email or phone is required for INVITED users');
    }

    // Try to find existing user by email (any status)
    let user = null;
    
    if (email) {
      user = await User.findOne({ email });
    }
    
    // If not found by email, try phone (any status)
    if (!user && phone) {
      user = await User.findOne({ phone });
    }

    // If user exists, return it (don't create duplicate)
    if (user) {
      // Update status if needed (e.g., GUEST -> INVITED if email/phone provided)
      if (status === 'INVITED' && user.status === 'GUEST') {
        // Only update if we have email or phone
        if (email || phone) {
          user.status = 'INVITED';
          if (email && !user.email) user.email = email;
          if (phone && !user.phone) user.phone = phone;
          if (!user.invitationToken) {
            user.invitationToken = crypto.randomBytes(32).toString('hex');
          }
          try {
            await user.save();
          } catch (saveError) {
            // If save fails (validation), just return user as-is
            console.warn('Could not update user status:', saveError.message);
          }
        }
      }
      return user;
    }

    // User doesn't exist - create new user
    if (status === 'INVITED') {
      // INVITED users must have email or phone (schema requirement)
      if (!email && !phone) {
        throw new Error('Email or phone is required for INVITED users');
      }
      
      // Create INVITED user with email or phone
      // Build userData object - only include fields that have values
      const userData = {
        name: name || 'Guest User',
        status: 'INVITED',
        invitationToken: crypto.randomBytes(32).toString('hex'),
      };
      
      // Only add email/phone if they exist and are not empty (don't set undefined/null/empty values)
      if (email && typeof email === 'string' && email.trim().length > 0) {
        userData.email = email.trim().toLowerCase();
      }
      // Don't set email if it's empty/undefined - this is important for INVITED users
      if (!email || (typeof email === 'string' && email.trim().length === 0)) {
        // Explicitly set email to undefined (not null, not empty string) so it's not validated
        delete userData.email;
      }
      
      if (phone && typeof phone === 'string' && phone.trim().length > 0) {
        userData.phone = phone.trim();
      }
      
      // Ensure status is explicitly set to INVITED
      userData.status = 'INVITED';
      
      // Debug: Log what we're creating
      console.log('Creating INVITED user with data:', JSON.stringify(userData, null, 2));
      
      // Create user - status is set to 'INVITED' so email won't be required
      // Make sure email is not in the object if it's not provided
      user = new User(userData);
      
      try {
        await user.save();
      } catch (saveError) {
        // If duplicate key error during save, find existing user
        if (saveError.code === 11000) {
          console.warn('Duplicate key during save, finding existing user:', saveError.keyValue);
          if (saveError.keyValue?.email) {
            user = await User.findOne({ email: saveError.keyValue.email });
          } else if (saveError.keyValue?.phone) {
            user = await User.findOne({ phone: saveError.keyValue.phone });
          }
          if (user) return user;
        }
        // If validation error about email, it might be a schema issue
        if (saveError.name === 'ValidationError' && saveError.errors?.email) {
          console.error('Validation error creating INVITED user:', saveError.errors);
          // Try to find existing user by phone if email validation fails
          if (phone) {
            const existingUser = await User.findOne({ phone });
            if (existingUser) return existingUser;
          }
        }
        throw saveError;
      }
    } else if (status === 'GUEST') {
      // Create GUEST user (name only, no email/phone required)
      user = new User({
        name: name || 'Guest User',
        status: 'GUEST',
      });
      await user.save();
    }

    return user;
  } catch (error) {
    // If duplicate key error, try to find the existing user again
    if (error.code === 11000) {
      console.warn('Duplicate key error, finding existing user:', error.keyValue);
      let existingUser = null;
      
      if (error.keyValue?.email) {
        existingUser = await User.findOne({ email: error.keyValue.email });
      } else if (error.keyValue?.phone) {
        existingUser = await User.findOne({ phone: error.keyValue.phone });
      }
      
      if (existingUser) {
        return existingUser;
      }
    }
    
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

// Helper function to merge duplicate users
async function mergeUsers(primaryUserId, duplicateUserId) {
  const primaryUser = await User.findById(primaryUserId);
  const duplicateUser = await User.findById(duplicateUserId);

  if (!primaryUser || !duplicateUser) {
    throw new Error('User not found');
  }

  // Update all split expenses where duplicate user is a participant
  await SplitExpense.updateMany(
    { 'participants.user': duplicateUserId },
    { $set: { 'participants.$[elem].user': primaryUserId } },
    { arrayFilters: [{ 'elem.user': duplicateUserId }] }
  );

  // Update all payments
  await Payment.updateMany(
    { fromUser: duplicateUserId },
    { $set: { fromUser: primaryUserId } }
  );
  await Payment.updateMany(
    { toUser: duplicateUserId },
    { $set: { toUser: primaryUserId } }
  );

  // Merge balances
  const duplicateBalances = await Balance.find({
    $or: [{ user1: duplicateUserId }, { user2: duplicateUserId }]
  });

  for (const balance of duplicateBalances) {
    const otherUserId = balance.user1.toString() === duplicateUserId.toString() 
      ? balance.user2 
      : balance.user1;
    
    if (otherUserId.toString() !== primaryUserId.toString()) {
      await Balance.updateBalance(primaryUserId, otherUserId, balance.amount);
    }
  }

  // Delete duplicate user
  await User.findByIdAndDelete(duplicateUserId);
}

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Split expenses router is working' });
});

// Get expense details for invitation (public route - no auth required)
router.get('/invitation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const splitExpense = await SplitExpense.findById(id)
      .populate('paidBy', 'name email phone')
      .populate('participants.user', 'name email phone status invitationToken');

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Find the invited user by token to get their email/phone for pre-filling signup
    let invitedUser = null;
    let userParticipant = null;
    
    if (token) {
      // Find user by invitation token
      invitedUser = await User.findOne({ invitationToken: token, status: 'INVITED' });
      
      if (invitedUser) {
        // Find the participant that matches this user
        userParticipant = splitExpense.participants.find(p => 
          p.user && p.user._id.toString() === invitedUser._id.toString()
        );
      }
    }

    // Return expense details (public info) with invitation user info
    res.json({
      success: true,
      data: {
        _id: splitExpense._id,
        description: splitExpense.description,
        amount: splitExpense.amount,
        paidBy: splitExpense.paidBy,
        participants: splitExpense.participants,
        createdAt: splitExpense.createdAt,
        // Include invitation user info for pre-filling signup form
        invitationUser: invitedUser ? {
          email: invitedUser.email,
          phone: invitedUser.phone,
          name: invitedUser.name
        } : null,
        userShare: userParticipant ? userParticipant.share : null
      }
    });
  } catch (error) {
    console.error('Error fetching invitation expense:', error);
    res.status(500).json({ success: false, message: 'Error fetching expense details' });
  }
});

// Create a new split expense with user invitations
router.post('/', auth, async (req, res) => {
  const { description, amount, participants, groupName } = req.body;

  if (!description || !amount || !participants || participants.length === 0) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const paidByUserId = req.user.id || req.user._id;
    const paidByUser = await User.findById(paidByUserId);
    
    if (!paidByUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get payment details
    const paymentDetails = paidByUser.paymentDetails || {};
    
    if (!paidByUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const processedParticipants = [];
    const invitations = [];

    // Process each participant
    for (const participant of participants) {
      try {
        const { name, email, phone, share } = participant;
        
        if (!name || share === undefined || isNaN(share)) {
          console.warn('Skipping invalid participant:', participant);
          continue; // Skip invalid participants
        }

        // Check if participant is the same as the payer (skip yourself)
        if (email && paidByUser.email && email.toLowerCase() === paidByUser.email.toLowerCase()) {
          console.warn('Skipping participant - same as payer:', email);
          continue; // Skip if it's the same user
        }
        if (phone && paidByUser.phone && phone === paidByUser.phone) {
          console.warn('Skipping participant - same as payer:', phone);
          continue; // Skip if it's the same user
        }

        let user = null;
        let userType = 'GUEST';

        // Determine user type and find/create user
        if (email || phone) {
          // Try to find existing user (any status) - check if it's the payer first
          if (email) {
            user = await User.findOne({ email });
            // Skip if it's the payer
            if (user && user._id.toString() === paidByUserId.toString()) {
              console.warn('Skipping participant - same as payer (by email)');
              continue;
            }
          }
          if (!user && phone) {
            user = await User.findOne({ phone });
            // Skip if it's the payer
            if (user && user._id.toString() === paidByUserId.toString()) {
              console.warn('Skipping participant - same as payer (by phone)');
              continue;
            }
          }

          if (!user) {
            // Create INVITED user
            user = await findOrCreateUser({ name, email, phone, status: 'INVITED' });
            userType = 'INVITED';
            
            // Prepare invitation
            invitations.push({
              user,
              email,
              phone,
              share
            });
          } else {
            // User exists - check if it's still the payer (double check)
            if (user._id.toString() === paidByUserId.toString()) {
              console.warn('Skipping participant - same as payer');
              continue;
            }
            userType = user.status;
          }
        } else {
          // Name only - create GUEST user
          user = await findOrCreateUser({ name, status: 'GUEST' });
          userType = 'GUEST';
        }

        if (!user || !user._id) {
          console.error('Failed to create/find user for participant:', participant);
          continue;
        }

        // Final check - make sure we're not adding the payer
        if (user._id.toString() === paidByUserId.toString()) {
          console.warn('Skipping participant - same as payer (final check)');
          continue;
        }

        processedParticipants.push({
          user: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          share: Number(share),
          paidAmount: 0,
          paid: false,
          userType
        });
      } catch (participantError) {
        console.error('Error processing participant:', participant, participantError);
        // Continue with other participants
        continue;
      }
    }

    if (processedParticipants.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid participants found' });
    }

    // Create split expense
    const splitExpense = new SplitExpense({
      description,
      amount: Number(amount),
      participants: processedParticipants,
      paidBy: paidByUserId,
      user: paidByUserId, // Legacy field
      settled: false,
      groupName: groupName || null, // Optional group name
    });

    await splitExpense.save();

    // Create payments and update balances
    for (const participant of processedParticipants) {
      try {
        // participant.user is already an ObjectId
        const participantUserId = participant.user;
        if (participantUserId && participantUserId.toString() !== paidByUserId.toString()) {
          // Create payment record
          const payment = new Payment({
            splitExpense: splitExpense._id,
            fromUser: participantUserId,
            toUser: paidByUserId,
            amount: participant.share,
            status: 'PENDING',
          });
          await payment.save();

          // Update balance
          try {
            await Balance.updateBalance(participantUserId, paidByUserId, participant.share);
          } catch (balanceError) {
            console.error('Error updating balance:', balanceError);
            // Continue even if balance update fails
          }
        }
      } catch (paymentError) {
        console.error('Error creating payment for participant:', participant, paymentError);
        // Continue with other participants
      }
    }

    // Send payment notifications to ALL participants (EXCEPT the creator who already paid)
    // Splitwise-style: Only members who OWE money get payment notifications
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Send notifications to INVITED users (new users)
    for (const invitation of invitations) {
      try {
        if (!invitation.user || !invitation.user._id) {
          continue;
        }
        
        // SKIP the creator (payer) - they already paid
        if (invitation.user._id.toString() === paidByUserId.toString()) {
          console.log(`⏭️ Skipping notification to creator (payer): ${invitation.user.name}`);
          continue;
        }
        
        // Create proper invitation link
        const inviteLink = `${baseUrl}/invitation?expense=${splitExpense._id}&token=${invitation.user.invitationToken || ''}`;
        
        if (invitation.email && invitation.user.status === 'INVITED') {
          try {
            await emailService.sendExpenseInvite({
              to: invitation.email,
              expenseDetails: {
                description,
                amount,
                share: invitation.share
              },
              inviteLink,
              userName: paidByUser.name,
              payerEmail: paidByUser.email,
              payerPhone: paidByUser.phone,
              paymentDetails: paymentDetails,
              groupName: groupName || null // Pass group name if provided
            });
            console.log(`✅ Payment notification email sent to ${invitation.email} (owes ₹${invitation.share})`);
          } catch (emailError) {
            console.error('❌ Error sending email invitation:', emailError);
            // Continue even if email fails
          }
        }

        if (invitation.phone && invitation.user.status === 'INVITED') {
          try {
            await smsService.sendExpenseInvite({
              to: invitation.phone,
              expenseDetails: {
                description,
                amount,
                share: invitation.share
              },
              inviteLink,
              userName: paidByUser.name,
              payerEmail: paidByUser.email,
              payerPhone: paidByUser.phone,
              paymentDetails: paymentDetails
            });
            console.log(`✅ Payment notification SMS sent to ${invitation.phone} (owes ₹${invitation.share})`);
          } catch (smsError) {
            console.error('❌ Error sending SMS invitation:', smsError);
            // Continue even if SMS fails
          }
        }
      } catch (invitationError) {
        console.error('Error processing invitation:', invitationError);
        // Continue with other invitations
      }
    }
    
    // Send notifications to ACTIVE users (existing users who are participants)
    // They also need payment notifications, not just INVITED users
    for (const participant of processedParticipants) {
      try {
        if (!participant.user) continue; // Skip if no user
        
        const participantUser = await User.findById(participant.user);
        if (!participantUser) continue;
        
        // SKIP the creator (payer) - they already paid
        if (participantUser._id.toString() === paidByUserId.toString()) {
          console.log(`⏭️ Skipping notification to creator (payer): ${participantUser.name}`);
          continue;
        }
        
        // Only send to ACTIVE users (INVITED users already handled above)
        if (participantUser.status !== 'ACTIVE') continue;
        
        const expenseLink = `${baseUrl}/expenses/${splitExpense._id}`;
        
        // Send email to ACTIVE users who owe money
        if (participantUser.email) {
          try {
            await emailService.sendExpenseInvite({
              to: participantUser.email,
              expenseDetails: {
                description,
                amount,
                share: participant.share
              },
              inviteLink: expenseLink,
              userName: paidByUser.name,
              payerEmail: paidByUser.email,
              payerPhone: paidByUser.phone,
              paymentDetails: paymentDetails,
              groupName: groupName || null
            });
            console.log(`✅ Payment notification email sent to ${participantUser.email} (owes ₹${participant.share})`);
          } catch (emailError) {
            console.error('❌ Error sending email to ACTIVE user:', emailError);
          }
        }
        
        // Send SMS to ACTIVE users who owe money
        if (participantUser.phone) {
          try {
            await smsService.sendExpenseInvite({
              to: participantUser.phone,
              expenseDetails: {
                description,
                amount,
                share: participant.share
              },
              inviteLink: expenseLink,
              userName: paidByUser.name,
              payerEmail: paidByUser.email,
              payerPhone: paidByUser.phone,
              paymentDetails: paymentDetails
            });
            console.log(`✅ Payment notification SMS sent to ${participantUser.phone} (owes ₹${participant.share})`);
          } catch (smsError) {
            console.error('❌ Error sending SMS to ACTIVE user:', smsError);
          }
        }
      } catch (participantError) {
        console.error('Error sending notification to participant:', participantError);
        // Continue with other participants
      }
    }
    
    console.log(`✅ Expense created by ${paidByUser.name}. Payment notifications sent to members who owe money.`);

    // Populate participants for response
    await splitExpense.populate('participants.user', 'name email phone status');
    await splitExpense.populate('paidBy', 'name email');

    // Populate participants for response (optional - don't fail if it fails)
    try {
      await splitExpense.populate('participants.user', 'name email phone status');
      await splitExpense.populate('paidBy', 'name email');
    } catch (populateError) {
      console.error('Error populating split expense:', populateError);
      // Continue even if populate fails - return without populated data
    }

    // Convert to plain object for response
    const expenseData = splitExpense.toObject ? splitExpense.toObject() : splitExpense;

    res.status(201).json({ 
      success: true, 
      message: 'Split expense created successfully', 
      data: expenseData
    });
  } catch (error) {
    console.error('Error creating split expense:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating split expense', 
      error: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
});

// Get all split expenses for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Get expenses where user is the payer or a participant
    const splitExpenses = await SplitExpense.find({
      $or: [
        { paidBy: userId },
        { 'participants.user': userId }
      ]
    })
    .populate('paidBy', 'name email phone status')
    .populate('participants.user', 'name email phone status')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: splitExpenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching split expenses', error: error.message });
  }
});

// Get a single split expense
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const splitExpense = await SplitExpense.findOne({
      _id: req.params.id,
      $or: [
        { paidBy: userId },
        { 'participants.user': userId }
      ]
    })
    .populate('paidBy', 'name email phone status paymentDetails')
    .populate('participants.user', 'name email phone status');
    
    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }
    
    res.json({ success: true, data: splitExpense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching split expense', error: error.message });
  }
});

// Record a payment/settlement
router.post('/:id/payment', auth, async (req, res) => {
  const { participantId, amount, paymentMethod = 'MANUAL', notes } = req.body;

  try {
    const userId = req.user.id || req.user._id;
    
    // Validate input
    if (!participantId) {
      return res.status(400).json({ success: false, message: 'Participant ID is required' });
    }

    const splitExpense = await SplitExpense.findById(req.params.id)
      .populate('paidBy', 'name email phone status')
      .populate('participants.user', 'name email phone status');

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }

    // Check if user has permission (must be the payer)
    if (splitExpense.paidBy._id.toString() !== userId.toString() && 
        splitExpense.paidBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the person who paid can record payments' });
    }

    // Find participant - try both string and ObjectId matching
    let participant = null;
    if (mongoose.Types.ObjectId.isValid(participantId)) {
      participant = splitExpense.participants.id(participantId);
    }
    
    // If not found by ID, try finding by index or user ID
    if (!participant) {
      participant = splitExpense.participants.find(p => 
        p._id.toString() === participantId || 
        p.user.toString() === participantId ||
        p.user._id?.toString() === participantId
      );
    }

    if (!participant) {
      console.error('Participant not found. participantId:', participantId);
      console.error('Available participants:', splitExpense.participants.map(p => ({
        id: p._id.toString(),
        userId: p.user.toString() || p.user._id?.toString(),
        name: p.name
      })));
      return res.status(404).json({ success: false, message: 'Participant not found in this expense' });
    }

    // Ensure participant.user is an ObjectId
    const participantUserId = participant.user._id || participant.user;
    if (!participantUserId) {
      return res.status(400).json({ success: false, message: 'Invalid participant user data' });
    }

    const paymentAmount = Number(amount) || participant.share;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const currentPaidAmount = Number(participant.paidAmount) || 0;
    const newPaidAmount = Math.min(currentPaidAmount + paymentAmount, participant.share);

    // Update participant payment
    participant.paidAmount = newPaidAmount;
    participant.paid = newPaidAmount >= participant.share;

    // Find or create payment record
    let payment = await Payment.findOne({
      splitExpense: splitExpense._id,
      fromUser: participantUserId,
      toUser: splitExpense.paidBy._id || splitExpense.paidBy
    });

    if (!payment) {
      // Create new payment record if it doesn't exist
      payment = new Payment({
        splitExpense: splitExpense._id,
        fromUser: participantUserId,
        toUser: splitExpense.paidBy._id || splitExpense.paidBy,
        amount: participant.share,
        paidAmount: newPaidAmount,
        status: newPaidAmount >= participant.share ? 'COMPLETED' : 
                newPaidAmount > 0 ? 'PARTIAL' : 'PENDING',
        paymentMethod: paymentMethod,
        notes: notes || ''
      });
    } else {
      // Update existing payment
      payment.paidAmount = newPaidAmount;
      payment.status = newPaidAmount >= participant.share ? 'COMPLETED' : 
                       newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
      payment.paymentMethod = paymentMethod;
      if (notes !== undefined) payment.notes = notes;
      if (payment.status === 'COMPLETED' && !payment.paidAt) {
        payment.paidAt = new Date();
      }
    }
    
    await payment.save();

    // Update balance (reduce the amount owed)
    try {
      const paidByUserId = splitExpense.paidBy._id || splitExpense.paidBy;
      await Balance.updateBalance(participantUserId, paidByUserId, -paymentAmount);
    } catch (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Continue even if balance update fails - payment is still recorded
    }

    // Check if all participants have paid
    const allPaid = splitExpense.participants.every(p => p.paid);
    splitExpense.settled = allPaid;

    await splitExpense.save();

    // Populate for response
    await splitExpense.populate('paidBy', 'name email phone status');
    await splitExpense.populate('participants.user', 'name email phone status');

    res.json({ 
      success: true, 
      message: 'Payment recorded successfully', 
      data: splitExpense 
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error recording payment', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate payment link (only for ACTIVE and INVITED users)
router.post('/:id/payment-link', auth, async (req, res) => {
  const { participantId } = req.body;

  try {
    const splitExpense = await SplitExpense.findById(req.params.id)
      .populate('participants.user', 'name email phone status');

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }

    const participant = splitExpense.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    const participantUser = await User.findById(participant.user);
    if (!participantUser || !['ACTIVE', 'INVITED'].includes(participantUser.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment links are only available for registered users' 
      });
    }

    // Generate payment link
    const paymentToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const paymentLink = `${baseUrl}/payment/${paymentToken}?expense=${splitExpense._id}&participant=${participantId}`;

    // Update payment record with link
    const payment = await Payment.findOne({
      splitExpense: splitExpense._id,
      fromUser: participant.user,
      toUser: splitExpense.paidBy
    });

    if (payment) {
      payment.paymentLink = paymentLink;
      payment.paymentLinkExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await payment.save();
    }

    res.json({ success: true, paymentLink, expiresAt: payment.paymentLinkExpiry });
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({ success: false, message: 'Error generating payment link', error: error.message });
  }
});

// Send payment reminder (only for ACTIVE and INVITED users)
router.post('/:id/reminder', auth, async (req, res) => {
  const { participantId } = req.body;

  try {
    const splitExpense = await SplitExpense.findById(req.params.id)
      .populate('paidBy', 'name email phone status')
      .populate('participants.user', 'name email phone status');

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }

    const participant = splitExpense.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    const participantUser = await User.findById(participant.user);
    if (!participantUser || !['ACTIVE', 'INVITED'].includes(participantUser.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reminders are only available for registered users' 
      });
    }

    const remainingAmount = participant.share - participant.paidAmount;
    const paidByUser = splitExpense.paidBy;
    
    // Get payer's payment details
    const payerUser = await User.findById(paidByUser._id).select('paymentDetails');
    const payerPaymentDetails = payerUser?.paymentDetails || {};

    // Send email reminder
    if (participantUser.email) {
      await emailService.sendPaymentReminder({
        to: participantUser.email,
        expenseDetails: {
          description: splitExpense.description,
          amount: splitExpense.amount
        },
        amount: remainingAmount,
        userName: paidByUser.name,
        payerEmail: paidByUser.email,
        payerPhone: paidByUser.phone,
        paymentDetails: payerPaymentDetails
      });
    }

    // Send SMS reminder
    if (participantUser.phone) {
      await smsService.sendPaymentReminder({
        to: participantUser.phone,
        expenseDetails: {
          description: splitExpense.description,
          amount: splitExpense.amount
        },
        amount: remainingAmount,
        userName: paidByUser.name,
        payerEmail: paidByUser.email,
        payerPhone: paidByUser.phone,
        paymentDetails: payerPaymentDetails
      });
    }

    res.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ success: false, message: 'Error sending reminder', error: error.message });
  }
});

// Get balances for a user
router.get('/balances/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user.id || req.user._id;

    // Only allow users to view their own balances
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const balances = await Balance.find({
      $or: [{ user1: userId }, { user2: userId }]
    })
    .populate('user1', 'name email phone status')
    .populate('user2', 'name email phone status');

    // Format balances
    const formattedBalances = balances.map(balance => {
      const isUser1 = balance.user1._id.toString() === userId;
      const otherUser = isUser1 ? balance.user2 : balance.user1;
      const amount = isUser1 ? balance.amount : -balance.amount;

      return {
        user: otherUser,
        amount,
        owesYou: amount > 0,
        youOwe: amount < 0
      };
    });

    res.json({ success: true, data: formattedBalances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching balances', error: error.message });
  }
});

// Update a split expense
router.put('/:id', auth, async (req, res) => {
  const { description, amount, participants } = req.body;

  try {
    const userId = req.user.id || req.user._id;
    const splitExpense = await SplitExpense.findOne({
      _id: req.params.id,
      paidBy: userId
    });

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }

    // Update fields
    if (description) splitExpense.description = description;
    if (amount) splitExpense.amount = amount;
    if (participants) {
      // Recalculate and update participants
      // This is a simplified version - in production, handle balance updates
      splitExpense.participants = participants;
    }

    await splitExpense.save();
    await splitExpense.populate('paidBy', 'name email phone status');
    await splitExpense.populate('participants.user', 'name email phone status');

    res.json({ success: true, message: 'Split expense updated successfully', data: splitExpense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating split expense', error: error.message });
  }
});

// Delete a split expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const splitExpense = await SplitExpense.findOne({
      _id: req.params.id,
      paidBy: userId
    });

    if (!splitExpense) {
      return res.status(404).json({ success: false, message: 'Split expense not found' });
    }

    // Reverse balance updates
    for (const participant of splitExpense.participants) {
      if (participant.user.toString() !== userId.toString()) {
        await Balance.updateBalance(participant.user, userId, -participant.share);
      }
    }

    // Delete associated payments
    await Payment.deleteMany({ splitExpense: splitExpense._id });

    // Delete the expense
    await splitExpense.deleteOne();

    res.json({ success: true, message: 'Split expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting split expense', error: error.message });
  }
});

module.exports = router;
