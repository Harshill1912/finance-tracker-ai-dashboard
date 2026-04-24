// utils/groupInvitationService.js - Service for handling group invitations
const Group = require('../models/group');
const GroupInvitation = require('../models/groupInvitation');
const User = require('../models/user');
const emailService = require('./emailService');
const smsService = require('./smsService');

/**
 * Normalize email for matching (case-insensitive, trimmed)
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number for matching
 * Removes all non-digit characters and ensures consistent format
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Return normalized format (keep original if can't parse)
  return digits.length >= 10 ? digits : phone.trim();
}

/**
 * Find existing user by email or phone
 * Matches case-insensitively for email, normalized for phone
 */
async function findUserByContact(email, phone) {
  const query = { $or: [] };
  
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    query.$or.push({ email: normalizedEmail });
  }
  
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    // Try exact match first
    query.$or.push({ phone: normalizedPhone });
    // Also try matching normalized versions
    const users = await User.find({ phone: { $exists: true } });
    for (const user of users) {
      if (user.phone && normalizePhone(user.phone) === normalizedPhone) {
        return user;
      }
    }
  }
  
  if (query.$or.length === 0) {
    return null;
  }
  
  return await User.findOne(query);
}

/**
 * Create a group invitation
 * Prevents duplicate pending invites for the same group+contact
 */
async function createInvitation({ groupId, invitedBy, email, phone, groupName }) {
  // Validate input
  if (!email && !phone) {
    throw new Error('Either email or phone is required');
  }
  
  // Normalize contact info
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  
  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  
  // Check if user is already a member
  if (normalizedEmail) {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && group.isMember(existingUser._id)) {
      throw new Error('User is already a member of this group');
    }
  }
  
  if (normalizedPhone) {
    const existingUser = await findUserByContact(null, normalizedPhone);
    if (existingUser && group.isMember(existingUser._id)) {
      throw new Error('User is already a member of this group');
    }
  }
  
  // Check for existing pending invitation
  const existingInviteQuery = {
    group: groupId,
    status: 'pending'
  };
  
  if (normalizedEmail) {
    existingInviteQuery.email = normalizedEmail;
  }
  if (normalizedPhone) {
    existingInviteQuery.phone = normalizedPhone;
  }
  
  const existingInvite = await GroupInvitation.findOne(existingInviteQuery);
  if (existingInvite) {
    throw new Error('A pending invitation already exists for this contact');
  }
  
  // Create invitation
  const invitation = new GroupInvitation({
    group: groupId,
    invitedBy,
    email: normalizedEmail,
    phone: normalizedPhone,
    status: 'pending'
  });
  
  await invitation.save();
  
  // Send notification (non-blocking)
  sendInvitationNotification(invitation, groupName || group.name).catch(err => {
    console.error('Error sending invitation notification:', err);
  });
  
  return invitation;
}

/**
 * Send invitation notification (email or SMS)
 */
