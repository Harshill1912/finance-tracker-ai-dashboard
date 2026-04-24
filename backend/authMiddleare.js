const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Extract the token from the Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided or invalid format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Ensure user ID is always available (support both 'id' and '_id' formats)
    if (!decoded.id && !decoded._id) {
      return res.status(401).json({ message: 'Invalid token: user ID not found' });
    }
    // Normalize user ID to always use 'id'
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded._id || decoded.id
    };
    next();  // Move to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
