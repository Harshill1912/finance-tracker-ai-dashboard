// Middleware to ensure all database queries include user filtering
const validateUserAccess = (req, res, next) => {
  if (!req.user || (!req.user.id && !req.user._id)) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  next();
};

// Helper function to get user ID consistently
const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};

module.exports = { validateUserAccess, getUserId };
