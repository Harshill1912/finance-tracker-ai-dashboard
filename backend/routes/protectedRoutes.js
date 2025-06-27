const express = require('express');
const auth = require('../authMiddleare');
const User = require('../models/user'); 

const router = express.Router();

// Example protected route
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: `Welcome, ${user.name}`, user });
  } catch (err) {a
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
