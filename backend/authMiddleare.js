const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Extract the token from the Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided or invalid format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded info to the request object
    next();  // Move to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
