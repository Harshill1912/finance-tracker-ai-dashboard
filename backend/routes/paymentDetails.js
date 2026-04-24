// Payment details management routes
const express = require('express');
const User = require('../models/user');
const auth = require('../authMiddleare');
const router = express.Router();

// Get user's payment details
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('paymentDetails name email phone');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        paymentDetails: user.paymentDetails || {},
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment details', error: error.message });
  }
});

// Update user's payment details
router.put('/', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      upiId,
      bankAccountNumber,
      bankIFSC,
      bankName,
      accountHolderName,
      preferredPaymentMethod,
      showPaymentDetails
    } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update payment details
    if (!user.paymentDetails) {
      user.paymentDetails = {};
    }

    if (upiId !== undefined) user.paymentDetails.upiId = upiId || null;
    if (bankAccountNumber !== undefined) user.paymentDetails.bankAccountNumber = bankAccountNumber || null;
    if (bankIFSC !== undefined) user.paymentDetails.bankIFSC = bankIFSC || null;
    if (bankName !== undefined) user.paymentDetails.bankName = bankName || null;
    if (accountHolderName !== undefined) user.paymentDetails.accountHolderName = accountHolderName || null;
    if (preferredPaymentMethod !== undefined) user.paymentDetails.preferredPaymentMethod = preferredPaymentMethod || 'NONE';
    if (showPaymentDetails !== undefined) user.paymentDetails.showPaymentDetails = showPaymentDetails;

    await user.save();

    res.json({
      success: true,
      message: 'Payment details updated successfully',
      data: user.paymentDetails
    });
  } catch (error) {
    console.error('Error updating payment details:', error);
    res.status(500).json({ success: false, message: 'Error updating payment details', error: error.message });
  }
});

// Get payment details for a specific user (for split expenses)
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id || req.user._id;

    // Only allow users to view payment details of users they have expenses with
    // For now, allow viewing (in production, add proper authorization)
    const user = await User.findById(userId).select('paymentDetails name email phone');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only return payment details if user has enabled sharing
    const paymentInfo = {
      name: user.name,
      email: user.email,
      phone: user.phone
    };

    if (user.paymentDetails?.showPaymentDetails) {
      if (user.paymentDetails.upiId) {
        paymentInfo.upiId = user.paymentDetails.upiId;
      }
      if (user.paymentDetails.bankAccountNumber && user.paymentDetails.bankIFSC) {
        paymentInfo.bankAccountNumber = user.paymentDetails.bankAccountNumber;
        paymentInfo.bankIFSC = user.paymentDetails.bankIFSC;
        paymentInfo.bankName = user.paymentDetails.bankName;
        paymentInfo.accountHolderName = user.paymentDetails.accountHolderName;
      }
      paymentInfo.preferredPaymentMethod = user.paymentDetails.preferredPaymentMethod;
    }

    res.json({
      success: true,
      data: paymentInfo
    });
  } catch (error) {
    console.error('Error fetching user payment details:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment details', error: error.message });
  }
});

module.exports = router;
