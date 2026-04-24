// Simple payment routes - No KYC required
const express = require('express');
const router = express.Router();
const auth = require('../authMiddleare');
const Payment = require('../models/payment');
const SplitExpense = require('../models/splitExpense');
const User = require('../models/user');
const balanceService = require('../services/balanceService');
const crypto = require('crypto');

// Test route to verify registration
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Simple payment routes are working' });
});

/**
 * Generate simple payment link
 * POST /api/simple-payments/generate-link
 */
router.post('/generate-link', auth, async (req, res) => {
  try {
    const { amount, expenseId, toUserId, description } = req.body;
    const fromUserId = req.user.id || req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient user ID is required'
      });
    }

    // Get recipient details
    const recipient = await User.findById(toUserId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Generate unique payment token
    const paymentToken = crypto.randomBytes(32).toString('hex');
    
    // Create payment record with PENDING status
    const payment = new Payment({
      splitExpense: expenseId || null,
      fromUser: fromUserId,
      toUser: toUserId,
      amount: Number(amount),
      status: 'PENDING',
      paymentMethod: 'PAYMENT_LINK',
      paymentLink: paymentToken,
      paymentLinkExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      notes: description || 'Payment via payment link'
    });

    await payment.save();

    // Generate payment link URL
    const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${paymentToken}`;

    // Generate UPI deep link if recipient has UPI ID (with amount pre-filled)
    let upiDeepLink = null;
    if (recipient.paymentDetails?.upiId) {
      const upiId = recipient.paymentDetails.upiId;
      // Format amount: UPI deep links accept amount in decimal format (e.g., 100.50 for ₹100.50)
      const upiAmount = parseFloat(amount).toFixed(2); // Ensure 2 decimal places
      const paymentDescription = description || 'Payment';
      upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(paymentDescription)}`;
      console.log('🔗 Generated UPI deep link:', {
        upiId,
        amount: upiAmount,
        description: paymentDescription,
        link: upiDeepLink
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        paymentLink,
        paymentToken,
        amount: payment.amount,
        recipient: {
          name: recipient.name,
          upiId: recipient.paymentDetails?.upiId || null,
          bankAccount: recipient.paymentDetails?.bankAccountNumber || null,
          bankIFSC: recipient.paymentDetails?.bankIFSC || null
        },
        upiDeepLink,
        expiresAt: payment.paymentLinkExpiry
      }
    });
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating payment link'
    });
  }
});

/**
 * Get payment link details
 * GET /api/simple-payments/link/:token
 */
router.get('/link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔗 Payment link request received for token:', token);
    console.log('🔗 Full URL:', req.originalUrl);
    console.log('🔗 Method:', req.method);
    
    if (!token || token === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Payment token is required'
      });
    }

    console.log('🔍 Searching for payment with token:', token);
    const payment = await Payment.findOne({
      paymentLink: token,
      status: 'PENDING'
    })
      .populate('fromUser', 'name email phone')
      .populate('toUser', 'name email phone paymentDetails')
      .populate('splitExpense', 'description amount');

    console.log('🔍 Payment found:', payment ? 'Yes' : 'No');

    if (!payment) {
      // Also check if payment exists but is not PENDING
      const anyPayment = await Payment.findOne({ paymentLink: token });
      if (anyPayment) {
        console.log('⚠️ Payment exists but status is:', anyPayment.status);
        return res.status(400).json({
          success: false,
          message: `Payment link has been ${anyPayment.status.toLowerCase()}`
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Payment link not found or expired'
      });
    }

    // Check if link expired
    if (payment.paymentLinkExpiry && new Date() > payment.paymentLinkExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Payment link has expired'
      });
    }

    // Generate UPI deep link with amount pre-filled
    let upiDeepLink = null;
    if (payment.toUser.paymentDetails?.upiId) {
      const upiId = payment.toUser.paymentDetails.upiId;
      const description = payment.splitExpense?.description || 'Payment';
      // Format amount: UPI deep links accept amount in decimal format (e.g., 100.50 for ₹100.50)
      // Ensure amount is properly formatted with 2 decimal places
      const amount = parseFloat(payment.amount).toFixed(2);
      upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
      console.log('🔗 Generated UPI deep link:', {
        upiId,
        amount,
        description,
        link: upiDeepLink
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        fromUser: {
          name: payment.fromUser.name,
          email: payment.fromUser.email,
          phone: payment.fromUser.phone
        },
        toUser: {
          name: payment.toUser.name,
          email: payment.toUser.email,
          phone: payment.toUser.phone,
          upiId: payment.toUser.paymentDetails?.upiId || null,
          bankAccount: payment.toUser.paymentDetails?.bankAccountNumber || null,
          bankIFSC: payment.toUser.paymentDetails?.bankIFSC || null,
          bankName: payment.toUser.paymentDetails?.bankName || null
        },
        expense: payment.splitExpense ? {
          description: payment.splitExpense.description,
          amount: payment.splitExpense.amount
        } : null,
        upiDeepLink,
        expiresAt: payment.paymentLinkExpiry
      }
    });
  } catch (error) {
    console.error('Error fetching payment link:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment link'
    });
  }
});

/**
 * Confirm payment (mark as completed)
 * POST /api/simple-payments/confirm/:token
 */
router.post('/confirm/:token', auth, async (req, res) => {
  try {
    const { token } = req.params;
    const { paymentMethod = 'UPI', notes = '' } = req.body;
    const userId = req.user.id || req.user._id;

    const payment = await Payment.findOne({
      paymentLink: token,
      status: 'PENDING'
    })
      .populate('splitExpense')
      .populate('fromUser')
      .populate('toUser');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found'
      });
    }

    // Verify user is the payer
    if (payment.fromUser._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this payment'
      });
    }

    // Check if link expired
    if (payment.paymentLinkExpiry && new Date() > payment.paymentLinkExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Payment link has expired'
      });
    }

    // Update payment status
    payment.status = 'COMPLETED';
    payment.paymentMethod = paymentMethod;
    payment.notes = notes || payment.notes;
    payment.paidAt = new Date();
    await payment.save();

    // Update expense participant if expenseId is provided
    if (payment.splitExpense) {
      const expense = await SplitExpense.findById(payment.splitExpense._id);
      if (expense) {
        const participant = expense.participants.find(p =>
          p.user && (
            p.user.toString() === userId.toString() ||
            p.user._id?.toString() === userId.toString()
          )
        );

        if (participant) {
          participant.paidAmount = (participant.paidAmount || 0) + payment.amount;
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
      }
    }

    // Update balances
    await balanceService.updateBalancesFromPayment(payment);

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: payment._id,
        amount: payment.amount
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming payment'
    });
  }
});

// Debug: Log all requests to this router
router.use((req, res, next) => {
  console.log(`📥 Simple Payment Route: ${req.method} ${req.path}`);
  next();
});

module.exports = router;
