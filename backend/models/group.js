// models/group.js - Group model for organizing split expenses
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Admin who created the group
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // Members of the group
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  // Group settings
  settings: {
    defaultCurrency: {
      type: String,
      default: 'INR'
    },
    allowMemberInvites: {
      type: Boolean,
      default: false // Only admin can invite by default
    }
  },
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes
GroupSchema.index({ createdBy: 1 });
GroupSchema.index({ members: 1 });
GroupSchema.index({ isActive: 1 });

// Helper method to check if user is a member
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(memberId => memberId.toString() === userId.toString());
};

// Helper method to check if user is admin
GroupSchema.methods.isAdmin = function(userId) {
  return this.createdBy.toString() === userId.toString();
};

const Group = mongoose.model('Group', GroupSchema);

module.exports = Group;