async function sendInvitationNotification(invitation, groupName) {
  const group = await Group.findById(invitation.group).populate('createdBy', 'name email phone');
  const inviter = group.createdBy;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${baseUrl}/group-invitation?token=${invitation.token}`;
  
  if (invitation.email) {
    // Send email invitation
    await emailService.sendGroupInvite({
      to: invitation.email,
      groupName,
      inviterName: inviter.name,
      inviteLink
    });
  } else if (invitation.phone) {
    // Send SMS invitation
    await smsService.sendGroupInvite({
      to: invitation.phone,
      groupName,
      inviterName: inviter.name,
      inviteLink
    });
  }
}

/**
 * Get pending invitations for a user (by email or phone)
 * Used when user is already logged in
 */
async function getPendingInvitationsForUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return [];
  }
  
  const query = {
    status: 'pending',
    $or: []
  };
  
  if (user.email) {
    query.$or.push({ email: normalizeEmail(user.email) });
  }
  
  if (user.phone) {
    const normalizedUserPhone = normalizePhone(user.phone);
    // Find invitations with matching normalized phone
    const allInvites = await GroupInvitation.find({
      status: 'pending',
      phone: { $exists: true }
    });
    
    for (const invite of allInvites) {
      if (invite.phone && normalizePhone(invite.phone) === normalizedUserPhone) {
        query.$or.push({ _id: invite._id });
      }
    }
    
    // Also try direct match
    query.$or.push({ phone: user.phone });
  }
  
  if (query.$or.length === 0) {
    return [];
  }
  
  // Check for expired invitations
  const invitations = await GroupInvitation.find(query)
    .populate('group', 'name description')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });
  
  // Filter out expired and mark them
  const validInvitations = [];
  for (const invite of invitations) {
    if (invite.isExpired()) {
      await invite.markExpired();
    } else {
      validInvitations.push(invite);
    }
  }
  
  return validInvitations;
}

/**
 * Get unclaimed invitations for email/phone
 * Used during signup to find invitations to auto-join
 */
async function getUnclaimedInvitations(email, phone) {
  const query = {
    status: 'pending',
    $or: []
  };
  
  if (email) {
    query.$or.push({ email: normalizeEmail(email) });
  }
  
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    // Find all pending invitations with phone numbers
    const allInvites = await GroupInvitation.find({
      status: 'pending',
      phone: { $exists: true }
    });
    
    for (const invite of allInvites) {
      if (invite.phone && normalizePhone(invite.phone) === normalizedPhone) {
        query.$or.push({ _id: invite._id });
      }
    }
    
    // Also try direct match
    query.$or.push({ phone: phone.trim() });
  }
  
  if (query.$or.length === 0) {
    return [];
  }
  
  const invitations = await GroupInvitation.find(query)
    .populate('group', 'name description')
    .sort({ createdAt: -1 });
  
  // Filter out expired
  const validInvitations = [];
  for (const invite of invitations) {
    if (!invite.isExpired()) {
      validInvitations.push(invite);
    }
  }
  
  return validInvitations;
}

/**
 * Accept a group invitation
 * Adds user to group and marks invitation as accepted
 */
async function acceptInvitation(invitationId, userId) {
  const invitation = await GroupInvitation.findById(invitationId)
    .populate('group');
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is already ${invitation.status}`);
  }
  
  if (invitation.isExpired()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new Error('Invitation has expired');
  }
  
  const group = invitation.group;
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify user matches invitation (email or phone)
  const userEmail = user.email ? normalizeEmail(user.email) : null;
  const userPhone = user.phone ? normalizePhone(user.phone) : null;
  
  const emailMatch = invitation.email && userEmail && invitation.email === userEmail;
  const phoneMatch = invitation.phone && userPhone && normalizePhone(invitation.phone) === userPhone;
  
  if (!emailMatch && !phoneMatch) {
    throw new Error('This invitation is not for your account');
  }
  
  // Check if already a member
  if (group.isMember(userId)) {
    // Mark as accepted anyway
    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();
    await invitation.save();
    return { group, alreadyMember: true };
  }
  
  // Add user to group
  group.members.push(userId);
  await group.save();
  
  // Mark invitation as accepted
  invitation.status = 'accepted';
  invitation.acceptedBy = userId;
  invitation.acceptedAt = new Date();
  await invitation.save();
  
  return { group, alreadyMember: false };
}

/**
 * Decline a group invitation
 */
async function declineInvitation(invitationId, userId) {
  const invitation = await GroupInvitation.findById(invitationId);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is already ${invitation.status}`);
  }
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify user matches invitation
  const userEmail = user.email ? normalizeEmail(user.email) : null;
  const userPhone = user.phone ? normalizePhone(user.phone) : null;
  
  const emailMatch = invitation.email && userEmail && invitation.email === userEmail;
  const phoneMatch = invitation.phone && userPhone && normalizePhone(invitation.phone) === userPhone;
  
  if (!emailMatch && !phoneMatch) {
    throw new Error('This invitation is not for your account');
  }
  
  invitation.status = 'declined';
  invitation.declinedAt = new Date();
  await invitation.save();
  
  return invitation;
}

/**
 * Auto-join groups from unclaimed invitations after signup
 * Called during user signup/login
 */
async function autoJoinGroupsFromInvitations(userId, email, phone) {
  const unclaimedInvitations = await getUnclaimedInvitations(email, phone);
  const joinedGroups = [];
  
  for (const invitation of unclaimedInvitations) {
    try {
      const result = await acceptInvitation(invitation._id, userId);
      if (!result.alreadyMember) {
        joinedGroups.push(result.group);
      }
    } catch (error) {
      console.error(`Error auto-joining group from invitation ${invitation._id}:`, error);
      // Continue with other invitations
    }
  }
  
  return joinedGroups;
}

module.exports = {
  createInvitation,
  getPendingInvitationsForUser,
  getUnclaimedInvitations,
  acceptInvitation,
  declineInvitation,
  autoJoinGroupsFromInvitations,
  normalizeEmail,
  normalizePhone,
  findUserByContact
};
