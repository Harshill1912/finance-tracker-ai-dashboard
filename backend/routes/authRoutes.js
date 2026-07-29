const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');
const invitationService = require('../utils/groupInvitationService');
const router = express.Router();

// Used to verify Google ID token signatures against Google's public keys.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error. JWT_SECRET missing.' });
    }

    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected. Please check MongoDB connection.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user has password (for Google OAuth users)
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google login. Please sign in with Google.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Extended token expiration
    });

    // Send response with token and user info
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'MongoServerError' || error.message?.includes('MongoServerError')) {
      return res.status(503).json({ message: 'Database connection error. Please check MongoDB connection.' });
    }
    if (error.name === 'MongooseError' || error.message?.includes('connection')) {
      return res.status(503).json({ message: 'Database not connected. Please start MongoDB.' });
    }
    res.status(500).json({ message: `Server error: ${error.message || 'Please try again later.'}` });
  }
});


router.post('/signup', async (req, res) => {
  const { email, name, password, phone } = req.body;

  try {
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error. JWT_SECRET missing.' });
    }

    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected. Please check MongoDB connection.' });
    }

    // Validation
    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for existing user by email
    let userExist = await User.findOne({ email });
    
    // Check for existing INVITED user by email or phone that can be claimed
    if (!userExist) {
      userExist = await User.findOne({ 
        $or: [
          { email, status: 'INVITED' },
          { phone, status: 'INVITED' }
        ]
      });
      
      // If found an INVITED user, claim the account
      if (userExist && userExist.status === 'INVITED') {
        userExist.password = await bcrypt.hash(password, 10);
        userExist.status = 'ACTIVE';
        userExist.email = email; // Update email if different
        if (phone) userExist.phone = phone;
        if (name) userExist.name = name; // Update name if provided
        userExist.provider = 'local';
        await userExist.save();
        
        const token = jwt.sign({ id: userExist._id, email: userExist.email }, process.env.JWT_SECRET, {
          expiresIn: '7d',
        });

        // Auto-join groups from unclaimed invitations
        let joinedGroups = [];
        try {
          joinedGroups = await invitationService.autoJoinGroupsFromInvitations(
            userExist._id,
            userExist.email,
            userExist.phone
          );
        } catch (error) {
          console.error('Error auto-joining groups:', error);
          // Don't fail signup if group joining fails
        }

        return res.json({
          token,
          user: {
            id: userExist._id,
            name: userExist.name,
            email: userExist.email,
            phone: userExist.phone,
            picture: userExist.picture,
          },
          message: 'Account claimed successfully',
          invited: true, // Flag to indicate this was an invited user
          joinedGroups: joinedGroups.map(g => g.name) // List of group names joined
        });
      }
    }

    if (userExist && userExist.status === 'ACTIVE') {
      return res.status(400).json({ message: 'User already exists. Please login instead.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone: phone || undefined,
      password: hashedPassword,
      provider: 'local',
      status: 'ACTIVE',
    });

    await user.save();

    // Auto-join groups from unclaimed invitations
    let joinedGroups = [];
    try {
      joinedGroups = await invitationService.autoJoinGroupsFromInvitations(
        user._id,
        user.email,
        user.phone
      );
    } catch (error) {
      console.error('Error auto-joining groups:', error);
      // Don't fail signup if group joining fails
    }

    // Generate token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Extended token expiration
    });

    // Send response with token and user info
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture,
      },
      joinedGroups: joinedGroups.map(g => g.name) // List of group names joined
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }
    // Check if MongoDB connection issue
    if (error.name === 'MongoServerError' || error.message?.includes('MongoServerError')) {
      return res.status(503).json({ message: 'Database connection error. Please check MongoDB connection.' });
    }
    if (error.name === 'MongooseError' || error.message?.includes('connection')) {
      return res.status(503).json({ message: 'Database not connected. Please start MongoDB.' });
    }
    res.status(500).json({ message: `Server error: ${error.message || 'Please try again later.'}` });
  }
});

// Google OAuth Route
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }

  try {
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error. JWT_SECRET missing.' });
    }

    // Verify the token against Google's public keys BEFORE touching the
    // database, so unauthenticated callers cannot probe infrastructure state.
    //
    // This previously used jwt.decode(), which parses the payload WITHOUT
    // checking the signature. Any client could forge a token for an arbitrary
    // email and receive a valid session for that account. verifyIdToken checks
    // the signature, issuer, audience and expiry.
    if (!GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID is not set - cannot verify Google tokens');
      return res.status(500).json({ message: 'Server configuration error. GOOGLE_CLIENT_ID missing.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error('Google token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid token data' });
    }

    // Google sets email_verified on the ID token; refuse unverified addresses so
    // an account cannot be claimed via an address the holder has not proven.
    if (payload.email_verified === false) {
      return res.status(403).json({ message: 'Your Google email address is not verified.' });
    }

    // Check MongoDB connection. Without this the User queries below throw a
    // buffering timeout that surfaces as a generic 500, hiding the real cause.
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected. Please check MongoDB connection.' });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user with Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture || user.picture;
        user.provider = 'google';
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId,
        picture,
        provider: 'google',
        emailVerified: true,
      });
      await user.save();
      
      // Auto-join groups from unclaimed invitations
      let joinedGroups = [];
      try {
        joinedGroups = await invitationService.autoJoinGroupsFromInvitations(
          user._id,
          user.email,
          user.phone
        );
      } catch (error) {
        console.error('Error auto-joining groups:', error);
        // Don't fail login if group joining fails
      }
      
      // Store joined groups for response
      user._joinedGroups = joinedGroups;
    }

    // Generate token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      joinedGroups: user._joinedGroups ? user._joinedGroups.map(g => g.name) : []
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
});

// Account claiming route - for users invited via email/phone
router.post('/claim-account', async (req, res) => {
  const { email, phone, password, name } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone is required' });
    }

    // Find INVITED user by email or phone
    const query = { status: 'INVITED' };
    if (email) query.email = email;
    if (phone) query.phone = phone;

    const invitedUser = await User.findOne(query);

    if (!invitedUser) {
      return res.status(404).json({ message: 'No pending invitation found for this email/phone.' });
    }

    // Claim the account
    invitedUser.password = await bcrypt.hash(password, 10);
    invitedUser.status = 'ACTIVE';
    if (name) invitedUser.name = name;
    await invitedUser.save();

    const token = jwt.sign({ id: invitedUser._id, email: invitedUser.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: invitedUser._id,
        name: invitedUser.name,
        email: invitedUser.email,
        phone: invitedUser.phone,
        picture: invitedUser.picture,
      },
      message: 'Account claimed successfully'
    });
  } catch (error) {
    console.error('Account claiming error:', error);
    res.status(500).json({ message: `Server error: ${error.message || 'Please try again later.'}` });
  }
});

module.exports = router;
