const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['stock', 'mutual_fund', 'sip', 'fd', 'gold', 'etf'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    trim: true,
    uppercase: true
  },
  amountInvested: {
    type: Number,
    required: true,
    min: 0
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0
  },
  quantity: {
    type: Number,
    min: 0
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // For Fixed Deposits
  interestRate: {
    type: Number,
    min: 0,
    max: 100
  },
  maturityDate: {
    type: Date
  },
  // For SIP
  sipAmount: {
    type: Number,
    min: 0
  },
  sipFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  // Additional metadata
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
investmentSchema.index({ userId: 1, type: 1 });
investmentSchema.index({ userId: 1, purchaseDate: -1 });
investmentSchema.index({ userId: 1, isActive: 1 });

// Virtual for calculating returns
investmentSchema.virtual('returns').get(function() {
  if (this.currentValue && this.amountInvested) {
    return this.currentValue - this.amountInvested;
  }
  return 0;
});

// Virtual for calculating returns percentage
investmentSchema.virtual('returnsPercentage').get(function() {
  if (this.amountInvested > 0 && this.currentValue) {
    return ((this.currentValue - this.amountInvested) / this.amountInvested) * 100;
  }
  return 0;
});

// Ensure virtuals are included in JSON
investmentSchema.set('toJSON', { virtuals: true });
investmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Investment', investmentSchema);
