const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  splitExpense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SplitExpense',
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'COMPLETED'],
    default: 'PENDING'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['MANUAL', 'PAYMENT_LINK', 'BANK_TRANSFER', 'UPI', 'RAZORPAY', 'OTHER'],
    default: 'MANUAL'
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  paymentLink: {
    type: String
  },
  paymentLinkExpiry: {
    type: Date
  },
  notes: {
    type: String
  },
  paidAt: {
    type: Date
  }
}, { timestamps: true });

PaymentSchema.index({ splitExpense: 1 });
PaymentSchema.index({ fromUser: 1 });
PaymentSchema.index({ toUser: 1 });
PaymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
