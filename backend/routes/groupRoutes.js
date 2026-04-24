// routes/groupRoutes.js - Group and invitation management routes
const express = require('express');
const Group = require('../models/group');
const GroupInvitation = require('../models/groupInvitation');
const User = require('../models/user');
const auth = require('../authMiddleare');
const invitationService = require('../utils/groupInvitationService');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const router = express.Router();

/**
 * Create a new group
 * POST /api/groups
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
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
          const smsResult = await smsService.sendGroupCreatedNotification({
            to: creator.phone,
            userName: creator.name,
            groupName: group.name,
            groupLink: groupLink
          });
          console.log('📱 SMS result:', smsResult);
        } else {
          console.log('⚠️ Creator has no phone number, skipping SMS notification');
        }
      } else {
        console.error('❌ Creator not found for userId:', userId);
      }
    } catch (notificationError) {
      console.error('❌ Error sending group creation notifications:', notificationError);
      console.error('❌ Error stack:', notificationError.stack);
      // Don't fail the request if notifications fail
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get all groups for the current user
 * GET /api/groups
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

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
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get a specific group
 * GET /api/groups/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email phone');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is a member
    if (!group.isMember(userId) && !group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Invite users to a group
 * POST /api/groups/:id/invite
 */
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body;
    const userId = req.user.id;

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Either email or phone is required' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can send invitations' });
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
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Get pending invitations for current user
 * GET /api/groups/invitations/pending
 */
router.get('/invitations/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const invitations = await invitationService.getPendingInvitationsForUser(userId);

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Accept a group invitation
 * POST /api/groups/invitations/:id/accept
 */
router.post('/invitations/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Decline a group invitation
 * POST /api/groups/invitations/:id/decline
 */
router.post('/invitations/:id/decline', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await invitationService.declineInvitation(id, userId);

    res.json({
      success: true,
      message: 'Invitation declined'
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Get invitation by token (public route for invitation links)
 * GET /api/groups/invitations/token/:token
 */
router.get('/invitations/token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await GroupInvitation.findOne({ token })
      .populate('group', 'name description')
      .populate('invitedBy', 'name email');

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.isExpired()) {
      await invitation.markExpired();
      return res.status(400).json({ success: false, message: 'Invitation has expired' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Invitation has been ${invitation.status}` 
      });
    }

    res.json({
      success: true,
      data: invitation
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Remove member from group (admin only)
 * DELETE /api/groups/:id/members/:memberId
 */
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Only group admin can remove members' });
    }

    // Can't remove admin
    if (group.createdBy.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot remove group admin' });
    }

    group.members = group.members.filter(
      member => member.toString() !== memberId
    );

    await group.save();

    res.json({
      success: true,
      message: 'Member removed from group'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
