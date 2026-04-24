// Payment processing routes using Razorpay
const express = require('express');
const router = express.Router();
const auth = require('../authMiddleare');
const crypto = require('crypto');
const Payment = require('../models/payment');
const SplitExpense = require('../models/splitExpense');
const User = require('../models/user');
const Balance = require('../models/balance');
const balanceService = require('../services/balanceService');

// Initialize Razorpay (optional - only if credentials are provided)
let Razorpay, razorpay;
try {
  Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
  } else {
    console.log('⚠️  Razorpay credentials not configured - payment features will be limited');
  }
} catch (error) {
  console.log('⚠️  Razorpay package not available - payment features will be limited');
}

/**
 * Create Razorpay order for payment
 * POST /api/payments/create-order
 */
router.post('/create-order', auth, async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Please configure Razorpay credentials.'
      });
    }

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

    // Verify expense exists and user is a participant
    if (expenseId) {
      const expense = await SplitExpense.findById(expenseId)
        .populate('paidBy', 'name email')
        .populate('participants.user', 'name email');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      const isParticipant = expense.participants?.some(p =>
        p.user && (
          p.user._id?.toString() === fromUserId.toString() ||
          p.user.toString() === fromUserId.toString()
        )
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this expense'
        });
      }
    }

    // Get recipient user details
    const recipient = await User.findById(toUserId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise (Razorpay expects amount in smallest currency unit)
      currency: 'INR',
      receipt: `expense_${expenseId || 'manual'}_${Date.now()}`,
      notes: {
        fromUserId: fromUserId.toString(),
        toUserId: toUserId.toString(),
        expenseId: expenseId || null,
        description: description || 'Split expense payment'
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating payment order'
    });
  }
});

/**
 * Verify Razorpay payment and record it
 * POST /api/payments/verify-payment
 */
router.post('/verify-payment', auth, async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Please configure Razorpay credentials.'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, expenseId, toUserId, amount, paymentMethod, notes } = req.body;
    const fromUserId = req.user.id || req.user._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification data is required'
      });
    }

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - invalid signature'
      });
    }

    // Verify payment with Razorpay
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment not successful. Status: ${payment.status}`
        });
      }

      // Payment verified - record it in database
      const paymentRecord = new Payment({
        splitExpense: expenseId || null,
        fromUser: fromUserId,
        toUser: toUserId,
        amount: Number(amount),
        status: 'COMPLETED',
        paymentMethod: paymentMethod || 'RAZORPAY',
        notes: notes || `Razorpay Payment ID: ${razorpay_payment_id}`,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date()
      });

      await paymentRecord.save();

      // Update expense participant if expenseId is provided
      if (expenseId) {
        const expense = await SplitExpense.findById(expenseId);
        if (expense) {
          const participant = expense.participants.find(p =>
            p.user && (
              p.user.toString() === fromUserId.toString() ||
              p.user._id?.toString() === fromUserId.toString()
            )
          );

          if (participant) {
            participant.paidAmount = (participant.paidAmount || 0) + Number(amount);
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
      await balanceService.updateBalancesFromPayment(paymentRecord);

      res.json({
        success: true,
        message: 'Payment verified and recorded successfully',
        data: {
          paymentId: paymentRecord._id,
          razorpayPaymentId: razorpay_payment_id,
          amount: paymentRecord.amount
        }
      });
    } catch (razorpayError) {
      console.error('Razorpay verification error:', razorpayError);
      return res.status(500).json({
        success: false,
        message: 'Error verifying payment with Razorpay'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying payment'
    });
  }
});

/**
 * Get payment status
 * GET /api/payments/status/:paymentId
 */
router.get('/status/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id || req.user._id;

    const payment = await Payment.findById(paymentId)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify user has access
    if (payment.fromUser._id.toString() !== userId.toString() &&
        payment.toUser._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this payment'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment status'
    });
  }
});

module.exports = router;
