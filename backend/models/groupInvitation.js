// models/groupInvitation.js - Group invitation model
const mongoose = require('mongoose');
const crypto = require('crypto');

const GroupInvitationSchema = new mongoose.Schema({
  // Group being invited to
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  // User who sent the invitation
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // Invitation identifier - email or phone
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true, // Allow null, but unique when present
    index: true
  },
  phone: {
    type: String,
    trim: true,
    sparse: true, // Allow null, but unique when present
    index: true
  },
  // Status of the invitation
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
    index: true
  },
  // User who accepted (if accepted)
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null
  },
  // Unique token for invitation link
  token: {
    type: String,
    unique: true,
    sparse: true,
    default: function() {
      return crypto.randomBytes(32).toString('hex');
    }
  },
  // Expiration date (optional - 30 days default)
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 30); // 30 days from now
      return date;
    }
  },
  // Timestamps
  acceptedAt: {
    type: Date,
    default: null
  },
  declinedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compound index to prevent duplicate pending invites for same group+email/phone
GroupInvitationSchema.index({ group: 1, email: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { email: { $exists: true }, status: 'pending' }
});

GroupInvitationSchema.index({ group: 1, phone: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { phone: { $exists: true }, status: 'pending' }
});

// Index for finding invitations by email/phone
GroupInvitationSchema.index({ email: 1, status: 1 });
GroupInvitationSchema.index({ phone: 1, status: 1 });

// Validation: Must have either email or phone
GroupInvitationSchema.pre('validate', function(next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone is required');
    this.invalidate('phone', 'Either email or phone is required');
  }
  next();
});

// Method to check if invitation is expired
GroupInvitationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Method to mark as expired
GroupInvitationSchema.methods.markExpired = async function() {
  if (this.status === 'pending' && this.isExpired()) {
    this.status = 'expired';
    await this.save();
  }
};

// Static method to normalize phone number
GroupInvitationSchema.statics.normalizePhone = function(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Add + prefix if not present and has country code
  if (digits.length >= 10) {
    return digits.startsWith('+') ? digits : `+${digits}`;
  }
  return phone; // Return as-is if can't normalize
};

// Static method to normalize email
GroupInvitationSchema.statics.normalizeEmail = function(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
};

const GroupInvitation = mongoose.model('GroupInvitation', GroupInvitationSchema);

module.exports = GroupInvitation;
