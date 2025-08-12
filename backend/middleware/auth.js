const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Invalid token - user not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = auth;
